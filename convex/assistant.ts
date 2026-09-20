import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery, mutation, query, type MutationCtx } from "./_generated/server";
import { logActivity, requireMember } from "./lib/auth";
import { chatMessageDoc } from "./lib/docs";
import { addGuestHelper, findDuplicateGuest } from "./guests";
import { addSlotHelper, updateSlotHelper } from "./slots";
import { startResearchHelper } from "./research";
import { addEventHelper } from "./events";
import { writeToVendorHelper } from "./agent";
import { rebalanceWeddingBudget } from "./lib/budget";
import { daysBetween, formatMoney } from "./lib/text";
import type { Doc, Id } from "./_generated/dataModel";

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
/** How many remembered lines a wedding keeps. */
const MAX_NOTES = 20;

export const history = query({
  args: { weddingId: v.id("weddings") },
  returns: v.array(chatMessageDoc),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.weddingId);
    // Newest first from the database, then flipped: a long conversation must still
    // show the reply that just arrived, and the cards attached to it.
    return (
      await ctx.db
        .query("chatMessages")
        .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
        .order("desc")
        .take(100)
    ).reverse();
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

/**
 * Do one of the things the assistant offered, once the couple has pressed the button.
 *
 * Every write goes through the same helper the matching screen uses, so a confirmed
 * card and a filled-in form produce exactly the same result, activity entry included.
 * Nothing here re-resolves a name: the ids were fixed when the card was made, so a card
 * can never quietly point at something created since.
 */
export const runProposal = mutation({
  args: {
    weddingId: v.id("weddings"),
    replyId: v.id("chatMessages"),
    index: v.number(),
    /** The couple's edits. Only the content fields of that kind are taken. */
    overrides: v.optional(v.any()),
  },
  returns: v.object({ done: v.string(), tab: v.optional(v.string()) }),
  handler: async (ctx, args): Promise<{ done: string; tab?: string }> => {
    const { userId, wedding } = await requireMember(ctx, args.weddingId, "planner");
    const reply = await ctx.db.get(args.replyId);
    if (!reply || reply.weddingId !== args.weddingId) throw new ConvexError("That message is gone.");
    const calls = reply.toolCalls ?? [];
    const call = calls[args.index];
    if (!call || call.name !== "propose") throw new ConvexError("That suggestion is gone.");
    if (call.status !== "proposed") throw new ConvexError("You have already handled that one.");

    const p = mergeOverrides(call.args as Record<string, unknown>, args.overrides);
    const money = (n: number) => formatMoney(n, wedding.currency);
    let done: string;
    let tab: string | undefined;

    switch (p.kind) {
      case "add_guest": {
        const name = String(p.guestName ?? "").trim();
        if (!name) throw new ConvexError("This one needs a name.");
        const email = p.guestEmail ? String(p.guestEmail).trim().toLowerCase() : undefined;
        if (await findDuplicateGuest(ctx, args.weddingId, name, email)) {
          throw new ConvexError(`${name} is already on your guest list.`);
        }
        await addGuestHelper(ctx, args.weddingId, {
          name,
          email,
          side: p.guestSide ? String(p.guestSide) : undefined,
          partySize: Number(p.guestPartySize ?? 1),
          eventIds: (p.eventIds as Id<"events">[] | undefined) ?? [],
        });
        done = `Added ${name} to the guest list.`;
        tab = "guests";
        break;
      }
      case "add_need": {
        const title = String(p.title ?? "").trim();
        if (!title) throw new ConvexError("This one needs a name.");
        const eventIds =
          (p.eventIds as Id<"events">[] | undefined) ??
          (
            await ctx.db
              .query("events")
              .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
              .take(50)
          ).map((e) => e._id);
        // A new need starts at what a typical need costs here, then everything is
        // re-split: it takes a share of the same total rather than inventing money.
        // Starting at zero would leave it at zero, because the re-split weighs each
        // need by what it already has.
        const slots = await ctx.db
          .query("vendorSlots")
          .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
          .take(100);
        const typical = slots.length
          ? Math.round(slots.reduce((sum, s) => sum + s.budget, 0) / slots.length)
          : Math.round(wedding.totalBudget / 10);
        const slotId = await addSlotHelper(ctx, {
          weddingId: args.weddingId,
          title,
          category: String(p.category ?? title),
          eventIds,
          budget: Math.max(1, typical),
        });
        await rebalanceWeddingBudget(ctx, args.weddingId);
        const slot = await ctx.db.get(slotId);
        done = `Added ${title} to your vendors${slot ? `, with ${money(slot.budget)} of the budget` : ""}.`;
        tab = "vendors";
        break;
      }
      case "research": {
        const slot = await ctx.db.get(p.slotId as Id<"vendorSlots">);
        if (!slot || slot.weddingId !== args.weddingId) {
          throw new ConvexError(`${p.slotTitle ?? "That need"} is not part of your plan any more.`);
        }
        await startResearchHelper(ctx, { slot, wedding, userId, query: String(p.query ?? "") });
        done = `Searching the web for ${slot.title.toLowerCase()}.`;
        tab = "vendors";
        break;
      }
      case "set_budget": {
        const amount = Number(p.amount);
        if (!Number.isFinite(amount) || amount < 0) throw new ConvexError("That amount doesn't look right.");
        if (p.budgetTarget === "need") {
          const slot = await ctx.db.get(p.slotId as Id<"vendorSlots">);
          if (!slot || slot.weddingId !== args.weddingId) {
            throw new ConvexError(`${p.slotTitle ?? "That need"} is not part of your plan any more.`);
          }
          await updateSlotHelper(ctx, slot, { budget: amount });
          done = `${slot.title} is now planned at ${money(amount)}. The other needs are unchanged.`;
          tab = "vendors";
          break;
        }
        if (p.budgetTarget === "event") {
          const event = await ctx.db.get(p.eventId as Id<"events">);
          if (!event || event.weddingId !== args.weddingId) {
            throw new ConvexError(`${p.eventName ?? "That day"} is not part of your plan any more.`);
          }
          await setEventBudget(ctx, event, amount);
          done = `${event.name} now takes ${money(amount)}, and the other days share the rest.`;
          tab = "";
          break;
        }
        await ctx.db.patch(args.weddingId, { totalBudget: amount });
        await rebalanceWeddingBudget(ctx, args.weddingId);
        await logActivity(ctx, {
          weddingId: args.weddingId,
          actorUserId: userId,
          type: "note",
          text: `set the total budget to ${money(amount)}.`,
        });
        done = `Your total is now ${money(amount)}, and every day and need has moved with it.`;
        tab = "";
        break;
      }
      case "add_event": {
        const name = String(p.eventName ?? "").trim();
        const date = String(p.date ?? "");
        // Same reasoning as a new need: a day with no weight would stay at nothing, so
        // an unstated share becomes what an average day here takes.
        const days = await ctx.db
          .query("events")
          .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
          .take(50);
        const share = Number(p.budgetShare ?? 0);
        const typicalDay = days.length
          ? Math.round(days.reduce((sum, e) => sum + e.budget, 0) / days.length)
          : Math.round(wedding.totalBudget / 3);
        const eventId = await addEventHelper(ctx, args.weddingId, {
          name,
          date,
          dayIndex: daysBetween(wedding.startDate, date),
          budget: share > 0 ? share : Math.max(1, typicalDay),
          guestCount: Number(p.guestCount ?? 0),
        });
        const event = await ctx.db.get(eventId);
        done = `Added ${name}${event ? ` with ${money(event.budget)} of the budget` : ""}.`;
        tab = "";
        break;
      }
      case "write_vendor": {
        const thread = await ctx.db.get(p.threadId as Id<"threads">);
        if (!thread || thread.weddingId !== args.weddingId) {
          throw new ConvexError(`That conversation with ${p.vendorName ?? "the vendor"} is gone.`);
        }
        await writeToVendorHelper(ctx, thread, String(p.message ?? ""), Boolean(p.asWritten));
        // "Golden Hour Photo Co." already ends in a full stop; don't give it two.
        const vendorName = String(p.vendorName ?? "them").replace(/\.$/, "");
        done =
          wedding.sendMode === "review" && !p.asWritten
            ? `Written to ${vendorName}, waiting in your inbox for you to send.`
            : `Sent to ${vendorName}.`;
        tab = "inbox";
        break;
      }
      default:
        throw new ConvexError("PlusOne can't do that one.");
    }

    const next = [...calls];
    next[args.index] = { ...call, status: "done", result: { done, tab, at: Date.now() } };
    await ctx.db.patch(args.replyId, { toolCalls: next });
    return { done, ...(tab ? { tab } : {}) };
  },
});

/** Not now: the card stops asking, and nothing is written. */
export const dismissProposal = mutation({
  args: { weddingId: v.id("weddings"), replyId: v.id("chatMessages"), index: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.weddingId, "planner");
    const reply = await ctx.db.get(args.replyId);
    if (!reply || reply.weddingId !== args.weddingId) return null;
    const calls = reply.toolCalls ?? [];
    const call = calls[args.index];
    if (!call || call.status !== "proposed") return null;
    const next = [...calls];
    next[args.index] = { ...call, status: "dismissed", result: { done: "Dismissed.", at: Date.now() } };
    await ctx.db.patch(args.replyId, { toolCalls: next });
    return null;
  },
});

