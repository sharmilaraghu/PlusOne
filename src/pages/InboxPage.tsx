import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";
import { money, statusLabel, timeAgo } from "../lib/format";
import { BookButton } from "../components/BookButton";
import { Icon } from "../components/ui/Icon";
import { EmptyState } from "../components/ui/EmptyState";
import { usePrivacy } from "../lib/privacy";

/** Names for the kinds of email a couple sees in a conversation. */
const KIND_LABEL: Record<string, string> = {
  inquiry: "First email",
  follow_up: "Follow-up",
  vendor_reply: "Their reply",
  agent_reply: "PlusOne's reply",
  negotiation: "Asked about price",
  booking_confirmation: "Going ahead",
  no_thanks: "No thank you",
};

/** Why a conversation needs the couple, in their words. */
const ATTENTION_LABEL: Record<string, string> = {
  vendor_question: "they asked something only you can answer.",
  reply_to_review: "PlusOne has written a reply for you to check before it goes.",
  max_follow_ups: "no reply after three follow-ups.",
  send_failed: "an email didn't send.",
};

type WeddingData = NonNullable<FunctionReturnType<typeof api.weddings.get>>;

const statusStyle: Record<string, string> = {
  draft: "bg-line/60 text-muted",
  sent: "bg-accent-soft text-accent",
  replied: "bg-ok-bg text-ok",
  quoted: "bg-ok-bg text-ok",
  booked: "bg-ok-bg text-ok",
  declined: "bg-line/60 text-muted",
  needs_attention: "bg-warn-bg text-warn",
};

/** The filters a couple actually thinks in. */
const FILTERS = [
  { id: "all", label: "All" },
  { id: "needs_attention", label: "Needs you" },
  { id: "sent", label: "Waiting" },
  { id: "quoted", label: "Quoted" },
  { id: "booked", label: "Booked" },
];

const STATUS_LABEL: Record<string, string> = {
  sent: "waiting",
  replied: "replied",
  quoted: "quoted",
  booked: "booked",
  declined: "passed",
  needs_attention: "needs you",
};

