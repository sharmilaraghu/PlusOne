import { createOpenAI } from "@ai-sdk/openai";
import { generateObject, generateText } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import { formatMoney, truncate } from "./lib/text";
import { rsvpStatus, vendorCardValidator, type RsvpStatus, type VendorCard } from "./lib/validators";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const MODEL_FAST = process.env.OPENAI_MODEL_FAST ?? "gpt-5.6-luna";
export const MODEL_SMART = process.env.OPENAI_MODEL_SMART ?? "gpt-5.6-terra";

const PAGE_CHARS = 12_000;
const nn = <T>(x: T | null | undefined): T | undefined => (x === null ? undefined : x);

function weddingBrief(wedding: Doc<"weddings">, events: Doc<"events">[]): string {
  const lines = events.map((e) => `- ${e.name} on ${e.date} (~${e.guestCount} guests, budget ${formatMoney(e.budget, wedding.currency)})`);
  return [
    `Couple: ${wedding.partnerA} & ${wedding.partnerB}`,
    `Wedding: ${wedding.name}, ${wedding.startDate} to ${wedding.endDate}, ${wedding.city}${wedding.country ? `, ${wedding.country}` : ""}`,
    `Tradition/template: ${wedding.template}. Total budget ${formatMoney(wedding.totalBudget, wedding.currency)}.`,
    wedding.styleSummary ? `Style: ${wedding.styleSummary}` : "",
    "Events:",
    ...lines,
  ]
    .filter(Boolean)
    .join("\n");
}

// ---- onboarding -------------------------------------------------------------

export const summariseStyle = internalAction({
  args: { weddingId: v.id("weddings"), markdown: v.string() },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const { text } = await generateText({
      model: openai(MODEL_FAST),
      prompt:
        "You are a wedding stylist. From the page content below (a couple's inspiration link), write a 2-3 sentence " +
        "style summary a vendor could act on: palette, mood, formality, cultural touches, must-haves. Plain text, no headings.\n\n" +
        truncate(args.markdown, PAGE_CHARS),
    });
    await ctx.runMutation(internal.weddings.setStyleSummary, { weddingId: args.weddingId, styleSummary: text.trim().slice(0, 1000) });
    return null;
  },
});

// ---- research ---------------------------------------------------------------

export const planSearch = internalAction({
  args: { weddingId: v.id("weddings"), slotId: v.id("vendorSlots"), query: v.string() },
  returns: v.object({ queries: v.array(v.string()), category: v.string(), city: v.string(), budgetHint: v.string() }),
  handler: async (ctx, args): Promise<{ queries: string[]; category: string; city: string; budgetHint: string }> => {
    const context = await ctx.runQuery(internal.weddings.getContext, { weddingId: args.weddingId });
    const slot = await ctx.runQuery(internal.slots.getInternal, { slotId: args.slotId });
    if (!context || !slot) throw new Error("Wedding or slot not found");
    const { wedding, events } = context;
    const { object } = await generateObject({
      model: openai(MODEL_FAST),
      schema: z.object({
        queries: z.array(z.string()).min(1).max(3),
        category: z.string(),
        city: z.string(),
        budgetHint: z.string(),
      }),
      prompt:
        "You turn a couple's request into web search queries that find INDIVIDUAL wedding vendor websites " +
        "(not directories like The Knot, WeddingWire, Yelp). Return 2-3 short queries that combine the vendor type, the city, " +
        "and one distinguishing detail (style, cuisine, budget). Also return the normalised vendor category, the city to search, " +
        "and a one-line budget hint the couple can afford for this slot.\n\n" +
        `${weddingBrief(wedding, events)}\n\nSlot: ${slot.title} (${slot.category}), budget ${formatMoney(slot.budget, wedding.currency)}\n` +
        `Couple's request: "${args.query}"`,
    });
    return {
      queries: object.queries.map((q) => q.slice(0, 200)),
      category: object.category || slot.category,
      city: object.city || wedding.city,
      budgetHint: object.budgetHint,
    };
  },
});

