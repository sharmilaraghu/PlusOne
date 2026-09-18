import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";
import {
  styleFormality,
  activityRefsValidator,
  activityType,
  attachmentValidator,
  chatRole,
  chatStatus,
  contractStatus,
  cultureTemplate,
  extractedValidator,
  flagSeverity,
  importStatus,
  messageDirection,
  messageKind,
  messageStatus,
  packageValidator,
  replyClassification,
  researchStatus,
  role,
  routedAs,
  rsvpStatus,
  slotStatus,
  threadStatus,
} from "./lib/validators";

/**
 * Field validators are exported so `lib/docs.ts` can build exact document
 * validators for `returns` without duplicating the shapes.
 */

export const weddingFields = {
  name: v.string(),
  partnerA: v.string(),
  partnerB: v.string(),
  startDate: v.string(), // YYYY-MM-DD
  endDate: v.string(),
  city: v.string(),
  /** Optional neighbourhood / district inside the city, e.g. "Bandra West", "Park Slope". */
  area: v.optional(v.string()),
  country: v.optional(v.string()),
  currency: v.string(),
  totalBudget: v.number(),
  template: cultureTemplate,
  styleSummary: v.optional(v.string()),
  inspirationUrl: v.optional(v.string()),
  /** How the couple describe the feel they want; shapes vendor searches and email tone. */
  styleVibes: v.optional(v.array(v.string())),
  stylePalette: v.optional(v.string()),
  styleFormality: v.optional(styleFormality),
  inboxId: v.optional(v.string()),
  inboxAddress: v.optional(v.string()),
  createdBy: v.id("users"),
};

export const memberFields = {
  weddingId: v.id("weddings"),
  userId: v.id("users"),
  role,
  invitedEmail: v.optional(v.string()),
};

export const inviteFields = {
  weddingId: v.id("weddings"),
  token: v.string(),
  role,
  email: v.optional(v.string()),
  createdBy: v.id("users"),
  acceptedBy: v.optional(v.id("users")),
  acceptedAt: v.optional(v.number()),
};

export const eventFields = {
  weddingId: v.id("weddings"),
  name: v.string(),
  dayIndex: v.number(),
  date: v.string(),
  guestCount: v.number(),
  budget: v.number(),
  color: v.string(),
  order: v.number(),
  description: v.optional(v.string()),
};

export const vendorSlotFields = {
  weddingId: v.id("weddings"),
  eventIds: v.array(v.id("events")),
  category: v.string(),
  title: v.string(),
  budget: v.number(),
  status: slotStatus,
  bookedVendorId: v.optional(v.id("vendors")),
  notes: v.optional(v.string()),
};

export const vendorFields = {
  weddingId: v.id("weddings"),
  slotId: v.optional(v.id("vendorSlots")),
  name: v.string(),
  website: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  city: v.optional(v.string()),
  category: v.string(),
  startingPrice: v.optional(v.number()),
  /** Currency of `startingPrice` as found on the vendor's own page — NOT the wedding's currency. */
  priceCurrency: v.optional(v.string()),
  priceNotes: v.optional(v.string()),
  packages: v.array(packageValidator),
  capacity: v.optional(v.string()),
  ratingText: v.optional(v.string()),
  /** Service area / address exactly as the vendor's own pages state it. Never geocoded. */
  serviceArea: v.optional(v.string()),
  highlights: v.array(v.string()),
  sourceUrls: v.array(v.string()),
  summary: v.optional(v.string()),
  shortlisted: v.boolean(),
  scrapedAt: v.number(),
  // Phase 2b: evidence gathered from review directories, contact pages and ranking.
  rating: v.optional(v.number()), // out of 5, only ever from a scraped review page
  reviewCount: v.optional(v.number()),
  reviewSource: v.optional(v.string()),
  reviewHighlights: v.array(v.string()),
  contactFormUrl: v.optional(v.string()),
  hasContactFormOnly: v.optional(v.boolean()),
  score: v.optional(v.number()), // 0-100, written by openai.rankVendors
  rankReason: v.optional(v.string()),
  isTopPick: v.optional(v.boolean()),
  pagesRead: v.array(v.string()), // the urls actually scraped for this vendor
};

