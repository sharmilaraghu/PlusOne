import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { userSummary } from "./lib/docs";

export const me = query({
  args: {},
  returns: v.union(userSummary, v.null()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return { _id: user._id, name: user.name, email: user.email };
  },
});