const cardSchema = z.object({
  isVendor: z.boolean().describe("false for directories, blogs, marketplaces, news, social profiles"),
  name: z.string(),
  website: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  city: z.string().nullable(),
  startingPrice: z.number().nullable().describe("lowest numeric price mentioned, in the page's currency"),
  priceNotes: z.string().nullable(),
  packages: z.array(z.object({ name: z.string(), price: z.number().nullable(), description: z.string().nullable() })),
  capacity: z.string().nullable(),
  ratingText: z.string().nullable(),
  highlights: z.array(z.string()).max(6),
  summary: z.string().describe("2 sentences for a couple comparing vendors"),
});

export const buildCards = internalAction({
  args: {
    weddingId: v.id("weddings"),
    slotId: v.id("vendorSlots"),
    pages: v.array(
      v.object({
        url: v.string(),
        title: v.optional(v.string()),
        markdown: v.string(),
        json: v.optional(v.any()),
        emails: v.optional(v.array(v.string())),
      }),
    ),
  },
  returns: v.object({ cards: v.array(vendorCardValidator) }),
  handler: async (ctx, args): Promise<{ cards: VendorCard[] }> => {
    const context = await ctx.runQuery(internal.weddings.getContext, { weddingId: args.weddingId });
    const slot = await ctx.runQuery(internal.slots.getInternal, { slotId: args.slotId });
    if (!context || !slot) throw new Error("Wedding or slot not found");
    const cards: VendorCard[] = [];
    for (const page of args.pages.slice(0, 5)) {
      const { object } = await generateObject({
        model: openai(MODEL_FAST),
        schema: cardSchema,
        prompt:
          `Read this web page and extract a vendor card for a couple looking for: ${slot.title} (${slot.category}) ` +
          `in ${context.wedding.city}. If the page is a directory, listicle, blog, marketplace or otherwise not a single vendor's own site, ` +
          `set isVendor=false. Use null for anything not on the page. Prices must be numbers only (no currency symbols).\n\n` +
          `URL: ${page.url}\nTitle: ${page.title ?? ""}\n` +
          (page.json ? `Structured extraction: ${JSON.stringify(page.json).slice(0, 3000)}\n` : "") +
          `Page content:\n${truncate(page.markdown, PAGE_CHARS)}`,
      });
      if (!object.isVendor) continue;
      const email = nn(object.email)?.toLowerCase() ?? page.emails?.[0];
      cards.push({
        name: object.name.slice(0, 120),
        website: nn(object.website) ?? page.url,
        email,
        phone: nn(object.phone),
        city: nn(object.city),
        startingPrice: nn(object.startingPrice),
        priceNotes: nn(object.priceNotes),
        packages: object.packages.slice(0, 10).map((p) => ({ name: p.name, price: nn(p.price), description: nn(p.description) })),
        capacity: nn(object.capacity),
        ratingText: nn(object.ratingText),
        highlights: object.highlights,
        sourceUrls: [page.url],
        summary: object.summary,
      });
    }
    return { cards };
  },
});

// ---- outreach ---------------------------------------------------------------

