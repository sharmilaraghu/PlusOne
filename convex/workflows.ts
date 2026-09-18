import { WorkflowManager } from "@convex-dev/workflow";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { hostOf } from "./lib/text";

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

/** Plan -> search -> scrape each of the top 5 -> cards appear incrementally. */
export const researchWorkflow = workflow.define({
  args: { researchRunId: v.id("researchRuns") },
  handler: async (step, args): Promise<void> => {
    const run = await step.runQuery(internal.research.getRun, { researchRunId: args.researchRunId });
    if (!run) return;
    let found = 0;
    try {
      await step.runMutation(internal.research.setStep, { researchRunId: run._id, step: "Planning the search" });
      const plan = await step.runAction(internal.openai.planSearch, { weddingId: run.weddingId, slotId: run.slotId, query: run.query });

      await step.runMutation(internal.research.setStep, { researchRunId: run._id, step: `Searching the web: ${plan.queries[0]}` });
      const candidates = await step.runAction(internal.firecrawl.searchVendors, { queries: plan.queries, city: plan.city, limit: 6 });
      if (candidates.length === 0) {
        await step.runMutation(internal.research.finish, { researchRunId: run._id, status: "done", foundCount: 0 });
        return;
      }

      for (const candidate of candidates.slice(0, 5)) {
        const host = hostOf(candidate.url) ?? candidate.url;
        await step.runMutation(internal.research.setStep, { researchRunId: run._id, step: `Reading ${host}`, foundCount: found });
        let page: { url: string; title?: string; markdown: string; json?: unknown; emails?: string[] } | null = null;
        try {
          page = await step.runAction(
            internal.firecrawl.scrapeVendor,
            { url: candidate.url },
            { retry: { maxAttempts: 2, initialBackoffMs: 1000, base: 2 } },
          );
        } catch (err) {
          console.warn("scrape failed, falling back to search snippet", host, err instanceof Error ? err.message : err);
          if (candidate.markdown) page = { url: candidate.url, title: candidate.title, markdown: candidate.markdown };
        }
        if (!page || page.markdown.trim().length < 100) continue;

        const { cards } = await step.runAction(internal.openai.buildCards, {
          weddingId: run.weddingId,
          slotId: run.slotId,
          pages: [{ url: page.url, title: page.title, markdown: page.markdown, json: page.json, emails: page.emails }],
        });
        if (cards.length === 0) continue;
        const created = await step.runMutation(internal.vendors.upsertMany, { weddingId: run.weddingId, slotId: run.slotId, cards });
        found += created;
        await step.runMutation(internal.research.setStep, { researchRunId: run._id, step: `Found ${cards[0].name}`, foundCount: found });
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
      fromAddress: wedding.inboxAddress ?? process.env.AGENTMAIL_FALLBACK_INBOX_ID ?? "",
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
