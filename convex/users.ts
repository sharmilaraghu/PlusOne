import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
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
