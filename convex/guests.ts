import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { logActivity, requireMember } from "./lib/auth";
import { guestDoc, weddingDoc } from "./lib/docs";
import { emailPool } from "./lib/pools";
import { rsvpStatus } from "./lib/validators";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const list = query({
  args: { weddingId: v.id("weddings") },
  returns: v.array(guestDoc),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.weddingId);
    return await ctx.db
      .query("guests")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(500);
  },
});

export const add = mutation({
  args: {
    weddingId: v.id("weddings"),
    name: v.string(),
    email: v.optional(v.string()),
    side: v.optional(v.string()),
    partySize: v.optional(v.number()),
    eventIds: v.optional(v.array(v.id("events"))),
  },
  returns: v.id("guests"),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.weddingId, "planner");
    const email = args.email?.trim().toLowerCase();
    if (email && !EMAIL_RE.test(email)) throw new ConvexError("That does not look like an email address.");
    const partySize = args.partySize ?? 1;
    if (!Number.isFinite(partySize) || partySize < 1 || partySize > 20) throw new ConvexError("Party size must be between 1 and 20.");
    let eventIds = args.eventIds ?? [];
    if (eventIds.length === 0) {
      eventIds = (
        await ctx.db
          .query("events")
          .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
          .take(50)
      ).map((e) => e._id);
    } else {
      for (const eventId of eventIds.slice(0, 20)) {
        const event = await ctx.db.get(eventId);
        if (!event || event.weddingId !== args.weddingId) throw new ConvexError("Event does not belong to this wedding.");
      }
    }
    return await ctx.db.insert("guests", {
      weddingId: args.weddingId,
      name: args.name.trim(),
      email: email || undefined,
      side: args.side,
      partySize: Math.floor(partySize),
      rsvp: "pending",
      attendingCount: 0,
      eventIds: eventIds.slice(0, 20),
    });
  },
});

