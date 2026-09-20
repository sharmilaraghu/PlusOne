import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { logActivity, requireMember } from "./lib/auth";
import type { Id } from "./_generated/dataModel";
import { eventDoc } from "./lib/docs";
import { rebalanceWeddingBudget } from "./lib/budget";
import { EVENT_COLORS } from "./lib/templates";

export const list = query({
  args: { weddingId: v.id("weddings") },
  returns: v.array(eventDoc),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.weddingId);
    const events = await ctx.db
      .query("events")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(50);
    return events.sort((a, b) => a.order - b.order);
  },
});

export const update = mutation({
  args: {
    eventId: v.id("events"),
    patch: v.object({
      name: v.optional(v.string()),
      dayIndex: v.optional(v.number()),
      date: v.optional(v.string()),
      guestCount: v.optional(v.number()),
      budget: v.optional(v.number()),
      color: v.optional(v.string()),
      order: v.optional(v.number()),
      description: v.optional(v.string()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError("Event not found.");
    await requireMember(ctx, event.weddingId, "planner");
    for (const key of ["guestCount", "budget", "dayIndex", "order"] as const) {
      const val = args.patch[key];
      if (val !== undefined && (!Number.isFinite(val) || val < 0)) {
        throw new ConvexError(`${key} must be a non-negative number.`);
      }
    }
    await ctx.db.patch(args.eventId, args.patch);

    // Changing one function's budget moves money away from the others. The couple
    // gets exactly the number they typed and the rest share what is left in the
    // proportions they already had, so the total never drifts.
    if (args.patch.budget !== undefined) {
      const wedding = await ctx.db.get(event.weddingId);
      const weights = new Map<Id<"events">, number>();
      if (wedding) {
        const events = await ctx.db
          .query("events")
          .withIndex("by_weddingId", (q) => q.eq("weddingId", event.weddingId))
          .take(50);
        const others = events.filter((e) => e._id !== args.eventId);
        const mine = Math.min(args.patch.budget, wedding.totalBudget);
        const rest = Math.max(0, wedding.totalBudget - mine);
        const otherTotal = others.reduce((a, e) => a + e.budget, 0);
        weights.set(args.eventId, mine);
        for (const e of others) {
          weights.set(e._id, otherTotal > 0 ? (e.budget / otherTotal) * rest : rest / Math.max(1, others.length));
        }
      }
      await rebalanceWeddingBudget(ctx, event.weddingId, weights.size > 0 ? weights : undefined);
    }
    return null;
  },
});

export const add = mutation({
  args: {
    weddingId: v.id("weddings"),
    name: v.string(),
    date: v.string(),
    dayIndex: v.number(),
    budget: v.number(),
    guestCount: v.number(),
  },
  returns: v.id("events"),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.weddingId, "planner");
    return await addEventHelper(ctx, args.weddingId, args);
  },
});

/**
 * One more day in the plan. Its budget is a weight rather than an amount: the rebalance
 * re-splits the same total across every day, so every share moves.
 */
export async function addEventHelper(
  ctx: MutationCtx,
  weddingId: Id<"weddings">,
  args: { name: string; date: string; dayIndex: number; budget: number; guestCount: number },
): Promise<Id<"events">> {
  if (!Number.isFinite(args.budget) || args.budget < 0) throw new ConvexError("Budget must be a non-negative number.");
  if (!Number.isFinite(args.guestCount) || args.guestCount < 0) throw new ConvexError("Guest count must be non-negative.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) throw new ConvexError("A day needs a date as YYYY-MM-DD.");
  const existing = await ctx.db
    .query("events")
    .withIndex("by_weddingId", (q) => q.eq("weddingId", weddingId))
    .take(50);
  if (existing.length >= 20) throw new ConvexError("A wedding can have at most 20 events.");
  const order = existing.length;
  const eventId = await ctx.db.insert("events", {
    weddingId,
    name: args.name.trim(),
    date: args.date,
    dayIndex: Math.max(0, Math.floor(args.dayIndex)),
    budget: args.budget,
    guestCount: Math.floor(args.guestCount),
    color: EVENT_COLORS[order % EVENT_COLORS.length],
    order,
  });
  // The new function's budget comes out of the same total as everyone else's.
  await rebalanceWeddingBudget(ctx, weddingId);
  await logActivity(ctx, {
    weddingId,
    type: "note",
    text: `added ${args.name.trim()} to the plan.`,
    refs: { eventId },
  });
  return eventId;
}

/**
 * Remove one function from the plan.
 *
 * Work already done for that day is never thrown away: a need that has only ever
 * been researched and is left serving nothing is removed with it, but a need that
 * has been contacted, quoted or booked — or that has vendors or email threads
 * against it — moves across to the first remaining function instead.
 */
export const remove = mutation({
  args: { eventId: v.id("events") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError("That function is no longer part of your plan.");
    const { userId } = await requireMember(ctx, event.weddingId, "planner");
    const weddingId = event.weddingId;

    const events = (
      await ctx.db
        .query("events")
        .withIndex("by_weddingId", (q) => q.eq("weddingId", weddingId))
        .take(50)
    ).sort((a, b) => a.order - b.order);
    const remaining = events.filter((e) => e._id !== args.eventId);
    if (remaining.length === 0) {
      throw new ConvexError("You can't remove your only function. Add another one first.");
    }
    const fallbackEventId = remaining[0]._id;

    const slots = await ctx.db
      .query("vendorSlots")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", weddingId))
      .take(200);

    let removedSlots = 0;
    let movedSlots = 0;
    for (const slot of slots) {
      if (!slot.eventIds.some((id) => id === args.eventId)) continue;
      const eventIds = slot.eventIds.filter((id) => id !== args.eventId);
      if (eventIds.length > 0) {
        await ctx.db.patch(slot._id, { eventIds });
        continue;
      }
      const vendor = await ctx.db
        .query("vendors")
        .withIndex("by_slotId", (q) => q.eq("slotId", slot._id))
        .first();
      const thread = await ctx.db
        .query("threads")
        .withIndex("by_slotId", (q) => q.eq("slotId", slot._id))
        .first();
      const untouched = slot.status === "research" && vendor === null && thread === null;
      if (!untouched) {
        // Never destroy work: park the need on the first remaining function.
        await ctx.db.patch(slot._id, { eventIds: [fallbackEventId] });
        movedSlots += 1;
        continue;
      }
      for (const run of await ctx.db
        .query("researchRuns")
        .withIndex("by_slotId", (q) => q.eq("slotId", slot._id))
        .take(100)) {
        await ctx.db.delete(run._id);
      }
      const line = await ctx.db
        .query("budgetLines")
        .withIndex("by_slotId", (q) => q.eq("slotId", slot._id))
        .first();
      if (line) await ctx.db.delete(line._id);
      await ctx.db.delete(slot._id);
      removedSlots += 1;
    }

    // Budget lines pinned to this function lose their pin.
    const lines = await ctx.db
      .query("budgetLines")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", weddingId))
      .take(200);
    for (const line of lines) {
      if (line.eventId === args.eventId) await ctx.db.patch(line._id, { eventId: undefined });
    }

    await ctx.db.delete(args.eventId);

    // Keep `order` a clean 0..n-1 — the day tints in the UI come from it.
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].order !== i) await ctx.db.patch(remaining[i]._id, { order: i });
    }

    // This function's share of the money goes back to the others.
    await rebalanceWeddingBudget(ctx, weddingId);

    await logActivity(ctx, {
      weddingId,
      actorUserId: userId,
      type: "note",
      text:
        `removed ${event.name} from the plan` +
        (movedSlots > 0 ? `, moving ${movedSlots} need${movedSlots === 1 ? "" : "s"} to ${remaining[0].name}` : "") +
        (removedSlots > 0 ? `, and removed ${removedSlots} need${removedSlots === 1 ? "" : "s"} nobody had started` : "") +
        ".",
    });
    return null;
  },
});

