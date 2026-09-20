import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalQuery, mutation, query, internalMutation } from "./_generated/server";
import { logActivity, requireMember } from "./lib/auth";
import { quoteDoc, vendorDoc, vendorSlotDoc } from "./lib/docs";
import { setCommittedForSlotHelper } from "./budget";
import { rebalanceWeddingBudget } from "./lib/budget";
import { splitByWeights } from "./lib/templates";
import { internal } from "./_generated/api";
import { workflow } from "./workflows";

export const list = query({
  args: { weddingId: v.id("weddings") },
  returns: v.array(
    v.object({
      slot: vendorSlotDoc,
      vendorsCount: v.number(),
      bestQuote: v.union(quoteDoc, v.null()),
      bookedVendor: v.union(vendorDoc, v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.weddingId);
    const slots = await ctx.db
      .query("vendorSlots")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(50);
    const out = [];
    for (const slot of slots) {
      const vendors = await ctx.db
        .query("vendors")
        .withIndex("by_slotId", (q) => q.eq("slotId", slot._id))
        .take(50);
      const quotes = await ctx.db
        .query("quotes")
        .withIndex("by_slotId", (q) => q.eq("slotId", slot._id))
        .take(20);
      let bestQuote = null;
      for (const q of quotes) if (!bestQuote || q.total < bestQuote.total) bestQuote = q;
      const bookedVendor = slot.bookedVendorId ? await ctx.db.get(slot.bookedVendorId) : null;
      out.push({ slot, vendorsCount: vendors.length, bestQuote, bookedVendor });
    }
    return out;
  },
});

export const add = mutation({
  args: {
    weddingId: v.id("weddings"),
    title: v.string(),
    category: v.string(),
    eventIds: v.array(v.id("events")),
    budget: v.number(),
  },
  returns: v.id("vendorSlots"),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.weddingId, "planner");
    if (!Number.isFinite(args.budget) || args.budget < 0) throw new ConvexError("Budget must be a non-negative number.");
    for (const eventId of args.eventIds.slice(0, 20)) {
      const event = await ctx.db.get(eventId);
      if (!event || event.weddingId !== args.weddingId) throw new ConvexError("Event does not belong to this wedding.");
    }
    const slotId = await ctx.db.insert("vendorSlots", {
      weddingId: args.weddingId,
      eventIds: args.eventIds.slice(0, 20),
      category: args.category.trim(),
      title: args.title.trim(),
      budget: args.budget,
      status: "research",
    });
    await ctx.db.insert("budgetLines", {
      weddingId: args.weddingId,
      slotId,
      label: args.title.trim(),
      planned: args.budget,
      committed: 0,
      paid: 0,
    });
    return slotId;
  },
});

