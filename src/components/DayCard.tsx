import { Link } from "react-router-dom";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";
import { dayTone } from "../lib/dayTone";
import { money, shortDate } from "../lib/format";
import { StatusChip } from "./ui/StatusChip";
import { Icon } from "./ui/Icon";
import type { FlatSlot } from "../lib/format";

type WeddingData = NonNullable<FunctionReturnType<typeof api.weddings.get>>;
type Event = WeddingData["events"][number];

const VISIBLE_SLOTS = 4;

export function DayCard({ event, slots, currency }: { event: Event; slots: FlatSlot[]; currency: string }) {
  const tone = dayTone(event.order);
  const shown = slots.slice(0, VISIBLE_SLOTS);
  const rest = slots.length - shown.length;

  return (
    <article className="card overflow-hidden">
      <div className={`${tone.strip} border-b border-line px-6 py-4`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-quiet">
          Day {event.dayIndex + 1} · {shortDate(event.date)}
        </p>
        <h3 className="mt-0.5 text-[1.4rem] leading-tight">{event.name}</h3>
        <p className="mt-1 text-sm text-muted">
          {event.guestCount} guests · {money(event.budget, currency)}
        </p>
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
                  {s.bestQuote && (
                    <span className="text-xs text-quiet">{money(s.bestQuote.total, s.bestQuote.currency)}</span>
                  )}
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
