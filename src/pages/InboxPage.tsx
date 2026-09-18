import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";
import { money, statusLabel, timeAgo } from "../lib/format";

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

export function InboxPage() {
  const { wedding, role } = useOutletContext<WeddingData>();
  const weddingId = wedding._id as Id<"weddings">;
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>("all");
  const threads = useQuery(api.threads.list, { weddingId })?.map((t) => ({ ...t.thread, vendorName: t.vendor.name, slotTitle: t.slot.title, latestQuote: t.latestQuote, lastPreview: t.lastMessage?.preview }));
  const canEdit = role !== "viewer";

  const visible = (threads ?? []).filter((t) => (filter === "all" ? t.status !== "draft" : t.status === filter));

  useEffect(() => {
    if (!threadId && visible.length > 0) navigate(`/w/${weddingId}/inbox/${visible[0]._id}`, { replace: true });
  }, [threadId, visible, navigate, weddingId]);

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="min-w-0">
        <h1 className="text-2xl">Inbox</h1>
        <p className="truncate font-mono text-[11px] text-muted">{wedding.inboxAddress ?? "inbox being created…"}</p>
        <div className="mt-3 flex flex-wrap gap-1 text-xs">
          {["all", "sent", "quoted", "needs_attention", "booked"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 ${filter === f ? "bg-accent text-paper" : "bg-line/60 text-muted"}`}>
              {statusLabel(f)}
            </button>
          ))}
        </div>
        {threads === undefined ? (
          <p className="mt-3 text-sm text-muted">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No conversations yet. Request quotes from the Vendors page and replies will land here.</p>
        ) : (
          <ul className="mt-3 space-y-1">
            {visible.map((t) => (
              <li key={t._id}>
                <Link
                  to={`/w/${weddingId}/inbox/${t._id}`}
                  aria-current={t._id === threadId ? "page" : undefined}
                  className={`block rounded-xl px-3 py-2 ${t._id === threadId ? "bg-accent-soft" : "hover:bg-sand"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{t.vendorName}</p>
                    <span className={`chip ${statusStyle[t.status] ?? "bg-sand"}`}>{statusLabel(t.status)}</span>
                  </div>
                  <p className="truncate text-xs text-muted">{t.slotTitle}{t.latestQuote ? ` · ${money(t.latestQuote.total, t.latestQuote.currency)}` : ""}</p>
                  {t.lastPreview && <p className="mt-0.5 truncate text-xs text-muted">{t.lastPreview}</p>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </aside>
      <section className="min-w-0">
        {threadId ? <ThreadView threadId={threadId as Id<"threads">} currency={wedding.currency} canEdit={canEdit} /> : <p className="text-muted">Select a conversation.</p>}
      </section>
    </div>
  );
}

function ThreadView({ threadId, currency, canEdit }: { threadId: Id<"threads">; currency: string; canEdit: boolean }) {
  const data = useQuery(api.threads.get, { threadId });
  const setStatus = useMutation(api.threads.setStatus);
  const resolve = useMutation(api.threads.resolveAttention);
  const followUp = useMutation(api.outreach.sendFollowUpNow);
  const markBooked = useMutation(api.slots.markBooked);
  const [busy, setBusy] = useState(false);

  if (data === undefined) return <p className="text-muted">Loading…</p>;
  if (data === null) return <p className="text-muted">This conversation is gone.</p>;
  const { thread, vendor, messages, quotes, slot } = data;
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
          {vendor.email && <p className="font-mono text-[11px] text-muted">{vendor.email}</p>}
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
              <button className="btn-primary btn-sm" onClick={() => void markBooked({ slotId: slot._id, vendorId: vendor._id })}>Mark booked</button>
            )}
          </div>
        )}
      </header>

      {thread.attentionReason && (
        <p className="rounded-xl bg-warn-bg px-4 py-3 text-sm text-warn">Needs you: {statusLabel(thread.attentionReason)}</p>
      )}

      {latestQuote && (
        <section className="card p-4" aria-label="Extracted quote">
          <p className="text-xs uppercase tracking-wide text-muted">Extracted from their reply</p>
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

      <ol className="space-y-3" aria-label="Email timeline">
        {messages.map((m) => (
          <li key={m._id} className={`card p-4 ${m.direction === "in" ? "border-accent/30" : ""}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
              <span>
                {m.direction === "in" ? "From" : "To"} <span className="text-ink">{m.direction === "in" ? m.fromAddress : m.toAddress}</span> · {statusLabel(m.kind)}
              </span>
              <span>
                {m.status === "failed" ? <span className="text-bad">failed</span> : m.status}{m.sentAt || m.receivedAt ? ` · ${timeAgo(m.sentAt ?? m.receivedAt)}` : ""}
              </span>
            </div>
            <p className="mt-2 font-medium">{m.subject}</p>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed">{m.bodyText}</pre>
            {m.attachments.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2 text-xs">
                {m.attachments.map((a, i) => (
                  <li key={i} className="chip-quiet">{a.filename}</li>
                ))}
              </ul>
            )}
            {m.errorMessage && <p className="mt-2 text-xs text-bad">{m.errorMessage}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}
