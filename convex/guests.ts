import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { logActivity, requireMember } from "./lib/auth";
import { guestDoc, weddingDoc } from "./lib/docs";
import { emailPool } from "./lib/pools";
import { importStatus, rsvpStatus } from "./lib/validators";

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
    /** Omitted when the reply only told us about food, so their answer stays as it was. */
    rsvp: v.optional(rsvpStatus),
    attendingCount: v.number(),
    dietary: v.optional(v.string()),
    allergies: v.optional(v.array(v.string())),
    note: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const guest = await ctx.db.get(args.guestId);
    if (!guest) return null;
    const attendingCount = Math.max(0, Math.min(guest.partySize, Math.floor(Number.isFinite(args.attendingCount) ? args.attendingCount : 0)));
    // Allergies only ever accumulate: a later "see you there!" must not erase "Sam is allergic to shellfish".
    const known = guest.allergies ?? [];
    const fresh = (args.allergies ?? []).filter(
      (a) => !known.some((k) => k.split(",")[0].trim().toLowerCase() === a.split(",")[0].trim().toLowerCase()),
    );
    const allergies = [...known, ...fresh].slice(0, 12).map((a) => a.slice(0, 120));
    await ctx.db.patch(args.guestId, {
      ...(args.rsvp ? { rsvp: args.rsvp, attendingCount: args.rsvp === "no" ? 0 : attendingCount } : {}),
      ...(args.dietary ? { dietary: args.dietary.slice(0, 300) } : {}),
      ...(fresh.length ? { allergies } : {}),
      ...(args.note ? { notes: args.note.slice(0, 500) } : {}),
    });
    const food = fresh.length ? ` Allergy: ${fresh.join("; ")}.` : "";
    await logActivity(ctx, {
      weddingId: guest.weddingId,
      actorLabel: guest.name,
      type: "guest_rsvp",
      text:
        !args.rsvp
          ? `told you about their food needs.${food}${args.dietary ? ` ${args.dietary}.` : ""}`
          : args.rsvp === "yes"
            ? `RSVP'd yes${attendingCount > 1 ? ` for ${attendingCount}` : ""}${args.dietary ? ` (${args.dietary})` : ""}.${food}`
            : args.rsvp === "no"
              ? "RSVP'd no."
              : `RSVP'd ${args.rsvp}.${food}`,
      refs: { guestId: guest._id },
    });
    return null;
  },
});

/**
 * What the kitchen needs to know, without names: allergens with how many guests and
 * whether any are severe, then preferences. Null when nobody has said anything.
 */
export const dietarySummary = internalQuery({
  args: { weddingId: v.id("weddings") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const guests = await ctx.db
      .query("guests")
      .withIndex("by_weddingId", (q) => q.eq("weddingId", args.weddingId))
      .take(1000);
    const allergens = new Map<string, { count: number; severe: number }>();
    const prefs = new Map<string, number>();
    for (const g of guests) {
      if (g.rsvp === "no") continue;
      for (const a of g.allergies ?? []) {
        const [name, ...rest] = a.split(",");
        const key = name.replace(/\(.*\)/, "").trim().toLowerCase();
        const entry = allergens.get(key) ?? { count: 0, severe: 0 };
        entry.count += 1;
        if (rest.join(",").includes("severe")) entry.severe += 1;
        allergens.set(key, entry);
      }
      if (g.dietary) prefs.set(g.dietary.trim().toLowerCase(), (prefs.get(g.dietary.trim().toLowerCase()) ?? 0) + 1);
    }
    if (allergens.size === 0 && prefs.size === 0) return null;
    const parts: string[] = [];
    if (allergens.size) {
      parts.push(
        "Allergies: " +
          [...allergens].map(([k, e]) => `${k} (${e.count} ${e.count === 1 ? "guest" : "guests"}${e.severe ? `, ${e.severe} severe` : ""})`).join("; "),
      );
    }
    if (prefs.size) parts.push("Other food needs: " + [...prefs].map(([k, n]) => `${k} (${n})`).join("; "));
    return parts.join(". ") + ".";
  },
});

// ---- bringing in a whole list at once ---------------------------------------

const MAX_IMPORT_GUESTS = 400;

const importedGuest = v.object({
  name: v.string(),
  email: v.optional(v.string()),
  side: v.optional(v.string()),
  partySize: v.number(),
});

/** A one-off upload URL for a guest list file. */
export const generateUploadUrl = mutation({
  args: { weddingId: v.id("weddings") },
  returns: v.string(),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.weddingId, "planner");
    return await ctx.storage.generateUploadUrl();
  },
});

