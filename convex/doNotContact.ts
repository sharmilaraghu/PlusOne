import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation, type MutationCtx, type QueryCtx } from "./_generated/server";
import { logActivity, requireMember } from "./lib/auth";
import { normaliseAddress } from "./lib/optOut";

/**
 * Addresses PlusOne must not write to again.
 *
 * The list is for the whole product, not one event: a vendor who asks one host to stop
 * has asked PlusOne to stop. It is checked at the moment an email is sent, so drafts,
 * follow-ups and automatic replies are all covered, and nothing in the app removes an
 * address from it.
 */

export async function isBlocked(ctx: QueryCtx | MutationCtx, address: string | undefined): Promise<boolean> {
  if (!address) return false;
  const row = await ctx.db
    .query("doNotContact")
    .withIndex("by_address", (q) => q.eq("address", normaliseAddress(address)))
    .first();
  return row !== null;
}

export const check = internalQuery({
  args: { address: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => await isBlocked(ctx, args.address),
});

/** Add the vendor on this thread to the list and close the conversation. */
async function blockThread(
  ctx: MutationCtx,
  threadId: Id<"threads">,
  why: "asked_to_stop" | "added_by_host",
  actorUserId?: Id<"users">,
): Promise<boolean> {
  const thread = await ctx.db.get(threadId);
  if (!thread) return false;
  const vendor = await ctx.db.get(thread.vendorId);
  const address = vendor?.email ? normaliseAddress(vendor.email) : undefined;
  if (address && !(await isBlocked(ctx, address))) {
    await ctx.db.insert("doNotContact", { address, reason: why, weddingId: thread.weddingId, threadId });
  }
  if (thread.status !== "booked") {
    await ctx.db.patch(threadId, {
      status: "declined",
      nextFollowUpAt: undefined,
      attentionReason: undefined,
      pendingQuestion: undefined,
    });
  }
  // Anything written but not yet sent to them is withdrawn.
  const unsent = await ctx.db
    .query("messages")
    .withIndex("by_threadId", (q) => q.eq("threadId", threadId))
    .order("desc")
    .take(20);
  for (const m of unsent) {
    if (m.direction === "out" && (m.status === "draft" || m.status === "queued")) {
      await ctx.db.patch(m._id, { status: "failed", errorMessage: "Not sent: they asked not to be contacted." });
    }
  }
  await logActivity(ctx, {
    weddingId: thread.weddingId,
    actorUserId,
    type: "note",
    text:
      why === "asked_to_stop"
        ? `${vendor?.name ?? "A vendor"} asked not to be contacted again. PlusOne will not email them.`
        : `marked ${vendor?.name ?? "a vendor"} as do not contact. PlusOne will not email them again.`,
    refs: { threadId, vendorId: thread.vendorId, slotId: thread.slotId },
  });
  return true;
}

/** A vendor's reply asked PlusOne to stop. */
export const recordOptOut = internalMutation({
  args: { threadId: v.id("threads") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await blockThread(ctx, args.threadId, "asked_to_stop");
    return null;
  },
});

/** The host decides this vendor should not be written to again, for instance after a phone call. */
export const block = mutation({
  args: { threadId: v.id("threads") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new ConvexError("That conversation is gone.");
    const { userId } = await requireMember(ctx, thread.weddingId, "planner");
    await blockThread(ctx, args.threadId, "added_by_host", userId);
    return null;
  },
});
