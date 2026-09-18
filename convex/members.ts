import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireMember } from "./lib/auth";
import { memberDoc, userSummary } from "./lib/docs";
import { role } from "./lib/validators";

export const list = query({
  args: { weddingId: v.id("weddings") },
  returns: v.array(v.object({ member: memberDoc, user: v.union(userSummary, v.null()) })),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.weddingId);
    const members = await ctx.db
      .query("members")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(50);
    const out = [];
    for (const member of members) {
      const user = await ctx.db.get(member.userId);
      out.push({ member, user: user ? { _id: user._id, name: user.name, email: user.email } : null });
    }
    return out;
  },
});

export const setRole = mutation({
  args: { memberId: v.id("members"), role },
  returns: v.null(),
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) throw new ConvexError("Member not found.");
    const { userId } = await requireMember(ctx, member.weddingId, "owner");
    if (member.userId === userId && args.role !== "owner") {
      throw new ConvexError("You cannot demote yourself. Make someone else an owner first.");
    }
    await ctx.db.patch(args.memberId, { role: args.role });
    return null;
  },
});

export const remove = mutation({
  args: { memberId: v.id("members") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) throw new ConvexError("Member not found.");
    const { userId } = await requireMember(ctx, member.weddingId, "owner");
    if (member.userId === userId) throw new ConvexError("You cannot remove yourself.");
    await ctx.db.delete(args.memberId);
    return null;
  },
});