export const researchRunFields = {
  weddingId: v.id("weddings"),
  slotId: v.id("vendorSlots"),
  query: v.string(),
  /** Neighbourhood to bias this one search towards; overrides the wedding's area. */
  area: v.optional(v.string()),
  status: researchStatus,
  step: v.string(),
  foundCount: v.number(),
  error: v.optional(v.string()),
  startedAt: v.number(),
  finishedAt: v.optional(v.number()),
};

export const threadFields = {
  weddingId: v.id("weddings"),
  vendorId: v.id("vendors"),
  slotId: v.id("vendorSlots"),
  agentmailThreadId: v.optional(v.string()),
  status: threadStatus,
  lastInboundMessageId: v.optional(v.string()),
  lastOutboundAt: v.optional(v.number()),
  lastInboundAt: v.optional(v.number()),
  nextFollowUpAt: v.optional(v.number()),
  followUpCount: v.number(),
  attentionReason: v.optional(v.string()),
};

export const messageFields = {
  weddingId: v.id("weddings"),
  threadId: v.optional(v.id("threads")),
  guestId: v.optional(v.id("guests")),
  direction: messageDirection,
  kind: messageKind,
  status: messageStatus,
  fromAddress: v.string(),
  toAddress: v.string(),
  subject: v.string(),
  bodyText: v.string(),
  agentmailMessageId: v.optional(v.string()),
  agentmailThreadId: v.optional(v.string()),
  attachments: v.array(attachmentValidator),
  classification: v.optional(replyClassification),
  extracted: v.optional(extractedValidator),
  idempotencyKey: v.optional(v.string()),
  errorMessage: v.optional(v.string()),
  sentAt: v.optional(v.number()),
  receivedAt: v.optional(v.number()),
};

export const quoteFields = {
  weddingId: v.id("weddings"),
  slotId: v.id("vendorSlots"),
  vendorId: v.id("vendors"),
  threadId: v.id("threads"),
  messageId: v.id("messages"),
  total: v.number(),
  deposit: v.optional(v.number()),
  currency: v.string(),
  includes: v.array(v.string()),
  excludes: v.array(v.string()),
  validUntil: v.optional(v.string()),
  redFlags: v.array(v.string()),
  summary: v.string(),
};

export const budgetLineFields = {
  weddingId: v.id("weddings"),
  eventId: v.optional(v.id("events")),
  slotId: v.optional(v.id("vendorSlots")),
  label: v.string(),
  planned: v.number(),
  committed: v.number(),
  paid: v.number(),
};

export const guestFields = {
  weddingId: v.id("weddings"),
  name: v.string(),
  email: v.optional(v.string()),
  side: v.optional(v.string()),
  partySize: v.number(),
  rsvp: rsvpStatus,
  attendingCount: v.number(),
  dietary: v.optional(v.string()),
  eventIds: v.array(v.id("events")),
  lastInvitedAt: v.optional(v.number()),
  lastRemindedAt: v.optional(v.number()),
  notes: v.optional(v.string()),
};

export const taskFields = {
  weddingId: v.id("weddings"),
  title: v.string(),
  dueAt: v.optional(v.number()),
  eventId: v.optional(v.id("events")),
  done: v.boolean(),
  autoSource: v.optional(v.string()),
};

export const chatMessageFields = {
  weddingId: v.id("weddings"),
  userId: v.optional(v.id("users")),
  role: chatRole,
  content: v.string(),
  toolCalls: v.optional(
    v.array(
      v.object({
        name: v.string(),
        args: v.any(),
        result: v.optional(v.any()),
        status: v.string(),
      }),
    ),
  ),
  status: v.optional(chatStatus),
};

export const activityFields = {
  weddingId: v.id("weddings"),
  actorUserId: v.optional(v.id("users")),
  actorLabel: v.string(),
  type: activityType,
  text: v.string(),
  refs: v.optional(activityRefsValidator),
};

