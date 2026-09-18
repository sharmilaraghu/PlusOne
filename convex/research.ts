import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { logActivity, requireMember } from "./lib/auth";
import { researchRunDoc } from "./lib/docs";
import { workflow } from "./workflows";

export const start = mutation({
  args: { slotId: v.id("vendorSlots"), query: v.string(), area: v.optional(v.string()) },
  returns: v.id("researchRuns"),
  handler: async (ctx, args): Promise<Id<"researchRuns">> => {
    const slot = await ctx.db.get(args.slotId);
    if (!slot) throw new ConvexError("Slot not found.");
    const { userId, wedding } = await requireMember(ctx, slot.weddingId, "planner");
    if (slot.status === "booked") {
      throw new ConvexError(`${slot.title} is already booked. Un-book it first if you want to look again.`);
    }
    const q = args.query.trim();
    if (q.length < 3) throw new ConvexError("Describe what you are looking for in a few words.");
    if (q.length > 300) throw new ConvexError("Keep the search under 300 characters.");

    const running = await ctx.db
      .query("researchRuns")
      .withIndex("by_slotId", (s) => s.eq("slotId", args.slotId))
      .order("desc")
      .take(1);
    if (running[0]?.status === "running" && Date.now() - running[0].startedAt < 5 * 60_000) {
      throw new ConvexError("Research is already running for this slot. Give it a minute.");
    }

    // An explicit area overrides the wedding's own neighbourhood for this search only.
    const area = args.area?.trim().slice(0, 120) || wedding.area;
    const researchRunId = await ctx.db.insert("researchRuns", {
      weddingId: slot.weddingId,
      slotId: args.slotId,
      query: q,
      area: area || undefined,
      status: "running",
      step: "Queued",
      foundCount: 0,
      startedAt: Date.now(),
    });
    await logActivity(ctx, {
      weddingId: wedding._id,
      actorUserId: userId,
      type: "research_started",
      text: `started researching "${q}" for ${slot.title}.`,
      refs: { slotId: args.slotId },
    });
    await workflow.start(ctx, internal.workflows.researchWorkflow, { researchRunId });
    return researchRunId;
  },
});

export const latestForSlot = query({
  args: { slotId: v.id("vendorSlots") },
  returns: v.union(researchRunDoc, v.null()),
  handler: async (ctx, args) => {
    const slot = await ctx.db.get(args.slotId);
    if (!slot) throw new ConvexError("Slot not found.");
    await requireMember(ctx, slot.weddingId);
    const runs = await ctx.db
      .query("researchRuns")
      .withIndex("by_slotId", (q) => q.eq("slotId", args.slotId))
      .order("desc")
      .take(1);
    return runs[0] ?? null;
  },
});

// ---- internal ---------------------------------------------------------------

/** Start a research run without a signed-in caller (CLI checks, scheduled re-research). */
export const startForSlot = internalMutation({
  args: { slotId: v.id("vendorSlots"), query: v.string(), area: v.optional(v.string()) },
  returns: v.union(v.id("researchRuns"), v.null()),
  handler: async (ctx, args): Promise<Id<"researchRuns"> | null> => {
    const slot = await ctx.db.get(args.slotId);
    if (!slot) return null;
    const q = args.query.trim().slice(0, 300);
    if (q.length < 3) return null;
    const wedding = await ctx.db.get(slot.weddingId);
    const researchRunId = await ctx.db.insert("researchRuns", {
      weddingId: slot.weddingId,
      slotId: args.slotId,
      query: q,
      area: args.area?.trim().slice(0, 120) || wedding?.area,
      status: "running",
      step: "Queued",
      foundCount: 0,
      startedAt: Date.now(),
    });
    await workflow.start(ctx, internal.workflows.researchWorkflow, { researchRunId });
    return researchRunId;
  },
});

export const getRun = internalQuery({
  args: { researchRunId: v.id("researchRuns") },
  returns: v.union(researchRunDoc, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.researchRunId);
  },
});

export const setStep = internalMutation({
  args: { researchRunId: v.id("researchRuns"), step: v.string(), foundCount: v.optional(v.number()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.researchRunId);
    if (!run) return null;
    await ctx.db.patch(args.researchRunId, {
      step: args.step,
      ...(args.foundCount !== undefined ? { foundCount: args.foundCount } : {}),
    });
    return null;
  },
});

export const finish = internalMutation({
  args: {
    researchRunId: v.id("researchRuns"),
    status: v.union(v.literal("done"), v.literal("failed")),
    foundCount: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.researchRunId);
    if (!run) return null;
    await ctx.db.patch(args.researchRunId, {
      status: args.status,
      step: args.status === "done" ? `Done — ${args.foundCount ?? run.foundCount} vendors found` : "Failed",
      foundCount: args.foundCount ?? run.foundCount,
      error: args.error,
      finishedAt: Date.now(),
    });
    if (args.status === "done") {
      const slot = await ctx.db.get(run.slotId);
      await logActivity(ctx, {
        weddingId: run.weddingId,
        type: "note",
        text: `Research finished for ${slot?.title ?? "a slot"}: ${args.foundCount ?? run.foundCount} vendors found.`,
        refs: { slotId: run.slotId },
      });
    }
    return null;
  },
});