/** Only the content of a card is the couple's to change; never what it points at. */
const OVERRIDABLE: Record<string, string[]> = {
  add_guest: ["guestName", "guestEmail", "guestSide", "guestPartySize", "eventIds"],
  add_need: ["title", "category", "eventIds"],
  research: ["query"],
  set_budget: ["amount"],
  add_event: ["eventName", "date", "guestCount", "budgetShare"],
  write_vendor: ["message", "asWritten"],
};

function mergeOverrides(stored: Record<string, unknown>, overrides: unknown): Record<string, unknown> {
  if (!overrides || typeof overrides !== "object") return stored;
  const allowed = OVERRIDABLE[String(stored.kind)] ?? [];
  const merged = { ...stored };
  for (const [key, value] of Object.entries(overrides as Record<string, unknown>)) {
    if (allowed.includes(key) && value !== undefined) merged[key] = value;
  }
  return merged;
}

/**
 * One day's budget, with the rest sharing what is left in their current proportions —
 * the same arithmetic the days screen uses, so the total never drifts.
 */
async function setEventBudget(ctx: MutationCtx, event: Doc<"events">, amount: number): Promise<void> {
  const wedding = await ctx.db.get(event.weddingId);
  if (!wedding) return;
  const events = await ctx.db
    .query("events")
    .withIndex("by_weddingId", (q) => q.eq("weddingId", event.weddingId))
    .take(50);
  const mine = Math.min(amount, wedding.totalBudget);
  const others = events.filter((e) => e._id !== event._id);
  const othersTotal = others.reduce((sum, e) => sum + e.budget, 0);
  const left = Math.max(0, wedding.totalBudget - mine);
  const weights = new Map<Id<"events">, number>([[event._id, mine]]);
  for (const other of others) {
    weights.set(other._id, othersTotal > 0 ? (other.budget / othersTotal) * left : left / Math.max(1, others.length));
  }
  await rebalanceWeddingBudget(ctx, event.weddingId, weights);
}

