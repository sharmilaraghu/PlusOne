import { v, type Infer } from "convex/values";

/** Shared enum validators. Export both the validator and the TS type. */

export const role = v.union(v.literal("owner"), v.literal("planner"), v.literal("viewer"));
export type Role = Infer<typeof role>;

export const cultureTemplate = v.union(
  v.literal("hindu"),
  v.literal("muslim"),
  v.literal("sikh"),
  v.literal("western"),
  v.literal("jewish"),
  v.literal("fusion"),
  v.literal("custom"),
);
export type CultureTemplate = Infer<typeof cultureTemplate>;

export const slotStatus = v.union(
  v.literal("research"),
  v.literal("contacted"),
  v.literal("quoted"),
  v.literal("booked"),
);
export type SlotStatus = Infer<typeof slotStatus>;

export const threadStatus = v.union(
  v.literal("draft"),
  v.literal("sent"),
  v.literal("replied"),
  v.literal("quoted"),
  v.literal("booked"),
  v.literal("declined"),
  v.literal("needs_attention"),
);
export type ThreadStatus = Infer<typeof threadStatus>;

export const messageDirection = v.union(v.literal("in"), v.literal("out"));
export type MessageDirection = Infer<typeof messageDirection>;

export const messageKind = v.union(
  v.literal("inquiry"),
  v.literal("follow_up"),
  v.literal("vendor_reply"),
  v.literal("rsvp_invite"),
  v.literal("rsvp_reply"),
  v.literal("guest_question"),
  v.literal("notification"),
  v.literal("invite"),
);
export type MessageKind = Infer<typeof messageKind>;

export const messageStatus = v.union(
  v.literal("draft"),
  v.literal("queued"),
  v.literal("sending"),
  v.literal("sent"),
  v.literal("failed"),
  v.literal("received"),
);
export type MessageStatus = Infer<typeof messageStatus>;

export const replyClassification = v.union(
  v.literal("quote"),
  v.literal("question"),
  v.literal("declined"),
  v.literal("available"),
  v.literal("other"),
);
export type ReplyClassification = Infer<typeof replyClassification>;

export const rsvpStatus = v.union(
  v.literal("pending"),
  v.literal("yes"),
  v.literal("no"),
  v.literal("maybe"),
);
export type RsvpStatus = Infer<typeof rsvpStatus>;

export const activityType = v.union(
  v.literal("wedding_created"),
  v.literal("inbox_ready"),
  v.literal("research_started"),
  v.literal("vendor_found"),
  v.literal("inquiry_sent"),
  v.literal("vendor_replied"),
  v.literal("quote_received"),
  v.literal("follow_up_sent"),
  v.literal("booked"),
  v.literal("guest_rsvp"),
  v.literal("member_joined"),
  v.literal("task_done"),
  v.literal("note"),
);
export type ActivityType = Infer<typeof activityType>;

export const researchStatus = v.union(v.literal("running"), v.literal("done"), v.literal("failed"));
export type ResearchStatus = Infer<typeof researchStatus>;

export const routedAs = v.union(
  v.literal("pending"),
  v.literal("vendor_reply"),
  v.literal("guest_reply"),
  v.literal("contract"),
  v.literal("unknown_sender"),
  v.literal("duplicate"),
  v.literal("error"),
);
export type RoutedAs = Infer<typeof routedAs>;

export const contractStatus = v.union(v.literal("pending"), v.literal("done"), v.literal("failed"));
export const importStatus = v.union(
  v.literal("pending"),
  v.literal("mapped"),
  v.literal("committed"),
  v.literal("failed"),
);
export const chatRole = v.union(v.literal("user"), v.literal("assistant"), v.literal("tool"));
export const chatStatus = v.union(v.literal("thinking"), v.literal("done"), v.literal("error"));
export const flagSeverity = v.union(v.literal("low"), v.literal("medium"), v.literal("high"));

/** Sub-object validators reused by schema + returns. */
export const packageValidator = v.object({
  name: v.string(),
  price: v.optional(v.number()),
  description: v.optional(v.string()),
});

