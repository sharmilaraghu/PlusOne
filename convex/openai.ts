import { createOpenAI } from "@ai-sdk/openai";
import { generateObject, generateText } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalAction, type ActionCtx } from "./_generated/server";
import { formatMoney, matchByName, truncate } from "./lib/text";
import {
  replyClassification,
  rsvpStatus,
  vendorCardValidator,
  type ReplyClassification,
  type RsvpStatus,
  type VendorCard,
} from "./lib/validators";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const MODEL_FAST = process.env.OPENAI_MODEL_FAST ?? "gpt-5.6-luna";
export const MODEL_SMART = process.env.OPENAI_MODEL_SMART ?? "gpt-5.6-terra";

const PAGE_CHARS = 12_000;
const nn = <T>(x: T | null | undefined): T | undefined => (x === null ? undefined : x);

/** How formal the couple said the day is, turned into an instruction about tone. */
function toneFor(wedding: Doc<"weddings">): string {
  switch (wedding.styleFormality) {
    case "relaxed":
      return "Tone: friendly and casual, first names, contractions welcome, no stiff phrasing.";
    case "formal":
      return "Tone: courteous and formal. No contractions, no slang, address the vendor politely by name.";
    default:
      return "Tone: warm and straightforward, the way one person writes to another they hope to work with.";
  }
}

function weddingBrief(wedding: Doc<"weddings">, events: Doc<"events">[], dietary?: string | null): string {
  const lines = events.map((e) => `- ${e.name} on ${e.date} (~${e.guestCount} guests, budget ${formatMoney(e.budget, wedding.currency)})`);
  return [
    `Couple: ${wedding.partnerA} & ${wedding.partnerB}`,
    `Wedding: ${wedding.name}, ${wedding.startDate} to ${wedding.endDate}, ${wedding.city}${wedding.country ? `, ${wedding.country}` : ""}`,
    `Tradition/template: ${wedding.template}. Total budget ${formatMoney(wedding.totalBudget, wedding.currency)}.`,
    wedding.styleVibes?.length ? `The feel they want: ${wedding.styleVibes.join(", ")}` : "",
    wedding.stylePalette ? `Colours: ${wedding.stylePalette}` : "",
    wedding.styleFormality ? `Formality: ${wedding.styleFormality}` : "",
    wedding.styleSummary ? `Style notes: ${wedding.styleSummary}` : "",
    wedding.inspirationNotes ? `In their words: ${truncate(wedding.inspirationNotes, 600)}` : "",
    dietary ? `Guests' food needs from their RSVPs so far: ${dietary}` : "",
    "Events:",
    ...lines,
  ]
    .filter(Boolean)
    .join("\n");
}

// ---- onboarding -------------------------------------------------------------

/** Reads whatever inspiration the couple gave (a page, their own words, pictures) into one brief. */
export const summariseStyle = internalAction({
  args: {
    weddingId: v.id("weddings"),
    markdown: v.optional(v.string()),
    notes: v.optional(v.string()),
    images: v.optional(v.array(v.id("_storage"))),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const urls: string[] = [];
    for (const id of args.images ?? []) {
      const url = await ctx.storage.getUrl(id);
      if (url) urls.push(url);
    }
    const sources = [
      args.notes ? `How the couple describe it:\n${truncate(args.notes, 2000)}` : "",
      args.markdown ? `Their inspiration page:\n${truncate(args.markdown, PAGE_CHARS)}` : "",
      urls.length ? `They also shared ${urls.length} mood-board picture${urls.length === 1 ? "" : "s"}, attached.` : "",
    ].filter(Boolean);
    if (!sources.length) return null;
    const { text } = await generateText({
      model: openai(MODEL_FAST),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "You are a wedding stylist. From the couple's inspiration below, write a 2-3 sentence style summary a " +
                "vendor could act on: palette, mood, formality, cultural touches, must-haves. Plain text, no headings.\n\n" +
                sources.join("\n\n"),
            },
            ...urls.map((url) => ({ type: "file" as const, data: new URL(url), mediaType: "image" })),
          ],
        },
      ],
    });
    await ctx.runMutation(internal.weddings.setStyleSummary, { weddingId: args.weddingId, styleSummary: text.trim().slice(0, 1000) });
    return null;
  },
});

// ---- research ---------------------------------------------------------------

