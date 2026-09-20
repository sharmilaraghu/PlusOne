import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { logActivity, requireMember } from "./lib/auth";
import { contractCheckDoc, guestDoc, weddingDoc } from "./lib/docs";
import { contractStatus, flagSeverity, routedAs } from "./lib/validators";

/**
 * First touch for every webhook delivery. Idempotent on the AgentMail message
 * id so redelivered webhooks (Svix retries) become no-ops.
 */
export const claim = internalMutation({
  args: {
    agentmailMessageId: v.string(),
    eventId: v.string(),
    inboxId: v.string(),
    threadId: v.optional(v.string()),
    fromAddress: v.string(),
  },
  returns: v.object({
    status: v.union(v.literal("new"), v.literal("duplicate")),
    inboundEventId: v.id("inboundEvents"),
    weddingId: v.union(v.id("weddings"), v.null()),
  }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("inboundEvents")
      .withIndex("by_agentmailMessageId", (q) => q.eq("agentmailMessageId", args.agentmailMessageId))
      .first();
    if (existing) return { status: "duplicate" as const, inboundEventId: existing._id, weddingId: existing.weddingId ?? null };
    const byEvent = await ctx.db
      .query("inboundEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .first();
    if (byEvent) return { status: "duplicate" as const, inboundEventId: byEvent._id, weddingId: byEvent.weddingId ?? null };

    const wedding = await weddingForInbound(ctx, args.inboxId, args.fromAddress);
    const inboundEventId = await ctx.db.insert("inboundEvents", {
      agentmailMessageId: args.agentmailMessageId,
      eventId: args.eventId,
      inboxId: args.inboxId,
      threadId: args.threadId,
      fromAddress: args.fromAddress,
      routedAs: "pending",
      weddingId: wedding?._id,
    });
    return { status: "new" as const, inboundEventId, weddingId: wedding?._id ?? null };
  },
});

/**
 * Which wedding an email belongs to.
 *
 * One inbox usually means one wedding. When several share the fallback inbox, guessing
 * would file a couple's forwarded contract under someone else's wedding, so the sender
 * has to prove which one: their own address on the guest list, on a vendor, or on the
 * people planning it. No match means no wedding, and the email is logged as being from
 * a sender we do not know.
 */
async function weddingForInbound(
  ctx: QueryCtx | MutationCtx,
  inboxId: string,
  fromAddress: string,
): Promise<Doc<"weddings"> | null> {
  const weddings = await ctx.db
    .query("weddings")
    .withIndex("by_inboxId", (q) => q.eq("inboxId", inboxId))
    .take(20);
  if (weddings.length <= 1) return weddings[0] ?? null;

  const email = fromAddress.trim().toLowerCase();
  if (!email) return null;
  for (const wedding of weddings) {
    const guest = await ctx.db
      .query("guests")
      .withIndex("by_weddingId_and_email", (q) => q.eq("weddingId", wedding._id).eq("email", email))
      .first();
    if (guest) return wedding;
  }
  for (const wedding of weddings) {
    const vendors = await ctx.db
      .query("vendors")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", wedding._id))
      .take(200);
    if (vendors.some((v) => v.email?.toLowerCase() === email)) return wedding;
  }
  for (const wedding of weddings) {
    const members = await ctx.db
      .query("members")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", wedding._id))
      .take(20);
    for (const member of members) {
      const user = await ctx.db.get(member.userId);
      if (user?.email?.toLowerCase() === email) return wedding;
    }
  }
  return null;
}

export const finish = internalMutation({
  args: {
    inboundEventId: v.id("inboundEvents"),
    routedAs,
    weddingId: v.optional(v.id("weddings")),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.inboundEventId);
    if (!row) return null;
    await ctx.db.patch(args.inboundEventId, {
      routedAs: args.routedAs,
      weddingId: args.weddingId ?? row.weddingId,
      error: args.error?.slice(0, 1000),
      processedAt: Date.now(),
    });
    return null;
  },
});

export const findWeddingByInbox = internalQuery({
  args: { inboxId: v.string() },
  returns: v.union(weddingDoc, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("weddings")
      .withIndex("by_inboxId", (q) => q.eq("inboxId", args.inboxId))
      .first();
  },
});

/**
 * Guest lookup by sender. A shared fallback inbox can serve several weddings,
 * so we check every wedding bound to this inbox (bounded to 20).
 */
export const findGuestByEmail = internalQuery({
  args: { inboxId: v.string(), email: v.string() },
  returns: v.union(guestDoc, v.null()),
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase();
    const weddings = await ctx.db
      .query("weddings")
      .withIndex("by_inboxId", (q) => q.eq("inboxId", args.inboxId))
      .take(20);
    for (const wedding of weddings) {
      const guest = await ctx.db
        .query("guests")
        .withIndex("by_weddingId_and_email", (q) => q.eq("weddingId", wedding._id).eq("email", email))
        .first();
      if (guest) return guest;
    }
    return null;
  },
});

export const createContractCheck = internalMutation({
  args: { weddingId: v.id("weddings"), storageId: v.id("_storage"), filename: v.string(), vendorId: v.optional(v.id("vendors")) },
  returns: v.id("contractChecks"),
  handler: async (ctx, args) => {
    const contractCheckId = await ctx.db.insert("contractChecks", {
      weddingId: args.weddingId,
      storageId: args.storageId,
      filename: args.filename,
      vendorId: args.vendorId,
      status: "pending",
      flags: [],
    });
    // Read it straight away; the couple forwarded it because they want an answer.
    await ctx.scheduler.runAfter(0, internal.openai.checkContract, { contractCheckId });
    return contractCheckId;
  },
});

export const getContractCheck = internalQuery({
  args: { contractCheckId: v.id("contractChecks") },
  returns: v.union(contractCheckDoc, v.null()),
  handler: async (ctx, args) => await ctx.db.get(args.contractCheckId),
});

export const finishContractCheck = internalMutation({
  args: {
    contractCheckId: v.id("contractChecks"),
    status: contractStatus,
    summary: v.string(),
    flags: v.array(v.object({ severity: flagSeverity, clause: v.string(), why: v.string() })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const check = await ctx.db.get(args.contractCheckId);
    if (!check) return null;
    await ctx.db.patch(args.contractCheckId, { status: args.status, summary: args.summary, flags: args.flags });
    const high = args.flags.filter((f) => f.severity === "high").length;
    await logActivity(ctx, {
      weddingId: check.weddingId,
      type: "note",
      text:
        `read the contract "${check.filename}"` +
        (args.status === "failed"
          ? ", but it could not be opened."
          : high > 0
            ? `, and found ${high} thing${high === 1 ? "" : "s"} worth a second look.`
            : ", and found nothing alarming."),
    });
    return null;
  },
});

/** Everything the couple has forwarded, newest first. */
export const listContractChecks = query({
  args: { weddingId: v.id("weddings") },
  returns: v.array(contractCheckDoc),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.weddingId);
    return (
      await ctx.db
        .query("contractChecks")
        .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
        .order("desc")
        .take(30)
    );
  },
});
