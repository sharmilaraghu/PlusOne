import { ConvexError, v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { logActivity, requireMember } from "./lib/auth";
import { quoteDoc } from "./lib/docs";
import { formatMoney } from "./lib/text";
import { threadStatus } from "./lib/validators";
import { setCommittedForSlotHelper } from "./budget";

export const compareForSlot = query({
  args: { slotId: v.id("vendorSlots") },
  returns: v.array(
    v.object({
      quote: quoteDoc,
      vendor: v.object({
        _id: v.id("vendors"),
        name: v.string(),
        website: v.optional(v.string()),
        email: v.optional(v.string()),
        shortlisted: v.boolean(),
      }),
      threadStatus,
      deltaVsBudget: v.number(),
      isBooked: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    const slot = await ctx.db.get(args.slotId);
    if (!slot) throw new ConvexError("Slot not found.");
    await requireMember(ctx, slot.weddingId);
    const quotes = await ctx.db
      .query("quotes")
      .withIndex("by_slotId", (q) => q.eq("slotId", args.slotId))
      .order("desc")
      .take(50);
    // Keep only the latest quote per vendor.
    const seen = new Set<string>();
    const rows = [];
    for (const quote of quotes) {
      if (seen.has(quote.vendorId)) continue;
      seen.add(quote.vendorId);
      const vendor = await ctx.db.get(quote.vendorId);
      const thread = await ctx.db.get(quote.threadId);
      if (!vendor || !thread) continue;
      rows.push({
        quote,
        vendor: {
          _id: vendor._id,
          name: vendor.name,
          website: vendor.website,
          email: vendor.email,
          shortlisted: vendor.shortlisted,
        },
        threadStatus: thread.status,
        deltaVsBudget: quote.total - slot.budget,
        isBooked: slot.bookedVendorId === vendor._id,
      });
    }
    return rows.sort((a, b) => a.quote.total - b.quote.total);
  },
});

// ---- internal ---------------------------------------------------------------

/** Create/refresh the quote extracted from an inbound message; bumps slot/thread/budget. */
export const upsertFromMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    total: v.number(),
    deposit: v.optional(v.number()),
    currency: v.optional(v.string()),
    includes: v.array(v.string()),
    excludes: v.array(v.string()),
    validUntil: v.optional(v.string()),
    redFlags: v.array(v.string()),
    summary: v.string(),
    fromAttachment: v.optional(v.string()),
  },
  returns: v.union(v.id("quotes"), v.null()),
  handler: async (ctx, args) => {
    if (!Number.isFinite(args.total) || args.total <= 0) return null;
    const message = await ctx.db.get(args.messageId);
    if (!message || !message.threadId) return null;
    const thread = await ctx.db.get(message.threadId);
    if (!thread) return null;
    const wedding = await ctx.db.get(thread.weddingId);
    const slot = await ctx.db.get(thread.slotId);
    const vendor = await ctx.db.get(thread.vendorId);
    if (!wedding || !slot || !vendor) return null;

    const fields = {
      weddingId: thread.weddingId,
      slotId: thread.slotId,
      vendorId: thread.vendorId,
      threadId: thread._id,
      messageId: args.messageId,
      total: args.total,
      deposit: args.deposit,
      currency: args.currency ?? wedding.currency,
      includes: args.includes.slice(0, 20),
      excludes: args.excludes.slice(0, 20),
      validUntil: args.validUntil,
      redFlags: args.redFlags.slice(0, 10),
      summary: args.summary,
      ...(args.fromAttachment ? { fromAttachment: args.fromAttachment } : {}),
    };
    // One quote per message: re-running extraction updates instead of duplicating.
    const existing = (
      await ctx.db
        .query("quotes")
        .withIndex("by_vendorId", (q) => q.eq("vendorId", thread.vendorId))
        .order("desc")
        .take(20)
    ).find((q) => q.messageId === args.messageId);
    const quoteId = existing ? (await ctx.db.patch(existing._id, fields), existing._id) : await ctx.db.insert("quotes", fields);

    if (thread.status !== "booked" && thread.status !== "declined") {
      await ctx.db.patch(thread._id, { status: "quoted" });
    }
    if (slot.status === "research" || slot.status === "contacted") {
      await ctx.db.patch(slot._id, { status: "quoted" });
    }
    // The budget bar tracks the live quote until something is booked.
    if (slot.status !== "booked") {
      await setCommittedForSlotHelper(ctx, slot._id, args.total);
    }
    if (!existing) {
      await logActivity(ctx, {
        weddingId: thread.weddingId,
        actorLabel: vendor.name,
        type: "quote_received",
        text: `quoted ${formatMoney(args.total, fields.currency)} for ${slot.title}${args.redFlags.length ? ` (${args.redFlags.length} flag${args.redFlags.length > 1 ? "s" : ""})` : ""}.`,
        refs: { slotId: slot._id, vendorId: vendor._id, threadId: thread._id },
      });
    }
    return quoteId;
  },
});