export const inboundEventFields = {
  agentmailMessageId: v.string(),
  eventId: v.string(),
  inboxId: v.string(),
  threadId: v.optional(v.string()),
  fromAddress: v.string(),
  routedAs,
  weddingId: v.optional(v.id("weddings")),
  error: v.optional(v.string()),
  processedAt: v.optional(v.number()),
};

export const contractCheckFields = {
  weddingId: v.id("weddings"),
  storageId: v.id("_storage"),
  filename: v.string(),
  vendorId: v.optional(v.id("vendors")),
  status: contractStatus,
  summary: v.optional(v.string()),
  flags: v.array(
    v.object({
      severity: flagSeverity,
      clause: v.string(),
      why: v.string(),
    }),
  ),
};

export const importFields = {
  weddingId: v.id("weddings"),
  storageId: v.optional(v.id("_storage")),
  rawText: v.optional(v.string()),
  status: importStatus,
  preview: v.optional(v.any()),
  error: v.optional(v.string()),
};

export default defineSchema({
  ...authTables,

  weddings: defineTable(weddingFields).index("by_inboxId", ["inboxId"]),

  members: defineTable(memberFields)
    .index("by_weddingId", ["weddingId"])
    .index("by_userId", ["userId"])
    .index("by_weddingId_and_userId", ["weddingId", "userId"]),

  invites: defineTable(inviteFields)
    .index("by_token", ["token"])
    .index("by_weddingId", ["weddingId"]),

  events: defineTable(eventFields).index("by_weddingId", ["weddingId"]),

  vendorSlots: defineTable(vendorSlotFields)
    .index("by_weddingId", ["weddingId"])
    .index("by_weddingId_and_status", ["weddingId", "status"]),

  vendors: defineTable(vendorFields)
    .index("by_weddingId", ["weddingId"])
    .index("by_slotId", ["slotId"])
    .index("by_slotId_and_score", ["slotId", "score"])
    .index("by_weddingId_and_website", ["weddingId", "website"]),

  researchRuns: defineTable(researchRunFields)
    .index("by_slotId", ["slotId"])
    .index("by_weddingId", ["weddingId"]),

  threads: defineTable(threadFields)
    .index("by_weddingId", ["weddingId"])
    .index("by_vendorId", ["vendorId"])
    .index("by_agentmailThreadId", ["agentmailThreadId"])
    .index("by_status_and_nextFollowUpAt", ["status", "nextFollowUpAt"]),

  messages: defineTable(messageFields)
    .index("by_threadId", ["threadId"])
    .index("by_weddingId", ["weddingId"])
    .index("by_agentmailMessageId", ["agentmailMessageId"])
    .index("by_idempotencyKey", ["idempotencyKey"])
    .index("by_guestId", ["guestId"]),

  quotes: defineTable(quoteFields)
    .index("by_slotId", ["slotId"])
    .index("by_weddingId", ["weddingId"])
    .index("by_vendorId", ["vendorId"]),

  budgetLines: defineTable(budgetLineFields)
    .index("by_weddingId", ["weddingId"])
    .index("by_slotId", ["slotId"]),

  guests: defineTable(guestFields)
    .index("by_weddingId", ["weddingId"])
    .index("by_weddingId_and_email", ["weddingId", "email"]),

  tasks: defineTable(taskFields).index("by_weddingId", ["weddingId"]),

  chatMessages: defineTable(chatMessageFields).index("by_weddingId", ["weddingId"]),

  activity: defineTable(activityFields).index("by_weddingId", ["weddingId"]),

  inboundEvents: defineTable(inboundEventFields)
    .index("by_agentmailMessageId", ["agentmailMessageId"])
    .index("by_eventId", ["eventId"]),

  contractChecks: defineTable(contractCheckFields).index("by_weddingId", ["weddingId"]),

  imports: defineTable(importFields).index("by_weddingId", ["weddingId"]),
});
