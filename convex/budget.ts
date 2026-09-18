import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { requireMember } from "./lib/auth";
import { budgetLineDoc } from "./lib/docs";
import { slotStatus } from "./lib/validators";

const OVER_COMMIT_RATIO = 1.15;

export const summary = query({
  args: { weddingId: v.id("weddings") },
  returns: v.object({
    currency: v.string(),
    totalBudget: v.number(),
    plannedTotal: v.number(),
    committedTotal: v.number(),
    paidTotal: v.number(),
    events: v.array(
      v.object({
        eventId: v.id("events"),
        name: v.string(),
        color: v.string(),
        budget: v.number(),
        planned: v.number(),
        committed: v.number(),
        paid: v.number(),
      }),
    ),
    lines: v.array(
      v.object({
        line: budgetLineDoc,
        slot: v.union(
          v.object({ _id: v.id("vendorSlots"), title: v.string(), category: v.string(), status: slotStatus }),
          v.null(),
        ),
        eventName: v.union(v.string(), v.null()),
        overCommitted: v.boolean(),
      }),
    ),
    warnings: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const { wedding } = await requireMember(ctx, args.weddingId);
    const events = (
      await ctx.db
        .query("events")
        .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
        .take(50)
    ).sort((a, b) => a.order - b.order);
    const slots = await ctx.db
      .query("vendorSlots")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(200);
    const lines = await ctx.db
      .query("budgetLines")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(200);

    const slotById = new Map(slots.map((s) => [s._id, s]));
    const eventById = new Map(events.map((e) => [e._id, e]));

    // Per-event roll-up: a slot line is attributed evenly across its events.
    const perEvent = new Map<Id<"events">, { planned: number; committed: number; paid: number }>();
    for (const e of events) perEvent.set(e._id, { planned: 0, committed: 0, paid: 0 });
    const warnings: string[] = [];
    const outLines = [];
    for (const line of lines) {
      const slot = line.slotId ? slotById.get(line.slotId) : undefined;
      const targets: Id<"events">[] = line.eventId
        ? [line.eventId]
        : slot && slot.eventIds.length > 0
          ? slot.eventIds
          : [];
      const share = targets.length > 0 ? 1 / targets.length : 0;
      for (const eid of targets) {
        const acc = perEvent.get(eid);
        if (!acc) continue;
        acc.planned += line.planned * share;
        acc.committed += line.committed * share;
        acc.paid += line.paid * share;
      }
      const overCommitted = line.planned > 0 && line.committed > line.planned * OVER_COMMIT_RATIO;
      if (overCommitted) {
        warnings.push(`${line.label}: committed ${Math.round(line.committed)} is more than 15% over the planned ${Math.round(line.planned)}.`);
      }
      outLines.push({
        line,
        slot: slot ? { _id: slot._id, title: slot.title, category: slot.category, status: slot.status } : null,
        eventName: line.eventId ? (eventById.get(line.eventId)?.name ?? null) : null,
        overCommitted,
      });
    }
    const plannedTotal = lines.reduce((a, l) => a + l.planned, 0);
    const committedTotal = lines.reduce((a, l) => a + l.committed, 0);
    const paidTotal = lines.reduce((a, l) => a + l.paid, 0);
    if (wedding.totalBudget > 0 && committedTotal > wedding.totalBudget) {
      warnings.push(`Committed spend exceeds the total budget by ${Math.round(committedTotal - wedding.totalBudget)}.`);
    }
    return {
      currency: wedding.currency,
      totalBudget: wedding.totalBudget,
      plannedTotal,
      committedTotal,
      paidTotal,
      events: events.map((e) => {
        const acc = perEvent.get(e._id)!;
        return {
          eventId: e._id,
          name: e.name,
          color: e.color,
          budget: e.budget,
          planned: Math.round(acc.planned),
          committed: Math.round(acc.committed),
          paid: Math.round(acc.paid),
        };
      }),
      lines: outLines,
      warnings,
    };
  },
});

export const updateLine = mutation({
  args: { lineId: v.id("budgetLines"), planned: v.optional(v.number()), paid: v.optional(v.number()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const line = await ctx.db.get(args.lineId);
    if (!line) throw new ConvexError("Budget line not found.");
    await requireMember(ctx, line.weddingId, "planner");
    const patch: { planned?: number; paid?: number } = {};
    if (args.planned !== undefined) {
      if (!Number.isFinite(args.planned) || args.planned < 0) throw new ConvexError("Planned must be a non-negative number.");
      patch.planned = args.planned;
    }
    if (args.paid !== undefined) {
      if (!Number.isFinite(args.paid) || args.paid < 0) throw new ConvexError("Paid must be a non-negative number.");
      patch.paid = args.paid;
    }
    await ctx.db.patch(args.lineId, patch);
    return null;
  },
});

/** Shared helper: set the committed amount on the slot's budget line (creating it if missing). */
export async function setCommittedForSlotHelper(
  ctx: MutationCtx,
  slotId: Id<"vendorSlots">,
  committed: number,
): Promise<void> {
  const slot = await ctx.db.get(slotId);
  if (!slot) return;
  const line = await ctx.db
    .query("budgetLines")
    .withIndex("by_slotId", (q) => q.eq("slotId", slotId))
    .first();
  if (line) {
    await ctx.db.patch(line._id, { committed });
  } else {
    await ctx.db.insert("budgetLines", {
      weddingId: slot.weddingId,
      slotId,
      label: slot.title,
      planned: slot.budget,
      committed,
      paid: 0,
    });
  }
}

export const setCommittedForSlot = internalMutation({
  args: { slotId: v.id("vendorSlots"), committed: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!Number.isFinite(args.committed) || args.committed < 0) return null;
    await setCommittedForSlotHelper(ctx, args.slotId, args.committed);
    return null;
  },
});
