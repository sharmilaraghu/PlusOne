import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type MutationCtx } from "./_generated/server";
import { setCommittedForSlotHelper } from "./budget";
import { logActivity, requireUserId } from "./lib/auth";
import { addDays } from "./lib/text";
import { insertWedding } from "./weddings";

/**
 * A guest's sample wedding: built exactly like a real one, then filled in as if
 * PlusOne had been working on it for a couple of weeks, so every screen has
 * something true to show. Every vendor is fictional and uses the reserved
 * `.example` domain, and email on a demo wedding is simulated, never sent.
 */

const DAY = 86_400_000;

type SeedVendor = {
  name: string;
  handle: string;
  city: string;
  startingPrice: number;
  priceNotes: string;
  highlights: string[];
  summary: string;
  score: number;
  rankReason: string;
  isTopPick?: boolean;
  rating?: number;
  reviewCount?: number;
};

async function addVendor(
  ctx: MutationCtx,
  weddingId: Id<"weddings">,
  slot: Doc<"vendorSlots">,
  seed: SeedVendor,
  now: number,
): Promise<Id<"vendors">> {
  return await ctx.db.insert("vendors", {
    weddingId,
    slotId: slot._id,
    name: seed.name,
    email: `hello@${seed.handle}.example`,
    city: seed.city,
    category: slot.category,
    startingPrice: seed.startingPrice,
    priceUnit: "total",
    priceCurrency: "USD",
    priceNotes: seed.priceNotes,
    packages: [],
    highlights: seed.highlights,
    sourceUrls: [],
    summary: seed.summary,
    shortlisted: seed.isTopPick ?? false,
    scrapedAt: now - 12 * DAY,
    rating: seed.rating,
    reviewCount: seed.reviewCount,
    reviewSource: seed.rating ? "Sample reviews" : undefined,
    reviewHighlights: [],
    score: seed.score,
    rankReason: seed.rankReason,
    isTopPick: seed.isTopPick ?? false,
    pagesRead: [],
  });
}

async function researched(ctx: MutationCtx, weddingId: Id<"weddings">, slot: Doc<"vendorSlots">, query: string, found: number, at: number) {
  await ctx.db.insert("researchRuns", {
    weddingId,
    slotId: slot._id,
    query,
    status: "done",
    step: "Done",
    foundCount: found,
    startedAt: at,
    finishedAt: at + 2 * 60_000,
  });
}

type Mail = { dir: "in" | "out"; kind: Doc<"messages">["kind"]; body: string; at: number };

/** A thread with its emails, oldest first. Returns the thread and the id of each email. */
async function conversation(
  ctx: MutationCtx,
  weddingId: Id<"weddings">,
  slot: Doc<"vendorSlots">,
  vendorId: Id<"vendors">,
  vendorEmail: string,
  subject: string,
  mails: Mail[],
  thread: Partial<Doc<"threads">>,
): Promise<{ threadId: Id<"threads">; messageIds: Id<"messages">[] }> {
  const lastOut = [...mails].reverse().find((m) => m.dir === "out");
  const lastIn = [...mails].reverse().find((m) => m.dir === "in");
  const threadId = await ctx.db.insert("threads", {
    weddingId,
    vendorId,
    slotId: slot._id,
    status: "sent",
    followUpCount: 0,
    lastOutboundAt: lastOut?.at,
    lastInboundAt: lastIn?.at,
    ...thread,
  });
  const messageIds: Id<"messages">[] = [];
  for (const [i, m] of mails.entries()) {
    messageIds.push(
      await ctx.db.insert("messages", {
        weddingId,
        threadId,
        direction: m.dir,
        kind: m.kind,
        status: m.dir === "in" ? "received" : "sent",
        fromAddress: m.dir === "in" ? vendorEmail : "",
        toAddress: m.dir === "in" ? "" : vendorEmail,
        subject: i === 0 ? subject : `Re: ${subject}`,
        bodyText: m.body,
        attachments: [],
        ...(m.dir === "in" ? { receivedAt: m.at } : { sentAt: m.at }),
      }),
    );
  }
  return { threadId, messageIds };
}

/** Sign-off on every email PlusOne writes for the sample couple. */
const SIGN = "\n\nWarmly,\nEmma & James";

