import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireMember } from "./lib/auth";
import { messageDoc, vendorDoc } from "./lib/docs";
import { emailPool } from "./lib/pools";
import { workflow } from "./workflows";

const MAX_VENDORS_PER_BATCH = 10;

/** Every unsent inquiry PlusOne has written for one need, with the vendor it is for. */
async function draftsForSlot(ctx: QueryCtx, slotId: Id<"vendorSlots">) {
  const vendors = await ctx.db
    .query("vendors")
    .withIndex("by_slotId", (q) => q.eq("slotId", slotId))
    .take(100);
  const out: Array<{ message: Doc<"messages">; vendor: Doc<"vendors">; threadId: Id<"threads"> }> = [];
  for (const vendor of vendors) {
    const thread = await ctx.db
      .query("threads")
      .withIndex("by_vendorId", (q) => q.eq("vendorId", vendor._id))
      .first();
    if (!thread) continue;
    const recent = await ctx.db
      .query("messages")
      .withIndex("by_threadId", (q) => q.eq("threadId", thread._id))
      .order("desc")
      .take(5);
    const draft = recent.find((m) => m.direction === "out" && m.status === "draft");
    if (draft) out.push({ message: draft, vendor, threadId: thread._id });
  }
  return out;
}


/** Kick off OpenAI drafting; one draft message + thread per vendor appears shortly after. */
export const draft = mutation({
  args: { slotId: v.id("vendorSlots"), vendorIds: v.array(v.id("vendors")) },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const slot = await ctx.db.get(args.slotId);
    if (!slot) throw new ConvexError("Slot not found.");
    await requireMember(ctx, slot.weddingId, "planner");
    if (args.vendorIds.length === 0) throw new ConvexError("Pick at least one vendor.");
    if (args.vendorIds.length > MAX_VENDORS_PER_BATCH) throw new ConvexError(`Draft for at most ${MAX_VENDORS_PER_BATCH} vendors at a time.`);
    for (const vendorId of args.vendorIds) {
      const vendor = await ctx.db.get(vendorId);
      if (!vendor || vendor.weddingId !== slot.weddingId) throw new ConvexError("Vendor does not belong to this wedding.");
    }
    await ctx.scheduler.runAfter(0, internal.openai.draftInquiries, { slotId: args.slotId, vendorIds: args.vendorIds });
    return null;
  },
});

export const listDrafts = query({
  args: { slotId: v.id("vendorSlots") },
  returns: v.array(v.object({ message: messageDoc, vendor: vendorDoc, threadId: v.id("threads") })),
  handler: async (ctx, args) => {
    const slot = await ctx.db.get(args.slotId);
    if (!slot) throw new ConvexError("Slot not found.");
    await requireMember(ctx, slot.weddingId);
    return await draftsForSlot(ctx, args.slotId);
  },
});

export const updateDraft = mutation({
  args: { messageId: v.id("messages"), subject: v.optional(v.string()), bodyText: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new ConvexError("Draft not found.");
    await requireMember(ctx, message.weddingId, "planner");
    if (message.status !== "draft") throw new ConvexError("Only drafts can be edited.");
    await ctx.db.patch(args.messageId, {
      ...(args.subject !== undefined ? { subject: args.subject.slice(0, 200) } : {}),
      ...(args.bodyText !== undefined ? { bodyText: args.bodyText.slice(0, 20_000) } : {}),
    });
    return null;
  },
});

