import { WorkflowManager } from "@convex-dev/workflow";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { hostOf } from "./lib/text";
import type { VendorDetail, VendorReview } from "./lib/validators";

export const workflow = new WorkflowManager(components.workflow, {
  workpoolOptions: {
    defaultRetryBehavior: { maxAttempts: 3, initialBackoffMs: 1000, base: 2 },
    retryActionsByDefault: true,
  },
});

/** New wedding: create its AgentMail inbox, then (optionally) read the inspiration link. */
export const onboardingWorkflow = workflow.define({
  args: { weddingId: v.id("weddings") },
  handler: async (step, args): Promise<void> => {
    await step.runAction(internal.agentmail.createInbox, { weddingId: args.weddingId });
    const wedding = await step.runQuery(internal.weddings.getInternal, { weddingId: args.weddingId });
    if (!wedding?.inspirationUrl) return;
    try {
      const markdown = await step.runAction(internal.firecrawl.readInspiration, { url: wedding.inspirationUrl }, { retry: false });
      if (markdown.trim().length > 200) {
        await step.runAction(internal.openai.summariseStyle, { weddingId: args.weddingId, markdown });
      }
    } catch (err) {
      console.warn("inspiration step skipped", err instanceof Error ? err.message : err);
    }
  },
});

/**
 * Plan -> search -> per vendor: read its own contact/pricing pages, look up its rating,
 * upsert the cards batch by batch -> rank them all -> done.
 * Phase 2b: `researchVendorDetail` + `lookupReviews` replace the single homepage scrape.
 */
const RESEARCH_BUDGET_MS = 55_000; // per-batch wall time; a slow first batch skips the second so a run stays near two minutes
const MAX_CANDIDATES = 6;
const BATCH_SIZE = 3; // vendors researched in parallel; a batch's cards land together

export const researchWorkflow = workflow.define({
  args: { researchRunId: v.id("researchRuns") },
  handler: async (step, args): Promise<void> => {
    const run = await step.runQuery(internal.research.getRun, { researchRunId: args.researchRunId });
    if (!run) return;
    let found = 0;
    try {
      await step.runMutation(internal.research.setStep, { researchRunId: run._id, step: "Planning the search" });
      const plan = await step.runAction(internal.openai.planSearch, {
        weddingId: run.weddingId,
        slotId: run.slotId,
        query: run.query,
        area: run.area,
      });
      const wedding = await step.runQuery(internal.weddings.getInternal, { weddingId: run.weddingId });

      await step.runMutation(internal.research.setStep, { researchRunId: run._id, step: `Searching the web: ${plan.queries[0]}` });
      const candidates = await step.runAction(internal.firecrawl.searchVendors, { queries: plan.queries, city: plan.city, limit: MAX_CANDIDATES });
      if (candidates.length === 0) {
        await step.runMutation(internal.research.finish, { researchRunId: run._id, status: "done", foundCount: 0 });
        return;
      }

      /** Read one vendor properly: its own pages, then its rating, then the card. */
      const researchOne = async (
        candidate: { url: string; title?: string; markdown?: string },
      ): Promise<{ created: number; upserted: number; ms: number }> => {
        const host = hostOf(candidate.url) ?? candidate.url;
        let ms = 0;
        let detail: VendorDetail | null = null;
        try {
          detail = await step.runAction(
            internal.firecrawl.researchVendorDetail,
            { url: candidate.url, need: plan.category, city: plan.city, currency: wedding?.currency },
            { retry: { maxAttempts: 2, initialBackoffMs: 1000, base: 2 } },
          );
          ms += detail.ms;
        } catch (err) {
          console.warn("vendor detail failed, falling back to the search snippet", host, err instanceof Error ? err.message : err);
        }

        const markdown = detail && detail.markdown.trim().length >= 100 ? detail.markdown : (candidate.markdown ?? "");
        if (markdown.trim().length < 100) return { created: 0, upserted: 0, ms };

        const businessName = detail?.businessName ?? candidate.title ?? host;
        let review: VendorReview = { highlights: [], ms: 0 };
        try {
          review = await step.runAction(
            internal.firecrawl.lookupReviews,
            { businessName, need: plan.category, city: plan.city, ownWebsite: detail?.url ?? candidate.url },
            { retry: false },
          );
          ms += review.ms;
        } catch (err) {
          console.warn("review lookup failed", businessName, err instanceof Error ? err.message : err);
        }

        const { cards } = await step.runAction(internal.openai.buildCards, {
          weddingId: run.weddingId,
          slotId: run.slotId,
          pages: [
            {
              url: detail?.url ?? candidate.url,
              title: detail?.title ?? candidate.title,
              markdown,
              json: detail
                ? {
                    businessName: detail.businessName,
                    emails: detail.emails,
                    phone: detail.phone,
                    startingPrice: detail.startingPrice,
                    priceUnit: detail.priceUnit,
                    priceText: detail.priceText,
                    currency: detail.currency,
                    packages: detail.packages,
                    servesCity: detail.servesCity,
                    address: detail.address,
                  }
                : undefined,
              emails: detail?.emails,
            },
          ],
        });
        if (cards.length === 0) return { created: 0, upserted: 0, ms }; // a directory, blog or unrelated business

        // Only evidence that survived the scrape is stored: a price is kept solely when
        // `researchVendorDetail` accepted it (plausible amount + a known currency).
        const card = {
          ...cards[0],
          email: detail?.emails[0] ?? cards[0].email,
          phone: cards[0].phone ?? detail?.phone,
          website: detail?.url ?? candidate.url, // the url we actually fetched, not a model guess
          startingPrice: detail ? detail.startingPrice : undefined,
          priceUnit: detail?.startingPrice !== undefined ? detail.priceUnit : undefined,
          priceCurrency: detail?.startingPrice !== undefined ? detail.currency : undefined,
          priceNotes: detail?.priceText ?? cards[0].priceNotes,
          packages: detail && detail.packages.length ? detail.packages : cards[0].packages,
          city: cards[0].city ?? detail?.servesCity,
          // Whatever the pages actually stated about where they work. No geocoding.
          serviceArea: detail?.servesCity ?? detail?.address,
          rating: review.rating,
          reviewCount: review.reviewCount,
          reviewSource: review.reviewSource,
          reviewHighlights: review.highlights,
          contactFormUrl: detail?.contactFormUrl,
          hasContactFormOnly: detail?.hasContactFormOnly,
          pagesRead: detail?.pagesRead ?? [],
          sourceUrls: [
            ...new Set([...(detail?.pagesRead ?? []), ...cards[0].sourceUrls, ...(review.reviewSource ? [review.reviewSource] : [])]),
          ].slice(0, 10),
        };
        const created = await step.runMutation(internal.vendors.upsertMany, { weddingId: run.weddingId, slotId: run.slotId, cards: [card] });
        await step.runMutation(internal.research.setStep, { researchRunId: run._id, step: `Found ${card.name}` });
        return { created, upserted: 1, ms };
      };

      // Batches of three in parallel: six vendors researched properly still finishes near two
      // minutes. A batch advances only when its slowest member is done, so its three cards
      // land together — the list still fills in visibly while the run continues.
      const shortlist = candidates.slice(0, MAX_CANDIDATES);
      let spentMs = 0;
      let upserted = 0; // cards written, new or refreshed — a re-run must still re-rank
      for (let i = 0; i < shortlist.length; i += BATCH_SIZE) {
        if (spentMs > RESEARCH_BUDGET_MS) break;
        const batch = shortlist.slice(i, i + BATCH_SIZE);
        await step.runMutation(internal.research.setStep, {
          researchRunId: run._id,
          step: `Reading ${batch.map((c) => hostOf(c.url) ?? c.url).join(", ")}`,
          foundCount: found,
        });
        const results = await Promise.all(batch.map((candidate) => researchOne(candidate)));
        found += results.reduce((sum, r) => sum + r.created, 0);
        upserted += results.reduce((sum, r) => sum + r.upserted, 0);
        spentMs += Math.max(...results.map((r) => r.ms), 0); // the batch ran in parallel
        await step.runMutation(internal.research.setStep, {
          researchRunId: run._id,
          step: `${found} vendor${found === 1 ? "" : "s"} so far`,
          foundCount: found,
        });
      }

      if (upserted > 0) {
        await step.runMutation(internal.research.setStep, { researchRunId: run._id, step: "Ranking what we found", foundCount: found });
        await step.runAction(internal.openai.rankVendors, { slotId: run.slotId }, { retry: { maxAttempts: 2, initialBackoffMs: 1000, base: 2 } });
      }
      await step.runMutation(internal.research.finish, { researchRunId: run._id, status: "done", foundCount: found });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      await step.runMutation(internal.research.finish, { researchRunId: run._id, status: "failed", foundCount: found, error });
    }
  },
});

