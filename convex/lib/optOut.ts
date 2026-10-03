/**
 * Spotting "please stop writing to us" in a reply, without a model.
 *
 * Deliberately narrow. Vendors' own auto-replies and newsletters end with "to
 * unsubscribe, click here", so the bare word only counts when it is the whole first
 * line, the way a person answers a "reply STOP" footer. The phrases below are things
 * people write to be left alone and almost never write otherwise. The model reading
 * the reply makes the same call separately; either one is enough.
 */

const PHRASES =
  /\b(stop (e-?mailing|contacting|messaging|writing to|sending)|do not (contact|e-?mail|message)|don'?t (contact|e-?mail|message) (me|us)|remove (me|us|this (e-?mail|address))( from)?|take (me|us) off|no more e-?mails?|not interested in (hearing|receiving)|unsubscribe (me|us))\b/i;

const ONE_WORD = /^(stop|unsubscribe|remove|opt[- ]?out)[.!]*$/i;

/** Normalise an address for comparison: trimmed and lower-cased. */
export function normaliseAddress(address: string): string {
  return address.trim().toLowerCase();
}

/** True when the sender is asking not to be contacted again. Looks only at what they wrote, not the quoted thread. */
export function looksLikeOptOut(body: string): boolean {
  const own = body.split(/\n\s*(On .{0,80}wrote:|-----Original Message-----|From: )/)[0] ?? body;
  const firstLine = own.trim().split("\n")[0]?.trim() ?? "";
  if (ONE_WORD.test(firstLine)) return true;
  return PHRASES.test(own.slice(0, 800));
}

/** Added to first contact and follow-ups, so every vendor has a one-word way to stop them. */
export function optOutFooter(hosts: string): string {
  return `\n\n--\nSent with PlusOne on behalf of ${hosts}. If you would rather not hear from us, reply STOP and we will not write again.`;
}