/** Queue drafts for sending. Each send is a single workpool job with retries off. */
export const send = mutation({
  args: { messageIds: v.array(v.id("messages")) },
  returns: v.object({ queued: v.number(), skipped: v.array(v.string()) }),
  handler: async (ctx, args): Promise<{ queued: number; skipped: string[] }> => {
    if (args.messageIds.length === 0) throw new ConvexError("Nothing selected.");
    if (args.messageIds.length > 25) throw new ConvexError("Send at most 25 messages at a time.");
    let queued = 0;
    const skipped: string[] = [];
    let checkedWedding: Id<"weddings"> | null = null;
    for (const messageId of args.messageIds) {
      const message = await ctx.db.get(messageId);
      if (!message) continue;
      if (checkedWedding !== message.weddingId) {
        await requireMember(ctx, message.weddingId, "planner");
        checkedWedding = message.weddingId;
      }
      if (message.status !== "draft") {
        skipped.push(`${message.subject}: already ${message.status}`);
        continue;
      }
      if (!message.toAddress) {
        skipped.push(`${message.subject}: vendor has no email address yet`);
        continue;
      }
      const idempotencyKey =
        message.idempotencyKey ?? (message.threadId ? `${message.threadId}:${message.kind}` : `${message._id}:${message.kind}`);
      await ctx.db.patch(messageId, { status: "queued", idempotencyKey });
      await emailPool.enqueueAction(ctx, internal.agentmail.sendOutbound, { messageId }, { retry: false });
      queued += 1;
    }
    return { queued, skipped };
  },
});

/** Demo affordance: run the follow-up workflow immediately for one thread. */
export const sendFollowUpNow = mutation({
  args: { threadId: v.id("threads") },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new ConvexError("Thread not found.");
    await requireMember(ctx, thread.weddingId, "planner");
    if (!thread.lastOutboundAt) throw new ConvexError("Send the first inquiry before following up.");
    if (thread.status === "booked" || thread.status === "declined") throw new ConvexError(`This thread is ${thread.status}.`);
    await ctx.db.patch(args.threadId, { nextFollowUpAt: undefined });
    await workflow.start(ctx, internal.workflows.followUpWorkflow, { threadId: args.threadId });
    return null;
  },
});

/**
 * Send every inquiry PlusOne has written for this need, in one go.
 *
 * This is the hands-off path: the couple confirms the shortlist once, having seen who
 * will be emailed and a sample of what PlusOne wrote, and everything goes out without
 * a per-email approval step. Taking the slot rather than a list of message ids means a
 * draft written a second later cannot be silently left behind.
 */
export const sendAllForSlot = mutation({
  args: { slotId: v.id("vendorSlots") },
  returns: v.object({ queued: v.number(), skipped: v.array(v.string()) }),
  handler: async (ctx, args): Promise<{ queued: number; skipped: string[] }> => {
    const slot = await ctx.db.get(args.slotId);
    if (!slot) throw new ConvexError("That need is no longer part of your plan.");
    await requireMember(ctx, slot.weddingId, "planner");

    const drafts = await draftsForSlot(ctx, args.slotId);
    if (drafts.length === 0) throw new ConvexError("There is nothing waiting to be sent for this one.");

    let queued = 0;
    const skipped: string[] = [];
    for (const { message, vendor } of drafts) {
      if (!message.toAddress) {
        skipped.push(`${vendor.name} has no email address yet`);
        continue;
      }
      const idempotencyKey =
        message.idempotencyKey ?? (message.threadId ? `${message.threadId}:${message.kind}` : `${message._id}:${message.kind}`);
      await ctx.db.patch(message._id, { status: "queued", idempotencyKey });
      await emailPool.enqueueAction(ctx, internal.agentmail.sendOutbound, { messageId: message._id }, { retry: false });
      queued += 1;
    }
    return { queued, skipped };
  },
});

/** Throw away what PlusOne wrote for this need, so the couple can choose again. */
export const discardDraftsForSlot = mutation({
  args: { slotId: v.id("vendorSlots") },
  returns: v.number(),
  handler: async (ctx, args): Promise<number> => {
    const slot = await ctx.db.get(args.slotId);
    if (!slot) throw new ConvexError("That need is no longer part of your plan.");
    await requireMember(ctx, slot.weddingId, "planner");
    const drafts = await draftsForSlot(ctx, args.slotId);
    for (const { message } of drafts) await ctx.db.delete(message._id);
    return drafts.length;
  },
});
