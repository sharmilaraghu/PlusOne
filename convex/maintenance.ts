import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

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
      // The inbox goes back to AgentMail: the allowance is small, and a deleted
      // wedding holding one means the next couple has to share the fallback.
      if (wedding.inboxId) {
        await ctx.scheduler.runAfter(0, internal.agentmail.releaseInbox, { inboxId: wedding.inboxId });
      }
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

/**
 * Wipe every search result for one wedding: the vendors found, the runs that found
 * them, and any conversation with those vendors. The needs themselves stay, back to
 * being unresearched, so a demo can start from a clean slate.
 *
 * `npx convex run maintenance:resetResearch '{"weddingId":"..."}'`
 */
export const resetResearch = internalMutation({
  args: { weddingId: v.id("weddings") },
  returns: v.object({ vendors: v.number(), runs: v.number(), threads: v.number(), messages: v.number() }),
  handler: async (ctx, args) => {
    let messages = 0;
    const threads = await ctx.db
      .query("threads")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(200);
    for (const thread of threads) {
      for (const message of await ctx.db
        .query("messages")
        .withIndex("by_threadId", (q) => q.eq("threadId", thread._id))
        .take(200)) {
        await ctx.db.delete(message._id);
        messages++;
      }
      await ctx.db.delete(thread._id);
    }
    for (const quote of await ctx.db
      .query("quotes")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(200)) {
      await ctx.db.delete(quote._id);
    }
    const vendors = await ctx.db
      .query("vendors")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(400);
    for (const vendor of vendors) await ctx.db.delete(vendor._id);
    const runs = await ctx.db
      .query("researchRuns")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(200);
    for (const run of runs) await ctx.db.delete(run._id);
    for (const slot of await ctx.db
      .query("vendorSlots")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(100)) {
      if (slot.status !== "booked") await ctx.db.patch(slot._id, { status: "research", bookedVendorId: undefined });
    }
    return { vendors: vendors.length, runs: runs.length, threads: threads.length, messages };
  },
});

/**
 * Put one vendor on a need without searching for it, for a demo or a walkthrough.
 *
 * `npx convex run maintenance:seedVendor '{"slotId":"...","name":"...","email":"..."}'`
 */
export const seedVendor = internalMutation({
  args: {
    slotId: v.id("vendorSlots"),
    name: v.string(),
    email: v.string(),
    city: v.optional(v.string()),
    website: v.optional(v.string()),
    summary: v.optional(v.string()),
    startingPrice: v.optional(v.number()),
    rating: v.optional(v.number()),
    reviewCount: v.optional(v.number()),
    score: v.optional(v.number()),
    rankReason: v.optional(v.string()),
    isTopPick: v.optional(v.boolean()),
    highlights: v.optional(v.array(v.string())),
  },
  returns: v.id("vendors"),
  handler: async (ctx, args) => {
    const slot = await ctx.db.get(args.slotId);
    if (!slot) throw new Error("Slot not found");
    return await ctx.db.insert("vendors", {
      weddingId: slot.weddingId,
      slotId: slot._id,
      name: args.name,
      email: args.email,
      website: args.website,
      city: args.city,
      category: slot.category,
      startingPrice: args.startingPrice,
      priceUnit: args.startingPrice ? "total" : undefined,
      priceCurrency: args.startingPrice ? "USD" : undefined,
      packages: [],
      highlights: args.highlights ?? [],
      sourceUrls: args.website ? [args.website] : [],
      summary: args.summary,
      shortlisted: args.isTopPick ?? false,
      scrapedAt: Date.now(),
      rating: args.rating,
      reviewCount: args.reviewCount,
      reviewSource: args.rating ? args.website : undefined,
      reviewHighlights: [],
      score: args.score,
      rankReason: args.rankReason,
      isTopPick: args.isTopPick ?? false,
      pagesRead: [],
    });
  },
});

/**
 * Replace one email address wherever a wedding's rows carry it: a guest's address and the
 * from/to of stored emails and inbound events. For taking a person's own address out of
 * test data. Whole-address match, case-insensitive; nothing else on the row changes. A
 * guest whose address is replaced can no longer be matched to a new reply, which is the
 * point. One table and one page per call: pass the returned cursor back until `done`.
 *
 * `npx convex run maintenance:replaceAddress '{"table":"guests","find":"me@x.com","replaceWith":"guest@removed.example","cursor":null}'`
 */
export const replaceAddress = internalMutation({
  args: {
    table: v.union(v.literal("guests"), v.literal("messages"), v.literal("inboundEvents")),
    find: v.string(),
    replaceWith: v.string(),
    cursor: v.union(v.string(), v.null()),
  },
  returns: v.object({
    scanned: v.number(),
    changed: v.number(),
    cursor: v.union(v.string(), v.null()),
    done: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const find = args.find.trim().toLowerCase();
    const same = (value: string | undefined) => value !== undefined && value.trim().toLowerCase() === find;
    const paginationOpts = { numItems: 200, cursor: args.cursor };
    let changed = 0;
    let result;
    if (args.table === "guests") {
      result = await ctx.db.query("guests").paginate(paginationOpts);
      for (const row of result.page) {
        if (same(row.email)) {
          await ctx.db.patch(row._id, { email: args.replaceWith });
          changed++;
        }
      }
    } else if (args.table === "messages") {
      result = await ctx.db.query("messages").paginate(paginationOpts);
      for (const row of result.page) {
        if (same(row.fromAddress) || same(row.toAddress)) {
          await ctx.db.patch(row._id, {
            fromAddress: same(row.fromAddress) ? args.replaceWith : row.fromAddress,
            toAddress: same(row.toAddress) ? args.replaceWith : row.toAddress,
          });
          changed++;
        }
      }
    } else {
      result = await ctx.db.query("inboundEvents").paginate(paginationOpts);
      for (const row of result.page) {
        if (same(row.fromAddress)) {
          await ctx.db.patch(row._id, { fromAddress: args.replaceWith });
          changed++;
        }
      }
    }
    return {
      scanned: result.page.length,
      changed,
      cursor: result.isDone ? null : result.continueCursor,
      done: result.isDone,
    };
  },
});
