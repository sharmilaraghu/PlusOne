import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalQuery, mutation, query } from "./_generated/server";
import { logActivity, requireMember, requireUserId } from "./lib/auth";
import { inviteDoc, weddingDoc } from "./lib/docs";
import { role } from "./lib/validators";

export const create = mutation({
  args: { weddingId: v.id("weddings"), role, email: v.optional(v.string()) },
  returns: v.object({ token: v.string(), inviteId: v.id("invites") }),
  handler: async (ctx, args): Promise<{ token: string; inviteId: Id<"invites"> }> => {
    const { userId } = await requireMember(ctx, args.weddingId, "planner");
    if (args.role === "owner") {
      // Only owners may mint owner invites.
      await requireMember(ctx, args.weddingId, "owner");
    }
    const email = args.email?.trim().toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ConvexError("That does not look like an email address.");
    const token = crypto.randomUUID().replace(/-/g, "");
    const inviteId = await ctx.db.insert("invites", {
      weddingId: args.weddingId,
      token,
      role: args.role,
      email: email || undefined,
      createdBy: userId,
    });
    if (email) {
      // Best-effort email from the wedding inbox; the link still works without it.
      await ctx.scheduler.runAfter(0, internal.agentmail.sendInvite, { inviteId });
    }
    return { token, inviteId };
  },
});

/** Public: what the invite page shows before sign-in. */
export const preview = query({
  args: { token: v.string() },
  returns: v.union(
    v.object({ weddingName: v.string(), role, partnerA: v.string(), partnerB: v.string() }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!invite) return null;
    const wedding = await ctx.db.get(invite.weddingId);
    if (!wedding) return null;
    return { weddingName: wedding.name, role: invite.role, partnerA: wedding.partnerA, partnerB: wedding.partnerB };
  },
});

export const accept = mutation({
  args: { token: v.string() },
  returns: v.id("weddings"),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!invite) throw new ConvexError("This invite link is not valid.");
    const existing = await ctx.db
      .query("members")
      .withIndex("by_weddingId_and_userId", (q) => q.eq("weddingId", invite.weddingId).eq("userId", userId))
      .unique();
    if (existing) return invite.weddingId; // already in — idempotent
    await ctx.db.insert("members", {
      weddingId: invite.weddingId,
      userId,
      role: invite.role,
      invitedEmail: invite.email,
    });
    await ctx.db.patch(invite._id, { acceptedBy: userId, acceptedAt: Date.now() });
    await logActivity(ctx, {
      weddingId: invite.weddingId,
      actorUserId: userId,
      type: "member_joined",
      text: `joined as ${invite.role}.`,
    });
    return invite.weddingId;
  },
});

// ---- internal ---------------------------------------------------------------

export const getInternal = internalQuery({
  args: { inviteId: v.id("invites") },
  returns: v.union(v.object({ invite: inviteDoc, wedding: weddingDoc, inviterLabel: v.string() }), v.null()),
  handler: async (ctx, args) => {
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) return null;
    const wedding = await ctx.db.get(invite.weddingId);
    if (!wedding) return null;
    const inviter = await ctx.db.get(invite.createdBy);
    return { invite, wedding, inviterLabel: inviter?.name ?? inviter?.email ?? `${wedding.partnerA} & ${wedding.partnerB}` };
  },
});
