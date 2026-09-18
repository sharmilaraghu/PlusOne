"use node";

import { AgentMailClient } from "agentmail";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, type ActionCtx } from "./_generated/server";
import { extractEmail, slugify } from "./lib/text";
import { workflow } from "./workflows";

const am = new AgentMailClient({ apiKey: process.env.AGENTMAIL_API_KEY });

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

function fallbackInbox(): string | undefined {
  return process.env.AGENTMAIL_FALLBACK_INBOX_ID || undefined;
}

/**
 * How many inboxes this AgentMail plan allows. Every wedding is meant to get its own
 * address, so on a small plan the only way to keep that promise for the next couple
 * is to give up an inbox nobody is using.
 */
const INBOX_LIMIT = Number(process.env.AGENTMAIL_INBOX_LIMIT ?? 3);

/**
 * Free a slot, if one can be freed honestly.
 *
 * Nothing carrying real correspondence is ever deleted: an inbox is only a candidate
 * when its wedding has never written to or heard from a vendor, and the fallback inbox
 * is never touched. The wedding that gives one up is told, so the app stops pointing at
 * an address that no longer exists.
 */
async function makeRoomForInbox(ctx: ActionCtx): Promise<void> {
  let inboxes: Array<{ inboxId?: string; createdAt?: unknown }> = [];
  try {
    const res = (await am.inboxes.list()) as { inboxes?: unknown; data?: unknown };
    inboxes = ((res.inboxes ?? res.data ?? []) as Array<{ inboxId?: string; createdAt?: unknown }>);
  } catch (err) {
    console.warn("agentmail.inboxes.list failed", err instanceof Error ? err.message : err);
    return; // let the create attempt decide
  }
  if (inboxes.length < INBOX_LIMIT) return;

  const reserved = fallbackInbox();
  const usage = await ctx.runQuery(internal.weddings.inboxUsage, {});
  const byInbox = new Map(usage.map((u) => [u.inboxId, u]));

  // Oldest first, so the inbox given up is always the most stale one.
  const candidates = inboxes
    .filter((i): i is { inboxId: string; createdAt?: unknown } => Boolean(i.inboxId) && i.inboxId !== reserved)
    .filter((i) => byInbox.get(i.inboxId)?.hasTraffic !== true)
    .sort((a, b) => String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")));

  let held = inboxes.length;
  for (const candidate of candidates) {
    if (held < INBOX_LIMIT) break;
    try {
      await am.inboxes.delete(candidate.inboxId);
      const owner = byInbox.get(candidate.inboxId);
      if (owner) await ctx.runMutation(internal.weddings.clearInbox, { weddingId: owner.weddingId });
      held -= 1;
      console.log("released an idle AgentMail inbox", candidate.inboxId);
    } catch (err) {
      console.warn("could not release inbox", candidate.inboxId, err instanceof Error ? err.message : err);
    }
  }
}

// ---- inbox ------------------------------------------------------------------

export const createInbox = internalAction({
  args: { weddingId: v.id("weddings") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args): Promise<string | null> => {
    const wedding = await ctx.runQuery(internal.weddings.getInternal, { weddingId: args.weddingId });
    if (!wedding) return null;
    if (wedding.inboxId) return wedding.inboxId; // workflow replay / retry safety
    const shortId = wedding._id.slice(-6).toLowerCase().replace(/[^a-z0-9]/g, "");
    const username = `${slugify(wedding.partnerA)}-and-${slugify(wedding.partnerB)}-${shortId}`.replace(/-+/g, "-").slice(0, 60);
    // On a small plan the limit is reached quickly, and a couple with no inbox cannot be
    // written to at all — so make room before asking, and share the fallback rather than
    // fail if there is genuinely nothing to give up.
    await makeRoomForInbox(ctx);

    let inboxId: string | undefined;
    let inboxAddress: string | undefined;
    try {
      const inbox = await am.inboxes.create({
        username,
        domain: process.env.AGENTMAIL_INBOX_DOMAIN || undefined,
        displayName: `${wedding.partnerA} & ${wedding.partnerB}`,
        clientId: `plusone-${wedding._id}`,
      });
      inboxId = inbox.inboxId;
      inboxAddress = inbox.email ?? inbox.inboxId;
    } catch (err) {
      console.warn("agentmail.inboxes.create failed, using fallback inbox", err instanceof Error ? err.message : err);
      const fb = fallbackInbox();
      if (!fb) throw err;
      inboxId = fb;
      inboxAddress = fb;
    }
    await ctx.runMutation(internal.weddings.setInbox, { weddingId: args.weddingId, inboxId, inboxAddress: inboxAddress ?? inboxId });
    return inboxId;
  },
});

// ---- outbound ---------------------------------------------------------------

/**
 * Sends one queued message. `markSending` is a compare-and-set so a duplicate
 * enqueue can never double-send; the workpool never retries this action.
 */
export const sendOutbound = internalAction({
  args: { messageId: v.id("messages") },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const taken = await ctx.runMutation(internal.messages.markSending, { messageId: args.messageId });
    if (!taken) return null;
    const context = await ctx.runQuery(internal.messages.getContext, { messageId: args.messageId });
    if (!context) return null;
    const { message, wedding, thread } = context;
    const inboxId = wedding.inboxId ?? fallbackInbox();
    try {
      if (!inboxId) throw new Error("No AgentMail inbox for this wedding yet");
      if (!message.toAddress) throw new Error("Recipient has no email address");
      const replyTo = message.kind === "inquiry" ? undefined : thread?.lastInboundMessageId;
      const result = replyTo
        ? await am.inboxes.messages.reply(inboxId, replyTo, { text: message.bodyText })
        : await am.inboxes.messages.send(inboxId, { to: [message.toAddress], subject: message.subject, text: message.bodyText });
      const sentAt = Date.now();
      await ctx.runMutation(internal.messages.markSent, {
        messageId: args.messageId,
        agentmailMessageId: result.messageId,
        agentmailThreadId: result.threadId,
        sentAt,
      });
      if (thread) {
        await ctx.runMutation(internal.threads.markSent, {
          threadId: thread._id,
          agentmailThreadId: result.threadId,
          sentAt,
          kind: message.kind,
        });
      }
      if (message.guestId) {
        await ctx.runMutation(internal.guests.markInvited, { guestId: message.guestId, at: sentAt });
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.messages.markFailed, { messageId: args.messageId, error });
      if (thread) await ctx.runMutation(internal.threads.setAttention, { threadId: thread._id, reason: "send_failed" });
    }
    return null;
  },
});

