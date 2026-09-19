import { agentSentText } from "./agent";
import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { clampLimit, logActivity, requireMember } from "./lib/auth";
import { eventDoc, messageDoc, quoteDoc, threadDoc, vendorDoc, vendorSlotDoc, weddingDoc } from "./lib/docs";
import { FOLLOW_UP_DELAY_MS } from "./lib/text";
import { threadStatus } from "./lib/validators";

export const list = query({
  args: { weddingId: v.id("weddings"), status: v.optional(threadStatus) },
  returns: v.array(
    v.object({
      thread: threadDoc,
      vendor: vendorDoc,
      slot: vendorSlotDoc,
      lastMessage: v.union(
        v.object({
          _id: v.id("messages"),
          direction: v.union(v.literal("in"), v.literal("out")),
          subject: v.string(),
          preview: v.string(),
          at: v.number(),
        }),
        v.null(),
      ),
      latestQuote: v.union(quoteDoc, v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.weddingId);
    const threads = (
      await ctx.db
        .query("threads")
        .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
        .order("desc")
        .take(100)
    ).filter((t) => !args.status || t.status === args.status);
    const out = [];
    for (const thread of threads) {
      const vendor = await ctx.db.get(thread.vendorId);
      const slot = await ctx.db.get(thread.slotId);
      if (!vendor || !slot) continue;
      const last = await ctx.db
        .query("messages")
        .withIndex("by_threadId", (q) => q.eq("threadId", thread._id))
        .order("desc")
        .take(1);
      const quotes = await ctx.db
        .query("quotes")
        .withIndex("by_vendorId", (q) => q.eq("vendorId", thread.vendorId))
        .order("desc")
        .take(1);
      const m = last[0];
      out.push({
        thread,
        vendor,
        slot,
        lastMessage: m
          ? {
              _id: m._id,
              direction: m.direction,
              subject: m.subject,
              preview: m.bodyText.slice(0, 160),
              at: m.receivedAt ?? m.sentAt ?? m._creationTime,
            }
          : null,
        latestQuote: quotes[0] ?? null,
      });
    }
    return out;
  },
});

export const get = query({
  args: { threadId: v.id("threads") },
  returns: v.union(
    v.object({
      thread: threadDoc,
      vendor: vendorDoc,
      slot: vendorSlotDoc,
      messages: v.array(messageDoc),
      quotes: v.array(quoteDoc),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) return null;
    await requireMember(ctx, thread.weddingId);
    const vendor = await ctx.db.get(thread.vendorId);
    const slot = await ctx.db.get(thread.slotId);
    if (!vendor || !slot) return null;
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .take(100);
    const quotes = await ctx.db
      .query("quotes")
      .withIndex("by_vendorId", (q) => q.eq("vendorId", thread.vendorId))
      .order("desc")
      .take(20);
    return { thread, vendor, slot, messages, quotes };
  },
});

export const setStatus = mutation({
  args: { threadId: v.id("threads"), status: threadStatus },
  returns: v.null(),
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new ConvexError("Thread not found.");
    await requireMember(ctx, thread.weddingId, "planner");
    await ctx.db.patch(args.threadId, {
      status: args.status,
      ...(args.status === "booked" || args.status === "declined" ? { nextFollowUpAt: undefined } : {}),
      ...(args.status !== "needs_attention" ? { attentionReason: undefined } : {}),
    });
    return null;
  },
});

export const resolveAttention = mutation({
  args: { threadId: v.id("threads") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new ConvexError("Thread not found.");
    await requireMember(ctx, thread.weddingId, "planner");
    if (thread.status !== "needs_attention") return null;
    // Back to the most sensible prior state.
    const status = thread.lastInboundAt ? "replied" : thread.lastOutboundAt ? "sent" : "draft";
    await ctx.db.patch(args.threadId, { status, attentionReason: undefined });
    return null;
  },
});

// ---- internal ---------------------------------------------------------------

export const getInternal = internalQuery({
  args: { threadId: v.id("threads") },
  returns: v.union(threadDoc, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.threadId);
  },
});

export const findByAgentmailThreadId = internalQuery({
  args: { agentmailThreadId: v.string() },
  returns: v.union(threadDoc, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("threads")
      .withIndex("by_agentmailThreadId", (q) => q.eq("agentmailThreadId", args.agentmailThreadId))
      .first();
  },
});

/** One thread per vendor; created in `draft` when the first inquiry is drafted. */
export const getOrCreateForVendor = internalMutation({
  args: { weddingId: v.id("weddings"), vendorId: v.id("vendors"), slotId: v.id("vendorSlots") },
  returns: v.id("threads"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("threads")
      .withIndex("by_vendorId", (q) => q.eq("vendorId", args.vendorId))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("threads", {
      weddingId: args.weddingId,
      vendorId: args.vendorId,
      slotId: args.slotId,
      status: "draft",
      followUpCount: 0,
    });
  },
});

export const markSent = internalMutation({
  args: { threadId: v.id("threads"), agentmailThreadId: v.optional(v.string()), sentAt: v.number(), kind: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) return null;
    const keep = thread.status === "booked" || thread.status === "declined";
    await ctx.db.patch(args.threadId, {
      agentmailThreadId: args.agentmailThreadId ?? thread.agentmailThreadId,
      lastOutboundAt: args.sentAt,
      ...(keep ? {} : { status: "sent" as const, nextFollowUpAt: args.sentAt + FOLLOW_UP_DELAY_MS, attentionReason: undefined }),
    });
    const slot = await ctx.db.get(thread.slotId);
    if (slot && slot.status === "research") await ctx.db.patch(slot._id, { status: "contacted" });
    const agentText = agentSentText(args.kind, (await ctx.db.get(thread.vendorId))?.name ?? "a vendor");
    if (agentText) {
      await logActivity(ctx, {
        weddingId: thread.weddingId,
        actorLabel: "PlusOne",
        type: "note",
        text: agentText,
        refs: { threadId: thread._id, vendorId: thread.vendorId, slotId: thread.slotId },
      });
    }
    if (args.kind === "inquiry") {
      const vendor = await ctx.db.get(thread.vendorId);
      await logActivity(ctx, {
        weddingId: thread.weddingId,
        type: "inquiry_sent",
        text: `Inquiry sent to ${vendor?.name ?? "a vendor"}${slot ? ` for ${slot.title}` : ""}.`,
        refs: { threadId: thread._id, vendorId: thread.vendorId, slotId: thread.slotId },
      });
    }
    return null;
  },
});

