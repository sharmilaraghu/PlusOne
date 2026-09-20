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

/**
 * Forget one vendor conversation: its emails, the thread itself, and any quote read
 * from it. The vendor card stays, so the need looks researched but never contacted.
 *
 * `npx convex run maintenance:forgetVendorThread '{"vendorId":"..."}'`
 */
export const forgetVendorThread = internalMutation({
  args: { vendorId: v.id("vendors") },
  returns: v.object({ messages: v.number(), threads: v.number(), quotes: v.number() }),
  handler: async (ctx, args) => {
    const threads = await ctx.db
      .query("threads")
      .withIndex("by_vendorId", (q) => q.eq("vendorId", args.vendorId))
      .take(20);
    let messages = 0;
    let quotes = 0;
    for (const thread of threads) {
      for (const message of await ctx.db
        .query("messages")
        .withIndex("by_threadId", (q) => q.eq("threadId", thread._id))
        .take(200)) {
        await ctx.db.delete(message._id);
        messages++;
      }
      for (const quote of await ctx.db
        .query("quotes")
        .withIndex("by_vendorId", (q) => q.eq("vendorId", args.vendorId))
        .take(50)) {
        await ctx.db.delete(quote._id);
        quotes++;
      }
      // A need with nobody left to hear from is back to being researched.
      const others = (
        await ctx.db
          .query("threads")
          .withIndex("by_slotId", (q) => q.eq("slotId", thread.slotId))
          .take(20)
      ).filter((t) => t._id !== thread._id);
      const slot = await ctx.db.get(thread.slotId);
      if (slot && others.length === 0 && slot.status === "contacted") {
        await ctx.db.patch(slot._id, { status: "research" });
      }
      await ctx.db.delete(thread._id);
    }
    return { messages, threads: threads.length, quotes };
  },
});