/** Vendor reply: classify + extract quote (mutations inside the action update thread/budget/activity). */
export const inboundWorkflow = workflow.define({
  args: { messageId: v.id("messages") },
  handler: async (step, args): Promise<void> => {
    await step.runAction(internal.openai.extractReply, { messageId: args.messageId });
  },
});

/** Draft a nudge, queue it, send it once (no retry), then bump the counter. */
export const followUpWorkflow = workflow.define({
  args: { threadId: v.id("threads") },
  handler: async (step, args): Promise<void> => {
    const context = await step.runQuery(internal.threads.getContext, { threadId: args.threadId });
    if (!context) return;
    const { thread, vendor, wedding } = context;
    if (thread.status === "booked" || thread.status === "declined") return;
    if (!vendor.email) return;
    const draft = await step.runAction(internal.openai.draftFollowUp, { threadId: args.threadId });
    const messageId = await step.runMutation(internal.messages.createOutboundDraft, {
      weddingId: thread.weddingId,
      threadId: thread._id,
      kind: "follow_up",
      status: "queued",
      // `process` is blanked inside workflow handlers, so no env lookup here.
      // sendOutbound resolves the real inbox (including any fallback) when it sends.
      fromAddress: wedding.inboxAddress ?? "",
      toAddress: vendor.email,
      subject: draft.subject,
      bodyText: draft.bodyText,
      idempotencyKey: `${thread._id}:follow_up:${thread.followUpCount + 1}`,
    });
    await step.runAction(internal.agentmail.sendOutbound, { messageId }, { retry: false });
    const sent = await step.runQuery(internal.messages.getInternal, { messageId });
    if (sent?.status === "sent") {
      await step.runMutation(internal.threads.afterFollowUpSent, { threadId: args.threadId });
    }
  },
});

/** Guest reply: parse with OpenAI, then update the guest row + activity. */
export const rsvpWorkflow = workflow.define({
  args: { messageId: v.id("messages") },
  handler: async (step, args): Promise<void> => {
    const parsed = await step.runAction(internal.openai.parseRsvp, { messageId: args.messageId });
    if (parsed.rsvp === "pending") return;
    await step.runMutation(internal.guests.applyRsvp, {
      guestId: parsed.guestId,
      rsvp: parsed.rsvp,
      attendingCount: parsed.attendingCount,
      dietary: parsed.dietary,
      note: parsed.note,
    });
  },
});