// ---- internal ---------------------------------------------------------------

/**
 * Everything the assistant is allowed to know, gathered in one read.
 *
 * Ids travel with the names they belong to, because the assistant proposes actions by
 * name ("the florist", "the Oak Barn") and those have to resolve to something real
 * before a card is ever shown.
 */
export const context = internalQuery({
  args: { weddingId: v.id("weddings") },
  returns: v.object({
    recent: v.array(v.object({ role: v.string(), content: v.string() })),
    currency: v.string(),
    totalBudget: v.number(),
    sendMode: v.string(),
    committed: v.number(),
    events: v.array(
      v.object({
        eventId: v.id("events"),
        name: v.string(),
        date: v.string(),
        dayIndex: v.number(),
        guestCount: v.number(),
        budget: v.number(),
      }),
    ),
    needs: v.array(
      v.object({
        slotId: v.id("vendorSlots"),
        title: v.string(),
        category: v.string(),
        budget: v.number(),
        status: v.string(),
        vendorCount: v.number(),
        bestQuote: v.union(v.number(), v.null()),
        eventIds: v.array(v.id("events")),
      }),
    ),
    vendors: v.array(
      v.object({
        threadId: v.id("threads"),
        vendorName: v.string(),
        slotTitle: v.string(),
        state: v.string(),
        hasEmail: v.boolean(),
      }),
    ),
    guests: v.object({
      total: v.number(),
      yes: v.number(),
      pending: v.number(),
      names: v.array(v.string()),
    }),
  }),
  handler: async (ctx, args) => {
    const wedding = await ctx.db.get(args.weddingId);
    if (!wedding) throw new Error("Wedding not found");

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .order("desc")
      .take(40);
    const recent = messages
      .reverse()
      .filter((m) => m.content.trim().length > 0)
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content }));

    const events = await ctx.db
      .query("events")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(50);
    const slots = await ctx.db
      .query("vendorSlots")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(100);
    // Flat reads and an in-memory group-by: the same answer as two queries per slot,
    // in two queries for the whole wedding.
    const vendorRows = await ctx.db
      .query("vendors")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(500);
    const quoteRows = await ctx.db
      .query("quotes")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(400);
    const threadRows = await ctx.db
      .query("threads")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(100);
    const guests = await ctx.db
      .query("guests")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(500);
    const lines = await ctx.db
      .query("budgetLines")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(200);

    const vendorById = new Map(vendorRows.map((vendor) => [vendor._id, vendor]));
    const slotById = new Map(slots.map((slot) => [slot._id, slot]));
    const countBySlot = new Map<string, number>();
    for (const vendor of vendorRows) {
      if (!vendor.slotId) continue;
      countBySlot.set(vendor.slotId, (countBySlot.get(vendor.slotId) ?? 0) + 1);
    }
    const bestBySlot = new Map<string, number>();
    for (const quote of quoteRows) {
      const best = bestBySlot.get(quote.slotId);
      if (best === undefined || quote.total < best) bestBySlot.set(quote.slotId, quote.total);
    }

    return {
      recent,
      currency: wedding.currency,
      totalBudget: wedding.totalBudget,
      sendMode: wedding.sendMode ?? "auto",
      committed: lines.reduce((sum, l) => sum + l.committed, 0),
      events: events
        .sort((a, b) => a.order - b.order)
        .map((e) => ({
          eventId: e._id,
          name: e.name,
          date: e.date,
          dayIndex: e.dayIndex,
          guestCount: e.guestCount,
          budget: e.budget,
        })),
      needs: slots.map((slot) => ({
        slotId: slot._id,
        title: slot.title,
        category: slot.category,
        budget: slot.budget,
        status: slot.status,
        vendorCount: countBySlot.get(slot._id) ?? 0,
        bestQuote: bestBySlot.get(slot._id) ?? null,
        eventIds: slot.eventIds,
      })),
      vendors: threadRows.map((thread) => ({
        threadId: thread._id,
        vendorName: vendorById.get(thread.vendorId)?.name ?? "A vendor",
        slotTitle: slotById.get(thread.slotId)?.title ?? "",
        state: thread.status,
        hasEmail: Boolean(vendorById.get(thread.vendorId)?.email),
      })),
      guests: {
        total: guests.length,
        yes: guests.filter((g) => g.rsvp === "yes").length,
        pending: guests.filter((g) => g.rsvp === "pending").length,
        names: guests.slice(0, 200).map((g) => g.name),
      },
    };
  },
});

