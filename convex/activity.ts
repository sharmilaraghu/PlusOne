import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { clampLimit, logActivity, requireMember } from "./lib/auth";
import { activityDoc } from "./lib/docs";
import { activityRefsValidator, activityType } from "./lib/validators";

export const list = query({
  args: { weddingId: v.id("weddings"), limit: v.optional(v.number()) },
  returns: v.array(activityDoc),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.weddingId);
    const limit = clampLimit(args.limit, 30, 50);
    return await ctx.db
      .query("activity")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .order("desc")
      .take(limit);
  },
});

export const log = internalMutation({
  args: {
    weddingId: v.id("weddings"),
    actorUserId: v.optional(v.id("users")),
    actorLabel: v.optional(v.string()),
    type: activityType,
    text: v.string(),
    refs: v.optional(activityRefsValidator),
  },
  returns: v.id("activity"),
  handler: async (ctx, args) => {
    return await logActivity(ctx, args);
  },
});
