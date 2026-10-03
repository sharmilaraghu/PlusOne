import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { deleteUserRecords } from "./lib/accounts";
import { startPurge } from "./maintenance";

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** A demo is for looking around; nobody comes back to one after a few days. */
export const DEMO_KEPT_FOR = 3 * DAY;
/** Long after any redelivery, so duplicate detection never loses a record it still needs. */
export const INBOUND_RECORDS_KEPT_FOR = 90 * DAY;
/** A search takes two or three minutes; one still "running" after this has died. */
export const SEARCH_GIVEN_UP_AFTER = 30 * MINUTE;

const DEMOS_PER_RUN = 10;

/**
 * The hourly tidy-up, in small batches so it never crowds out real work.
 *
 * - Old demos go, with the anonymous visitor who opened each one. Every visit to the
 *   demo makes a new visitor and a new copy of the demo event, so without this they
 *   pile up for ever.
 * - Records of inbound email that are long past any redelivery go.
 * - A search that has been "running" far longer than a search takes is marked failed,
 *   so the need can be searched again instead of waiting on something that died.
 */
export const sweep = internalMutation({
  args: {},
  returns: v.object({ demos: v.number(), inboundRecords: v.number(), searches: v.number() }),
  handler: async (ctx) => {
    const now = Date.now();

    const demos = await ctx.db
      .query("weddings")
      .withIndex("by_demo", (q) => q.eq("demo", true).lt("_creationTime", now - DEMO_KEPT_FOR))
      .take(DEMOS_PER_RUN);
    for (const demo of demos) {
      const visitor = await ctx.db.get(demo.createdBy);
      await startPurge(ctx, demo._id);
      if (visitor?.isAnonymous) await deleteUserRecords(ctx, visitor._id);
    }

    const oldInbound = await ctx.db.query("inboundEvents").order("asc").take(200);
    let inboundRecords = 0;
    for (const record of oldInbound) {
      if (record._creationTime >= now - INBOUND_RECORDS_KEPT_FOR) break;
      await ctx.db.delete(record._id);
      inboundRecords++;
    }

    const stuck = await ctx.db
      .query("researchRuns")
      .withIndex("by_status_and_startedAt", (q) => q.eq("status", "running").lt("startedAt", now - SEARCH_GIVEN_UP_AFTER))
      .take(50);
    for (const run of stuck) {
      await ctx.db.patch(run._id, {
        status: "failed",
        step: "Stopped",
        error: "This search stopped before it finished. Start it again.",
        finishedAt: now,
      });
    }

    // More old demos than one run clears: carry on straight away rather than in an hour.
    if (demos.length === DEMOS_PER_RUN) await ctx.scheduler.runAfter(0, internal.housekeeping.sweep, {});
    return { demos: demos.length, inboundRecords, searches: stuck.length };
  },
});
