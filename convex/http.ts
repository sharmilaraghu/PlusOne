import { httpRouter } from "convex/server";
import { registerStaticRoutes } from "@convex-dev/static-hosting";
import { components, internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { verifySvix } from "./lib/svix";
import { extractEmail } from "./lib/text";

const http = httpRouter();

auth.addHttpRoutes(http);

/**
 * AgentMail -> Svix webhook. Verify, claim (dedupe on message_id), schedule the
 * heavy ingest in a node action, and return 200 fast so Svix does not retry.
 */
http.route({
  path: "/agentmail/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const rawBody = await request.text();
    const secret = process.env.AGENTMAIL_WEBHOOK_SECRET;
    if (secret) {
      const ok = await verifySvix(secret, request.headers, rawBody);
      if (!ok) return new Response("invalid signature", { status: 401 });
    } else {
      console.warn("AGENTMAIL_WEBHOOK_SECRET is not set; accepting unsigned webhook");
    }

    let payload: WebhookPayload;
    try {
      payload = JSON.parse(rawBody) as WebhookPayload;
    } catch {
      return new Response("invalid json", { status: 400 });
    }
    if (payload.event_type !== "message.received" || !payload.message) {
      return json({ ok: true, ignored: payload.event_type ?? "unknown" });
    }
    const m = payload.message;
    if (!m.message_id || !m.inbox_id) return new Response("missing message_id/inbox_id", { status: 400 });

    const rawFrom = m.from_ ?? m.from;
    const fromAddress = extractEmail(Array.isArray(rawFrom) ? rawFrom[0] : rawFrom);
    const eventId = payload.event_id ?? `evt_${m.message_id}`;

    const claim = await ctx.runMutation(internal.inbound.claim, {
      agentmailMessageId: m.message_id,
      eventId,
      inboxId: m.inbox_id,
      threadId: m.thread_id ?? undefined,
      fromAddress,
    });
    if (claim.status === "duplicate") return json({ ok: true, duplicate: true });

    await ctx.scheduler.runAfter(0, internal.agentmail.ingestInbound, {
      inboundEventId: claim.inboundEventId,
      weddingId: claim.weddingId ?? undefined,
      inboxId: m.inbox_id,
      messageId: m.message_id,
      threadId: m.thread_id ?? undefined,
      fromAddress,
      subject: (m.subject ?? "(no subject)").slice(0, 500),
      text: m.text ?? undefined,
      html: m.html ? m.html.slice(0, 200_000) : undefined,
      extractedText: m.extracted_text ?? undefined,
      attachments: (m.attachments ?? []).slice(0, 10).map((a) => ({
        attachmentId: a.attachment_id,
        filename: a.filename ?? undefined,
        contentType: a.content_type ?? undefined,
        size: typeof a.size === "number" ? a.size : undefined,
        inline: a.inline ?? undefined,
      })),
    });
    return json({ ok: true });
  }),
});

// Static site catch-all must be registered LAST so exact routes above win.
registerStaticRoutes(http, components.staticHosting);

export default http;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

type WebhookPayload = {
  event_type?: string;
  event_id?: string;
  message?: {
    inbox_id?: string;
    thread_id?: string | null;
    message_id?: string;
    from_?: string | string[];
    from?: string | string[];
    to?: string[];
    subject?: string | null;
    text?: string | null;
    html?: string | null;
    extracted_text?: string | null;
    attachments?: {
      attachment_id: string;
      filename?: string | null;
      content_type?: string | null;
      size?: number | null;
      inline?: boolean | null;
    }[];
  };
};