export const planSearch = internalAction({
  args: {
    weddingId: v.id("weddings"),
    slotId: v.id("vendorSlots"),
    query: v.string(),
    /** Neighbourhood to bias the search towards; defaults to the wedding's own area. */
    area: v.optional(v.string()),
  },
  returns: v.object({
    queries: v.array(v.string()),
    category: v.string(),
    /** The full search location used in every query: "<area> <city>" when an area is set. */
    city: v.string(),
    area: v.optional(v.string()),
    budgetHint: v.string(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{ queries: string[]; category: string; city: string; area?: string; budgetHint: string }> => {
    const context = await ctx.runQuery(internal.weddings.getContext, { weddingId: args.weddingId });
    const slot = await ctx.runQuery(internal.slots.getInternal, { slotId: args.slotId });
    if (!context || !slot) throw new Error("Wedding or slot not found");
    const { wedding, events } = context;
    const area = (args.area ?? wedding.area)?.trim().slice(0, 120) || undefined;
    const { object } = await generateObject({
      model: openai(MODEL_FAST),
      schema: z.object({
        queries: z.array(z.string()).min(1).max(3),
        category: z.string(),
        city: z.string(),
        budgetHint: z.string(),
      }),
      prompt:
        "You turn a couple's request into web search queries that land on an INDIVIDUAL wedding vendor's OWN website " +
        "(not a directory, marketplace or listicle like The Knot, WeddingWire, Yelp, Zola, wedmegood). " +
        "Return exactly 3 short queries. Every query must name the city. Bias them towards a vendor's own site by using the " +
        "words a vendor writes on their own pages (e.g. \"studio\", \"packages\", \"book\", \"portfolio\") rather than " +
        "listing words (\"best\", \"top 10\", \"near me\"). Make the queries different from each other: one plain " +
        "\"<vendor type> <city>\", one with a distinguishing detail drawn from the couple's own words about the feel " +
        "they want (their vibe words, colours or tradition) when those genuinely narrow the search, and one that includes " +
        "\"packages\" or \"pricing\" so the result page is likely to show numbers. " +
        "Also return the normalised vendor category, the city to search, and a one-line budget hint for this slot.\n\n" +
        (area
          ? `Every query MUST place the neighbourhood "${area}" immediately before the city, like ` +
            `"<vendor type> ${area} ${wedding.city}" — searching the neighbourhood returns genuinely local vendors, ` +
            `while the city alone returns mostly directories.\n`
          : "") +
        `${weddingBrief(wedding, events)}\n\nSlot: ${slot.title} (${slot.category}), budget ${formatMoney(slot.budget, wedding.currency)}\n` +
        (area ? `Neighbourhood to search: ${area}\n` : "") +
        `Couple's request: "${args.query}"`,
    });
    // The location string every query must contain: neighbourhood first, then city.
    const city = area ? `${area} ${object.city || wedding.city}` : object.city || wedding.city;
    // Guarantee the two properties the eval showed matter: the city, and one pricing-shaped query.
    const queries = object.queries
      .map((q) => q.trim().slice(0, 200))
      .filter((q) => q.length > 0)
      .map((q) => (q.toLowerCase().includes(city.toLowerCase()) ? q : `${q} ${city}`.slice(0, 200)));
    while (queries.length < 3) queries.push(`${slot.category} ${city}`.slice(0, 200));
    const top3 = [...new Set(queries)].slice(0, 3);
    // Replace the last query rather than appending, or the slice below would drop it.
    if (!top3.some((q) => /packages|pricing|price/i.test(q))) {
      top3[top3.length - 1] = `${slot.category} ${city} wedding packages pricing`.slice(0, 200);
    }
    return {
      queries: top3,
      category: object.category || slot.category,
      city,
      area,
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
          `in ${context.wedding.city}.\n` +
          `Set isVendor=false — and extract nothing else — when the page is any of: a directory or marketplace listing ` +
          `(The Knot, WeddingWire, Zola, Yelp, WedMeGood, Hitched), a blog post, a listicle ("best 10 ..."), a news or ` +
          `magazine article, a social media profile, a government, university or tourism page, or a business that does not ` +
          `itself offer ${slot.category} for weddings. Set isVendor=true only when this is one real business's own website ` +
          `offering this service.\n` +
          `Every field must be supported by the page text: use null for anything the page does not state, never guess a ` +
          `price, email or rating. Prices must be numbers only (no currency symbols).\n\n` +
          `URL: ${page.url}\nTitle: ${page.title ?? ""}\n` +
          (page.json ? `Structured extraction: ${JSON.stringify(page.json).slice(0, 3000)}\n` : "") +
          `Page content:\n${truncate(page.markdown, PAGE_CHARS)}`,
      });
      if (!object.isVendor) continue;
      // Scraped addresses (mailto links, page text, own-domain first) beat the model's guess.
      const email = page.emails?.[0] ?? nn(object.email)?.toLowerCase();
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

// ---- ranking ----------------------------------------------------------------

const rankingSchema = z.object({
  rankings: z
    .array(
      z.object({
        index: z.number().int().describe("the 1-based number of the vendor in the list"),
        score: z.number().min(0).max(100),
        reason: z
          .string()
          .describe("one sentence naming the actual evidence, e.g. 'highest rated of the six found and $400 under your budget'"),
      }),
    )
    .max(30),
});

/**
 * Score every vendor on a slot from the evidence we actually scraped: rating and review
 * count, price against the slot budget, and fit with the couple's request. Writes
 * `score`, `rankReason` and marks the top three `isTopPick`.
 */
export const rankVendors = internalAction({
  args: { slotId: v.id("vendorSlots") },
  returns: v.number(),
  handler: async (ctx, args): Promise<number> => {
    const slot = await ctx.runQuery(internal.slots.getInternal, { slotId: args.slotId });
    if (!slot) return 0;
    const context = await ctx.runQuery(internal.weddings.getContext, { weddingId: slot.weddingId });
    if (!context) return 0;
    const vendors = await ctx.runQuery(internal.vendors.listForRanking, { slotId: args.slotId });
    if (vendors.length === 0) return 0;

    const currency = context.wedding.currency;
    // How many people this need actually has to cover, so a per-head rate can be
    // compared to the budget honestly instead of being read as a total.
    const guestCount = Math.max(
      0,
      ...context.events.filter((e) => slot.eventIds.includes(e._id)).map((e) => e.guestCount),
    );
    const lines = vendors.map((vendor, i) => {
      const priceCurrency = vendor.priceCurrency ?? currency;
      const unitWord =
        vendor.priceUnit === "per_person"
          ? " per person"
          : vendor.priceUnit === "per_hour"
            ? " per hour"
            : vendor.priceUnit === "per_day"
              ? " per day"
              : "";
      const perHeadTotal =
        vendor.priceUnit === "per_person" && vendor.startingPrice !== undefined && guestCount > 0
          ? ` — about ${formatMoney(vendor.startingPrice * guestCount, priceCurrency)} for ${guestCount} guests`
          : "";
      const price =
        vendor.startingPrice !== undefined
          ? `from ${formatMoney(vendor.startingPrice, priceCurrency)}${unitWord}${perHeadTotal}` +
            (vendor.priceCurrency && vendor.priceCurrency !== currency ? ` (quoted in ${vendor.priceCurrency}, not ${currency})` : "")
          : (vendor.priceNotes ?? "no price published");
      const rating =
        vendor.rating !== undefined
          ? `${vendor.rating}/5 from ${vendor.reviewCount ?? "?"} reviews (${vendor.reviewSource ?? "directory"})`
          : "no public rating found";
      return [
        `${i + 1}. ${vendor.name}${vendor.city ? ` — ${vendor.city}` : ""}${vendor.serviceArea ? ` (serves: ${vendor.serviceArea})` : ""}`,
        `   price: ${price}`,
        `   rating: ${rating}`,
        vendor.reviewHighlights.length ? `   reviewers say: ${vendor.reviewHighlights.slice(0, 4).join("; ")}` : "",
        vendor.highlights.length ? `   site says: ${vendor.highlights.slice(0, 5).join("; ")}` : "",
        vendor.packages.length
          ? `   packages: ${vendor.packages.slice(0, 4).map((p) => `${p.name}${p.price !== undefined ? ` (${p.price})` : ""}`).join(", ")}`
          : "",
        vendor.summary ? `   summary: ${truncate(vendor.summary, 400)}` : "",
        `   contactable: ${vendor.email ? "email found" : vendor.hasContactFormOnly ? "contact form only" : "no contact found"}`,
      ]
        .filter(Boolean)
        .join("\n");
    });

    const { object } = await generateObject({
      model: openai(MODEL_SMART),
      schema: rankingSchema,
      prompt:
        `Rank these ${vendors.length} vendors for a couple's "${slot.title}" (${slot.category}) slot, budget ` +
        `${formatMoney(slot.budget, currency)}, for this wedding:\n${weddingBrief(context.wedding, context.events)}\n\n` +
        `Score each one 0-100 using, in order of weight: (a) rating and how many reviews back it up, ` +
        `(b) price against the ${formatMoney(slot.budget, currency)} budget — under budget is good, no published price is a ` +
        `mild unknown, well over budget is bad, (c) how well what they offer fits the couple's request and style.\n` +
        `Where a price is marked "per person" or "per hour", it is a rate, NOT a total: compare the total shown beside it ` +
        `to the budget, never the rate itself, and call it a per-person rate when you mention it.\n` +
        `A vendor with no public rating must NOT be pushed to the bottom for that alone — judge it on price and fit and say ` +
        `"no public rating found" in its reason.\n` +
        `Every reason must be one sentence that names the real evidence above (a rating, a review count, a price versus the ` +
        `budget, or a specific thing they offer). Never invent a number that is not in the list, and when a rating appears ` +
        `only in the vendor's own summary or highlights rather than on the "rating:" line, call it self-reported. ` +
        `Return one entry per vendor.\n\n` +
        lines.join("\n"),
    });

    const byIndex = new Map<number, { score: number; reason: string }>();
    for (const r of object.rankings) {
      if (!Number.isFinite(r.score) || r.index < 1 || r.index > vendors.length) continue;
      byIndex.set(Math.floor(r.index), { score: Math.max(0, Math.min(100, Math.round(r.score))), reason: r.reason });
    }
    const scored = vendors.map((vendor, i) => {
      const r = byIndex.get(i + 1);
      return {
        vendorId: vendor._id,
        score: r?.score ?? 0,
        rankReason: truncate(r?.reason ?? "Not enough information to rank this vendor yet.", 300),
        ranked: r !== undefined && r.score > 0,
      };
    });
    // Only a vendor the model actually scored can be a top pick — never three arbitrary rows.
    const topThree = new Set(
      scored
        .filter((s) => s.ranked)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((s) => s.vendorId),
    );
    await ctx.runMutation(internal.vendors.applyRanking, {
      slotId: args.slotId,
      rankings: scored.map(({ ranked: _ranked, ...s }) => ({ ...s, isTopPick: topThree.has(s.vendorId) })),
    });
    return scored.length;
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
          "their website says they offer), and sign off with both partners' first names. Subject line under 70 characters.\n" +
          `${toneFor(wedding)}\n` +
          "If the couple named a feel or colours, mention them only where they genuinely help the vendor answer, never as decoration.\n\n" +
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

// ---- the agent's side of the conversation ----------------------------------

/**
 * The line PlusOne never crosses on its own: anything that spends money, commits
 * the couple, or picks between options is theirs to decide.
 */
const AGENT_RULES =
  "Rules you must follow:\n" +
  "- Use only facts in the wedding brief or the couple's own answer. Never invent times, addresses, menus, " +
  "headcounts, names or preferences.\n" +
  "- Never agree to book, sign, pay, place a deposit or hold, or accept a price. Never share phone numbers, " +
  "home addresses or payment details.\n" +
  "- Guests' food needs and allergies are for food and drink vendors only (catering, cake, bar). Share the allergens, " +
  "how many guests and how severe, never a guest's name, and say more RSVPs may still come in.\n" +
  "- Mention money only if they asked about budget or price; then you may share the rough budget given below. " +
  "Never volunteer it.\n" +
  "- Write in the couple's own voice (we, us, our), never about them in the third person.\n" +
  "- Plain text, warm and brief, answering their questions in the order they asked. Sign off with both partners' " +
  "first names. No subject line, no placeholders in brackets.";

/** "around $4,600" reads like a person's budget; "$4,614" reads like a spreadsheet's. */
function roughMoney(amount: number, currency: string): string {
  const step = amount >= 10_000 ? 500 : amount >= 1_000 ? 100 : 10;
  return `around ${formatMoney(Math.round(amount / step) * step, currency)}`;
}

const vendorDecisionSchema = z.object({
  decision: z
    .enum(["answer", "ask_couple", "no_reply_needed"])
    .describe(
      "'answer' when every question can be answered from the brief alone; 'ask_couple' when any part needs a " +
        "decision, a preference, a commitment or a fact the brief does not have; 'no_reply_needed' for thank-yous, " +
        "out-of-office and automatic replies",
    ),
  reply: z.string().describe("when 'answer': the email body to send the vendor; otherwise empty"),
  questionForCouple: z
    .string()
    .describe(
      "when 'ask_couple': the one thing the couple must tell us, in plain words, naming the vendor and quoting " +
        "any options and prices they gave; otherwise empty",
    ),
  reason: z.string().describe("one short line on why, for the couple's activity feed"),
});
export type VendorDecision = z.infer<typeof vendorDecisionSchema>;

/**
 * Decide what to do with a vendor's question: answer it from what PlusOne already
 * knows, ask the couple the one thing only they can say, or let it be.
 */
export const decideVendorReply = internalAction({
  args: {
    weddingId: v.id("weddings"),
    slotTitle: v.string(),
    slotBudget: v.number(),
    vendorName: v.string(),
    /** Earlier emails, oldest first, already formatted. */
    conversation: v.string(),
    latest: v.string(),
  },
  returns: v.object({
    decision: v.union(v.literal("answer"), v.literal("ask_couple"), v.literal("no_reply_needed")),
    reply: v.string(),
    questionForCouple: v.string(),
    reason: v.string(),
  }),
  handler: async (ctx, args): Promise<VendorDecision> => {
    const context = await ctx.runQuery(internal.weddings.getContext, { weddingId: args.weddingId });
    if (!context) throw new Error("Wedding not found");
    const { wedding, events } = context;
    const dietary = await ctx.runQuery(internal.guests.dietarySummary, { weddingId: args.weddingId });
    const { object } = await generateObject({
      model: openai(MODEL_SMART),
      schema: vendorDecisionSchema,
      prompt:
        `You handle email with wedding vendors on behalf of ${wedding.partnerA} & ${wedding.partnerB}. ` +
        `${args.vendorName} (${args.slotTitle}) has just written back. Decide how to respond.\n\n${AGENT_RULES}\n` +
        `${toneFor(wedding)}\n\n${weddingBrief(wedding, events, dietary)}\n` +
        `Rough budget for ${args.slotTitle} (only if they asked): ${roughMoney(args.slotBudget, wedding.currency)}\n\n` +
        (args.conversation ? `Earlier in this conversation:\n${truncate(args.conversation, 6000)}\n\n` : "") +
        `Their latest email:\n${truncate(args.latest, PAGE_CHARS)}`,
    });
    // Belt and braces: an "answer" with nothing to send is really a question for the couple.
    if (object.decision === "answer" && !object.reply.trim()) {
      return { ...object, decision: "ask_couple", questionForCouple: object.questionForCouple || object.reason };
    }
    return object;
  },
});

/** Write the reply once the couple has answered what PlusOne could not. */
export const writeVendorReply = internalAction({
  args: {
    weddingId: v.id("weddings"),
    slotTitle: v.string(),
    slotBudget: v.number(),
    vendorName: v.string(),
    conversation: v.string(),
    latest: v.string(),
    coupleAnswer: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    const context = await ctx.runQuery(internal.weddings.getContext, { weddingId: args.weddingId });
    if (!context) throw new Error("Wedding not found");
    const { wedding, events } = context;
    const dietary = await ctx.runQuery(internal.guests.dietarySummary, { weddingId: args.weddingId });
    const { object } = await generateObject({
      model: openai(MODEL_SMART),
      schema: z.object({ bodyText: z.string() }),
      prompt:
        `You handle email with wedding vendors on behalf of ${wedding.partnerA} & ${wedding.partnerB}. ` +
        `Write to ${args.vendorName} (${args.slotTitle}). Answer anything they asked that is still open, and say what ` +
        `the couple wants said. The couple has told you:\n` +
        `"${truncate(args.coupleAnswer, 2000)}"\nPass that on faithfully; it is the couple's decision, so you may state ` +
        `it, but do not go beyond it.\n\n${AGENT_RULES}\n${toneFor(wedding)}\n\n${weddingBrief(wedding, events, dietary)}\n` +
        `Rough budget for ${args.slotTitle} (only if they asked): ${roughMoney(args.slotBudget, wedding.currency)}\n\n` +
        (args.conversation ? `Earlier in this conversation:\n${truncate(args.conversation, 6000)}\n\n` : "") +
        `Their latest email:\n${truncate(args.latest, PAGE_CHARS)}`,
    });
    return object.bodyText;
  },
});

const PURPOSES = {
  negotiate: (budget: string, quote: string) =>
    `Their quote of ${quote} is above the couple's planned budget of ${budget} for this. Thank them for the quote, say ` +
    `honestly that it is more than planned, and ask whether they have a package or a trimmed-down option that ` +
    `comes closer to ${budget}, and what would change. Warm, not haggling; no ultimatums; do not reject the quote.`,
  confirm: () =>
    `The couple has chosen this vendor. Say they would love to go ahead, and ask what the next steps are to confirm ` +
    `(contract, deposit, anything they need from the couple). Do not agree to any specific payment yourself.`,
  decline: () =>
    `The couple has gone with someone else for this. Thank them sincerely for their time and let them know ` +
    `kindly that the couple has booked another vendor. Two or three sentences. Do not give reasons or name the other vendor.`,
} as const;

/** One of PlusOne's own emails that move a conversation to its end. */
export const writeAgentEmail = internalAction({
  args: {
    weddingId: v.id("weddings"),
    slotTitle: v.string(),
    slotBudget: v.number(),
    vendorName: v.string(),
    conversation: v.string(),
    purpose: v.union(v.literal("negotiate"), v.literal("confirm"), v.literal("decline")),
    quoteTotal: v.optional(v.number()),
  },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    const context = await ctx.runQuery(internal.weddings.getContext, { weddingId: args.weddingId });
    if (!context) throw new Error("Wedding not found");
    const { wedding, events } = context;
    const dietary = await ctx.runQuery(internal.guests.dietarySummary, { weddingId: args.weddingId });
    const budget = roughMoney(args.slotBudget, wedding.currency);
    const task =
      args.purpose === "negotiate"
        ? PURPOSES.negotiate(budget, formatMoney(args.quoteTotal ?? 0, wedding.currency))
        : PURPOSES[args.purpose]();
    const { object } = await generateObject({
      model: openai(MODEL_SMART),
      schema: z.object({ bodyText: z.string() }),
      prompt:
        `You handle email with wedding vendors on behalf of ${wedding.partnerA} & ${wedding.partnerB}. ` +
        `Write to ${args.vendorName} (${args.slotTitle}). ${task}\n\n${AGENT_RULES}\n${toneFor(wedding)}\n\n` +
        `${weddingBrief(wedding, events, dietary)}\n\n` +
        (args.conversation ? `The conversation so far:\n${truncate(args.conversation, 6000)}` : ""),
    });
    return object.bodyText;
  },
});

// ---- inbound ----------------------------------------------------------------

const replySchema = z.object({
  classification: z.enum(["quote", "question", "declined", "available", "other"]),
  total: z.number().nullable().describe("all-in quoted price as a number, null if none"),
  deposit: z.number().nullable(),
  currency: z.string().nullable().describe("ISO code like USD"),
  availability: z.string().nullable().describe("what they said about the dates, in their own words"),
  availableOnDates: z
    .enum(["yes", "no", "unclear"])
    .describe(
      "whether this reply says they are free on the couple's dates: 'yes' only if they confirm those dates, " +
        "'no' if they say they are booked or cannot do them, 'unclear' if they never address the dates",
    ),
  includes: z.array(z.string()).max(12),
  excludes: z.array(z.string()).max(12),
  deadline: z.string().nullable().describe("any quote validity / hold deadline mentioned"),
  summary: z.string().describe("1-2 sentence summary for the couple"),
  redFlags: z.array(z.string()).max(6).describe("non-refundable deposits, vague scope, hidden fees, pressure tactics"),
  attachmentKind: z
    .enum(["none", "quote", "contract", "other"])
    .describe(
      "what the attached PDF is: 'quote' for a quote, estimate, proposal, price list or invoice; 'contract' for an " +
        "agreement to sign; 'other' for brochures, menus or portfolios; 'none' when nothing is attached",
    ),
  pricesFromAttachment: z.boolean().describe("true when the total came from the attached PDF rather than the email text"),
});

type ReplyReading = z.infer<typeof replySchema>;

/** Read a vendor reply, and its PDF when there is one: quotes often live in the attachment, not the email. */
async function readVendorReply(args: {
  wedding: Doc<"weddings">;
  slot: Doc<"vendorSlots"> | null;
  vendorName: string;
  subject: string;
  body: string;
  pdf?: { bytes: ArrayBuffer; filename: string };
}): Promise<ReplyReading> {
  const { wedding, slot } = args;
  const text =
    `A wedding vendor replied to a couple's inquiry. Classify the reply and extract pricing details. ` +
    `The couple's dates are ${wedding.startDate} to ${wedding.endDate}; say whether this reply confirms those dates. ` +
    `Couple's currency is ${wedding.currency}; the slot is ${slot?.title ?? "a vendor slot"} with a budget of ` +
    `${slot ? formatMoney(slot.budget, wedding.currency) : "unknown"}. "quote" = they gave a price, in the email or in the ` +
    `attachment; "question" = they need information from the couple before quoting; "declined" = unavailable or not ` +
    `interested; "available" = available but no price yet.\n` +
    (args.pdf
      ? `They attached a PDF (${args.pdf.filename}). Read it as part of the reply: vendors often put the whole quote, ` +
        `package list or terms in the attachment and write only "please see attached" in the email.\n`
      : "") +
    `\nFrom: ${args.vendorName}\nSubject: ${args.subject}\n\n${truncate(args.body, PAGE_CHARS)}`;
  const { object } = await generateObject({
    model: openai(MODEL_SMART),
    schema: replySchema,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text },
          ...(args.pdf ? [{ type: "file" as const, data: args.pdf.bytes, mediaType: "application/pdf", filename: args.pdf.filename }] : []),
        ],
      },
    ],
  });
  return object;
}

/** The same reading on plain inputs, to check the prompt against sample replies and PDFs. */
export const readVendorReplySample = internalAction({
  args: {
    weddingId: v.id("weddings"),
    vendorName: v.string(),
    subject: v.string(),
    body: v.string(),
    pdfBase64: v.optional(v.string()),
    filename: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<ReplyReading> => {
    const context = await ctx.runQuery(internal.weddings.getContext, { weddingId: args.weddingId });
    if (!context) throw new Error("Wedding not found");
    const bytes = args.pdfBase64 ? Uint8Array.from(atob(args.pdfBase64), (c) => c.charCodeAt(0)).buffer : undefined;
    return await readVendorReply({
      wedding: context.wedding,
      slot: null,
      vendorName: args.vendorName,
      subject: args.subject,
      body: args.body,
      pdf: bytes ? { bytes, filename: args.filename ?? "attachment.pdf" } : undefined,
    });
  },
});

/** Classify + extract a vendor reply, then update quote / thread / budget / activity. */
export const extractReply = internalAction({
  args: { messageId: v.id("messages") },
  returns: v.union(v.object({ classification: replyClassification, total: v.union(v.number(), v.null()) }), v.null()),
  handler: async (ctx, args): Promise<{ classification: ReplyClassification; total: number | null } | null> => {
    const context = await ctx.runQuery(internal.messages.getContext, { messageId: args.messageId });
    if (!context || !context.thread) return null;
    const { message, wedding, thread, vendor, slot } = context;
    // The first PDF is read with the email; a quote often lives only in the attachment.
    const attached = message.attachments.find((f) => f.contentType.includes("pdf") || f.filename.toLowerCase().endsWith(".pdf"));
    const blob = attached ? await ctx.storage.get(attached.storageId) : null;
    const object = await readVendorReply({
      wedding,
      slot,
      vendorName: vendor?.name ?? message.fromAddress,
      subject: message.subject,
      body: message.bodyText,
      pdf: attached && blob ? { bytes: await blob.arrayBuffer(), filename: attached.filename } : undefined,
    });
    if (attached && object.attachmentKind === "contract") {
      await ctx.runMutation(internal.inbound.createContractCheck, {
        weddingId: thread.weddingId,
        storageId: attached.storageId,
        filename: attached.filename,
        vendorId: thread.vendorId,
      });
    }
    const extracted = {
      total: nn(object.total),
      deposit: nn(object.deposit),
      currency: nn(object.currency),
      availability: nn(object.availability),
      availableOnDates: object.availableOnDates,
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
        fromAttachment: attached && object.pricesFromAttachment ? attached.filename : undefined,
      });
    }
    return { classification: object.classification, total: extracted.total ?? null };
  },
});

const rsvpSchema = z.object({
  rsvp: z
    .enum(["yes", "no", "maybe", "pending"])
    .describe(
      "'pending' whenever the email does not actually answer the invitation — a forwarded document, a question, " +
        "a thank-you, small talk, or a note that only mentions food needs are all 'pending'",
    ),
  attendingCount: z.number().int().min(0).max(20),
  dietary: z
    .string()
    .nullable()
    .describe("food preferences only, such as vegetarian, vegan, halal, kosher or no pork; never allergies; null if none"),
  allergies: z
    .array(
      z.object({
        allergen: z.string().describe("the food, in plain words: peanuts, tree nuts, shellfish, gluten, dairy, eggs, sesame…"),
        severity: z
          .enum(["severe", "mild", "unknown"])
          .describe("'severe' for anaphylaxis, EpiPens, 'very allergic', 'can't even be near it'; 'mild' for intolerances"),
        who: z.string().nullable().describe("who has it, if the reply says: 'me', a name, 'my son'"),
      }),
    )
    .describe("every food allergy or intolerance mentioned anywhere in the email, even in passing or in a P.S."),
  note: z.string().nullable().describe("anything else the couple should know, one line"),
});

export type RsvpReading = {
  rsvp: RsvpStatus;
  attendingCount: number;
  dietary?: string;
  allergies: string[];
  note?: string;
};

/** Read one guest reply. Allergies are listed apart, one per entry, so none is lost in a sentence. */
async function readRsvp(
  guest: { name: string; partySize: number; attendingCount: number },
  subject: string,
  body: string,
): Promise<RsvpReading> {
  const { object } = await generateObject({
    model: openai(MODEL_FAST),
    schema: rsvpSchema,
    prompt:
      `A wedding guest replied to an RSVP email. Guest: ${guest.name}, invited for ${guest.partySize}. ` +
      `Work out whether they are coming, how many people are actually attending, their food preferences, and ` +
      `every food allergy or intolerance.\n` +
      `Count the people the reply itself names or implies, and let that override the number they were invited for: ` +
      `"two of us", "me and my husband David" or naming a second person all mean 2, even when the invitation was for ` +
      `one. "Plus one" means 2. Only fall back to the invited number when they say yes without indicating how many. ` +
      `If they are not coming, the count is 0. If the email does not address attendance at all, answer 'pending' and ` +
      `leave the count at ${guest.attendingCount}.\n` +
      `Allergies matter more than anything else here: a missed one can hurt someone. List each one separately, even ` +
      `when it is mentioned in passing, in a P.S., or about someone else in their party. An allergy is not a ` +
      `preference: "vegetarian" goes in dietary, "allergic to peanuts" goes in allergies.\n\n` +
      `Subject: ${subject}\n\n${truncate(body, 6000)}`,
  });
  return {
    rsvp: object.rsvp,
    attendingCount: object.attendingCount,
    dietary: nn(object.dietary),
    allergies: object.allergies.map(
      (a) =>
        `${a.allergen.charAt(0).toUpperCase()}${a.allergen.slice(1)}${a.severity === "severe" ? ", severe" : a.severity === "mild" ? ", mild" : ""}` +
        (a.who && !/^(me|myself|i)$/i.test(a.who.trim()) ? ` (${a.who})` : ""),
    ),
    note: nn(object.note),
  };
}

const rsvpReadingValidator = {
  rsvp: rsvpStatus,
  attendingCount: v.number(),
  dietary: v.optional(v.string()),
  allergies: v.array(v.string()),
  note: v.optional(v.string()),
};

/** The same reading, given plain text; used to check the prompt against sample replies. */
export const readRsvpReply = internalAction({
  args: { guestName: v.string(), partySize: v.number(), subject: v.string(), body: v.string() },
  returns: v.object(rsvpReadingValidator),
  handler: async (_ctx, args): Promise<RsvpReading> =>
    await readRsvp({ name: args.guestName, partySize: args.partySize, attendingCount: 0 }, args.subject, args.body),
});

export const parseRsvp = internalAction({
  args: { messageId: v.id("messages") },
  returns: v.object({ guestId: v.id("guests"), ...rsvpReadingValidator }),
  handler: async (ctx, args): Promise<RsvpReading & { guestId: Id<"guests"> }> => {
    const message = await ctx.runQuery(internal.messages.getInternal, { messageId: args.messageId });
    if (!message || !message.guestId) throw new Error("Message is not a guest reply");
    const context = await ctx.runQuery(internal.guests.getContextForRsvp, { guestId: message.guestId });
    if (!context) throw new Error("Guest not found");
    const { guest } = context;
    return { guestId: guest._id, ...(await readRsvp(guest, message.subject, message.bodyText)) };
  },
});

// ---- assistant ---------------------------------------------------------------

/**
 * What the assistant may offer to do. One flat object rather than a union: structured
 * outputs handle `oneOf` badly, and the codebase already leans on nullable fields.
 */
const proposalSchema = z.object({
  kind: z.enum(["add_guest", "add_need", "research", "set_budget", "add_event", "write_vendor"]),
  label: z.string().describe("one short line naming the action, e.g. 'Add Olivia Carter to the guest list'"),
  why: z.string().nullable().describe("one sentence on why you are offering it, from what they just said"),

  // Which existing thing this is about. Name it EXACTLY as it appears in the plan.
  needTitle: z.string().nullable().describe("for research/set_budget on a need: the exact title of an existing need"),
  vendorName: z.string().nullable().describe("for write_vendor: the exact name of a vendor already being emailed"),
  eventNames: z.array(z.string()).nullable().describe("which days this is for; null means every day"),

  // add_guest
  guestName: z.string().nullable(),
  guestEmail: z.string().nullable(),
  guestSide: z.string().nullable().describe("whose side, when they say"),
  guestPartySize: z.number().nullable().describe("how many people this row covers; 1 unless they say"),

  // add_need
  title: z.string().nullable().describe("for add_need: what to call it, e.g. 'Cake'"),
  category: z.string().nullable().describe("for add_need: a short category, e.g. 'Cake'"),

  // research
  query: z.string().nullable().describe("for research: what to search for, 3 to 300 characters of plain words"),

  // set_budget
  budgetTarget: z
    .enum(["total", "event", "need"])
    .nullable()
    .describe("for set_budget: the wedding total, one day, or one vendor need"),
  eventName: z.string().nullable().describe("for set_budget on a day, and for add_event: the day's name"),
  amount: z.number().nullable().describe("for set_budget: the new amount in the wedding's currency"),

  // add_event
  date: z.string().nullable().describe("for add_event: the date as YYYY-MM-DD"),
  guestCount: z.number().nullable().describe("for add_event: roughly how many people"),
  budgetShare: z.number().nullable().describe("for add_event: roughly what share of the budget; a weight, not an amount"),

  // write_vendor
  message: z.string().nullable().describe("for write_vendor: the email to send, in the couple's voice, signed off"),
  asWritten: z.boolean().nullable().describe("true only when they dictated the exact words to send"),
});

const assistantSchema = z.object({
  answer: z.string().describe("the reply to show the couple, in plain words, 1-5 short paragraphs"),
  proposals: z
    .array(proposalSchema)
    .max(3)
    .describe("things to do for them, only when they clearly asked; otherwise an empty list"),
  remember: z
    .array(z.string().max(160))
    .max(3)
    .describe(
      "things worth remembering that no screen holds: preferences, people, constraints " +
        "('no lilies, her mum is allergic'). Never numbers or vendors already in the plan, and never a whole sentence of chat.",
    ),
});

type Proposal = z.infer<typeof proposalSchema>;
type BoardContext = Awaited<ReturnType<typeof contextFor>>;
async function contextFor(ctx: ActionCtx, weddingId: Id<"weddings">) {
  return await ctx.runQuery(internal.assistant.context, { weddingId });
}

/**
 * Turn what the model named into what the database can act on. A proposal whose target
 * cannot be found never becomes a card — the answer text explains instead.
 */
function resolveProposal(p: Proposal, board: BoardContext): Record<string, unknown> | null {
  const events = (p.eventNames ?? [])
    .map((name) => matchByName(board.events, name, (e) => e.name))
    .filter((e): e is BoardContext["events"][number] => Boolean(e));
  const base = {
    kind: p.kind,
    label: p.label.slice(0, 120),
    why: p.why?.slice(0, 200) ?? null,
    ...(events.length ? { eventIds: events.map((e) => e.eventId), eventNames: events.map((e) => e.name) } : {}),
  };

  switch (p.kind) {
    case "add_guest": {
      const name = p.guestName?.trim();
      if (!name) return null;
      return {
        ...base,
        guestName: name.slice(0, 120),
        guestEmail: p.guestEmail?.trim().toLowerCase() ?? null,
        guestSide: p.guestSide?.slice(0, 60) ?? null,
        guestPartySize: Math.max(1, Math.min(20, Math.floor(p.guestPartySize ?? 1))),
      };
    }
    case "add_need": {
      const title = p.title?.trim() || p.label.replace(/^add (a|an|the)?\s*/i, "").trim();
      if (!title) return null;
      return { ...base, title: title.slice(0, 80), category: (p.category ?? title).trim().slice(0, 60) };
    }
    case "research": {
      const need = matchByName(board.needs, p.needTitle, (n) => n.title);
      if (!need) return null;
      const query = (p.query ?? `${need.category}`).trim();
      if (query.length < 3) return null;
      return {
        ...base,
        slotId: need.slotId,
        slotTitle: need.title,
        query: query.slice(0, 300),
        ...(need.status === "booked" ? { blocked: `${need.title} is already booked.` } : {}),
      };
    }
    case "set_budget": {
      const amount = p.amount;
      if (amount === null || !Number.isFinite(amount) || amount < 0) return null;
      const target = p.budgetTarget ?? (p.needTitle ? "need" : p.eventName ? "event" : "total");
      if (target === "need") {
        const need = matchByName(board.needs, p.needTitle, (n) => n.title);
        if (!need) return null;
        return { ...base, budgetTarget: "need", slotId: need.slotId, slotTitle: need.title, amount };
      }
      if (target === "event") {
        const day = matchByName(board.events, p.eventName, (e) => e.name);
        if (!day) return null;
        return { ...base, budgetTarget: "event", eventId: day.eventId, eventName: day.name, amount };
      }
      return { ...base, budgetTarget: "total", amount };
    }
    case "add_event": {
      const name = (p.eventName ?? p.title)?.trim();
      if (!name || !p.date || !/^\d{4}-\d{2}-\d{2}$/.test(p.date)) return null;
      return {
        ...base,
        eventName: name.slice(0, 80),
        date: p.date,
        guestCount: Math.max(0, Math.floor(p.guestCount ?? 0)),
        budgetShare: Math.max(0, p.budgetShare ?? 0),
      };
    }
    case "write_vendor": {
      const vendor = matchByName(board.vendors, p.vendorName, (t) => t.vendorName);
      const message = p.message?.trim();
      if (!vendor || !message) return null;
      return {
        ...base,
        threadId: vendor.threadId,
        vendorName: vendor.vendorName,
        message: message.slice(0, 4000),
        asWritten: p.asWritten ?? false,
        ...(vendor.hasEmail ? {} : { blocked: `PlusOne has no email address for ${vendor.vendorName} yet.` }),
      };
    }
  }
}

/**
 * Answer one question about this wedding, and offer to do what they asked for.
 *
 * The assistant never acts on its own: anything it can do becomes a card the couple
 * presses. That is the whole guard, so it applies to email too — the words are shown
 * before they go, which is what the vendor screen's confirmation always did.
 */
export const answerQuestion = internalAction({
  args: { weddingId: v.id("weddings"), replyId: v.id("chatMessages") },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    try {
      const wedding = await ctx.runQuery(internal.weddings.getContext, { weddingId: args.weddingId });
      if (!wedding) throw new Error("Wedding not found");
      const board = await contextFor(ctx, args.weddingId);
      const money = (n: number) => formatMoney(n, board.currency);

      const needLines = board.needs
        .map(
          (n) =>
            `- ${n.title} (${n.category}): ${money(n.budget)} planned, ${n.status}` +
            `, ${n.vendorCount} vendor${n.vendorCount === 1 ? "" : "s"} found` +
            (n.bestQuote !== null ? `, best quote ${money(n.bestQuote)}` : ""),
        )
        .join("\n");
      const dayLines = board.events
        .map((e) => `- ${e.name} on ${e.date}, ${e.guestCount} guests, ${money(e.budget)}`)
        .join("\n");
      const vendorLines = board.vendors
        .map((t) => `- ${t.vendorName} (${t.slotTitle}): ${t.state}${t.hasEmail ? "" : ", no email address"}`)
        .join("\n");
      const notes = (wedding.wedding.assistantNotes ?? []).map((n) => `- ${n}`).join("\n");
      const conversation = board.recent.map((m) => `${m.role === "user" ? "Couple" : "You"}: ${m.content}`).join("\n");

      const { object } = await generateObject({
        model: openai(MODEL_SMART),
        schema: assistantSchema,
        prompt:
          `You are PlusOne, a calm and competent wedding planning assistant talking to the couple whose plan is below. ` +
          `Answer from their plan first; you may add general knowledge about weddings and traditions, but never invent ` +
          `numbers, vendors, guests or quotes that are not in the plan. Be warm and brief, use plain words, and give one ` +
          `clear next step when there is one.\n\n` +
          `You can offer to do six things, as proposals: add a guest, add a vendor need, search the web for vendors for ` +
          `an existing need, change a budget (the total, one day, or one need), add a day to the plan, or write to a ` +
          `vendor you are already emailing. You never do any of them yourself — each becomes a card the couple presses ` +
          `to confirm, and they can edit it first. Only propose what they clearly asked for, at most two or three at a ` +
          `time, and say in one line what you are offering. Name an existing need, day or vendor EXACTLY as it appears ` +
          `below, or the card cannot be made.\n` +
          `For a vendor email, write the whole message in their voice, signed off with both first names.\n\n` +
          `${weddingBrief(wedding.wedding, wedding.events)}\n\n` +
          `Days:\n${dayLines || "(none yet)"}\n\n` +
          `Vendor needs:\n${needLines || "(none yet)"}\n\n` +
          `Vendors you are emailing:\n${vendorLines || "(none yet)"}\n\n` +
          `Guests: ${board.guests.total} on the list, ${board.guests.yes} coming, ${board.guests.pending} yet to reply.\n` +
          `Committed so far: ${money(board.committed)} of ${money(board.totalBudget)}.\n` +
          (notes ? `\nThings they have told you to remember:\n${notes}\n` : "") +
          `\nConversation so far:\n${conversation}`,
      });

      // Resolved here, where the plan is in hand: a card can only ever point at
      // something that exists. Anything unresolvable is dropped, not shown.
      const toolCalls = object.proposals
        .slice(0, 3)
        .map((p) => resolveProposal(p, board))
        .filter((p): p is Record<string, unknown> => p !== null)
        .map((p) => ({
          name: "propose",
          args: p,
          status: p.blocked ? "error" : "proposed",
          ...(p.blocked ? { result: { done: String(p.blocked), at: Date.now() } } : {}),
        }));

      if (object.remember.length > 0) {
        await ctx.runMutation(internal.assistant.remember, {
          weddingId: args.weddingId,
          notes: object.remember.map((n) => n.slice(0, 160)),
        });
      }

      await ctx.runMutation(internal.assistant.finishReply, {
        replyId: args.replyId,
        content: object.answer,
        status: "done",
        toolCalls: toolCalls.length ? toolCalls : undefined,
      });
    } catch (err) {
      console.warn("assistant failed", err instanceof Error ? err.message : err);
      await ctx.runMutation(internal.assistant.finishReply, {
        replyId: args.replyId,
        content: "Something went wrong answering that. Try asking again in a moment.",
        status: "error",
      });
    }
    return null;
  },
});
const contractSchema = z.object({
  summary: z.string().describe("two or three plain sentences: what this agreement commits the couple to"),
  flags: z
    .array(
      z.object({
        severity: z.enum(["low", "medium", "high"]),
        clause: z.string().describe("the sentence or phrase from the contract, quoted, that this is about"),
        why: z.string().describe("one plain sentence on what it means for the couple"),
      }),
    )
    .max(8),
});

/**
 * Read a forwarded contract and say plainly what is worth knowing.
 *
 * Every flag has to quote the sentence it came from: a red flag nobody can trace back
 * to the page is worse than no flag at all, because the couple cannot check it.
 */
export const checkContract = internalAction({
  args: { contractCheckId: v.id("contractChecks") },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const check = await ctx.runQuery(internal.inbound.getContractCheck, { contractCheckId: args.contractCheckId });
    if (!check) return null;
    try {
      const blob = await ctx.storage.get(check.storageId);
      if (!blob) throw new Error("The forwarded file is no longer stored");
      const bytes = await blob.arrayBuffer();

      const { object } = await generateObject({
        model: openai(MODEL_SMART),
        schema: contractSchema,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  `This is a wedding vendor contract a couple forwarded to their planning inbox. Write a short plain-English ` +
                  `summary, then flag what they should know before signing: cancellation rules, what happens if they move the ` +
                  `date, overtime charges, the deposit and whether it is refundable, and what happens if the vendor cannot ` +
                  `attend. Quote the exact sentence each flag comes from — never paraphrase it into the clause field, and ` +
                  `never flag something the document does not say. If the document is not a contract, say so in the summary ` +
                  `and return no flags.`,
              },
              { type: "file", data: bytes, mediaType: "application/pdf", filename: check.filename },
            ],
          },
        ],
      });

      await ctx.runMutation(internal.inbound.finishContractCheck, {
        contractCheckId: args.contractCheckId,
        status: "done",
        summary: object.summary,
        flags: object.flags,
      });
    } catch (err) {
      console.warn("contract check failed", err instanceof Error ? err.message : err);
      await ctx.runMutation(internal.inbound.finishContractCheck, {
        contractCheckId: args.contractCheckId,
        status: "failed",
        summary: "This file could not be read. Open it yourself, or forward it again.",
        flags: [],
      });
    }
    return null;
  },
});
