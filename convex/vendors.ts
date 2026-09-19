import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { logActivity, requireMember } from "./lib/auth";
import { messageDoc, quoteDoc, threadDoc, vendorDoc, vendorSlotDoc } from "./lib/docs";
import { canonicalWebsite, hostOf } from "./lib/text";
import { vendorCardValidator } from "./lib/validators";

export const listBySlot = query({
  args: { slotId: v.id("vendorSlots") },
  returns: v.array(vendorDoc),
  handler: async (ctx, args) => {
    const slot = await ctx.db.get(args.slotId);
    if (!slot) throw new ConvexError("Slot not found.");
    await requireMember(ctx, slot.weddingId);
    // by_slotId_and_score, descending: highest score first, unscored vendors last.
    const vendors = await ctx.db
      .query("vendors")
      .withIndex("by_slotId_and_score", (q) => q.eq("slotId", args.slotId))
      .order("desc")
      .take(100);
    // Top picks first, then score, then anything the couple shortlisted by hand.
    return vendors.sort(
      (a, b) =>
        Number(b.isTopPick ?? false) - Number(a.isTopPick ?? false) ||
        (b.score ?? -1) - (a.score ?? -1) ||
        Number(b.shortlisted) - Number(a.shortlisted) ||
        b._creationTime - a._creationTime,
    );
  },
});

export const get = query({
  args: { vendorId: v.id("vendors") },
  returns: v.union(
    v.object({
      vendor: vendorDoc,
      slot: v.union(vendorSlotDoc, v.null()),
      thread: v.union(threadDoc, v.null()),
      quotes: v.array(quoteDoc),
      messages: v.array(messageDoc),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) return null;
    await requireMember(ctx, vendor.weddingId);
    const slot = vendor.slotId ? await ctx.db.get(vendor.slotId) : null;
    const thread = await ctx.db
      .query("threads")
      .withIndex("by_vendorId", (q) => q.eq("vendorId", args.vendorId))
      .first();
    const quotes = await ctx.db
      .query("quotes")
      .withIndex("by_vendorId", (q) => q.eq("vendorId", args.vendorId))
      .order("desc")
      .take(20);
    const messages = thread
      ? await ctx.db
          .query("messages")
          .withIndex("by_threadId", (q) => q.eq("threadId", thread._id))
          .order("desc")
          .take(10)
      : [];
    return { vendor, slot, thread, quotes, messages: messages.reverse() };
  },
});

export const toggleShortlist = mutation({
  args: { vendorId: v.id("vendors") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) throw new ConvexError("Vendor not found.");
    await requireMember(ctx, vendor.weddingId, "planner");
    const next = !vendor.shortlisted;
    await ctx.db.patch(args.vendorId, { shortlisted: next });
    return next;
  },
});

export const setEmail = mutation({
  args: { vendorId: v.id("vendors"), email: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) throw new ConvexError("Vendor not found.");
    await requireMember(ctx, vendor.weddingId, "planner");
    const email = args.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ConvexError("That does not look like an email address.");
    await ctx.db.patch(args.vendorId, { email });
    return null;
  },
});

export const addManual = mutation({
  args: {
    weddingId: v.id("weddings"),
    slotId: v.id("vendorSlots"),
    name: v.string(),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  returns: v.id("vendors"),
  handler: async (ctx, args) => {
    const { userId } = await requireMember(ctx, args.weddingId, "planner");
    const slot = await ctx.db.get(args.slotId);
    if (!slot || slot.weddingId !== args.weddingId) throw new ConvexError("Slot does not belong to this wedding.");
    const email = args.email?.trim().toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ConvexError("That does not look like an email address.");
    const website = args.website ? (canonicalWebsite(args.website) ?? undefined) : undefined;
    const vendorId = await ctx.db.insert("vendors", {
      weddingId: args.weddingId,
      slotId: args.slotId,
      name: args.name.trim(),
      website,
      email: email || undefined,
      category: slot.category,
      packages: [],
      highlights: [],
      sourceUrls: args.website ? [args.website] : [],
      reviewHighlights: [],
      pagesRead: [],
      shortlisted: true,
      scrapedAt: Date.now(),
    });
    await logActivity(ctx, {
      weddingId: args.weddingId,
      actorUserId: userId,
      type: "vendor_found",
      text: `added ${args.name.trim()} manually to ${slot.title}.`,
      refs: { slotId: args.slotId, vendorId },
    });
    return vendorId;
  },
});

// ---- internal ---------------------------------------------------------------

export const getInternal = internalQuery({
  args: { vendorId: v.id("vendors") },
  returns: v.union(vendorDoc, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.vendorId);
  },
});

export const getMany = internalQuery({
  args: { vendorIds: v.array(v.id("vendors")) },
  returns: v.array(vendorDoc),
  handler: async (ctx, args) => {
    const out = [];
    for (const id of args.vendorIds.slice(0, 50)) {
      const vendor = await ctx.db.get(id);
      if (vendor) out.push(vendor);
    }
    return out;
  },
});

