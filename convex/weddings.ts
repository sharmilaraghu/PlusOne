import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { logActivity, requireMember, requireUserId } from "./lib/auth";
import { rebalanceWeddingBudget } from "./lib/budget";
import { eventDoc, weddingDoc } from "./lib/docs";
import {
  EVENT_COLORS,
  TEMPLATE_EVENTS,
  allocateSlotBudgets,
  defaultSlotsFor,
  spreadDayIndexes,
  splitByWeights,
} from "./lib/templates";
import { addDays, daysBetween } from "./lib/text";
import { cultureTemplate, sendMode, styleFormality, role } from "./lib/validators";
import { workflow } from "./workflows";

export const listMine = query({
  args: {},
  returns: v.array(
    v.object({
      wedding: weddingDoc,
      role,
      /** Enough for the card to say where this wedding stands without opening it. */
      summary: v.object({
        daysToGo: v.number(),
        needs: v.number(),
        booked: v.number(),
        committed: v.number(),
        quotesToCompare: v.number(),
        awaiting: v.number(),
        nextStep: v.string(),
      }),
    }),
  ),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const memberships = await ctx.db
      .query("members")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(50);
    const out = [];
    const today = new Date().toISOString().slice(0, 10);

    for (const m of memberships) {
      const wedding = await ctx.db.get(m.weddingId);
      if (!wedding) continue;

      const slots = await ctx.db
        .query("vendorSlots")
        .withIndex("by_weddingId", (q) => q.eq("weddingId", wedding._id))
        .take(200);
      const lines = await ctx.db
        .query("budgetLines")
        .withIndex("by_weddingId", (q) => q.eq("weddingId", wedding._id))
        .take(200);

      const booked = slots.filter((s) => s.status === "booked").length;
      const quotesToCompare = slots.filter((s) => s.status === "quoted").length;
      const awaiting = slots.filter((s) => s.status === "contacted").length;
      const researched = slots.filter((s) => s.status === "research").length;
      const committed = lines.reduce((sum, l) => sum + (slots.find((s) => s._id === l.slotId)?.status === "booked" ? l.committed : 0), 0);

      // One honest next step, in the order a couple would actually take them.
      const nextStep =
        slots.length === 0
          ? "Add what you need"
          : booked === slots.length
            ? "Everything is booked"
            : quotesToCompare > 0
              ? `${quotesToCompare} ${quotesToCompare === 1 ? "need has quotes" : "needs have quotes"} to compare`
              : awaiting > 0
                ? `Waiting on ${awaiting} ${awaiting === 1 ? "vendor" : "vendors"}`
                : researched > 0
                  ? booked > 0 || slots.length - researched > 0
                    ? `Find the other ${researched} ${researched === 1 ? "vendor" : "vendors"}`
                    : "Find your first vendors"
                  : "Pick who to ask";

      const daysToGo = Math.max(
        0,
        Math.round((new Date(wedding.startDate).getTime() - new Date(today).getTime()) / 86_400_000),
      );

      out.push({
        wedding,
        role: m.role,
        summary: { daysToGo, needs: slots.length, booked, committed, quotesToCompare, awaiting, nextStep },
      });
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
    styleVibes: v.optional(v.array(v.string())),
    stylePalette: v.optional(v.string()),
    styleFormality: v.optional(styleFormality),
    /**
     * The couple's own functions, honoured for every tradition. Omit to take the
     * tradition's defaults. `budget` is a share of the total, not an amount: the
     * shares are normalised so they always add up to the wedding's budget.
     */
    events: v.optional(
      v.array(
        v.object({
          name: v.string(),
          date: v.string(),
          dayIndex: v.optional(v.number()),
          guestCount: v.number(),
          budget: v.number(),
        }),
      ),
    ),
    /**
     * The vendors this couple actually needs, and which of them they have already
     * booked. Omit to take the tradition's defaults, all of them unbooked. A booked
     * need is never researched or emailed, and what they have already spent on it
     * counts against the budget from the first screen.
     */
    needs: v.optional(
      v.array(
        v.object({
          category: v.string(),
          title: v.string(),
          /** Share of the budget, as a percentage. Falls back to an even share. */
          pct: v.optional(v.number()),
          booked: v.boolean(),
          committed: v.optional(v.number()),
          /** Which functions this need serves, by name. Omitted means all of them. */
          eventNames: v.optional(v.array(v.string())),
        }),
      ),
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
      styleVibes: args.styleVibes?.filter((t) => t.trim()).slice(0, 12),
      stylePalette: args.stylePalette?.trim() || undefined,
      styleFormality: args.styleFormality,
      createdBy: userId,
    });
    await ctx.db.insert("members", { weddingId, userId, role: "owner" });

    // Events from the template (or the couple's own list for "custom").
    const totalDays = daysBetween(args.startDate, args.endDate);
    let plan: { name: string; dayIndex: number; date: string; weight: number; guestCount: number; description?: string }[];
    if (args.events && args.events.length > 0) {
      plan = args.events.slice(0, 20).map((e) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) throw new ConvexError("Each function needs a date as YYYY-MM-DD.");
        if (!Number.isFinite(e.guestCount) || e.guestCount < 0) throw new ConvexError("Guest counts must be zero or more.");
        if (!Number.isFinite(e.budget) || e.budget < 0) throw new ConvexError("Function budgets must be zero or more.");
        const dayIndex = e.dayIndex ?? daysBetween(args.startDate, e.date);
        return {
          name: e.name.trim() || "Celebration",
          dayIndex: Math.max(0, Math.min(totalDays, Math.floor(dayIndex))),
          date: e.date,
          // Budgets are weights here, so a couple's split is honoured exactly and
          // still adds up to the total even when their numbers do not.
          weight: e.budget,
          guestCount: Math.floor(e.guestCount),
        };
      });
      if (plan.every((e) => e.weight === 0)) plan = plan.map((e) => ({ ...e, weight: 1 }));
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

    // Default vendor needs, with their budgets drawn from the functions they serve
    // so needs, functions and the wedding total all add up to the same number.
    const chosen = args.needs && args.needs.length > 0 ? args.needs.slice(0, 40) : undefined;
    const templateSlots: Array<{ category: string; title: string; pct: number; eventNames?: string[]; booked?: boolean; committed?: number }> =
      chosen
        ? chosen.map((n) => ({
            category: n.category.trim().slice(0, 60) || "Other",
            title: n.title.trim().slice(0, 80) || n.category.trim().slice(0, 80) || "A vendor",
            pct: Number.isFinite(n.pct) && (n.pct ?? 0) > 0 ? (n.pct as number) : 100 / chosen.length,
            eventNames: n.eventNames,
            booked: n.booked,
            committed: Number.isFinite(n.committed) && (n.committed ?? 0) > 0 ? n.committed : undefined,
          }))
        : defaultSlotsFor(args.template);
    const slotPlans = templateSlots.map((slot) => {
      const matchedIndexes = slot.eventNames
        ? eventNames.map((n, i) => (slot.eventNames!.includes(n) ? i : -1)).filter((i) => i >= 0)
        : eventIds.map((_, i) => i);
      const eventIndexes = matchedIndexes.length > 0 ? matchedIndexes : eventIds.map((_, i) => i);
      return { pct: slot.pct, eventIndexes };
    });
    const slotBudgets = allocateSlotBudgets(eventBudgets, slotPlans);

    for (let i = 0; i < templateSlots.length; i++) {
      const slot = templateSlots[i];
      const { eventIndexes } = slotPlans[i];
      const budget = slotBudgets[i];
      const slotId = await ctx.db.insert("vendorSlots", {
        weddingId,
        eventIds: eventIndexes.map((idx) => eventIds[idx]),
        category: slot.category,
        title: slot.title,
        budget,
        // Something they have already booked is not something to go looking for.
        status: slot.booked ? "booked" : "research",
      });
      await ctx.db.insert("budgetLines", {
        weddingId,
        slotId,
        // A need that serves exactly one function is attributed to it, instead of
        // being split evenly across guesses when the budget is summarised.
        eventId: eventIndexes.length === 1 ? eventIds[eventIndexes[0]] : undefined,
        label: slot.title,
        planned: budget,
        // Money already spent is money already spent: the budget bar tells the truth
        // from the first screen rather than pretending nothing is committed.
        committed: slot.committed ?? 0,
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
      styleVibes: v.optional(v.array(v.string())),
      stylePalette: v.optional(v.string()),
      styleFormality: v.optional(styleFormality),
      sendMode: v.optional(sendMode),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { wedding } = await requireMember(ctx, args.weddingId, "planner");
    if (args.patch.totalBudget !== undefined && (!Number.isFinite(args.patch.totalBudget) || args.patch.totalBudget < 0)) {
      throw new ConvexError("Total budget must be a non-negative number.");
    }
    await ctx.db.patch(args.weddingId, args.patch);
    // A new total has to reach the functions, the needs and the budget lines,
    // or the budget bar would be measuring against a number nothing adds up to.
    if (args.patch.totalBudget !== undefined && args.patch.totalBudget !== wedding.totalBudget) {
      await rebalanceWeddingBudget(ctx, args.weddingId);
    }
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

/**
 * Which AgentMail inboxes this deployment is holding, and whether each one is
 * still carrying real correspondence.
 *
 * The plan allows only a handful of inboxes, so `agentmail.createInbox` has to
 * decide which one to give up when a new couple needs one. An inbox that has
 * actually written to or heard from a vendor is never a candidate; an inbox
 * belonging to a wedding that never got started is.
 */
export const inboxUsage = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      weddingId: v.id("weddings"),
      inboxId: v.string(),
      createdAt: v.number(),
      hasTraffic: v.boolean(),
    }),
  ),
  handler: async (ctx) => {
    const weddings = await ctx.db.query("weddings").take(500);
    const out = [];
    for (const wedding of weddings) {
      if (!wedding.inboxId) continue;
      const threads = await ctx.db
        .query("threads")
        .withIndex("by_weddingId", (q) => q.eq("weddingId", wedding._id))
        .take(50);
      out.push({
        weddingId: wedding._id,
        inboxId: wedding.inboxId,
        createdAt: wedding._creationTime,
        hasTraffic: threads.some((t) => t.lastOutboundAt !== undefined || t.lastInboundAt !== undefined),
      });
    }
    return out;
  },
});

/** Forget an inbox that has been handed to another couple, so nothing points at it. */
export const clearInbox = internalMutation({
  args: { weddingId: v.id("weddings") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.weddingId, { inboxId: undefined, inboxAddress: undefined });
    return null;
  },
});
