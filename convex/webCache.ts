import { ActionCache } from "@convex-dev/action-cache";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { vendorDetailValidator, vendorReviewValidator, type VendorDetail, type VendorReview } from "./lib/validators";

/**
 * Remembered web reads.
 *
 * Reading one vendor's site means mapping it and opening several pages, and looking up
 * its reviews means more searches. Neither answer depends on whose event is asking:
 * the same site, need and city give the same result. So the result is kept for a few
 * days and reused by every event and every "find more", instead of being fetched again.
 *
 * A read that came back empty is not remembered: it is usually a site that was briefly
 * down, and holding on to that for days would hide the vendor from everyone.
 */

const DAY = 24 * 60 * 60 * 1000;

const details = new ActionCache(components.actionCache, {
  action: internal.firecrawl.researchVendorDetail,
  // Change the name to discard everything remembered, e.g. when what is extracted changes.
  name: "vendor-detail-v1",
  ttl: 3 * DAY,
});

const reviews = new ActionCache(components.actionCache, {
  action: internal.firecrawl.lookupReviews,
  name: "vendor-reviews-v1",
  ttl: 7 * DAY,
});

const detailArgs = { url: v.string(), need: v.string(), city: v.string(), currency: v.optional(v.string()) };

export const vendorDetail = internalAction({
  args: detailArgs,
  returns: vendorDetailValidator,
  handler: async (ctx, args): Promise<VendorDetail> => {
    let detail: VendorDetail;
    try {
      detail = await details.fetch(ctx, args);
    } catch (err) {
      // The cache must never be the reason a search fails: read the site directly.
      console.warn("vendor detail cache unavailable; reading directly", err instanceof Error ? err.message : err);
      return await ctx.runAction(internal.firecrawl.researchVendorDetail, args);
    }
    if (detail.markdown.trim().length < 100) await details.remove(ctx, args);
    return detail;
  },
});

const reviewArgs = { businessName: v.string(), need: v.string(), city: v.string(), ownWebsite: v.optional(v.string()) };

export const vendorReviews = internalAction({
  args: reviewArgs,
  returns: vendorReviewValidator,
  handler: async (ctx, args): Promise<VendorReview> => {
    let review: VendorReview;
    try {
      review = await reviews.fetch(ctx, args);
    } catch (err) {
      console.warn("review cache unavailable; looking up directly", err instanceof Error ? err.message : err);
      return await ctx.runAction(internal.firecrawl.lookupReviews, args);
    }
    if (review.rating === undefined && review.highlights.length === 0) await reviews.remove(ctx, args);
    return review;
  },
});
