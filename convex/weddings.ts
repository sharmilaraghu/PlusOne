import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { logActivity, requireMember, requireUserId } from "./lib/auth";
import { eventDoc, weddingDoc } from "./lib/docs";
import {
  EVENT_COLORS,
  TEMPLATE_EVENTS,
  defaultSlotsFor,
  spreadDayIndexes,
  splitByWeights,
} from "./lib/templates";
import { addDays, daysBetween } from "./lib/text";
import { cultureTemplate, role } from "./lib/validators";
import { workflow } from "./workflows";

export const listMine = query({
  args: {},
  returns: v.array(v.object({ wedding: weddingDoc, role })),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const memberships = await ctx.db
      .query("members")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(50);
    const out = [];
    for (const m of memberships) {
      const wedding = await ctx.db.get(m.weddingId);
      if (wedding) out.push({ wedding, role: m.role });
    }
    return out;
  },
});

export const get = query({
  args: { weddingId: v.id("weddings") },
  returns: v.object({
    wedding: weddingDoc,
    role,
    events: v.array(eventDoc),
    stats: v.object({
      plannedTotal: v.number(),
      committedTotal: v.number(),
      paidTotal: v.number(),
      slotCounts: v.object({
        research: v.number(),
        contacted: v.number(),
        quoted: v.number(),
        booked: v.number(),
      }),
      guestCounts: v.object({
        pending: v.number(),
        yes: v.number(),
        no: v.number(),
        maybe: v.number(),
        attending: v.number(),
      }),
    }),
  }),
  handler: async (ctx, args) => {
    const { member, wedding } = await requireMember(ctx, args.weddingId);
    const events = (
      await ctx.db
        .query("events")
        .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
        .take(50)
    ).sort((a, b) => a.order - b.order);

    const lines = await ctx.db
      .query("budgetLines")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(200);
    const slots = await ctx.db
      .query("vendorSlots")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(200);
    const guests = await ctx.db
      .query("guests")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(200);

    const slotCounts = { research: 0, contacted: 0, quoted: 0, booked: 0 };
    for (const s of slots) slotCounts[s.status] += 1;
    const guestCounts = { pending: 0, yes: 0, no: 0, maybe: 0, attending: 0 };
    for (const g of guests) {
      guestCounts[g.rsvp] += 1;
      if (g.rsvp === "yes") guestCounts.attending += g.attendingCount;
    }

    return {
      wedding,
      role: member.role,
      events,
      stats: {
        plannedTotal: lines.reduce((a, l) => a + l.planned, 0),
        committedTotal: lines.reduce((a, l) => a + l.committed, 0),
        paidTotal: lines.reduce((a, l) => a + l.paid, 0),
        slotCounts,
        guestCounts,
      },
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    partnerA: v.string(),
    partnerB: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    city: v.string(),
    /** Neighbourhood / district inside the city; vendor searches are biased to it. */
    area: v.optional(v.string()),
    country: v.optional(v.string()),
    currency: v.string(),
    totalBudget: v.number(),
    template: cultureTemplate,
    inspirationUrl: v.optional(v.string()),
    customEvents: v.optional(
      v.array(v.object({ name: v.string(), dayIndex: v.number(), date: v.string() })),
    ),
  },
  returns: v.id("weddings"),
  handler: async (ctx, args): Promise<Id<"weddings">> => {
    const userId = await requireUserId(ctx);
    if (!Number.isFinite(args.totalBudget) || args.totalBudget < 0) {
      throw new ConvexError("Total budget must be a non-negative number.");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(args.endDate)) {
      throw new ConvexError("Dates must be YYYY-MM-DD.");
    }
    if (args.endDate < args.startDate) throw new ConvexError("End date must be on or after the start date.");
    if (args.inspirationUrl && !/^https?:\/\//i.test(args.inspirationUrl)) {
      throw new ConvexError("Inspiration URL must start with http:// or https://");
    }

    const weddingId = await ctx.db.insert("weddings", {
      name: args.name.trim(),
      partnerA: args.partnerA.trim(),
      partnerB: args.partnerB.trim(),
      startDate: args.startDate,
      endDate: args.endDate,
      city: args.city.trim(),
      area: args.area?.trim() || undefined,
      country: args.country,
      currency: args.currency.toUpperCase(),
      totalBudget: args.totalBudget,
      template: args.template,
      inspirationUrl: args.inspirationUrl,
      createdBy: userId,
    });
    await ctx.db.insert("members", { weddingId, userId, role: "owner" });

    // Events from the template (or the couple's own list for "custom").
    const totalDays = daysBetween(args.startDate, args.endDate);
    let plan: { name: string; dayIndex: number; date: string; weight: number; guestCount: number; description?: string }[];
    if (args.template === "custom" && args.customEvents && args.customEvents.length > 0) {
      plan = args.customEvents.slice(0, 20).map((e) => ({
        name: e.name.trim(),
        dayIndex: Math.max(0, Math.min(totalDays, Math.floor(e.dayIndex))),
        date: e.date,
        weight: 1,
        guestCount: 100,
      }));
    } else {
      const tpl = TEMPLATE_EVENTS[args.template];
      const dayIndexes = spreadDayIndexes(tpl.length, totalDays);
      plan = tpl.map((e, i) => ({
        ...e,
        dayIndex: dayIndexes[i],
        date: addDays(args.startDate, dayIndexes[i]),
      }));
    }
    const eventBudgets = splitByWeights(args.totalBudget, plan.map((e) => e.weight));
    const eventIds: Id<"events">[] = [];
    const eventNames: string[] = [];
    for (let i = 0; i < plan.length; i++) {
      const e = plan[i];
      const id = await ctx.db.insert("events", {
        weddingId,
        name: e.name,
        dayIndex: e.dayIndex,
        date: e.date,
        guestCount: e.guestCount,
        budget: eventBudgets[i],
        color: EVENT_COLORS[i % EVENT_COLORS.length],
        order: i,
        description: e.description,
      });
      eventIds.push(id);
      eventNames.push(e.name);
    }

    // Default vendor slots + one planned budget line per slot.
    for (const slot of defaultSlotsFor(args.template)) {
      const matched = slot.eventNames
        ? eventIds.filter((_, i) => slot.eventNames!.includes(eventNames[i]))
        : eventIds;
      const slotEventIds = matched.length > 0 ? matched : eventIds;
      const budget = Math.round((args.totalBudget * slot.pct) / 100);
      const slotId = await ctx.db.insert("vendorSlots", {
        weddingId,
        eventIds: slotEventIds,
        category: slot.category,
        title: slot.title,
        budget,
        status: "research",
      });
      await ctx.db.insert("budgetLines", {
        weddingId,
        slotId,
        label: slot.title,
        planned: budget,
        committed: 0,
        paid: 0,
      });
    }

    await logActivity(ctx, {
      weddingId,
      actorUserId: userId,
      type: "wedding_created",
      text: `created the wedding "${args.name.trim()}" (${plan.length} events in ${args.city.trim()}).`,
    });

    await workflow.start(ctx, internal.workflows.onboardingWorkflow, { weddingId });
    return weddingId;
  },
});

export const update = mutation({
  args: {
    weddingId: v.id("weddings"),
    patch: v.object({
      name: v.optional(v.string()),
      partnerA: v.optional(v.string()),
      partnerB: v.optional(v.string()),
      startDate: v.optional(v.string()),
      endDate: v.optional(v.string()),
      city: v.optional(v.string()),
      area: v.optional(v.string()),
      country: v.optional(v.string()),
      currency: v.optional(v.string()),
      totalBudget: v.optional(v.number()),
      styleSummary: v.optional(v.string()),
      inspirationUrl: v.optional(v.string()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.weddingId, "planner");
    if (args.patch.totalBudget !== undefined && (!Number.isFinite(args.patch.totalBudget) || args.patch.totalBudget < 0)) {
      throw new ConvexError("Total budget must be a non-negative number.");
    }
    await ctx.db.patch(args.weddingId, args.patch);
    return null;
  },
});

// ---- internal ---------------------------------------------------------------

export const getInternal = internalQuery({
  args: { weddingId: v.id("weddings") },
  returns: v.union(weddingDoc, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.weddingId);
  },
});

/** Wedding + its events, for prompt building in actions. */
export const getContext = internalQuery({
  args: { weddingId: v.id("weddings") },
  returns: v.union(v.object({ wedding: weddingDoc, events: v.array(eventDoc) }), v.null()),
  handler: async (ctx, args) => {
    const wedding = await ctx.db.get(args.weddingId);
    if (!wedding) return null;
    const events = (
      await ctx.db
        .query("events")
        .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
        .take(50)
    ).sort((a, b) => a.order - b.order);
    return { wedding, events };
  },
});

export const setInbox = internalMutation({
  args: { weddingId: v.id("weddings"), inboxId: v.string(), inboxAddress: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.weddingId, { inboxId: args.inboxId, inboxAddress: args.inboxAddress });
    await logActivity(ctx, {
      weddingId: args.weddingId,
      type: "inbox_ready",
      text: `Wedding inbox is ready: ${args.inboxAddress}`,
    });
    return null;
  },
});

export const setStyleSummary = internalMutation({
  args: { weddingId: v.id("weddings"), styleSummary: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.weddingId, { styleSummary: args.styleSummary });
    await logActivity(ctx, {
      weddingId: args.weddingId,
      type: "note",
      text: "Style summary generated from the inspiration link.",
    });
    return null;
  },
});