export const attachmentValidator = v.object({
  storageId: v.id("_storage"),
  filename: v.string(),
  contentType: v.string(),
  size: v.number(),
});

export const extractedValidator = v.object({
  total: v.optional(v.number()),
  deposit: v.optional(v.number()),
  currency: v.optional(v.string()),
  availability: v.optional(v.string()),
  includes: v.array(v.string()),
  excludes: v.array(v.string()),
  deadline: v.optional(v.string()),
  summary: v.string(),
});
export type Extracted = Infer<typeof extractedValidator>;

export const activityRefsValidator = v.object({
  vendorId: v.optional(v.id("vendors")),
  threadId: v.optional(v.id("threads")),
  slotId: v.optional(v.id("vendorSlots")),
  guestId: v.optional(v.id("guests")),
  eventId: v.optional(v.id("events")),
});

/**
 * What a published price is actually for. A caterer's "$200" is per head, not a total,
 * and treating it as a total ranked one first for being "under budget" in testing.
 */
export const priceUnit = v.union(
  v.literal("total"),
  v.literal("per_person"),
  v.literal("per_hour"),
  v.literal("per_day"),
  v.literal("other"),
);
export type PriceUnit = Infer<typeof priceUnit>;

/** Vendor card produced by OpenAI from scraped pages (input to vendors.upsertMany). */
export const vendorCardValidator = v.object({
  name: v.string(),
  website: v.string(),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  city: v.optional(v.string()),
  startingPrice: v.optional(v.number()),
  priceUnit: v.optional(priceUnit),
  priceCurrency: v.optional(v.string()),
  priceNotes: v.optional(v.string()),
  packages: v.array(packageValidator),
  capacity: v.optional(v.string()),
  ratingText: v.optional(v.string()),
  highlights: v.array(v.string()),
  sourceUrls: v.array(v.string()),
  summary: v.string(),
  // Phase 2b evidence merged in by the research workflow (never invented by the LLM).
  rating: v.optional(v.number()),
  reviewCount: v.optional(v.number()),
  reviewSource: v.optional(v.string()),
  reviewHighlights: v.optional(v.array(v.string())),
  contactFormUrl: v.optional(v.string()),
  hasContactFormOnly: v.optional(v.boolean()),
  pagesRead: v.optional(v.array(v.string())),
  /** The service area / address exactly as the scraped pages state it. No geocoding. */
  serviceArea: v.optional(v.string()),
});
export type VendorCard = Infer<typeof vendorCardValidator>;

/** What `firecrawl.researchVendorDetail` returns for one vendor. */
export const vendorDetailValidator = v.object({
  url: v.string(),
  title: v.optional(v.string()),
  businessName: v.optional(v.string()),
  emails: v.array(v.string()),
  phone: v.optional(v.string()),
  startingPrice: v.optional(v.number()),
  priceUnit: v.optional(priceUnit),
  priceText: v.optional(v.string()),
  currency: v.optional(v.string()),
  packages: v.array(packageValidator),
  servesCity: v.optional(v.string()),
  address: v.optional(v.string()),
  hasContactFormOnly: v.optional(v.boolean()),
  contactFormUrl: v.optional(v.string()),
  pagesRead: v.array(v.string()),
  markdown: v.string(),
  ms: v.number(),
});
export type VendorDetail = Infer<typeof vendorDetailValidator>;

/** What `firecrawl.lookupReviews` returns. Every field is null when nothing was found. */
export const vendorReviewValidator = v.object({
  rating: v.optional(v.number()),
  reviewCount: v.optional(v.number()),
  reviewSource: v.optional(v.string()),
  highlights: v.array(v.string()),
  ms: v.number(),
});
export type VendorReview = Infer<typeof vendorReviewValidator>;

/** How formal the celebration is; sets the tone of the emails PlusOne writes. */
export const styleFormality = v.union(v.literal("relaxed"), v.literal("smart"), v.literal("formal"));
export type StyleFormality = "relaxed" | "smart" | "formal";
