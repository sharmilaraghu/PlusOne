import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation, type MutationCtx } from "./_generated/server";
import { logActivity, requireMember } from "./lib/auth";
import { emailPool } from "./lib/pools";
import { MAX_BODY_CHARS, truncate } from "./lib/text";
import { workflow } from "./workflows";

/**
 * PlusOne's own side of a vendor conversation: answering what it can, asking the
 * couple what it can't, and closing things out once they have chosen.
 */

const agentKind = v.union(
  v.literal("agent_reply"),
  v.literal("negotiation"),
  v.literal("booking_confirmation"),
  v.literal("no_thanks"),
);

const SENT_TEXT: Record<string, (vendor: string) => string> = {
  agent_reply: (vendor) => `PlusOne answered ${vendor}'s questions.`,
  negotiation: (vendor) => `PlusOne asked ${vendor} whether they can come closer to your budget.`,
  booking_confirmation: (vendor) => `PlusOne told ${vendor} you'd love to go ahead, and asked for next steps.`,
  no_thanks: (vendor) => `PlusOne thanked ${vendor} and let them know you've booked someone else.`,
};

/** Activity line for an agent email that has just gone out; null for other kinds. */
export function agentSentText(kind: string, vendor: string): string | null {
  return SENT_TEXT[kind]?.(vendor) ?? null;
}

/** Everything the model needs to write the next email on a thread. */
export const threadBrief = internalQuery({
  args: { threadId: v.id("threads") },
  returns: v.union(
    v.object({
      weddingId: v.id("weddings"),
      status: v.string(),
      negotiatedAt: v.union(v.number(), v.null()),
      slotId: v.id("vendorSlots"),
      slotTitle: v.string(),
      slotBudget: v.number(),
      vendorName: v.string(),
      /** Every email but the latest one from the vendor, oldest first. */
      conversation: v.string(),
      /** The vendor's most recent email. */
      latest: v.string(),
      autoReplies: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) return null;
    const vendor = await ctx.db.get(thread.vendorId);
    const slot = await ctx.db.get(thread.slotId);
    if (!vendor || !slot) return null;
    const recent = (
      await ctx.db
        .query("messages")
        .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
        .order("desc")
        .take(12)
    )
      .filter((m) => m.direction === "in" || m.status === "sent")
      .reverse();
    const lastIn = [...recent].reverse().find((m) => m.direction === "in");
    const line = (m: Doc<"messages">) =>
      `${m.direction === "in" ? vendor.name : "Us"}: ${truncate(m.bodyText, 1200)}`;
    const autoReplies = recent.filter((m) => m.direction === "out" && m.kind === "agent_reply").length;
    return {
      weddingId: thread.weddingId,
      status: thread.status,
      negotiatedAt: thread.negotiatedAt ?? null,
      slotId: slot._id,
      slotTitle: slot.title,
      slotBudget: slot.budget,
      vendorName: vendor.name,
      conversation: recent.filter((m) => m !== lastIn).map(line).join("\n\n"),
      latest: lastIn?.bodyText ?? "",
      autoReplies,
    };
  },
});

async function queue(
  ctx: MutationCtx,
  thread: Doc<"threads">,
  args: { kind: Doc<"messages">["kind"]; bodyText: string; key: string; sendNow: boolean },
): Promise<Id<"messages"> | null> {
  const existing = await ctx.db
    .query("messages")
    .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", args.key))
    .first();
  if (existing) return existing._id;
  const wedding = await ctx.db.get(thread.weddingId);
  const vendor = await ctx.db.get(thread.vendorId);
  if (!wedding || !vendor?.email) return null;
  const last = await ctx.db
    .query("messages")
    .withIndex("by_threadId", (q) => q.eq("threadId", thread._id))
    .order("desc")
    .first();
  const base = last?.subject.replace(/^(re:\s*)+/i, "") ?? "Our wedding";
  // Review mode holds PlusOne's words for the couple to read first, unless they
  // wrote the substance themselves just now.
  const review = wedding.sendMode === "review" && !args.sendNow;
  const messageId = await ctx.db.insert("messages", {
    weddingId: thread.weddingId,
    threadId: thread._id,
    direction: "out",
    kind: args.kind,
    status: review ? "draft" : "queued",
    fromAddress: wedding.inboxAddress ?? "",
    toAddress: vendor.email,
    subject: `Re: ${base}`.slice(0, 200),
    bodyText: truncate(args.bodyText, MAX_BODY_CHARS),
    attachments: [],
    idempotencyKey: args.key,
  });
  if (review) {
    if (thread.status !== "booked" && thread.status !== "declined") {
      await ctx.db.patch(thread._id, { status: "needs_attention", attentionReason: "reply_to_review", nextFollowUpAt: undefined });
    }
  } else {
    await emailPool.enqueueAction(ctx, internal.agentmail.sendOutbound, { messageId }, { retry: false });
  }
  return messageId;
}

/** Queue (or, in review mode, draft) one of PlusOne's own emails on a thread. */
export const queueEmail = internalMutation({
  args: {
    threadId: v.id("threads"),
    kind: agentKind,
    bodyText: v.string(),
    /** Dedupes workflow retries: the same key never sends twice. */
    key: v.string(),
    /** The couple supplied the answer, so there is nothing left for them to review. */
    sendNow: v.optional(v.boolean()),
  },
  returns: v.union(v.id("messages"), v.null()),
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) return null;
    if (args.kind === "negotiation") await ctx.db.patch(thread._id, { negotiatedAt: Date.now() });
    return await queue(ctx, thread, { kind: args.kind, bodyText: args.bodyText, key: args.key, sendNow: args.sendNow ?? false });
  },
});

