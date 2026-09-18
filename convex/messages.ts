import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { messageDoc, threadDoc, vendorDoc, vendorSlotDoc, weddingDoc } from "./lib/docs";
import { MAX_BODY_CHARS, truncate } from "./lib/text";
import {
  attachmentValidator,
  extractedValidator,
  messageKind,
  replyClassification,
} from "./lib/validators";

/**
 * Outbound rows are created here by OpenAI drafting / follow-ups / invites.
 * `idempotencyKey` dedupes: a second call with the same key updates the draft
 * (while it is still a draft) instead of creating a duplicate row.
 */
export const createOutboundDraft = internalMutation({
  args: {
    weddingId: v.id("weddings"),
    threadId: v.optional(v.id("threads")),
    guestId: v.optional(v.id("guests")),
    kind: messageKind,
    status: v.union(v.literal("draft"), v.literal("queued")),
    fromAddress: v.string(),
    toAddress: v.string(),
    subject: v.string(),
    bodyText: v.string(),
    idempotencyKey: v.optional(v.string()),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const bodyText = truncate(args.bodyText, MAX_BODY_CHARS);
    const subject = args.subject.slice(0, 200);
    if (args.idempotencyKey) {
      const existing = await ctx.db
        .query("messages")
        .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", args.idempotencyKey))
        .first();
      if (existing) {
        if (existing.status === "draft") {
          await ctx.db.patch(existing._id, { subject, bodyText, toAddress: args.toAddress, fromAddress: args.fromAddress });
        } else if (existing.status === "failed") {
          // The key is derived from a counter that only advances on a successful send, so
          // a failed message would otherwise hold its key forever and every retry would
          // quietly reuse the corpse. Rewrite it and let it be queued again.
          await ctx.db.patch(existing._id, {
            subject,
            bodyText,
            toAddress: args.toAddress,
            fromAddress: args.fromAddress,
            status: args.status,
            errorMessage: undefined,
          });
        }
        return existing._id;
      }
    }
    return await ctx.db.insert("messages", {
      weddingId: args.weddingId,
      threadId: args.threadId,
      guestId: args.guestId,
      direction: "out",
      kind: args.kind,
      status: args.status,
      fromAddress: args.fromAddress,
      toAddress: args.toAddress,
      subject,
      bodyText,
      attachments: [],
      idempotencyKey: args.idempotencyKey,
    });
  },
});

export const getInternal = internalQuery({
  args: { messageId: v.id("messages") },
  returns: v.union(messageDoc, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.messageId);
  },
});

/** Message + the rows an action needs to send or interpret it. */
export const getContext = internalQuery({
  args: { messageId: v.id("messages") },
  returns: v.union(
    v.object({
      message: messageDoc,
      wedding: weddingDoc,
      thread: v.union(threadDoc, v.null()),
      vendor: v.union(vendorDoc, v.null()),
      slot: v.union(vendorSlotDoc, v.null()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return null;
    const wedding = await ctx.db.get(message.weddingId);
    if (!wedding) return null;
    const thread = message.threadId ? await ctx.db.get(message.threadId) : null;
    const vendor = thread ? await ctx.db.get(thread.vendorId) : null;
    const slot = thread ? await ctx.db.get(thread.slotId) : null;
    return { message, wedding, thread, vendor, slot };
  },
});

/** Compare-and-set queued -> sending. Returns false if someone else already took it. */
export const markSending = internalMutation({
  args: { messageId: v.id("messages") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message || message.status !== "queued") return false;
    await ctx.db.patch(args.messageId, { status: "sending", errorMessage: undefined });
    return true;
  },
});

export const markSent = internalMutation({
  args: {
    messageId: v.id("messages"),
    agentmailMessageId: v.string(),
    agentmailThreadId: v.optional(v.string()),
    sentAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      status: "sent",
      agentmailMessageId: args.agentmailMessageId,
      agentmailThreadId: args.agentmailThreadId,
      sentAt: args.sentAt,
      errorMessage: undefined,
    });
    return null;
  },
});

export const markFailed = internalMutation({
  args: { messageId: v.id("messages"), error: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, { status: "failed", errorMessage: args.error.slice(0, 1000) });
    return null;
  },
});

/** Store an inbound email. Idempotent on the AgentMail message id. */
export const recordInbound = internalMutation({
  args: {
    weddingId: v.id("weddings"),
    threadId: v.optional(v.id("threads")),
    guestId: v.optional(v.id("guests")),
    kind: messageKind,
    fromAddress: v.string(),
    toAddress: v.string(),
    subject: v.string(),
    bodyText: v.string(),
    agentmailMessageId: v.string(),
    agentmailThreadId: v.optional(v.string()),
    attachments: v.array(attachmentValidator),
    receivedAt: v.number(),
  },
  returns: v.object({ messageId: v.id("messages"), created: v.boolean() }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("messages")
      .withIndex("by_agentmailMessageId", (q) => q.eq("agentmailMessageId", args.agentmailMessageId))
      .first();
    if (existing) return { messageId: existing._id, created: false };
    const messageId = await ctx.db.insert("messages", {
      weddingId: args.weddingId,
      threadId: args.threadId,
      guestId: args.guestId,
      direction: "in",
      kind: args.kind,
      status: "received",
      fromAddress: args.fromAddress,
      toAddress: args.toAddress,
      subject: args.subject.slice(0, 500),
      bodyText: truncate(args.bodyText, MAX_BODY_CHARS),
      agentmailMessageId: args.agentmailMessageId,
      agentmailThreadId: args.agentmailThreadId,
      attachments: args.attachments.slice(0, 5),
      receivedAt: args.receivedAt,
    });
    return { messageId, created: true };
  },
});

export const setExtraction = internalMutation({
  args: {
    messageId: v.id("messages"),
    classification: replyClassification,
    extracted: extractedValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, { classification: args.classification, extracted: args.extracted });
    return null;
  },
});
