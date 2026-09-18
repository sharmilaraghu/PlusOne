import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

const CHILD_TABLES = [
  "members",
  "invites",
  "events",
  "vendorSlots",
  "vendors",
  "researchRuns",
  "threads",
  "messages",
  "quotes",
  "budgetLines",
  "guests",
  "tasks",
  "chatMessages",
  "activity",
  "contractChecks",
  "imports",
] as const;

/**
 * Deletes one wedding and every row that belongs to it, in batches.
 * Run repeatedly until it returns { done: true }.
 * `npx convex run maintenance:deleteWedding '{"weddingId":"..."}'`
 */
export const deleteWedding = internalMutation({
  args: { weddingId: v.id("weddings") },
  returns: v.object({ done: v.boolean(), deleted: v.number() }),
  handler: async (ctx, args) => {
    let deleted = 0;
    for (const table of CHILD_TABLES) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
        .take(200);
      for (const row of rows) {
        await ctx.db.delete(row._id);
        deleted++;
      }
      if (rows.length === 200) return { done: false, deleted };
    }
    const wedding = await ctx.db.get(args.weddingId);
    if (wedding) {
      await ctx.db.delete(args.weddingId);
      deleted++;
    }
    return { done: true, deleted };
  },
});