/** Hand PlusOne a spreadsheet, a PDF or a pasted list; it comes back as rows to check. */
export const startImport = mutation({
  args: {
    weddingId: v.id("weddings"),
    storageId: v.optional(v.id("_storage")),
    filename: v.optional(v.string()),
    rawText: v.optional(v.string()),
  },
  returns: v.id("guestImports"),
  handler: async (ctx, args) => {
    await requireMember(ctx, args.weddingId, "planner");
    if (!args.storageId && !args.rawText?.trim()) throw new ConvexError("Paste a list or choose a file first.");
    const importId = await ctx.db.insert("guestImports", {
      weddingId: args.weddingId,
      storageId: args.storageId,
      filename: args.filename?.slice(0, 200),
      rawText: args.rawText?.slice(0, 40_000),
      status: "pending",
    });
    await ctx.scheduler.runAfter(0, internal.guestImport.read, { importId });
    return importId;
  },
});

/** The list PlusOne read, for the couple to check before anyone is added. */
export const getImportForCouple = query({
  args: { importId: v.id("guestImports") },
  returns: v.union(
    v.object({
      status: importStatus,
      filename: v.optional(v.string()),
      error: v.optional(v.string()),
      note: v.optional(v.string()),
      guests: v.array(importedGuest),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.importId);
    if (!row) return null;
    await requireMember(ctx, row.weddingId);
    const preview = (row.preview ?? {}) as { guests?: unknown; note?: string };
    return {
      status: row.status,
      filename: row.filename,
      error: row.error,
      note: preview.note,
      guests: (Array.isArray(preview.guests) ? preview.guests : []) as { name: string; email?: string; side?: string; partySize: number }[],
    };
  },
});

/** Add the rows the couple kept. Anyone already on the list by email is left alone. */
export const commitImport = mutation({
  args: { importId: v.id("guestImports"), guests: v.array(importedGuest), eventIds: v.optional(v.array(v.id("events"))) },
  returns: v.object({ added: v.number(), skipped: v.number() }),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.importId);
    if (!row) throw new ConvexError("That import is gone.");
    const { userId } = await requireMember(ctx, row.weddingId, "planner");
    if (args.guests.length === 0) throw new ConvexError("Nobody to add.");
    if (args.guests.length > MAX_IMPORT_GUESTS) throw new ConvexError(`Up to ${MAX_IMPORT_GUESTS} guests at a time.`);

    let eventIds = args.eventIds ?? [];
    if (eventIds.length === 0) {
      eventIds = (
        await ctx.db
          .query("events")
          .withIndex("by_weddingId", (q) => q.eq("weddingId", row.weddingId))
          .take(50)
      ).map((e) => e._id);
    }
    // Someone with no email can still be a duplicate, so names count too.
    const existingNames = new Set(
      (
        await ctx.db
          .query("guests")
          .withIndex("by_weddingId", (q) => q.eq("weddingId", row.weddingId))
          .take(2000)
      ).map((g) => g.name.trim().toLowerCase()),
    );
    let added = 0;
    let skipped = 0;
    for (const guest of args.guests.slice(0, MAX_IMPORT_GUESTS)) {
      const name = guest.name.trim().slice(0, 120);
      if (!name) {
        skipped += 1;
        continue;
      }
      const email = guest.email?.trim().toLowerCase();
      if (email && !EMAIL_RE.test(email)) {
        skipped += 1;
        continue;
      }
      if (email) {
        const existing = await ctx.db
          .query("guests")
          .withIndex("by_weddingId_and_email", (q) => q.eq("weddingId", row.weddingId).eq("email", email))
          .first();
        if (existing) {
          skipped += 1;
          continue;
        }
      }
      if (!email && existingNames.has(name.toLowerCase())) {
        skipped += 1;
        continue;
      }
      existingNames.add(name.toLowerCase());
      const partySize = Math.max(1, Math.min(20, Math.floor(guest.partySize || 1)));
      await ctx.db.insert("guests", {
        weddingId: row.weddingId,
        name,
        email: email || undefined,
        side: guest.side?.slice(0, 60) || undefined,
        partySize,
        rsvp: "pending",
        attendingCount: 0,
        eventIds: eventIds.slice(0, 20),
      });
      added += 1;
    }
    await ctx.db.patch(args.importId, { status: "committed" });
    if (added > 0) {
      await logActivity(ctx, {
        weddingId: row.weddingId,
        actorUserId: userId,
        type: "note",
        text: `added ${added} ${added === 1 ? "guest" : "guests"} from ${row.filename ?? "a pasted list"}.`,
      });
    }
    return { added, skipped };
  },
});

// ---- internal ---------------------------------------------------------------

export const getImport = internalQuery({
  args: { importId: v.id("guestImports") },
  returns: v.union(
    v.object({
      weddingId: v.id("weddings"),
      storageId: v.optional(v.id("_storage")),
      filename: v.optional(v.string()),
      rawText: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.importId);
    if (!row) return null;
    return { weddingId: row.weddingId, storageId: row.storageId, filename: row.filename, rawText: row.rawText };
  },
});

export const setImportPreview = internalMutation({
  args: { importId: v.id("guestImports"), guests: v.array(importedGuest), note: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.importId, { status: "mapped", preview: { guests: args.guests, note: args.note }, error: undefined });
    return null;
  },
});

export const failImport = internalMutation({
  args: { importId: v.id("guestImports"), error: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.importId, { status: "failed", error: args.error.slice(0, 300) });
    return null;
  },
});
