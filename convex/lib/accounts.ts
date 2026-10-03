import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/**
 * Remove a person's own records: their unfinished onboarding and its pictures, every
 * sign-in session and token, their accounts and codes, and the user row itself. What
 * happens to their events is decided by the caller first.
 */
export async function deleteUserRecords(ctx: MutationCtx, userId: Id<"users">): Promise<void> {
  const drafts = await ctx.db
    .query("onboardingDrafts")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(20);
  for (const draft of drafts) {
    for (const picture of draft.pictures) {
      try {
        await ctx.storage.delete(picture);
      } catch {
        // already deleted
      }
    }
    await ctx.db.delete(draft._id);
  }

  const sessions = await ctx.db
    .query("authSessions")
    .withIndex("userId", (q) => q.eq("userId", userId))
    .take(200);
  for (const session of sessions) {
    const tokens = await ctx.db
      .query("authRefreshTokens")
      .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
      .take(500);
    for (const token of tokens) await ctx.db.delete(token._id);
    await ctx.db.delete(session._id);
  }
  const accounts = await ctx.db
    .query("authAccounts")
    .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
    .take(20);
  for (const account of accounts) {
    const codes = await ctx.db
      .query("authVerificationCodes")
      .withIndex("accountId", (q) => q.eq("accountId", account._id))
      .take(50);
    for (const code of codes) await ctx.db.delete(code._id);
    await ctx.db.delete(account._id);
  }
  if (await ctx.db.get(userId)) await ctx.db.delete(userId);
}