/** Called when a vendor reply lands: pauses follow-ups and flips to `replied`. */
export const applyInbound = internalMutation({
  args: { threadId: v.id("threads"), agentmailMessageId: v.string(), agentmailThreadId: v.optional(v.string()), receivedAt: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) return null;
    const keep = thread.status === "booked" || thread.status === "declined" || thread.status === "quoted";
    await ctx.db.patch(args.threadId, {
      lastInboundMessageId: args.agentmailMessageId,
      lastInboundAt: args.receivedAt,
      agentmailThreadId: args.agentmailThreadId ?? thread.agentmailThreadId,
      nextFollowUpAt: undefined,
      ...(keep ? {} : { status: "replied" as const, attentionReason: undefined }),
    });
    const vendor = await ctx.db.get(thread.vendorId);
    await logActivity(ctx, {
      weddingId: thread.weddingId,
      actorLabel: vendor?.name ?? "Vendor",
      type: "vendor_replied",
      text: "replied to your inquiry.",
      refs: { threadId: thread._id, vendorId: thread.vendorId, slotId: thread.slotId },
    });
    return null;
  },
});

/** Outcome of OpenAI classification on an inbound reply. */
export const applyClassification = internalMutation({
  args: { threadId: v.id("threads"), classification: v.union(v.literal("quote"), v.literal("question"), v.literal("declined"), v.literal("available"), v.literal("other")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.status === "booked") return null;
    if (args.classification === "declined") {
      await ctx.db.patch(args.threadId, { status: "declined", nextFollowUpAt: undefined, attentionReason: undefined });
    }
    // A question is left to the inbound workflow: PlusOne answers it, or asks the couple.
    return null;
  },
});

export const setAttention = internalMutation({
  args: { threadId: v.id("threads"), reason: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) return null;
    await ctx.db.patch(args.threadId, { status: "needs_attention", attentionReason: args.reason, nextFollowUpAt: undefined });
    return null;
  },
});

export const afterFollowUpSent = internalMutation({
  args: { threadId: v.id("threads") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) return null;
    const followUpCount = thread.followUpCount + 1;
    await ctx.db.patch(args.threadId, { followUpCount });
    const vendor = await ctx.db.get(thread.vendorId);
    await logActivity(ctx, {
      weddingId: thread.weddingId,
      type: "follow_up_sent",
      text: `Follow-up #${followUpCount} sent to ${vendor?.name ?? "a vendor"}.`,
      refs: { threadId: thread._id, vendorId: thread.vendorId, slotId: thread.slotId },
    });
    return null;
  },
});

/** Threads in `sent` whose follow-up time has passed. Both range ends are bounded. */
export const listDueForFollowUp = internalQuery({
  args: { now: v.number(), limit: v.optional(v.number()) },
  returns: v.array(threadDoc),
  handler: async (ctx, args) => {
    const limit = clampLimit(args.limit, 20, 50);
    return await ctx.db
      .query("threads")
      .withIndex("by_status_and_nextFollowUpAt", (q) =>
        q.eq("status", "sent").gte("nextFollowUpAt", 1).lte("nextFollowUpAt", args.now),
      )
      .take(limit);
  },
});

/** Everything an action needs to write about this thread. */
export const getContext = internalQuery({
  args: { threadId: v.id("threads") },
  returns: v.union(
    v.object({
      thread: threadDoc,
      vendor: vendorDoc,
      slot: vendorSlotDoc,
      wedding: weddingDoc,
      events: v.array(eventDoc),
      lastOutbound: v.union(messageDoc, v.null()),
      lastInbound: v.union(messageDoc, v.null()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) return null;
    const vendor = await ctx.db.get(thread.vendorId);
    const slot = await ctx.db.get(thread.slotId);
    const wedding = await ctx.db.get(thread.weddingId);
    if (!vendor || !slot || !wedding) return null;
    const events = (
      await ctx.db
        .query("events")
        .withIndex("by_weddingId", (q) => q.eq("weddingId", thread.weddingId))
        .take(50)
    )
      .filter((e) => slot.eventIds.includes(e._id))
      .sort((a, b) => a.order - b.order);
    const recent = await ctx.db
      .query("messages")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .order("desc")
      .take(20);
    const lastOutbound = recent.find((m) => m.direction === "out" && m.status === "sent") ?? null;
    const lastInbound = recent.find((m) => m.direction === "in") ?? null;
    return { thread, vendor, slot, wedding, events, lastOutbound, lastInbound };
  },
});

/** How many conversations are waiting on the couple, for the badge beside Inbox. */
export const attentionCount = query({
  args: { weddingId: v.id("weddings") },
  returns: v.number(),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.weddingId);
    const threads = await ctx.db
      .query("threads")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(500);
    return threads.filter((t) => t.status === "needs_attention" || t.pendingQuestion).length;
  },
});