/** Hand the vendor's question to the couple, phrased as the one thing only they can answer. */
export const askCouple = internalMutation({
  args: { threadId: v.id("threads"), question: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) return null;
    const settled = thread.status === "booked";
    await ctx.db.patch(thread._id, {
      pendingQuestion: args.question.slice(0, 1000),
      attentionReason: "vendor_question",
      nextFollowUpAt: undefined,
      ...(settled ? {} : { status: "needs_attention" as const }),
    });
    const vendor = await ctx.db.get(thread.vendorId);
    await logActivity(ctx, {
      weddingId: thread.weddingId,
      type: "note",
      text: `${vendor?.name ?? "A vendor"} needs an answer from you: ${args.question.slice(0, 300)}`,
      refs: { threadId: thread._id, vendorId: thread.vendorId, slotId: thread.slotId },
    });
    return null;
  },
});

/** The couple answers the vendor's question in the app; PlusOne writes and sends the email. */
export const answerForCouple = mutation({
  args: { threadId: v.id("threads"), answer: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new ConvexError("That conversation is gone.");
    await requireMember(ctx, thread.weddingId, "planner");
    const answer = args.answer.trim();
    if (!answer) throw new ConvexError("Write your answer first.");
    if (!thread.pendingQuestion) throw new ConvexError("There is no open question on this conversation.");
    await ctx.db.patch(thread._id, {
      pendingQuestion: undefined,
      attentionReason: undefined,
      ...(thread.status === "needs_attention" ? { status: "replied" as const } : {}),
    });
    await workflow.start(ctx, internal.workflows.coupleAnswerWorkflow, {
      threadId: thread._id,
      answer: answer.slice(0, 2000),
      key: `${thread._id}:couple_answer:${Date.now()}`,
    });
    return null;
  },
});

/**
 * The couple writes to a vendor at any point: a question after a quote, a change of
 * plan, a nudge on a booked vendor. PlusOne turns their notes into the email, or sends
 * their words exactly when they'd rather write it themselves.
 */
export const writeToVendor = mutation({
  args: { threadId: v.id("threads"), message: v.string(), asWritten: v.optional(v.boolean()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new ConvexError("That conversation is gone.");
    await requireMember(ctx, thread.weddingId, "planner");
    const message = args.message.trim();
    if (!message) throw new ConvexError("Write your message first.");
    const vendor = await ctx.db.get(thread.vendorId);
    if (!vendor?.email) throw new ConvexError("This vendor has no email address yet. Add one on the Vendors page.");
    // Writing to someone answers whatever PlusOne was holding for them.
    if (thread.pendingQuestion) await ctx.db.patch(thread._id, { pendingQuestion: undefined, attentionReason: undefined });

    if (args.asWritten) {
      await queue(ctx, thread, {
        kind: "agent_reply",
        bodyText: message.slice(0, 5000),
        key: `${thread._id}:couple_wrote:${Date.now()}`,
        sendNow: true,
      });
      return null;
    }
    await workflow.start(ctx, internal.workflows.coupleAnswerWorkflow, {
      threadId: thread._id,
      answer: message.slice(0, 2000),
      key: `${thread._id}:couple_answer:${Date.now()}`,
    });
    return null;
  },
});

/**
 * After a booking: mark the other contacted vendors for this need as passed on, and
 * return who should hear what. The emails themselves are written by the workflow.
 */
export const closeOutSlot = internalMutation({
  args: { slotId: v.id("vendorSlots"), bookedVendorId: v.id("vendors") },
  returns: v.object({
    confirm: v.union(v.id("threads"), v.null()),
    decline: v.array(v.id("threads")),
  }),
  handler: async (ctx, args) => {
    const threads = await ctx.db
      .query("threads")
      .withIndex("by_slotId", (q) => q.eq("slotId", args.slotId))
      .take(50);
    let confirm: Id<"threads"> | null = null;
    const decline: Id<"threads">[] = [];
    for (const t of threads) {
      if (!t.lastOutboundAt) continue; // never written to, so nothing to close
      if (t.vendorId === args.bookedVendorId) {
        confirm = t._id;
      } else if (t.status !== "declined" && t.status !== "booked") {
        await ctx.db.patch(t._id, {
          status: "declined",
          nextFollowUpAt: undefined,
          attentionReason: undefined,
          pendingQuestion: undefined,
        });
        decline.push(t._id);
      }
    }
    return { confirm, decline };
  },
});
