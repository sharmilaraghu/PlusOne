import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireUserId } from "./lib/auth";

const MAX_STATE_CHARS = 100_000;
const MAX_PICTURES = 6;

async function draftFor(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  return await ctx.db
    .query("onboardingDrafts")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
}

/** The caller's unfinished wedding, if they have one. */
export const mine = query({
  args: {},
  returns: v.union(
    v.object({
      name: v.string(),
      step: v.number(),
      state: v.string(),
      pictures: v.array(v.object({ id: v.id("_storage"), url: v.string() })),
      updatedAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const draft = await draftFor(ctx, userId);
    if (!draft) return null;
    const pictures: { id: Id<"_storage">; url: string }[] = [];
    for (const id of draft.pictures) {
      const url = await ctx.storage.getUrl(id);
      if (url) pictures.push({ id, url });
    }
    return { name: draft.name, step: draft.step, state: draft.state, pictures, updatedAt: draft.updatedAt };
  },
});

/** Saves onboarding as they go; called on every pause in typing. */
export const save = mutation({
  args: { name: v.string(), step: v.number(), state: v.string(), pictures: v.array(v.id("_storage")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (args.state.length > MAX_STATE_CHARS) throw new ConvexError("That's too much to save in one go.");
    if (args.pictures.length > MAX_PICTURES) throw new ConvexError(`Up to ${MAX_PICTURES} pictures, please.`);
    const fields = {
      name: args.name.trim().slice(0, 200) || "Our wedding",
      step: Math.max(0, Math.min(10, Math.floor(args.step))),
      state: args.state,
      pictures: args.pictures,
      updatedAt: Date.now(),
    };
    const existing = await draftFor(ctx, userId);
    if (existing) await ctx.db.patch(existing._id, fields);
    else await ctx.db.insert("onboardingDrafts", { userId, ...fields });
    return null;
  },
});

/** Start over: forget the draft and the pictures uploaded for it. */
export const discard = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const draft = await draftFor(ctx, userId);
    if (!draft) return null;
    for (const id of draft.pictures) {
      if (await ctx.db.system.get("_storage", id)) await ctx.storage.delete(id);
    }
    await ctx.db.delete(draft._id);
    return null;
  },
});

/** Called by `weddings.create`: the wedding now exists, so the draft is done. */
export async function clearDraft(ctx: MutationCtx, userId: Id<"users">): Promise<void> {
  const draft = await draftFor(ctx, userId);
  if (draft) await ctx.db.delete(draft._id);
}