export function InboxPage() {
  const privacy = usePrivacy();
  const { wedding, role } = useOutletContext<WeddingData>();
  const weddingId = wedding._id as Id<"weddings">;
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>("all");
  const threads = useQuery(api.threads.list, { weddingId })?.map((t) => ({ ...t.thread, vendorName: t.vendor.name, slotTitle: t.slot.title, latestQuote: t.latestQuote, lastPreview: t.lastMessage?.preview }));
  const canEdit = role !== "viewer";
  const contracts = useQuery(api.inbound.listContractChecks, { weddingId });

  // A booked vendor can still ask something only the couple can answer, so "Needs you"
  // follows the open question rather than the conversation's state.
  const needsYou = (t: { status: string; pendingQuestion?: string }) => t.status === "needs_attention" || Boolean(t.pendingQuestion);
  const matches = (t: { status: string; pendingQuestion?: string }) =>
    filter === "all" ? t.status !== "draft" : filter === "needs_attention" ? needsYou(t) : t.status === filter;
  const visible = (threads ?? []).filter(matches);

  useEffect(() => {
    if (!threadId && visible.length > 0) navigate(`/w/${weddingId}/inbox/${visible[0]._id}`, { replace: true });
  }, [threadId, visible, navigate, weddingId]);

  const all = (threads ?? []).filter((t) => t.status !== "draft");
  const counts = Object.fromEntries(
    FILTERS.map((f) => [f.id, f.id === "all" ? all.length : all.filter((t) => (f.id === "needs_attention" ? needsYou(t) : t.status === f.id)).length]),
  );

  if (threads !== undefined && all.length === 0) {
    return (
      <div>
        <h1 className="text-2xl">Inbox</h1>
        <p className="mt-1 text-sm text-muted">Every conversation PlusOne is having with your vendors.</p>
        <div className="mt-6">
          <EmptyState
            icon="mail"
            title="No conversations yet"
            body="When PlusOne emails vendors for you, every reply lands here: quotes read and totted up, questions answered, and anything that needs you flagged at the top."
            action={<Link to={`/w/${weddingId}/vendors`} className="btn-primary">Find vendors to contact</Link>}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl">Inbox</h1>
          <p className="mt-1 text-sm text-muted">Every conversation PlusOne is having with your vendors.</p>
        </div>
        <div className="flex max-w-full flex-wrap gap-1 rounded-full bg-cream p-1 shadow-[inset_0_0_0_1px_var(--color-line)]" role="group" aria-label="Show conversations">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs transition ${
                filter === f.id ? "bg-accent text-paper" : "text-muted hover:text-accent"
              }`}
            >
              {f.label}
              {counts[f.id] > 0 && <span className={`ml-1.5 tabular-nums ${filter === f.id ? "opacity-80" : "text-quiet"}`}>{counts[f.id]}</span>}
            </button>
          ))}
        </div>
      </header>

    <div className="mt-6 grid items-start gap-6 lg:grid-cols-[340px_1fr]">
      <aside className="card min-w-0 overflow-hidden">
        {threads === undefined ? (
          <p className="p-4 text-sm text-muted">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="p-5 text-sm text-muted">Nothing here right now.</p>
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((t) => (
              <li key={t._id}>
                <Link
                  to={`/w/${weddingId}/inbox/${t._id}`}
                  aria-current={t._id === threadId ? "page" : undefined}
                  className={`block px-4 py-3 transition ${t._id === threadId ? "bg-accent-soft" : "hover:bg-accent-soft/40"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{t.vendorName}</p>
                    <span className={`chip shrink-0 ${statusStyle[t.status] ?? "bg-sand"}`}>{STATUS_LABEL[t.status] ?? statusLabel(t.status)}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {t.slotTitle}
                    {t.latestQuote ? ` · ${money(t.latestQuote.total, t.latestQuote.currency)}` : ""}
                  </p>
                  {t.lastPreview && <p className="mt-1 truncate text-xs text-quiet">{privacy.text(t.lastPreview)}</p>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </aside>
      <section className="min-w-0">
        {threadId ? (
          <ThreadView threadId={threadId as Id<"threads">} currency={wedding.currency} canEdit={canEdit} />
        ) : (
          <EmptyState compact icon="mail" title="Pick a conversation" body="Choose one on the left to read it." />
        )}

        {/* Anything the couple forwarded in, read and flagged. */}
        {contracts && contracts.length > 0 && (
          <div className="mt-8">
            <h2 className="display text-[1.3rem]">Documents you forwarded</h2>
            <p className="mt-1 text-sm text-muted">
              Send any contract to your wedding inbox and PlusOne reads it, quoting the line each warning comes from.
            </p>
            <ul className="mt-4 grid gap-4">
              {contracts.map((c) => (
                <li key={c._id} className="card p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="font-medium">{c.filename}</p>
                    <span className={c.status === "done" ? "chip-quiet" : c.status === "failed" ? "chip-warn" : "chip-pending"}>
                      {c.status === "done" ? `${c.flags.length} things to know` : c.status === "failed" ? "could not be read" : "reading it…"}
                    </span>
                  </div>
                  {c.summary && <p className="mt-2 text-sm leading-relaxed text-muted">{c.summary}</p>}
                  {c.flags.length > 0 && (
                    <ul className="mt-4 grid gap-3">
                      {c.flags.map((f, i) => (
                        <li
                          key={i}
                          className={`rounded-[12px] px-4 py-3 ${f.severity === "high" ? "bg-bad-bg" : f.severity === "medium" ? "bg-warn-bg" : "bg-line/40"}`}
                        >
                          <p className={`text-sm ${f.severity === "high" ? "text-bad" : f.severity === "medium" ? "text-warn" : "text-muted"}`}>
                            {f.why}
                          </p>
                          <p className="mt-1.5 border-l-2 border-current/25 pl-2.5 text-xs italic leading-relaxed text-muted">
                            “{f.clause}”
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
    </div>
  );
}

function ThreadView({ threadId, currency, canEdit }: { threadId: Id<"threads">; currency: string; canEdit: boolean }) {
  const data = useQuery(api.threads.get, { threadId });
  const privacy = usePrivacy();
  const setStatus = useMutation(api.threads.setStatus);
  const resolve = useMutation(api.threads.resolveAttention);
  const followUp = useMutation(api.outreach.sendFollowUpNow);
  const markBooked = useMutation(api.slots.markBooked);
  const answer = useMutation(api.agent.answerForCouple);
  const send = useMutation(api.outreach.send);
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState("");
  const [answerError, setAnswerError] = useState<string | null>(null);

  if (data === undefined) return <p className="text-muted">Loading…</p>;
  if (data === null) return <p className="text-muted">This conversation is gone.</p>;
  const { thread, vendor, messages, quotes, slot, files } = data;
  const urlOf = (storageId: string) => files.find((f) => f.storageId === storageId)?.url;
  const latestQuote = quotes[0];

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl">{vendor.name}</h2>
          <p className="text-sm text-muted">
            {slot.title} · <span className="capitalize">{statusLabel(thread.status)}</span>
            {thread.nextFollowUpAt && thread.status === "sent" ? ` · follow-up ${new Date(thread.nextFollowUpAt).toLocaleDateString()}` : ""}
            {thread.followUpCount ? ` · ${thread.followUpCount}/3 nudges` : ""}
          </p>
          {vendor.email && <p className="font-mono text-[11px] text-muted">{privacy.email(vendor.email)}</p>}
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            {thread.status === "sent" && (
              <button className="btn-ghost btn-sm" disabled={busy} onClick={() => { setBusy(true); void followUp({ threadId }).finally(() => setBusy(false)); }}>
                Send follow-up now
              </button>
            )}
            {thread.status === "needs_attention" && (
              <button className="btn-ghost btn-sm" onClick={() => void resolve({ threadId })}>Mark handled</button>
            )}
            {thread.status !== "booked" && thread.status !== "declined" && (
              <button className="btn-ghost btn-sm" onClick={() => void setStatus({ threadId, status: "declined" })}>Pass</button>
            )}
            {thread.status !== "booked" && (
              <BookButton vendorName={vendor.name} onBook={(notify) => markBooked({ slotId: slot._id, vendorId: vendor._id, notify })} />
            )}
          </div>
        )}
      </header>

      {thread.pendingQuestion ? (
        <section className="card border-warn/40 p-4" aria-label="A question for you">
          <p className="text-xs uppercase tracking-wide text-warn">Only you can answer this</p>
          <p className="mt-1.5 text-[0.95rem] leading-relaxed">{privacy.text(thread.pendingQuestion)}</p>
          {canEdit && (
            <form
              className="mt-3"
              onSubmit={(e) => {
                e.preventDefault();
                setAnswerError(null);
                setBusy(true);
                void answer({ threadId, answer: reply })
                  .then(() => setReply(""))
                  .catch((err: unknown) => setAnswerError(err instanceof Error ? err.message : "That didn't send."))
                  .finally(() => setBusy(false));
              }}
            >
              <label className="label" htmlFor="couple-answer">Your answer</label>
              <textarea
                id="couple-answer"
                rows={2}
                className="input resize-y"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Just the gist. PlusOne writes the email and sends it."
              />
              {answerError && <p role="alert" className="mt-1 text-xs text-bad">{answerError}</p>}
              <div className="mt-2 flex justify-end">
                <button type="submit" className="btn-primary btn-sm" disabled={busy || !reply.trim()}>
                  {busy ? "Sending…" : "Send to " + vendor.name}
                </button>
              </div>
            </form>
          )}
        </section>
      ) : thread.attentionReason ? (
        <p className="rounded-xl bg-warn-bg px-4 py-3 text-sm text-warn">
          Needs you: {ATTENTION_LABEL[thread.attentionReason] ?? statusLabel(thread.attentionReason)}
        </p>
      ) : null}

      {latestQuote && (
        <section className="card p-4" aria-label="Extracted quote">
          <p className="text-xs uppercase tracking-wide text-muted">
            {latestQuote.fromAttachment ? `Read from their attached PDF, ${latestQuote.fromAttachment}` : "Extracted from their reply"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            <span className="chip-ok">Total {money(latestQuote.total, latestQuote.currency || currency)}</span>
            {latestQuote.deposit ? <span className="chip-quiet">Deposit {money(latestQuote.deposit, latestQuote.currency || currency)}</span> : null}
            {latestQuote.validUntil && <span className="chip-quiet">Valid until {latestQuote.validUntil}</span>}
          </div>
          {latestQuote.summary && <p className="mt-2 text-sm">{latestQuote.summary}</p>}
          {latestQuote.includes.length > 0 && <p className="mt-1 text-xs text-muted">Includes: {latestQuote.includes.join(", ")}</p>}
          {latestQuote.excludes.length > 0 && <p className="mt-1 text-xs text-muted">Not included: {latestQuote.excludes.join(", ")}</p>}
          {latestQuote.redFlags.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-warn">
              {latestQuote.redFlags.map((r, i) => <li key={i}>⚠ {r}</li>)}
            </ul>
          )}
        </section>
      )}

      {canEdit && vendor.email && <WriteToVendor threadId={threadId} vendorName={vendor.name} />}

      <ol className="space-y-3" aria-label="Email timeline">
        {messages.map((m) => (
          <li key={m._id} className={`card p-4 ${m.direction === "in" ? "border-accent/30" : ""}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
              <span>
                {m.direction === "in" ? vendor.name : "You"} · {KIND_LABEL[m.kind] ?? statusLabel(m.kind)}
              </span>
              <span>
                {m.status === "failed" ? <span className="text-bad">failed</span> : m.status}{m.sentAt || m.receivedAt ? ` · ${timeAgo(m.sentAt ?? m.receivedAt)}` : ""}
              </span>
            </div>
            <p className="mt-2 font-medium">{m.subject}</p>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed">{privacy.text(m.bodyText)}</pre>
            {m.attachments.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2 text-xs">
                {m.attachments.map((a, i) => {
                  const url = urlOf(a.storageId);
                  const isPdf = a.contentType.includes("pdf") || a.filename.toLowerCase().endsWith(".pdf");
                  return (
                    <li key={i}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-[10px] border border-line bg-cream px-3 py-2 text-ink transition hover:border-accent hover:bg-accent-soft"
                      >
                        <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper">
                          {isPdf ? "PDF" : "File"}
                        </span>
                        <span className="max-w-[16rem] truncate">{a.filename}</span>
                        <Icon name="external" size={13} className="text-muted" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
            {m.errorMessage && <p className="mt-2 text-xs text-bad">This one didn't send. Try again, or email them yourself.</p>}
            {m.direction === "out" && m.status === "draft" && canEdit && (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    void send({ messageIds: [m._id] }).finally(() => setBusy(false));
                  }}
                >
                  Send it
                </button>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Always available: a question after a quote, a change of plan, a nudge on a booked vendor. */
function WriteToVendor({ threadId, vendorName }: { threadId: Id<"threads">; vendorName: string }) {
  const write = useMutation(api.agent.writeToVendor);
  const [message, setMessage] = useState("");
  const [asWritten, setAsWritten] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  return (
    <section className="card p-4 md:p-5" aria-label={`Write to ${vendorName}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setBusy(true);
          void write({ threadId, message, asWritten })
            .then(() => {
              setMessage("");
              setSent(true);
            })
            .catch((err: unknown) => setError(err instanceof Error ? err.message : "That didn't send."))
            .finally(() => setBusy(false));
        }}
      >
        <label className="label" htmlFor="write-vendor">Write to {vendorName}</label>
        <textarea
          id="write-vendor"
          rows={2}
          className="input resize-y"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setSent(false);
          }}
          placeholder={asWritten ? "Your email, exactly as you want it sent." : "Just the gist — could they do a vegan menu for 20? PlusOne writes the email."}
        />
        {error && <p role="alert" className="mt-1 text-xs text-bad">{error}</p>}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={asWritten} onChange={(e) => setAsWritten(e.target.checked)} />
            Send my words exactly
          </label>
          <span className="flex items-center gap-3">
            {sent && <span aria-live="polite" className="text-xs text-muted">Sent.</span>}
            <button type="submit" className="btn-primary btn-sm" disabled={busy || !message.trim()}>
              {busy ? "Sending…" : "Send"}
            </button>
          </span>
        </div>
      </form>
    </section>
  );
}