/** Keep a few things the couple said that no screen holds. Newest wins, oldest drops. */
export const remember = internalMutation({
  args: { weddingId: v.id("weddings"), notes: v.array(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const wedding = await ctx.db.get(args.weddingId);
    if (!wedding) return null;
    const known = wedding.assistantNotes ?? [];
    const seen = new Set(known.map((n) => n.trim().toLowerCase()));
    const fresh = args.notes
      .map((n) => n.trim().slice(0, 160))
      .filter((n) => n.length > 2 && !seen.has(n.toLowerCase()));
    if (fresh.length === 0) return null;
    await ctx.db.patch(args.weddingId, { assistantNotes: [...known, ...fresh].slice(-MAX_NOTES) });
    return null;
  },
});

/** The couple can drop anything it remembered. */
export const forgetNote = mutation({
  args: { weddingId: v.id("weddings"), note: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { wedding } = await requireMember(ctx, args.weddingId, "planner");
    const kept = (wedding.assistantNotes ?? []).filter((n) => n !== args.note);
    await ctx.db.patch(args.weddingId, { assistantNotes: kept });
    return null;
  },
});

/** What the assistant has been told to remember, for the couple to see and edit. */
export const notes = query({
  args: { weddingId: v.id("weddings") },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const { wedding } = await requireMember(ctx, args.weddingId);
    return wedding.assistantNotes ?? [];
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
