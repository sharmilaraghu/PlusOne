import { useState } from "react";
import { ConvexError } from "convex/values";
import { useMutation } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Icon } from "../ui/Icon";
import { usePrivacy } from "../../lib/privacy";

type Call = { name: string; args: unknown; result?: unknown; status: string };

/** A refusal the couple can act on, rather than a stack trace. */
function readableError(e: unknown): string {
  if (e instanceof ConvexError && typeof e.data === "string") return e.data;
  return "That didn't work. Try again in a moment.";
}
type Fields = Record<string, unknown>;

const KIND_ICON: Record<string, Parameters<typeof Icon>[0]["name"]> = {
  add_guest: "guests",
  add_need: "plus",
  research: "search",
  set_budget: "pen",
  add_event: "calendar",
  write_vendor: "mail",
};

/**
 * One thing PlusOne has offered to do. Nothing happens until the couple presses the
 * button, and they can change the words and numbers first.
 */
export function ProposalCard({
  weddingId,
  replyId,
  index,
  call,
  canEdit,
  events,
}: {
  weddingId: Id<"weddings">;
  replyId: Id<"chatMessages">;
  index: number;
  call: Call;
  canEdit: boolean;
  events: { _id: string; name: string }[];
}) {
  const run = useMutation(api.assistant.runProposal);
  const dismiss = useMutation(api.assistant.dismissProposal);
  const privacy = usePrivacy();
  const p = (call.args ?? {}) as Fields;
  const kind = String(p.kind ?? "");
  // An email is never confirmed unread, so that one starts open.
  const [open, setOpen] = useState(kind === "write_vendor");
  const [draft, setDraft] = useState<Fields>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const value = (key: string) => (draft[key] !== undefined ? draft[key] : p[key]);
  const set = (key: string, next: unknown) => setDraft((d) => ({ ...d, [key]: next }));
  const result = call.result as { done?: string; tab?: string } | undefined;

  if (call.status === "done" || call.status === "dismissed" || call.status === "error") {
    const tone = call.status === "done" ? "text-ok" : "text-quiet";
    return (
      <p className={`mt-2 flex flex-wrap items-center gap-2 text-xs ${tone}`}>
        <Icon name={call.status === "done" ? "check" : "dot"} size={13} />
        {privacy.text(String(result?.done ?? "Done."))}
        {call.status === "done" && result?.tab !== undefined && (
          <Link to={`/w/${weddingId}/${result.tab}`} className="underline underline-offset-2">
            Take a look
          </Link>
        )}
      </p>
    );
  }

  return (
    <section className="mt-3 rounded-[14px] border border-line bg-paper p-3.5" aria-label={String(p.label ?? "A suggestion")}>
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
          <Icon name={KIND_ICON[kind] ?? "star"} size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{privacy.text(String(p.label ?? "A suggestion"))}</p>
          {p.why ? <p className="mt-0.5 text-xs text-muted">{privacy.text(String(p.why))}</p> : null}

          {open && (
            <div className="mt-3 grid gap-2.5">
              {kind === "add_guest" && (
                <>
                  <Field label="Name" value={String(value("guestName") ?? "")} onChange={(v) => set("guestName", v)} />
                  <Field
                    label="Email"
                    value={String(value("guestEmail") ?? "")}
                    onChange={(v) => set("guestEmail", v)}
                    placeholder="so PlusOne can invite them"
                  />
                  <NumberField label="Party of" value={Number(value("guestPartySize") ?? 1)} onChange={(v) => set("guestPartySize", v)} />
                </>
              )}
              {kind === "add_need" && (
                <>
                  <Field label="What you need" value={String(value("title") ?? "")} onChange={(v) => set("title", v)} />
                  <Days events={events} selected={value("eventIds") as string[] | undefined} onChange={(ids) => set("eventIds", ids)} />
                  <p className="text-xs text-quiet">It takes a share of your existing budget; nothing is added to the total.</p>
                </>
              )}
              {kind === "research" && (
                <>
                  <p className="text-xs text-muted">For {String(p.slotTitle ?? "this need")}</p>
                  <Area label="Search for" value={String(value("query") ?? "")} onChange={(v) => set("query", v)} rows={2} />
                </>
              )}
              {kind === "set_budget" && (
                <>
                  <NumberField label="New amount" value={Number(value("amount") ?? 0)} onChange={(v) => set("amount", v)} step={100} />
                  <p className="text-xs text-quiet">
                    {p.budgetTarget === "need"
                      ? "Only this need changes; the others stay as they are."
                      : "Everything else re-splits around it, so your total stays the same."}
                  </p>
                </>
              )}
              {kind === "add_event" && (
                <>
                  <Field label="Name" value={String(value("eventName") ?? "")} onChange={(v) => set("eventName", v)} />
                  <Field label="Date" value={String(value("date") ?? "")} onChange={(v) => set("date", v)} type="date" />
                  <NumberField label="Guests" value={Number(value("guestCount") ?? 0)} onChange={(v) => set("guestCount", v)} step={10} />
                  <p className="text-xs text-quiet">Its budget is a share of your total, so every other day moves a little.</p>
                </>
              )}
              {kind === "write_vendor" && (
                <>
                  <p className="text-xs text-muted">To {String(p.vendorName ?? "the vendor")}</p>
                  <Area label="The email" value={String(value("message") ?? "")} onChange={(v) => set("message", v)} rows={7} />
                  <label className="flex items-center gap-2 text-xs text-muted">
                    <input
                      type="checkbox"
                      checked={Boolean(value("asWritten"))}
                      onChange={(e) => set("asWritten", e.target.checked)}
                    />
                    Send these words exactly
                  </label>
                </>
              )}
            </div>
          )}

          {error && <p role="alert" className="mt-2 text-xs text-bad">{error}</p>}

          {canEdit && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn-primary btn-sm"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  setError(null);
                  void run({ weddingId, replyId, index, overrides: draft })
                    .catch((e: unknown) => setError(readableError(e)))
                    .finally(() => setBusy(false));
                }}
              >
                {busy ? "Doing it…" : "Do it"}
              </button>
              {!open && (
                <button type="button" className="btn-quiet btn-sm" onClick={() => setOpen(true)}>
                  Change something
                </button>
              )}
              <button
                type="button"
                className="text-xs text-quiet underline underline-offset-2 hover:text-accent"
                disabled={busy}
                onClick={() => void dismiss({ weddingId, replyId, index })}
              >
                No thanks
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input" type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        className="input w-40"
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Area({ label, value, onChange, rows }: { label: string; value: string; onChange: (v: string) => void; rows: number }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <textarea className="input resize-y leading-relaxed" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

/** Which days a need covers; nothing chosen means every day. */
function Days({
  events,
  selected,
  onChange,
}: {
  events: { _id: string; name: string }[];
  selected: string[] | undefined;
  onChange: (ids: string[]) => void;
}) {
  const on = new Set(selected ?? events.map((e) => e._id));
  return (
    <div>
      <span className="label">Needed for</span>
      <span className="flex flex-wrap gap-1.5">
        {events.map((e) => {
          const active = on.has(e._id);
          return (
            <button
              key={e._id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? [...on].filter((id) => id !== e._id) : [...on, e._id])}
              className={`rounded-full px-3 py-1 text-xs transition ${
                active ? "bg-accent text-paper" : "bg-cream text-muted shadow-[inset_0_0_0_1px_var(--color-line)]"
              }`}
            >
              {e.name}
            </button>
          );
        })}
      </span>
    </div>
  );
}