export const sendInvite = internalAction({
  args: { inviteId: v.id("invites") },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const context = await ctx.runQuery(internal.invites.getInternal, { inviteId: args.inviteId });
    if (!context) return null;
    const { invite, wedding, inviterLabel } = context;
    const email = invite.email;
    if (!email) return null;
    const inboxId = wedding.inboxId ?? fallbackInbox();
    if (!inboxId) return null; // link-only invite
    const base = (process.env.SITE_URL ?? process.env.CONVEX_SITE_URL ?? "").replace(/\/$/, "");
    const link = `${base}/invite/${invite.token}`;
    const text =
      `Hi,\n\n${inviterLabel} invited you to help plan ${wedding.name} (${wedding.partnerA} & ${wedding.partnerB}) on PlusOne as a ${invite.role}.\n\n` +
      `Open this link to join: ${link}\n\nSee you there!`;
    try {
      const result = await am.inboxes.messages.send(inboxId, {
        to: [email],
        subject: `Help plan ${wedding.name}`.slice(0, 70),
        text,
      });
      // Record the sent invite in the message log.
      const messageId = await ctx.runMutation(internal.messages.createOutboundDraft, {
        weddingId: wedding._id,
        kind: "invite",
        status: "queued",
        fromAddress: wedding.inboxAddress ?? inboxId,
        toAddress: email,
        subject: `Help plan ${wedding.name}`.slice(0, 70),
        bodyText: text,
        idempotencyKey: `${invite._id}:invite`,
      });
      await ctx.runMutation(internal.messages.markSent, {
        messageId,
        agentmailMessageId: result.messageId,
        agentmailThreadId: result.threadId,
        sentAt: Date.now(),
      });
    } catch (err) {
      console.warn("sendInvite failed", err instanceof Error ? err.message : err);
    }
    return null;
  },
});

// ---- inbound ----------------------------------------------------------------

const inboundAttachment = v.object({
  attachmentId: v.string(),
  filename: v.optional(v.string()),
  contentType: v.optional(v.string()),
  size: v.optional(v.number()),
  inline: v.optional(v.boolean()),
});

/**
 * Runs after the webhook has claimed the event. Routing order:
 *  1. AgentMail thread id matches a vendor thread  -> vendor reply
 *  2. Sender is a known guest of a wedding on this inbox -> RSVP reply
 *  3. Otherwise unknown sender (a PDF attachment still becomes a contract check)
 */
