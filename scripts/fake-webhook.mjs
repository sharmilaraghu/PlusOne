#!/usr/bin/env node
// Sends a Svix-signed fake `message.received` event to the webhook so the inbound
// path can be tested without real email.
// Usage:
//   AGENTMAIL_WEBHOOK_SECRET=whsec_... node scripts/fake-webhook.mjs \
//     https://<deployment>.convex.site <inbox_id> <from_email> "<subject>" "<body>" [thread_id] [--tamper]
import { createHmac, randomUUID } from "node:crypto";

const [site, inboxId, from, subject = "Re: your wedding", body = "Our package is $3,200 for 8 hours with a $500 deposit. We're available on your dates.", threadIdArg] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const tamper = process.argv.includes("--tamper");
const secret = process.env.AGENTMAIL_WEBHOOK_SECRET;
if (!site || !inboxId || !from || !secret) {
  console.error("Usage: AGENTMAIL_WEBHOOK_SECRET=whsec_... node scripts/fake-webhook.mjs <site> <inbox_id> <from_email> [subject] [body] [thread_id] [--tamper]");
  process.exit(1);
}
const messageId = `<${randomUUID()}@fake.local>`;
const threadId = threadIdArg ?? `thd_${randomUUID().slice(0, 8)}`;
const payload = {
  event_type: "message.received",
  event_id: `evt_${randomUUID()}`,
  message: {
    inbox_id: inboxId,
    thread_id: threadId,
    message_id: messageId,
    from_: from,
    to: [inboxId],
    subject,
    text: body,
    extracted_text: body,
    timestamp: new Date().toISOString(),
    attachments: [],
  },
};
const raw = JSON.stringify(payload);
const id = `msg_${randomUUID().replace(/-/g, "").slice(0, 22)}`;
const ts = Math.floor(Date.now() / 1000).toString();
const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
let sig = createHmac("sha256", key).update(`${id}.${ts}.${raw}`).digest("base64");
if (tamper) sig = sig.slice(0, -2) + "AA";

const res = await fetch(`${site.replace(/\/$/, "")}/agentmail/webhook`, {
  method: "POST",
  headers: { "content-type": "application/json", "svix-id": id, "svix-timestamp": ts, "svix-signature": `v1,${sig}` },
  body: raw,
});
console.log(res.status, await res.text());
console.log(`thread_id=${threadId}`);