export const update = mutation({
  args: {
    slotId: v.id("vendorSlots"),
    patch: v.object({
      title: v.optional(v.string()),
      category: v.optional(v.string()),
      eventIds: v.optional(v.array(v.id("events"))),
      budget: v.optional(v.number()),
      notes: v.optional(v.string()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const slot = await ctx.db.get(args.slotId);
    if (!slot) throw new ConvexError("Slot not found.");
    await requireMember(ctx, slot.weddingId, "planner");
    if (args.patch.budget !== undefined && (!Number.isFinite(args.patch.budget) || args.patch.budget < 0)) {
      throw new ConvexError("Budget must be a non-negative number.");
    }
    if (args.patch.eventIds) {
      for (const eventId of args.patch.eventIds.slice(0, 20)) {
        const event = await ctx.db.get(eventId);
        if (!event || event.weddingId !== slot.weddingId) throw new ConvexError("Event does not belong to this wedding.");
      }
    }
    await ctx.db.patch(args.slotId, args.patch);
    if (args.patch.budget !== undefined || args.patch.title !== undefined || args.patch.eventIds !== undefined) {
      const line = await ctx.db
        .query("budgetLines")
        .withIndex("by_slotId", (q) => q.eq("slotId", args.slotId))
        .first();
      if (line) {
        await ctx.db.patch(line._id, {
          ...(args.patch.budget !== undefined ? { planned: args.patch.budget } : {}),
          ...(args.patch.title !== undefined ? { label: args.patch.title } : {}),
          // A need that now serves one day belongs to that day; one that serves several
          // belongs to none of them in particular.
          ...(args.patch.eventIds !== undefined
            ? { eventId: args.patch.eventIds.length === 1 ? args.patch.eventIds[0] : undefined }
            : {}),
        });
      }
    }
    return null;
  },
});

/**
 * One need becomes one per day: two venues for two days, a different florist for the
 * ceremony and the reception. The original keeps the first day and whatever research
 * and conversations it already has; the rest start fresh with their share of the budget,
 * split by guest count so the bigger day gets the bigger share.
 */
export const splitByEvent = mutation({
  args: { slotId: v.id("vendorSlots") },
  returns: v.array(v.id("vendorSlots")),
  handler: async (ctx, args): Promise<Id<"vendorSlots">[]> => {
    const slot = await ctx.db.get(args.slotId);
    if (!slot) throw new ConvexError("That need is no longer part of your plan.");
    const { userId } = await requireMember(ctx, slot.weddingId, "planner");
    if (slot.status === "booked") throw new ConvexError("This one is already booked. Un-book it first if you want to split it.");
    if (slot.eventIds.length < 2) throw new ConvexError("This need is already for a single day.");

    const events = [];
    for (const eventId of slot.eventIds) {
      const event = await ctx.db.get(eventId);
      if (event) events.push(event);
    }
    if (events.length < 2) throw new ConvexError("This need is already for a single day.");
    events.sort((a, b) => a.order - b.order);
    const shares = splitByWeights(slot.budget, events.map((e) => Math.max(1, e.guestCount)));

    const ids: Id<"vendorSlots">[] = [];
    for (const [i, event] of events.entries()) {
      const title = `${slot.title} — ${event.name}`.slice(0, 80);
      if (i === 0) {
        // The original carries its vendors, quotes and threads, so nothing is lost.
        await ctx.db.patch(slot._id, { title, eventIds: [event._id], budget: shares[0] });
        const line = await ctx.db
          .query("budgetLines")
          .withIndex("by_slotId", (q) => q.eq("slotId", slot._id))
          .first();
        if (line) await ctx.db.patch(line._id, { label: title, planned: shares[0], eventId: event._id });
        ids.push(slot._id);
        continue;
      }
      const slotId = await ctx.db.insert("vendorSlots", {
        weddingId: slot.weddingId,
        eventIds: [event._id],
        category: slot.category,
        title,
        budget: shares[i],
        status: "research",
      });
      await ctx.db.insert("budgetLines", {
        weddingId: slot.weddingId,
        slotId,
        eventId: event._id,
        label: title,
        planned: shares[i],
        committed: 0,
        paid: 0,
      });
      ids.push(slotId);
    }
    await logActivity(ctx, {
      weddingId: slot.weddingId,
      actorUserId: userId,
      type: "note",
      text: `split ${slot.category.toLowerCase()} into ${events.length} separate needs, one per day.`,
      refs: { slotId: slot._id },
    });
    return ids;
  },
});

export const markBooked = mutation({
  args: {
    slotId: v.id("vendorSlots"),
    vendorId: v.id("vendors"),
    /**
     * Let PlusOne tell the chosen vendor and thank the others. Off when they booked
     * outside PlusOne and there is nobody to tell.
     */
    notify: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const slot = await ctx.db.get(args.slotId);
    if (!slot) throw new ConvexError("Slot not found.");
    const { userId } = await requireMember(ctx, slot.weddingId, "planner");
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor || vendor.weddingId !== slot.weddingId) throw new ConvexError("Vendor does not belong to this wedding.");

    await ctx.db.patch(args.slotId, { status: "booked", bookedVendorId: args.vendorId });

    const thread = await ctx.db
      .query("threads")
      .withIndex("by_vendorId", (q) => q.eq("vendorId", args.vendorId))
      .first();
    if (thread) {
      await ctx.db.patch(thread._id, { status: "booked", nextFollowUpAt: undefined, attentionReason: undefined });
    }

    // Commit the vendor's latest quote (if any) to the budget line.
    const quotes = await ctx.db
      .query("quotes")
      .withIndex("by_vendorId", (q) => q.eq("vendorId", args.vendorId))
      .order("desc")
      .take(1);
    if (quotes.length > 0) {
      await setCommittedForSlotHelper(ctx, args.slotId, quotes[0].total);
    }

    await logActivity(ctx, {
      weddingId: slot.weddingId,
      actorUserId: userId,
      type: "booked",
      text: `booked ${vendor.name} for ${slot.title}.`,
      refs: { slotId: args.slotId, vendorId: args.vendorId, threadId: thread?._id },
    });
    if (args.notify) {
      await workflow.start(ctx, internal.workflows.bookingWorkflow, { slotId: args.slotId, vendorId: args.vendorId });
    }
    return null;
  },
});

/**
 * Remove a vendor need from the plan, with everything that was only ever a
 * research step for it. Anything that means a real person was contacted — a
 * booking, or an email thread that actually went out — stops the removal.
 */
export const remove = mutation({
  args: { slotId: v.id("vendorSlots") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const slot = await ctx.db.get(args.slotId);
    if (!slot) throw new ConvexError("That need is no longer part of your plan.");
    const { userId } = await requireMember(ctx, slot.weddingId, "planner");

    // Only a real booking blocks removal. A need the couple simply ticked as "already
    // booked" when they signed up has no vendor behind it and can be dropped freely.
    if (slot.status === "booked" && slot.bookedVendorId) {
      const booked = await ctx.db.get(slot.bookedVendorId);
      throw new ConvexError(
        `${booked?.name ?? "A vendor"} is already booked for ${slot.title}. Un-book it first, then you can remove it.`,
      );
    }

    const threads = await ctx.db
      .query("threads")
      .withIndex("by_slotId", (q) => q.eq("slotId", args.slotId))
      .take(100);
    const live = threads.find((t) => t.status !== "draft");
    if (live) {
      const vendor = await ctx.db.get(live.vendorId);
      throw new ConvexError(
        `You've already emailed ${vendor?.name ?? "a vendor"} about ${slot.title}, so this need can't be removed. Mark it booked or leave it as is.`,
      );
    }

    // Vendors found only for this need go with it, unless a draft thread still
    // points at one — those are left alone along with their threads.
    const vendors = await ctx.db
      .query("vendors")
      .withIndex("by_slotId", (q) => q.eq("slotId", args.slotId))
      .take(200);
    const vendorIdsWithThreads = new Set(threads.map((t) => t.vendorId));
    let removedVendors = 0;
    for (const vendor of vendors) {
      if (vendorIdsWithThreads.has(vendor._id)) continue;
      await ctx.db.delete(vendor._id);
      removedVendors += 1;
    }

    for (const run of await ctx.db
      .query("researchRuns")
      .withIndex("by_slotId", (q) => q.eq("slotId", args.slotId))
      .take(100)) {
      await ctx.db.delete(run._id);
    }

    const line = await ctx.db
      .query("budgetLines")
      .withIndex("by_slotId", (q) => q.eq("slotId", args.slotId))
      .first();
    if (line) await ctx.db.delete(line._id);

    await ctx.db.delete(args.slotId);

    // Its budget goes back to the needs that remain.
    await rebalanceWeddingBudget(ctx, slot.weddingId);

    await logActivity(ctx, {
      weddingId: slot.weddingId,
      actorUserId: userId,
      type: "note",
      text:
        `removed ${slot.title} from the plan` +
        (removedVendors > 0 ? `, along with ${removedVendors} vendor${removedVendors === 1 ? "" : "s"} found for it` : "") +
        ".",
    });
    return null;
  },
});

// ---- internal ---------------------------------------------------------------

export const getInternal = internalQuery({
  args: { slotId: v.id("vendorSlots") },
  returns: v.union(vendorSlotDoc, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.slotId);
  },
});

/** Add a vendor need without a session, for the assistant acting on the couple's behalf. */
export const addInternal = internalMutation({
  args: { weddingId: v.id("weddings"), title: v.string(), category: v.string() },
  returns: v.id("vendorSlots"),
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(50);
    const slotId = await ctx.db.insert("vendorSlots", {
      weddingId: args.weddingId,
      eventIds: events.map((e) => e._id),
      category: args.category,
      title: args.title,
      budget: 0,
      status: "research",
    });
    await ctx.db.insert("budgetLines", {
      weddingId: args.weddingId,
      slotId,
      label: args.title,
      planned: 0,
      committed: 0,
      paid: 0,
    });
    await rebalanceWeddingBudget(ctx, args.weddingId);
    return slotId;
  },
});