export const ingestInbound = internalAction({
  args: {
    inboundEventId: v.id("inboundEvents"),
    weddingId: v.optional(v.id("weddings")),
    inboxId: v.string(),
    messageId: v.string(),
    threadId: v.optional(v.string()),
    fromAddress: v.string(),
    subject: v.string(),
    text: v.optional(v.string()),
    html: v.optional(v.string()),
    extractedText: v.optional(v.string()),
    attachments: v.array(inboundAttachment),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    try {
      let bodyText = args.extractedText || args.text || "";
      let attachments = args.attachments;
      let toAddress = args.inboxId;
      if (!bodyText) {
        // Webhook payloads can omit the body; refetch.
        const full = await am.inboxes.messages.get(args.inboxId, args.messageId);
        bodyText = full.extractedText || full.text || stripHtml(full.html ?? "") || "";
        toAddress = full.to?.[0] ?? toAddress;
        if (attachments.length === 0 && full.attachments) {
          attachments = full.attachments.map((a) => ({
            attachmentId: a.attachmentId,
            filename: a.filename,
            contentType: a.contentType,
            size: a.size,
          }));
        }
      }
      if (!bodyText && args.html) bodyText = stripHtml(args.html);

      const stored: { storageId: Id<"_storage">; filename: string; contentType: string; size: number }[] = [];
      for (const a of attachments.filter((x) => !x.inline).slice(0, MAX_ATTACHMENTS)) {
        if ((a.size ?? 0) > MAX_ATTACHMENT_BYTES) continue;
        try {
          const meta = await am.inboxes.messages.getAttachment(args.inboxId, args.messageId, a.attachmentId);
          const res = await fetch(meta.downloadUrl, { signal: AbortSignal.timeout(20_000) });
          if (!res.ok) continue;
          const blob = await res.blob();
          if (blob.size > MAX_ATTACHMENT_BYTES) continue;
          const storageId = await ctx.storage.store(blob);
          stored.push({
            storageId,
            filename: a.filename ?? meta.filename ?? "attachment",
            contentType: a.contentType ?? meta.contentType ?? blob.type ?? "application/octet-stream",
            size: blob.size,
          });
        } catch (err) {
          console.warn("attachment download failed", a.attachmentId, err instanceof Error ? err.message : err);
        }
      }

      const fromAddress = extractEmail(args.fromAddress);
      const receivedAt = Date.now();

      // 1. Vendor thread
      const thread = args.threadId
        ? await ctx.runQuery(internal.threads.findByAgentmailThreadId, { agentmailThreadId: args.threadId })
        : null;
      if (thread) {
        const { messageId, created } = await ctx.runMutation(internal.messages.recordInbound, {
          weddingId: thread.weddingId,
          threadId: thread._id,
          kind: "vendor_reply",
          fromAddress,
          toAddress,
          subject: args.subject,
          bodyText,
          agentmailMessageId: args.messageId,
          agentmailThreadId: args.threadId,
          attachments: stored,
          receivedAt,
        });
        if (created) {
          await ctx.runMutation(internal.threads.applyInbound, {
            threadId: thread._id,
            agentmailMessageId: args.messageId,
            agentmailThreadId: args.threadId,
            receivedAt,
          });
          await workflow.start(ctx, internal.workflows.inboundWorkflow, { messageId });
          const pdf = stored.find((s) => s.contentType.includes("pdf") || s.filename.toLowerCase().endsWith(".pdf"));
          if (pdf) {
            await ctx.runMutation(internal.inbound.createContractCheck, {
              weddingId: thread.weddingId,
              storageId: pdf.storageId,
              filename: pdf.filename,
              vendorId: thread.vendorId,
            });
          }
        }
        await ctx.runMutation(internal.inbound.finish, { inboundEventId: args.inboundEventId, routedAs: "vendor_reply", weddingId: thread.weddingId });
        return null;
      }

      // 2. Known guest
      const guest = fromAddress ? await ctx.runQuery(internal.inbound.findGuestByEmail, { inboxId: args.inboxId, email: fromAddress }) : null;
      if (guest) {
        const { messageId, created } = await ctx.runMutation(internal.messages.recordInbound, {
          weddingId: guest.weddingId,
          guestId: guest._id,
          kind: "rsvp_reply",
          fromAddress,
          toAddress,
          subject: args.subject,
          bodyText,
          agentmailMessageId: args.messageId,
          agentmailThreadId: args.threadId,
          attachments: stored,
          receivedAt,
        });
        if (created) await workflow.start(ctx, internal.workflows.rsvpWorkflow, { messageId });
        await ctx.runMutation(internal.inbound.finish, { inboundEventId: args.inboundEventId, routedAs: "guest_reply", weddingId: guest.weddingId });
        return null;
      }

      // 3. Unknown sender
      const pdf = stored.find((s) => s.contentType.includes("pdf") || s.filename.toLowerCase().endsWith(".pdf"));
      if (pdf && args.weddingId) {
        await ctx.runMutation(internal.inbound.createContractCheck, {
          weddingId: args.weddingId,
          storageId: pdf.storageId,
          filename: pdf.filename,
        });
        await ctx.runMutation(internal.inbound.finish, { inboundEventId: args.inboundEventId, routedAs: "contract", weddingId: args.weddingId });
        return null;
      }
      await ctx.runMutation(internal.inbound.finish, { inboundEventId: args.inboundEventId, routedAs: "unknown_sender", weddingId: args.weddingId });
      return null;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error("ingestInbound failed", error);
      await ctx.runMutation(internal.inbound.finish, { inboundEventId: args.inboundEventId, routedAs: "error", weddingId: args.weddingId, error });
      return null;
    }
  },
});

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
