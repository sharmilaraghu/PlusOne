import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { dayTone } from "../lib/dayTone";
import { money, shortDate, type FlatSlot } from "../lib/format";
import { StatusChip } from "./ui/StatusChip";
import { Icon } from "./ui/Icon";

type WeddingData = NonNullable<FunctionReturnType<typeof api.weddings.get>>;
type Event = WeddingData["events"][number];

const VISIBLE_SLOTS = 4;

export function DayCard({
  event,
  slots,
  currency,
  canEdit,
  canRemove,
  anchor = false,
}: {
  event: Event;
  slots: FlatSlot[];
  currency: string;
  canEdit: boolean;
  canRemove: boolean;
  /** Marks the first card so the walkthrough has something specific to point at. */
  anchor?: boolean;
}) {
  const tone = dayTone(event.order);
  const update = useMutation(api.events.update);
  const remove = useMutation(api.events.remove);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: event.name, date: event.date, guestCount: event.guestCount, budget: event.budget });

  const shown = slots.slice(0, VISIBLE_SLOTS);
  const rest = slots.length - shown.length;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await update({
        eventId: event._id as Id<"events">,
        patch: {
          name: draft.name.trim() || event.name,
          date: draft.date,
          guestCount: Number(draft.guestCount) || 0,
          budget: Number(draft.budget) || 0,
        },
      });
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't save.");
    } finally {
      setBusy(false);
    }
  }

  async function removeDay() {
    if (!window.confirm(`Remove ${event.name}? Vendor needs you've already contacted move to another day.`)) return;
    setBusy(true);
    setError(null);
    try {
      await remove({ eventId: event._id as Id<"events"> });
    } catch (e) {
      setError(e instanceof Error ? e.message : "That day couldn't be removed.");
      setBusy(false);
    }
  }

  return (
    <article className="card overflow-hidden" data-tour={anchor ? "days" : undefined}>
      <div className={`${tone.strip} border-b border-line px-6 py-4`}>
        {editing ? (
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_11rem]">
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-quiet">
                Name
                <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-quiet">
                Date
                <input type="date" className="input" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-quiet">
                Guests
                <input type="number" min={0} step={10} className="input" value={draft.guestCount} onChange={(e) => setDraft({ ...draft, guestCount: Number(e.target.value) })} />
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-quiet">
                Budget ({currency})
                <input type="number" min={0} step={100} className="input" value={draft.budget} onChange={(e) => setDraft({ ...draft, budget: Number(e.target.value) })} />
              </label>
            </div>
            <p className="text-xs text-quiet">Changing a budget re-spreads the rest so your total still adds up.</p>
            {error && <p role="alert" className="text-sm text-bad">{error}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="btn-primary btn-sm" onClick={() => void save()} disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </button>
              <button type="button" className="btn-quiet btn-sm" onClick={() => { setEditing(false); setError(null); setDraft({ name: event.name, date: event.date, guestCount: event.guestCount, budget: event.budget }); }}>
                Cancel
              </button>
              {canRemove && (
                <button type="button" className="ml-auto text-sm text-bad underline underline-offset-2 hover:opacity-80" onClick={() => void removeDay()} disabled={busy}>
                  Remove this day
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-quiet">
                Day {event.dayIndex + 1} · {shortDate(event.date)}
              </p>
              <h3 className="mt-0.5 text-[1.4rem] leading-tight">{event.name}</h3>
              <p className="mt-1 text-sm text-muted">
                {event.guestCount} guests · {money(event.budget, currency)}
              </p>
            </div>
            {canEdit && (
              <button
                type="button"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-cream hover:text-accent"
                onClick={() => setEditing(true)}
                aria-label={`Edit ${event.name}`}
              >
                <Icon name="pen" size={17} />
              </button>
            )}
          </div>
        )}
        {!editing && error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
      </div>

      {shown.length === 0 ? (
        <p className="px-6 py-5 text-sm text-quiet">No vendor needs on this day yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {shown.map((s) => (
            <li key={s._id}>
              <Link
                to={`vendors/${s._id}`}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-6 py-3 transition hover:bg-accent-soft/50"
              >
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="truncate text-[0.95rem]">{s.title}</span>
                  {s.bestQuote && <span className="text-xs text-quiet">{money(s.bestQuote.total, s.bestQuote.currency)}</span>}
                </span>
                <StatusChip status={s.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {rest > 0 && (
        <Link to="vendors" className="flex items-center gap-1.5 border-t border-line px-6 py-3 text-sm text-accent hover:bg-accent-soft/50">
          {rest} more {rest === 1 ? "need" : "needs"} <Icon name="arrow" size={16} />
        </Link>
      )}
    </article>
  );
}