export const draftInquiries = internalAction({
  args: { slotId: v.id("vendorSlots"), vendorIds: v.array(v.id("vendors")) },
  returns: v.number(),
  handler: async (ctx, args): Promise<number> => {
    const slot = await ctx.runQuery(internal.slots.getInternal, { slotId: args.slotId });
    if (!slot) throw new Error("Slot not found");
    const context = await ctx.runQuery(internal.weddings.getContext, { weddingId: slot.weddingId });
    if (!context) throw new Error("Wedding not found");
    const { wedding } = context;
    const events = context.events.filter((e) => slot.eventIds.includes(e._id));
    const vendors = await ctx.runQuery(internal.vendors.getMany, { vendorIds: args.vendorIds });
    const fromAddress = wedding.inboxAddress ?? process.env.AGENTMAIL_FALLBACK_INBOX_ID ?? "";
    let count = 0;
    for (const vendor of vendors) {
      const threadId = await ctx.runMutation(internal.threads.getOrCreateForVendor, {
        weddingId: wedding._id,
        vendorId: vendor._id,
        slotId: slot._id,
      });
      const { object } = await generateObject({
        model: openai(MODEL_SMART),
        schema: z.object({ subject: z.string().max(70), bodyText: z.string() }),
        prompt:
          "Write a warm, specific first inquiry email from a couple to a wedding vendor. Plain text only, no markdown, " +
          "no placeholders in square brackets. Greet the vendor by name, give the wedding dates and city, list the events " +
          "this vendor would cover with approximate guest counts, mention the budget range only if it helps, ask exactly 3 " +
          "specific questions (availability on the dates, pricing/packages for this scope, and one question tailored to what " +
          "their website says they offer), and sign off with both partners' first names. Subject line under 70 characters.\n\n" +
          `${weddingBrief(wedding, events)}\n\nSlot: ${slot.title} (${slot.category}), budget ${formatMoney(slot.budget, wedding.currency)}\n` +
          `Vendor: ${vendor.name}${vendor.website ? ` (${vendor.website})` : ""}\n` +
          (vendor.summary ? `What we know about them: ${vendor.summary}\n` : "") +
          (vendor.highlights.length ? `Highlights: ${vendor.highlights.join("; ")}\n` : "") +
          (vendor.startingPrice ? `Their listed starting price: ${vendor.startingPrice}\n` : ""),
      });
      await ctx.runMutation(internal.messages.createOutboundDraft, {
        weddingId: wedding._id,
        threadId,
        kind: "inquiry",
        status: "draft",
        fromAddress,
        toAddress: vendor.email ?? "",
        subject: object.subject,
        bodyText: object.bodyText,
        idempotencyKey: `${threadId}:inquiry`,
      });
      count += 1;
    }
    return count;
  },
});

export const draftFollowUp = internalAction({
  args: { threadId: v.id("threads") },
  returns: v.object({ subject: v.string(), bodyText: v.string() }),
  handler: async (ctx, args): Promise<{ subject: string; bodyText: string }> => {
    const context = await ctx.runQuery(internal.threads.getContext, { threadId: args.threadId });
    if (!context) throw new Error("Thread not found");
    const { thread, vendor, slot, wedding, lastOutbound } = context;
    const { object } = await generateObject({
      model: openai(MODEL_FAST),
      schema: z.object({ subject: z.string().max(70), bodyText: z.string() }),
      prompt:
        `Write a short, friendly follow-up email (3-5 sentences, plain text) from ${wedding.partnerA} & ${wedding.partnerB} ` +
        `to ${vendor.name} about ${slot.title} for their wedding on ${wedding.startDate} in ${wedding.city}. ` +
        `This is follow-up number ${thread.followUpCount + 1}. Do not be pushy; restate the dates, say you are finalising ` +
        `vendors soon, and ask if they are available and what their pricing is. Sign off with first names.\n\n` +
        (lastOutbound ? `Previous email we sent:\nSubject: ${lastOutbound.subject}\n${truncate(lastOutbound.bodyText, 3000)}` : ""),
    });
    const subject = lastOutbound?.subject ? `Re: ${lastOutbound.subject}`.slice(0, 70) : object.subject;
    return { subject, bodyText: object.bodyText };
  },
});

// ---- inbound ----------------------------------------------------------------

const replySchema = z.object({
  classification: z.enum(["quote", "question", "declined", "available", "other"]),
  total: z.number().nullable().describe("all-in quoted price as a number, null if none"),
  deposit: z.number().nullable(),
  currency: z.string().nullable().describe("ISO code like USD"),
  availability: z.string().nullable().describe("what they said about the dates"),
  includes: z.array(z.string()).max(12),
  excludes: z.array(z.string()).max(12),
  deadline: z.string().nullable().describe("any quote validity / hold deadline mentioned"),
  summary: z.string().describe("1-2 sentence summary for the couple"),
  redFlags: z.array(z.string()).max(6).describe("non-refundable deposits, vague scope, hidden fees, pressure tactics"),
});