async function seedDemo(ctx: MutationCtx, userId: Id<"users">): Promise<Id<"weddings">> {
  const now = Date.now();
  const start = addDays(new Date(now).toISOString().slice(0, 10), 270);
  const weddingId = await insertWedding(
    ctx,
    userId,
    {
      name: "Emma & James",
      partnerA: "Emma",
      partnerB: "James",
      startDate: start,
      endDate: addDays(start, 1),
      city: "Austin",
      area: "Hill Country",
      country: "United States",
      currency: "USD",
      totalBudget: 40000,
      template: "western",
      styleVibes: ["Outdoors", "Candlelit", "Relaxed"],
      stylePalette: "Sage, cream and warm brass",
      styleFormality: "smart",
    },
    { demo: true },
  );
  await ctx.db.patch(weddingId, {
    styleSummary:
      "A relaxed Hill Country evening: long candlelit tables under the oaks, sage and cream with warm brass accents, " +
      "loose garden florals, and smart-casual dress rather than black tie.",
  });

  const slots = await ctx.db
    .query("vendorSlots")
    .withIndex("by_weddingId", (q) => q.eq("weddingId", weddingId))
    .take(40);
  const slot = (title: string) => slots.find((s) => s.title === title)!;
  const venue = slot("Venue");
  const catering = slot("Catering");
  const photo = slot("Photography & Video");
  const florals = slot("Decor & Florals");
  const dateText = new Date(`${start}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

  // ---- Venue: chosen and confirmed; the runner-up thanked. ----------------------
  await researched(ctx, weddingId, venue, "Outdoor wedding venue near Austin for 120 guests", 2, now - 13 * DAY);
  const oak = await addVendor(ctx, weddingId, venue, {
    name: "The Oak Barn at Driftwood", handle: "oakbarn-driftwood", city: "Driftwood, TX", startingPrice: 11500,
    priceNotes: "Saturday evening, ceremony and reception", highlights: ["Ceremony lawn under live oaks", "Holds 150 seated", "Tables and string lights included"],
    summary: "A restored barn with an oak-shaded lawn, 35 minutes from downtown.", score: 93, rankReason: "Fits 120 guests with room, and the lawn suits an outdoor candlelit ceremony.", isTopPick: true, rating: 4.9, reviewCount: 212,
  }, now);
  const river = await addVendor(ctx, weddingId, venue, {
    name: "Riverside Pavilion", handle: "riverside-pavilion", city: "Austin, TX", startingPrice: 13800,
    priceNotes: "Friday or Sunday discounts", highlights: ["On the river", "In-house catering required"],
    summary: "A riverside pavilion with its own catering team.", score: 81, rankReason: "Lovely setting, but in-house catering pushes it over budget.", rating: 4.6, reviewCount: 98,
  }, now);
  const oakMail = await conversation(ctx, weddingId, venue, oak, "hello@oakbarn-driftwood.example", `Wedding on ${dateText}, 120 guests`, [
    { dir: "out", kind: "inquiry", at: now - 12 * DAY, body: `Hi there,\n\nWe're getting married on ${dateText} and would love to hold the ceremony and reception at the Oak Barn: about 120 guests, outdoors if the weather allows. Are you free that evening, and what would it cost?${SIGN}` },
    { dir: "in", kind: "vendor_reply", at: now - 11 * DAY, body: `Hi Emma and James,\n\nCongratulations! ${dateText} is open. Our Saturday package is $12,000 for the evening, including the ceremony lawn, the barn, tables, chairs and string lights. A $3,000 deposit holds the date.\n\nBest,\nMaria, The Oak Barn` },
    { dir: "out", kind: "booking_confirmation", at: now - 6 * DAY, body: `Hi Maria,\n\nThank you so much. We'd love to go ahead with the Oak Barn. Could you let us know the next steps to confirm: the contract, the deposit, and anything you need from us?${SIGN}` },
  ], { status: "booked" });
  await ctx.db.insert("quotes", {
    weddingId, slotId: venue._id, vendorId: oak, threadId: oakMail.threadId, messageId: oakMail.messageIds[1],
    total: 12000, deposit: 3000, currency: "USD", includes: ["Ceremony lawn", "Barn reception", "Tables and chairs", "String lights"], excludes: ["Catering", "Bar service"],
    redFlags: [], summary: "Evening package with ceremony lawn and barn, $3,000 deposit to hold the date.",
  });
  await conversation(ctx, weddingId, venue, river, "hello@riverside-pavilion.example", `Wedding on ${dateText}, 120 guests`, [
    { dir: "out", kind: "inquiry", at: now - 12 * DAY, body: `Hi there,\n\nWe're planning a wedding for about 120 guests on ${dateText} and wondered whether the pavilion is free, and what it would cost.${SIGN}` },
    { dir: "in", kind: "vendor_reply", at: now - 10 * DAY, body: `Hello! We have availability. Venue hire is $6,800, and our in-house catering starts at $58 per person.\n\nKind regards,\nRiverside Pavilion Events` },
    { dir: "out", kind: "no_thanks", at: now - 6 * DAY, body: `Hi there,\n\nThank you so much for your time and the details. We've decided to go with another venue, but we really appreciated your help.${SIGN}` },
  ], { status: "declined" });
  await ctx.db.patch(venue._id, { status: "booked", bookedVendorId: oak });
  await setCommittedForSlotHelper(ctx, venue._id, 12000);

  // ---- Photography: one within budget, one over it and asked about. -------------
  await researched(ctx, weddingId, photo, "Wedding photographer in Austin, natural candid style", 3, now - 10 * DAY);
  const golden = await addVendor(ctx, weddingId, photo, {
    name: "Golden Hour Photo Co.", handle: "goldenhour-photo", city: "Austin, TX", startingPrice: 3600,
    priceNotes: "8 hours, online gallery", highlights: ["Candid, documentary style", "Second shooter available", "Gallery in 6 weeks"],
    summary: "A husband-and-wife team known for relaxed, candid wedding days.", score: 91, rankReason: "Candid style suits a relaxed day, and the full day fits the budget.", isTopPick: true, rating: 4.9, reviewCount: 147,
  }, now);
  const barton = await addVendor(ctx, weddingId, photo, {
    name: "Barton Creek Studios", handle: "bartoncreek-studios", city: "Austin, TX", startingPrice: 5500,
    priceNotes: "Photo and film packages", highlights: ["Photo and film together", "Drone footage"],
    summary: "A studio offering photography and film as one package.", score: 84, rankReason: "Beautiful film work, but the combined package runs over budget.", rating: 4.8, reviewCount: 89,
  }, now);
  await addVendor(ctx, weddingId, photo, {
    name: "Lumen & Lace", handle: "lumen-lace", city: "San Marcos, TX", startingPrice: 2900,
    priceNotes: "6 hours", highlights: ["Film photography", "Small weddings"],
    summary: "A film photographer who works mostly with smaller weddings.", score: 77, rankReason: "Lovely film look; six hours may not cover the whole evening.",
  }, now);
  const goldenMail = await conversation(ctx, weddingId, photo, golden, "hello@goldenhour-photo.example", `Photography for ${dateText}`, [
    { dir: "out", kind: "inquiry", at: now - 9 * DAY, body: `Hi there,\n\nWe're getting married at the Oak Barn at Driftwood on ${dateText}, with about 120 guests. We love your candid style. Are you available, and what would a full day cost?${SIGN}` },
    { dir: "in", kind: "vendor_reply", at: now - 8 * DAY, body: `Hi both! We'd love to shoot at the Oak Barn. We're free on ${dateText}. Our full-day collection is $3,900: eight hours, a second shooter, and your online gallery. A $1,000 retainer books the date.\n\nTalk soon,\nSam & Priya` },
  ], { status: "quoted" });
  await ctx.db.insert("quotes", {
    weddingId, slotId: photo._id, vendorId: golden, threadId: goldenMail.threadId, messageId: goldenMail.messageIds[1],
    total: 3900, deposit: 1000, currency: "USD", includes: ["8 hours", "Second shooter", "Online gallery"], excludes: ["Printed album"],
    redFlags: [], summary: "Full day with a second shooter for $3,900; $1,000 retainer.",
  });
  const bartonMail = await conversation(ctx, weddingId, photo, barton, "hello@bartoncreek-studios.example", `Photography for ${dateText}`, [
    { dir: "out", kind: "inquiry", at: now - 9 * DAY, body: `Hi there,\n\nWe're getting married on ${dateText} near Austin, with about 120 guests, and would love to know if you're available and what photography would cost.${SIGN}` },
    { dir: "in", kind: "vendor_reply", at: now - 7 * DAY, body: `Hello Emma and James,\n\nWe're available! Our Signature photo and film package is $6,200, including a highlight film and drone coverage. A 50% non-refundable deposit secures the date.\n\nBarton Creek Studios` },
    { dir: "out", kind: "negotiation", at: now - 7 * DAY + 3_600_000, body: `Hi there,\n\nThank you for the package details. It looks beautiful. $6,200 is more than we'd planned for photography; we were hoping to stay around $4,500. Do you have a photo-only or shorter option that comes closer, and what would change?${SIGN}` },
  ], { status: "sent", negotiatedAt: now - 7 * DAY + 3_600_000, nextFollowUpAt: now + 2 * DAY });
  await ctx.db.insert("quotes", {
    weddingId, slotId: photo._id, vendorId: barton, threadId: bartonMail.threadId, messageId: bartonMail.messageIds[1],
    total: 6200, deposit: 3100, currency: "USD", includes: ["Photography", "Highlight film", "Drone coverage"], excludes: [],
    redFlags: ["50% deposit is non-refundable"], summary: "Photo and film package for $6,200, over the planned budget.",
  });
  await ctx.db.patch(photo._id, { status: "quoted" });

  // ---- Catering: one answered by PlusOne, one that needs the couple. ------------
  await researched(ctx, weddingId, catering, "Wedding caterer Austin Hill Country, 120 guests", 2, now - 8 * DAY);
  const hill = await addVendor(ctx, weddingId, catering, {
    name: "Hill Country Table", handle: "hillcountry-table", city: "Dripping Springs, TX", startingPrice: 68,
    priceNotes: "Per person, family style or plated", highlights: ["Local, seasonal menus", "Works at the Oak Barn often"],
    summary: "Seasonal Texas cooking, served family style or plated.", score: 90, rankReason: "Knows the venue well, and family style suits long tables.", isTopPick: true, rating: 4.8, reviewCount: 176,
  }, now);
  const salt = await addVendor(ctx, weddingId, catering, {
    name: "Salt & Smoke Catering", handle: "saltandsmoke", city: "Austin, TX", startingPrice: 55,
    priceNotes: "Per person, BBQ buffet", highlights: ["Texas BBQ", "Late-night tacos add-on"],
    summary: "A barbecue caterer with a late-night taco truck.", score: 83, rankReason: "Relaxed and good value; buffet only.", rating: 4.7, reviewCount: 231,
  }, now);
  await conversation(ctx, weddingId, catering, hill, "hello@hillcountry-table.example", `Catering for ${dateText}, 120 guests`, [
    { dir: "out", kind: "inquiry", at: now - 7 * DAY, body: `Hi there,\n\nWe're getting married at the Oak Barn on ${dateText} with about 120 guests, and would love to talk about catering the reception.${SIGN}` },
    { dir: "in", kind: "vendor_reply", at: now - 1 * DAY, body: `Hi Emma and James,\n\nWe'd love to cook for you, and we know the Oak Barn well. Before I put numbers together: would you like a plated dinner or family style? Family style is $68 a head and plated is $82. And are there any dietary needs we should plan around?\n\nThanks,\nLuis, Hill Country Table` },
  ], {
    status: "needs_attention",
    attentionReason: "vendor_question",
    pendingQuestion: "Hill Country Table asks whether you'd like a plated dinner ($82 a head) or family style ($68 a head), and whether there are any dietary needs they should plan around.",
  });
  await conversation(ctx, weddingId, catering, salt, "hello@saltandsmoke.example", `Catering for ${dateText}, 120 guests`, [
    { dir: "out", kind: "inquiry", at: now - 7 * DAY, body: `Hi there,\n\nWe're planning a relaxed wedding near Austin and would love to hear about your catering.${SIGN}` },
    { dir: "in", kind: "vendor_reply", at: now - 5 * DAY, body: `Hey! Thanks for reaching out. What's the date, where's the venue, and roughly how many guests?\n\nSalt & Smoke` },
    { dir: "out", kind: "agent_reply", at: now - 5 * DAY + 600_000, body: `Hi there,\n\nThanks for getting back to us! The wedding is on ${dateText} at the Oak Barn at Driftwood, with about 120 guests at the reception.${SIGN}` },
  ], { status: "sent", nextFollowUpAt: now + 1 * DAY });
  await ctx.db.patch(catering._id, { status: "contacted" });

  // ---- Florals: researched and ranked, not contacted yet. ------------------------
  await researched(ctx, weddingId, florals, "Wedding florist Austin, loose garden style, sage and cream", 3, now - 2 * DAY);
  for (const f of [
    { name: "Wildflower & Wren", handle: "wildflower-wren", city: "Austin, TX", startingPrice: 3800, priceNotes: "Full wedding florals", highlights: ["Loose, garden-style arrangements", "Candle and table styling"], summary: "Garden-style florals with a soft, natural look.", score: 92, rankReason: "Their loose garden style matches the sage and cream palette.", isTopPick: true, rating: 4.9, reviewCount: 64 },
    { name: "Bluebonnet Blooms", handle: "bluebonnet-blooms", city: "Austin, TX", startingPrice: 2900, priceNotes: "Ceremony and centrepieces", highlights: ["Local Texas flowers"], summary: "A local florist using Texas-grown flowers.", score: 85, rankReason: "Good value and local flowers; a little more formal in style.", rating: 4.7, reviewCount: 41 },
    { name: "Brass & Petal Studio", handle: "brass-petal", city: "Round Rock, TX", startingPrice: 4600, priceNotes: "Florals and decor hire", highlights: ["Brass candlesticks and decor hire"], summary: "Florals plus decor hire, including brass candlesticks.", score: 80, rankReason: "Brings the brass accents, but runs above the planned budget." },
  ]) {
    await addVendor(ctx, weddingId, florals, f, now);
  }

  // ---- Guests: some answered in plain words, some still to reply. ---------------
  const events = await ctx.db
    .query("events")
    .withIndex("by_weddingId", (q) => q.eq("weddingId", weddingId))
    .take(10);
  const all = events.map((e) => e._id);
  const party = events.filter((e) => e.name !== "Rehearsal Dinner").map((e) => e._id);
  const guests: Array<[string, string, number, Doc<"guests">["rsvp"], number, string | undefined, string[], boolean]> = [
    ["Olivia Carter", "Emma", 2, "yes", 2, "One vegetarian", [], true],
    ["Noah Bennett", "James", 1, "yes", 1, undefined, ["Shellfish, mild"], true],
    ["Ava & Liam Brooks", "Emma", 4, "yes", 3, undefined, ["Tree nuts, severe (Leo)"], false],
    ["Sophia Nguyen", "Emma", 2, "no", 0, undefined, [], false],
    ["Mason Reed", "James", 2, "yes", 2, "Vegetarian (his wife)", ["Gluten, severe"], false],
    ["Isabella Diaz", "Emma", 1, "maybe", 0, undefined, [], false],
    ["Ethan Park", "James", 2, "pending", 0, undefined, [], false],
    ["Grace Whitfield", "Emma", 2, "pending", 0, undefined, [], true],
    ["Lucas Moreno", "James", 1, "yes", 1, undefined, ["Peanuts, severe"], false],
    ["Chloe Anders", "Emma", 2, "pending", 0, undefined, [], false],
  ];
  for (const [name, side, partySize, rsvp, attendingCount, dietary, allergies, rehearsal] of guests) {
    await ctx.db.insert("guests", {
      weddingId,
      name,
      email: `${name.split(" ")[0].toLowerCase()}@guests.example`,
      side,
      partySize,
      rsvp,
      attendingCount,
      dietary,
      ...(allergies.length ? { allergies } : {}),
      eventIds: rehearsal ? all : party,
      lastInvitedAt: now - 9 * DAY,
    });
  }

  // ---- What the activity feed would have shown along the way. --------------------
  for (const text of [
    "PlusOne found 2 venues and ranked them for 120 guests outdoors.",
    "PlusOne emailed 2 venues, 3 photographers and 2 caterers from your wedding inbox.",
    "The Oak Barn at Driftwood quoted $12,000; Golden Hour Photo Co. quoted $3,900.",
    "Barton Creek Studios quoted $6,200, over budget, so PlusOne asked whether they have something closer to $4,500.",
    "PlusOne answered Salt & Smoke's questions about the date, venue and guest count.",
    "You booked The Oak Barn at Driftwood. PlusOne confirmed with them and thanked Riverside Pavilion.",
    "5 guests have replied. Lucas Moreno has a severe peanut allergy, and Leo Brooks a severe tree nut allergy.",
    "Hill Country Table needs an answer from you: plated or family style, and any dietary needs.",
  ]) {
    await logActivity(ctx, { weddingId, actorLabel: "PlusOne", type: "note", text });
  }
  return weddingId;
}

/** Sign-in as a guest lands here: their sample wedding, made on first visit. */
export const start = mutation({
  args: {},
  returns: v.id("weddings"),
  handler: async (ctx): Promise<Id<"weddings">> => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("members")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (existing) return existing.weddingId;
    return await seedDemo(ctx, userId);
  },
});
