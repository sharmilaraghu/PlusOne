import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireMember } from "./lib/auth";
import { eventDoc } from "./lib/docs";
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
    if (!Number.isFinite(args.budget) || args.budget < 0) throw new ConvexError("Budget must be a non-negative number.");
    if (!Number.isFinite(args.guestCount) || args.guestCount < 0) throw new ConvexError("Guest count must be non-negative.");
    const existing = await ctx.db
      .query("events")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(50);
    if (existing.length >= 20) throw new ConvexError("A wedding can have at most 20 events.");
    const order = existing.length;
    return await ctx.db.insert("events", {
      weddingId: args.weddingId,
      name: args.name.trim(),
      date: args.date,
      dayIndex: Math.floor(args.dayIndex),
      budget: args.budget,
      guestCount: Math.floor(args.guestCount),
      color: EVENT_COLORS[order % EVENT_COLORS.length],
      order,
    });
  },
});
