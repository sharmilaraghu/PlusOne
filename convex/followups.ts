import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { logActivity } from "./lib/auth";
import { workflow } from "./workflows";

const MAX_FOLLOW_UPS = 3;

/** Hourly cron: nudge vendors who have not replied; escalate after 3 nudges. */
export const tick = internalMutation({
  args: {},
  returns: v.object({ started: v.number(), escalated: v.number() }),
  handler: async (ctx): Promise<{ started: number; escalated: number }> => {
    const now = Date.now();
    // Same range as threads.listDueForFollowUp, read directly inside this transaction.
    const due = await ctx.db
      .query("threads")
      .withIndex("by_status_and_nextFollowUpAt", (q) =>
        q.eq("status", "sent").gte("nextFollowUpAt", 1).lte("nextFollowUpAt", now),
      )
      .take(20);
    let started = 0;
    let escalated = 0;
    for (const thread of due) {
      if (thread.followUpCount >= MAX_FOLLOW_UPS) {
        await ctx.db.patch(thread._id, {
          status: "needs_attention",
          attentionReason: "max_follow_ups",
          nextFollowUpAt: undefined,
        });
        const vendor = await ctx.db.get(thread.vendorId);
        await logActivity(ctx, {
          weddingId: thread.weddingId,
          type: "note",
          text: `${vendor?.name ?? "A vendor"} has not replied after ${MAX_FOLLOW_UPS} follow-ups. Needs your attention.`,
          refs: { threadId: thread._id, vendorId: thread.vendorId, slotId: thread.slotId },
        });
        escalated += 1;
        continue;
      }
      // Clear the due time first so the next tick does not pick it up twice.
      await ctx.db.patch(thread._id, { status: "sent", nextFollowUpAt: undefined });
      await workflow.start(ctx, internal.workflows.followUpWorkflow, { threadId: thread._id });
      started += 1;
    }
    return { started, escalated };
  },
});