export const update = mutation({
  args: {
    guestId: v.id("guests"),
    patch: v.object({
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      side: v.optional(v.string()),
      partySize: v.optional(v.number()),
      rsvp: v.optional(rsvpStatus),
      attendingCount: v.optional(v.number()),
      dietary: v.optional(v.string()),
      eventIds: v.optional(v.array(v.id("events"))),
      notes: v.optional(v.string()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const guest = await ctx.db.get(args.guestId);
    if (!guest) throw new ConvexError("Guest not found.");
    await requireMember(ctx, guest.weddingId, "planner");
    const patch = { ...args.patch };
    if (patch.email !== undefined) {
      patch.email = patch.email.trim().toLowerCase();
      if (patch.email && !EMAIL_RE.test(patch.email)) throw new ConvexError("That does not look like an email address.");
    }
    for (const key of ["partySize", "attendingCount"] as const) {
      const val = patch[key];
      if (val !== undefined && (!Number.isFinite(val) || val < 0 || val > 20)) throw new ConvexError(`${key} must be between 0 and 20.`);
    }
    await ctx.db.patch(args.guestId, patch);
    return null;
  },
});

export const remove = mutation({
  args: { guestId: v.id("guests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const guest = await ctx.db.get(args.guestId);
    if (!guest) throw new ConvexError("Guest not found.");
    await requireMember(ctx, guest.weddingId, "planner");
    await ctx.db.delete(args.guestId);
    return null;
  },
});

/** Email RSVP invites from the wedding inbox. Replies are matched back by sender address. */
export const sendInvites = mutation({
  args: { weddingId: v.id("weddings"), guestIds: v.array(v.id("guests")) },
  returns: v.object({ queued: v.number(), skipped: v.number() }),
  handler: async (ctx, args): Promise<{ queued: number; skipped: number }> => {
    const { wedding } = await requireMember(ctx, args.weddingId, "planner");
    if (args.guestIds.length > 50) throw new ConvexError("Send to at most 50 guests at a time.");
    const fromAddress = wedding.inboxAddress ?? process.env.AGENTMAIL_FALLBACK_INBOX_ID;
    if (!fromAddress) throw new ConvexError("The wedding inbox is not ready yet. Try again in a moment.");
    const events = (
      await ctx.db
        .query("events")
        .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
        .take(50)
    ).sort((a, b) => a.order - b.order);
    let queued = 0;
    let skipped = 0;
    for (const guestId of args.guestIds) {
      const guest = await ctx.db.get(guestId);
      if (!guest || guest.weddingId !== args.weddingId || !guest.email) {
        skipped += 1;
        continue;
      }
      const invited = events.filter((e) => guest.eventIds.includes(e._id));
      const lines = invited.map((e) => `  • ${e.name} — ${e.date}`).join("\n");
      const bodyText =
        `Hi ${guest.name.split(" ")[0]},\n\n` +
        `${wedding.partnerA} & ${wedding.partnerB} would love to have you at their wedding in ${wedding.city}` +
        ` (${wedding.startDate} to ${wedding.endDate}).\n\n` +
        (lines ? `You're invited to:\n${lines}\n\n` : "") +
        `Just reply to this email with "yes" or "no", how many of your party of ${guest.partySize} will attend, ` +
        `and any dietary needs. We'll take care of the rest.\n\n` +
        `With love,\n${wedding.partnerA} & ${wedding.partnerB}`;
      const round = (guest.lastInvitedAt ? 2 : 1);
      const messageId = await ctx.db.insert("messages", {
        weddingId: args.weddingId,
        guestId,
        direction: "out",
        kind: "rsvp_invite",
        status: "queued",
        fromAddress,
        toAddress: guest.email,
        subject: `You're invited: ${wedding.name}`.slice(0, 70),
        bodyText,
        attachments: [],
        idempotencyKey: `${guestId}:rsvp_invite:${round}`,
      });
      await emailPool.enqueueAction(ctx, internal.agentmail.sendOutbound, { messageId }, { retry: false });
      queued += 1;
    }
    return { queued, skipped };
  },
});

// ---- internal ---------------------------------------------------------------

export const getContextForRsvp = internalQuery({
  args: { guestId: v.id("guests") },
  returns: v.union(v.object({ guest: guestDoc, wedding: weddingDoc }), v.null()),
  handler: async (ctx, args) => {
    const guest = await ctx.db.get(args.guestId);
    if (!guest) return null;
    const wedding = await ctx.db.get(guest.weddingId);
    if (!wedding) return null;
    return { guest, wedding };
  },
});

export const markInvited = internalMutation({
  args: { guestId: v.id("guests"), at: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const guest = await ctx.db.get(args.guestId);
    if (!guest) return null;
    await ctx.db.patch(args.guestId, guest.lastInvitedAt ? { lastRemindedAt: args.at } : { lastInvitedAt: args.at });
    return null;
  },
});

export const applyRsvp = internalMutation({
  args: {
    guestId: v.id("guests"),
    rsvp: rsvpStatus,
    attendingCount: v.number(),
    dietary: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const guest = await ctx.db.get(args.guestId);
    if (!guest) return null;
    const attendingCount = Math.max(0, Math.min(guest.partySize, Math.floor(Number.isFinite(args.attendingCount) ? args.attendingCount : 0)));
    await ctx.db.patch(args.guestId, {
      rsvp: args.rsvp,
      attendingCount: args.rsvp === "no" ? 0 : attendingCount,
      ...(args.dietary ? { dietary: args.dietary.slice(0, 300) } : {}),
      ...(args.note ? { notes: args.note.slice(0, 500) } : {}),
    });
    await logActivity(ctx, {
      weddingId: guest.weddingId,
      actorLabel: guest.name,
      type: "guest_rsvp",
      text:
        args.rsvp === "yes"
          ? `RSVP'd yes${attendingCount > 1 ? ` for ${attendingCount}` : ""}${args.dietary ? ` (${args.dietary})` : ""}.`
          : args.rsvp === "no"
            ? "RSVP'd no."
            : `RSVP'd ${args.rsvp}.`,
      refs: { guestId: guest._id },
    });
    return null;
  },
});
