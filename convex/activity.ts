import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { clampLimit, logActivity, nameFromEmail, requireMember } from "./lib/auth";
import { activityDoc } from "./lib/docs";
import { activityRefsValidator, activityType } from "./lib/validators";

/** What a couple sees when PlusOne can start writing on their behalf. */
export const INBOX_READY_TEXT = "PlusOne is ready to email vendors for you.";

export const list = query({
  args: { weddingId: v.id("weddings"), limit: v.optional(v.number()) },
  returns: v.array(activityDoc),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.weddingId);
    const limit = clampLimit(args.limit, 30, 50);
    const rows = await ctx.db
      .query("activity")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .order("desc")
      .take(limit);
    // Older entries named the mailbox address, or signed themselves with one.
    return rows.map((r) => ({
      ...r,
      ...(r.type === "inbox_ready" ? { text: INBOX_READY_TEXT } : {}),
      actorLabel: r.actorLabel.includes("@") ? (nameFromEmail(r.actorLabel) ?? "Someone") : r.actorLabel,
    }));
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