/** Accepts an email only when it looks like one; the same check the couple's own input gets. */
function validEmail(email: string | undefined): string | undefined {
  const value = email?.trim().toLowerCase();
  if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return undefined;
  return value;
}

/** Insert or refresh vendor cards. Dedupes on the canonical website host, within one slot. Returns the number of NEW vendors. */
export const upsertMany = internalMutation({
  args: {
    weddingId: v.id("weddings"),
    slotId: v.id("vendorSlots"),
    cards: v.array(vendorCardValidator),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const slot = await ctx.db.get(args.slotId);
    if (!slot) return 0;
    let created = 0;
    for (const card of args.cards.slice(0, 20)) {
      const website = canonicalWebsite(card.website);
      const fields = {
        weddingId: args.weddingId,
        slotId: args.slotId,
        name: card.name.trim().slice(0, 120),
        website: website ?? undefined,
        email: validEmail(card.email),
        phone: card.phone,
        city: card.city,
        category: slot.category,
        startingPrice: card.startingPrice,
        priceUnit: card.priceUnit,
        priceCurrency: card.priceCurrency,
        priceNotes: card.priceNotes,
        packages: card.packages.slice(0, 10),
        capacity: card.capacity,
        ratingText: card.ratingText,
        serviceArea: card.serviceArea,
        highlights: card.highlights.slice(0, 8),
        sourceUrls: card.sourceUrls.slice(0, 10),
        summary: card.summary,
        rating: card.rating,
        reviewCount: card.reviewCount,
        reviewSource: card.reviewSource,
        reviewHighlights: (card.reviewHighlights ?? []).slice(0, 4),
        contactFormUrl: card.contactFormUrl,
        hasContactFormOnly: card.hasContactFormOnly,
        pagesRead: (card.pagesRead ?? []).slice(0, 5),
        scrapedAt: Date.now(),
      };
      const match = website
        ? await ctx.db
            .query("vendors")
            .withIndex("by_weddingId_and_website", (q) => q.eq("weddingId", args.weddingId).eq("website", website))
            .first()
        : null;
      // The same business can legitimately fill two slots (photo + video): only merge within one slot.
      const existing = match && (match.slotId === undefined || match.slotId === args.slotId) ? match : null;
      if (existing) {
        // Keep anything the couple typed in by hand (email) if the scrape found none.
        // `patch` deletes a field set to undefined, so drop every empty value: a pass that
        // fails to re-find a price or an email must never erase what an earlier pass proved.
        const patch: Record<string, unknown> = { slotId: existing.slotId ?? args.slotId };
        for (const [key, value] of Object.entries(fields)) {
          if (value === undefined) continue;
          if (Array.isArray(value) && value.length === 0) continue;
          patch[key] = value;
        }
        await ctx.db.patch(existing._id, patch);
      } else {
        const vendorId = await ctx.db.insert("vendors", { ...fields, shortlisted: false });
        created += 1;
        await logActivity(ctx, {
          weddingId: args.weddingId,
          type: "vendor_found",
          text: `found ${fields.name}${card.startingPrice ? ` (from ${card.startingPrice})` : ""} for ${slot.title}.`,
          refs: { slotId: args.slotId, vendorId },
        });
      }
    }
    return created;
  },
});

/** Vendors on a slot, in a bounded list, for `openai.rankVendors`. */
export const listForRanking = internalQuery({
  args: { slotId: v.id("vendorSlots") },
  returns: v.array(vendorDoc),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("vendors")
      .withIndex("by_slotId", (q) => q.eq("slotId", args.slotId))
      .take(30);
  },
});

/** Write the scores produced by `openai.rankVendors`. Vendors missing from the list keep whatever they had. */
export const applyRanking = internalMutation({
  args: {
    slotId: v.id("vendorSlots"),
    rankings: v.array(
      v.object({
        vendorId: v.id("vendors"),
        score: v.number(),
        rankReason: v.string(),
        isTopPick: v.boolean(),
      }),
    ),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    let updated = 0;
    for (const ranking of args.rankings.slice(0, 30)) {
      const vendor = await ctx.db.get(ranking.vendorId);
      if (!vendor || vendor.slotId !== args.slotId) continue;
      if (!Number.isFinite(ranking.score)) continue;
      await ctx.db.patch(ranking.vendorId, {
        score: Math.max(0, Math.min(100, Math.round(ranking.score))),
        rankReason: ranking.rankReason.slice(0, 300),
        isTopPick: ranking.isTopPick,
      });
      updated += 1;
    }
    return updated;
  },
});

/** Every website already found for a need, so "find more" can look past them. */
export const hostsForSlot = internalQuery({
  args: { slotId: v.id("vendorSlots") },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const vendors = await ctx.db
      .query("vendors")
      .withIndex("by_slotId", (q) => q.eq("slotId", args.slotId))
      .take(200);
    const hosts = vendors.map((v) => (v.website ? hostOf(v.website) : null)).filter((h): h is string => Boolean(h));
    return [...new Set(hosts)];
  },
});