/**
 * Re-split the wedding budget across the functions. The numbers given are read as
 * a split, not as amounts, so the functions always add back up to the couple's
 * total — exactly how the budget is set when the wedding is created.
 */
export const setBudgets = mutation({
  args: {
    weddingId: v.id("weddings"),
    allocations: v.array(v.object({ eventId: v.id("events"), budget: v.number() })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId } = await requireMember(ctx, args.weddingId, "planner");
    if (args.allocations.length === 0) throw new ConvexError("Tell us how to split the budget first.");
    if (args.allocations.length > 20) throw new ConvexError("A wedding can have at most 20 functions.");

    const weights = new Map<Id<"events">, number>();
    for (const a of args.allocations) {
      if (!Number.isFinite(a.budget) || a.budget < 0) {
        throw new ConvexError("Every function's budget must be zero or more.");
      }
      const event = await ctx.db.get(a.eventId);
      if (!event || event.weddingId !== args.weddingId) {
        throw new ConvexError("One of those functions isn't part of this wedding.");
      }
      weights.set(a.eventId, a.budget);
    }

    await rebalanceWeddingBudget(ctx, args.weddingId, weights);

    await logActivity(ctx, {
      weddingId: args.weddingId,
      actorUserId: userId,
      type: "note",
      text: "re-split the budget across the functions.",
    });
    return null;
  },
});
