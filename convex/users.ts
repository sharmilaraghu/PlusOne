import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { deleteUserRecords } from "./lib/accounts";
import { startPurge } from "./maintenance";
import { userSummary } from "./lib/docs";
import { nameFromEmail } from "./lib/auth";

export const me = query({
  args: {},
  returns: v.union(userSummary, v.null()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      image: user.image,
      nameFromEmail: nameFromEmail(user.email),
    };
  },
});

/** Their own name, for the top of the app and the activity feed. */
export const setName = mutation({
  args: { name: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Please sign in to continue.");
    const name = args.name.trim().slice(0, 80);
    if (!name) throw new ConvexError("Enter your name.");
    await ctx.db.patch(userId, { name });
    return null;
  },
});

/**
 * Delete the signed-in person's account and everything that is only theirs.
 *
 * An event they own alone is deleted with them. An event that has another owner, or
 * that they were only invited to, stays for the others and they are removed from it.
 * Their saved onboarding draft, its pictures, and every sign-in record go too.
 */
export const deleteAccount = mutation({
  args: { confirm: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Please sign in to continue.");
    if (args.confirm.trim().toUpperCase() !== "DELETE") {
      throw new ConvexError("Type DELETE to confirm. Nothing was deleted.");
    }

    const memberships = await ctx.db
      .query("members")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(200);
    for (const mine of memberships) {
      const others = await ctx.db
        .query("members")
        .withIndex("by_weddingId", (q) => q.eq("weddingId", mine.weddingId))
        .take(200);
      const anotherOwner = others.some((m) => m.userId !== userId && m.role === "owner");
      if (mine.role === "owner" && !anotherOwner) await startPurge(ctx, mine.weddingId);
      else await ctx.db.delete(mine._id);
    }

    await deleteUserRecords(ctx, userId);
    return null;
  },
});
