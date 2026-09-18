import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { requireMember } from "./lib/auth";
import { chatMessageDoc } from "./lib/docs";

/**
 * The assistant that knows this particular wedding.
 *
 * It answers from the plan rather than from the open web, and it is allowed to do
 * exactly two things on the couple's behalf: start a vendor search, and add a vendor
 * need. It is deliberately given no way to send an email — outreach always goes
 * through the confirmation screen, so nothing leaves the wedding inbox that the
 * couple has not said yes to.
 */

const MAX_QUESTION = 800;

export const history = query({
  args: { weddingId: v.id("weddings") },
  returns: v.array(chatMessageDoc),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.weddingId);
    return await ctx.db
      .query("chatMessages")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(100);
  },
});

/** Record the question, park a "thinking" reply, and let the action fill it in. */
export const ask = mutation({
  args: { weddingId: v.id("weddings"), content: v.string() },
  returns: v.id("chatMessages"),
  handler: async (ctx, args): Promise<Id<"chatMessages">> => {
    const { userId } = await requireMember(ctx, args.weddingId, "planner");
    const content = args.content.trim();
    if (content.length < 2) throw new ConvexError("Ask a question first.");
    if (content.length > MAX_QUESTION) throw new ConvexError(`Keep it under ${MAX_QUESTION} characters.`);

    await ctx.db.insert("chatMessages", { weddingId: args.weddingId, userId, role: "user", content });
    const replyId = await ctx.db.insert("chatMessages", {
      weddingId: args.weddingId,
      role: "assistant",
      content: "",
      status: "thinking",
    });
    await ctx.scheduler.runAfter(0, internal.openai.answerQuestion, { weddingId: args.weddingId, replyId });
    return replyId;
  },
});

export const clear = mutation({
  args: { weddingId: v.id("weddings") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.weddingId, "planner");
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(200);
    for (const m of messages) await ctx.db.delete(m._id);
    return null;
  },
});

// ---- internal ---------------------------------------------------------------

/** Everything the assistant is allowed to know, gathered in one read. */
export const context = internalQuery({
  args: { weddingId: v.id("weddings") },
  returns: v.object({
    recent: v.array(v.object({ role: v.string(), content: v.string() })),
    needs: v.array(
      v.object({
        slotId: v.id("vendorSlots"),
        title: v.string(),
        category: v.string(),
        budget: v.number(),
        status: v.string(),
        vendorCount: v.number(),
        bestQuote: v.union(v.number(), v.null()),
      }),
    ),
    guests: v.object({ total: v.number(), yes: v.number(), pending: v.number() }),
    committed: v.number(),
  }),
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(100);
    const recent = messages
      .filter((m) => m.content.trim().length > 0)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    const slots = await ctx.db
      .query("vendorSlots")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(100);
    const needs = [];
    for (const slot of slots) {
      const vendors = await ctx.db
        .query("vendors")
        .withIndex("by_slotId", (q) => q.eq("slotId", slot._id))
        .take(50);
      const quotes = await ctx.db
        .query("quotes")
        .withIndex("by_slotId", (q) => q.eq("slotId", slot._id))
        .take(50);
      needs.push({
        slotId: slot._id,
        title: slot.title,
        category: slot.category,
        budget: slot.budget,
        status: slot.status,
        vendorCount: vendors.length,
        bestQuote: quotes.length ? Math.min(...quotes.map((q) => q.total)) : null,
      });
    }

    const guests = await ctx.db
      .query("guests")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(500);
    const lines = await ctx.db
      .query("budgetLines")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(200);

    return {
      recent,
      needs,
      guests: {
        total: guests.length,
        yes: guests.filter((g) => g.rsvp === "yes").length,
        pending: guests.filter((g) => g.rsvp === "pending").length,
      },
      committed: lines.reduce((sum, l) => sum + l.committed, 0),
    };
  },
});

export const finishReply = internalMutation({
  args: {
    replyId: v.id("chatMessages"),
    content: v.string(),
    status: v.union(v.literal("done"), v.literal("error")),
    toolCalls: v.optional(v.array(v.object({ name: v.string(), args: v.any(), result: v.optional(v.any()), status: v.string() }))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.replyId, {
      content: args.content,
      status: args.status,
      ...(args.toolCalls ? { toolCalls: args.toolCalls } : {}),
    });
    return null;
  },
});
