import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { logActivity, requireMember } from "./lib/auth";
import { messageDoc, quoteDoc, threadDoc, vendorDoc, vendorSlotDoc } from "./lib/docs";
import { canonicalWebsite } from "./lib/text";
import { vendorCardValidator } from "./lib/validators";

export const listBySlot = query({
  args: { slotId: v.id("vendorSlots") },
  returns: v.array(vendorDoc),
  handler: async (ctx, args) => {
    const slot = await ctx.db.get(args.slotId);
    if (!slot) throw new ConvexError("Slot not found.");
    await requireMember(ctx, slot.weddingId);
    const vendors = await ctx.db
      .query("vendors")
      .withIndex("by_slotId", (q) => q.eq("slotId", args.slotId))
      .order("desc")
      .take(100);
    // Shortlisted first, then newest.
    return vendors.sort((a, b) => Number(b.shortlisted) - Number(a.shortlisted));
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

/** Insert or refresh vendor cards. Dedupes on the canonical website host. Returns the number of NEW vendors. */
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
        email: card.email?.toLowerCase(),
        phone: card.phone,
        city: card.city,
        category: slot.category,
        startingPrice: card.startingPrice,
        priceNotes: card.priceNotes,
        packages: card.packages.slice(0, 10),
        capacity: card.capacity,
        ratingText: card.ratingText,
        highlights: card.highlights.slice(0, 8),
        sourceUrls: card.sourceUrls.slice(0, 10),
        summary: card.summary,
        scrapedAt: Date.now(),
      };
      const existing = website
        ? await ctx.db
            .query("vendors")
            .withIndex("by_weddingId_and_website", (q) => q.eq("weddingId", args.weddingId).eq("website", website))
            .first()
        : null;
      if (existing) {
        // Keep anything the couple typed in by hand (email) if the scrape found none.
        await ctx.db.patch(existing._id, {
          ...fields,
          slotId: existing.slotId ?? args.slotId,
          email: fields.email ?? existing.email,
        });
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
