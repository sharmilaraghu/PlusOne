// TEMPORARY verification harness — deleted after the checks below run.
// It calls the real public mutation handlers with a fake signed-in identity,
// because `npx convex run` has no way to authenticate.
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import * as events from "./events";
import * as slots from "./slots";
import * as weddings from "./weddings";

function asUser(ctx: any, userId: string) {
  return {
    ...ctx,
    db: ctx.db,
    auth: { getUserIdentity: async () => ({ subject: `${userId}|scratch`, issuer: "scratch", tokenIdentifier: "scratch" }) },
  };
}

export const callAsOwner = internalMutation({
  args: { weddingId: v.id("weddings"), fn: v.string(), payload: v.any() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("members")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .first();
    if (!member) throw new Error("no member");
    const fake = asUser(ctx, member.userId);
    const table: Record<string, any> = {
      "events.remove": (events as any).remove,
      "events.setBudgets": (events as any).setBudgets,
      "slots.remove": (slots as any).remove,
      "slots.markBooked": (slots as any).markBooked,
      "slots.update": (slots as any).update,
      "weddings.update": (weddings as any).update,
    };
    const fn = table[args.fn];
    if (!fn) throw new Error("unknown fn");
    return await fn._handler(fake, args.payload);
  },
});

export const snapshot = internalQuery({
  args: { weddingId: v.id("weddings") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const evs = (
      await ctx.db
        .query("events")
        .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
        .take(50)
    ).sort((a, b) => a.order - b.order);
    const sl = await ctx.db
      .query("vendorSlots")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(200);
    const lines = await ctx.db
      .query("budgetLines")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(200);
    const wedding = await ctx.db.get(args.weddingId);
    const eventIds = new Set(evs.map((e) => e._id as string));
    return {
      totalBudget: wedding?.totalBudget,
      sumEvents: evs.reduce((a, e) => a + e.budget, 0),
      sumSlots: sl.reduce((a, s) => a + s.budget, 0),
      sumPlanned: lines.reduce((a, l) => a + l.planned, 0),
      sumCommitted: lines.reduce((a, l) => a + l.committed, 0),
      sumPaid: lines.reduce((a, l) => a + l.paid, 0),
      orders: evs.map((e) => e.order),
      eventCount: evs.length,
      slotCount: sl.length,
      lineCount: lines.length,
      emptyEventIdSlots: sl.filter((s) => s.eventIds.length === 0).length,
      danglingSlotEventRefs: sl.flatMap((s) => s.eventIds.filter((id) => !eventIds.has(id as string))).length,
      orphanLines: lines.filter((l) => l.slotId && !sl.some((s) => s._id === l.slotId)).length,
      danglingLineEventRefs: lines.filter((l) => l.eventId && !eventIds.has(l.eventId as string)).length,
      events: evs.map((e) => ({ id: e._id, name: e.name, order: e.order, budget: e.budget })),
      slots: sl.map((s) => ({ id: s._id, title: s.title, status: s.status, budget: s.budget, events: s.eventIds.length })),
    };
  },
});