/** Classify + extract a vendor reply, then update quote / thread / budget / activity. */
export const extractReply = internalAction({
  args: { messageId: v.id("messages") },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const context = await ctx.runQuery(internal.messages.getContext, { messageId: args.messageId });
    if (!context || !context.thread) return null;
    const { message, wedding, thread, vendor, slot } = context;
    const { object } = await generateObject({
      model: openai(MODEL_SMART),
      schema: replySchema,
      prompt:
        `A wedding vendor replied to a couple's inquiry. Classify the reply and extract pricing details. ` +
        `Couple's currency is ${wedding.currency}; the slot is ${slot?.title ?? "a vendor slot"} with a budget of ` +
        `${slot ? formatMoney(slot.budget, wedding.currency) : "unknown"}. "quote" = they gave a price; "question" = they need ` +
        `information from the couple before quoting; "declined" = unavailable or not interested; "available" = available but no price yet.\n\n` +
        `From: ${vendor?.name ?? message.fromAddress}\nSubject: ${message.subject}\n\n${truncate(message.bodyText, PAGE_CHARS)}`,
    });
    const extracted = {
      total: nn(object.total),
      deposit: nn(object.deposit),
      currency: nn(object.currency),
      availability: nn(object.availability),
      includes: object.includes,
      excludes: object.excludes,
      deadline: nn(object.deadline),
      summary: object.summary,
    };
    await ctx.runMutation(internal.messages.setExtraction, {
      messageId: args.messageId,
      classification: object.classification,
      extracted,
    });
    await ctx.runMutation(internal.threads.applyClassification, { threadId: thread._id, classification: object.classification });
    if (extracted.total !== undefined && extracted.total > 0) {
      await ctx.runMutation(internal.quotes.upsertFromMessage, {
        messageId: args.messageId,
        total: extracted.total,
        deposit: extracted.deposit,
        currency: extracted.currency,
        includes: extracted.includes,
        excludes: extracted.excludes,
        validUntil: extracted.deadline,
        redFlags: object.redFlags,
        summary: object.summary,
      });
    }
    return null;
  },
});

export const parseRsvp = internalAction({
  args: { messageId: v.id("messages") },
  returns: v.object({
    guestId: v.id("guests"),
    rsvp: rsvpStatus,
    attendingCount: v.number(),
    dietary: v.optional(v.string()),
    note: v.optional(v.string()),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{ guestId: Id<"guests">; rsvp: RsvpStatus; attendingCount: number; dietary?: string; note?: string }> => {
    const message = await ctx.runQuery(internal.messages.getInternal, { messageId: args.messageId });
    if (!message || !message.guestId) throw new Error("Message is not a guest reply");
    const context = await ctx.runQuery(internal.guests.getContextForRsvp, { guestId: message.guestId });
    if (!context) throw new Error("Guest not found");
    const { guest } = context;
    const { object } = await generateObject({
      model: openai(MODEL_FAST),
      schema: z.object({
        rsvp: z.enum(["yes", "no", "maybe", "pending"]).describe("pending only if the email does not answer at all"),
        attendingCount: z.number().int().min(0).max(20),
        dietary: z.string().nullable(),
        note: z.string().nullable().describe("anything else the couple should know, one line"),
      }),
      prompt:
        `A wedding guest replied to an RSVP email. Guest: ${guest.name}, invited party size ${guest.partySize}. ` +
        `Work out whether they are coming, how many people are attending (default to the party size when they say yes ` +
        `without a number; "plus one" means 2), and any dietary needs.\n\nSubject: ${message.subject}\n\n${truncate(message.bodyText, 6000)}`,
    });
    return {
      guestId: guest._id,
      rsvp: object.rsvp,
      attendingCount: object.attendingCount,
      dietary: nn(object.dietary),
      note: nn(object.note),
    };
  },
});
