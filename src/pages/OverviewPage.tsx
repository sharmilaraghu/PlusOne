import { useQuery } from "convex/react";
import { Link, useOutletContext } from "react-router-dom";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { flattenSlots, longDate, money, pct } from "../lib/format";
import { ActivityFeed } from "../components/ActivityFeed";
import { DayCard } from "../components/DayCard";
import { EmptyState } from "../components/ui/EmptyState";
import { StatusChip } from "../components/ui/StatusChip";
import { Icon } from "../components/ui/Icon";

type WeddingData = NonNullable<FunctionReturnType<typeof api.weddings.get>>;

export function OverviewPage() {
  const { wedding, events, stats } = useOutletContext<WeddingData>();
  const weddingId = wedding._id as Id<"weddings">;
  const slots = flattenSlots(useQuery(api.slots.list, { weddingId }));
  const budget = useQuery(api.budget.summary, { weddingId });

  const committedPct = pct(stats.committedTotal, wedding.totalBudget);
  // A need attached to every day belongs to the wedding, not to one function:
  // repeating it on each day card is what made the board feel crowded.
  const shared = (slots ?? []).filter((s) => s.eventIds.length >= events.length && events.length > 1);
  const sharedIds = new Set(shared.map((s) => s._id));
  const days = Math.max(1, Math.round((new Date(wedding.endDate).getTime() - new Date(wedding.startDate).getTime()) / 86400000) + 1);
  const ordered = events.slice().sort((a, b) => a.order - b.order);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      {/* Header: name, dates, the budget line, and the couple's style in one card. */}
      <section className="card px-7 py-6 lg:col-span-2" aria-labelledby="wedding-name">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <h1 id="wedding-name" className="text-[2rem] leading-tight md:text-[2.4rem]">{wedding.name}</h1>
            <p className="mt-1.5 text-sm text-muted">
              {longDate(wedding.startDate)}
              {days > 1 ? ` → ${longDate(wedding.endDate)}` : ""} · {days} {days === 1 ? "day" : "days"} · {wedding.city}
              {wedding.area ? `, ${wedding.area}` : ""}
            </p>
          </div>
          <Link to="vendors" className="btn-primary">Find vendors</Link>
        </div>

        <div className="mt-6 border-t border-line pt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-sm text-muted">
              <span className="display text-[1.35rem] text-ink">{money(stats.committedTotal, wedding.currency)}</span> committed of{" "}
              {money(wedding.totalBudget, wedding.currency)}
            </p>
            <p className="text-sm text-quiet">
              {stats.slotCounts?.booked ?? 0} booked · {stats.slotCounts?.quoted ?? 0} quoted · {stats.slotCounts?.contacted ?? 0} contacted
            </p>
          </div>
          <div
            className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-valuenow={committedPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Budget committed"
          >
            <div
              className={`h-full rounded-full transition-all ${committedPct > 100 ? "bg-bad" : "bg-accent"}`}
              style={{ width: `${Math.min(100, committedPct)}%` }}
            />
          </div>
          {budget?.warnings?.length ? (
            <ul className="mt-3 space-y-1 text-sm text-warn">
              {budget.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
            </ul>
          ) : null}
          {wedding.styleSummary && (
            <p className="mt-4 text-sm italic leading-relaxed text-muted">“{wedding.styleSummary}”</p>
          )}
        </div>
      </section>

      {/* Days lead. */}
      <section aria-labelledby="days-h" className="min-w-0">
        <h2 id="days-h" className="sr-only">Your days</h2>
        {slots === undefined ? (
          <p className="text-sm text-muted">Loading your days…</p>
        ) : ordered.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="No days yet"
            body="Add the first function of your celebration to start planning it."
          />
        ) : (
          <div className="grid gap-4">
            {ordered.map((ev) => (
              <DayCard
                key={ev._id}
                event={ev}
                slots={(slots ?? []).filter((s) => s.eventIds.includes(ev._id) && !sharedIds.has(s._id))}
                currency={wedding.currency}
              />
            ))}
          </div>
        )}
      </section>

      {shared.length > 0 && (
        <section className="card px-7 py-6 lg:col-start-1" aria-labelledby="shared-h">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="shared-h" className="display text-xl">Across the whole wedding</h2>
            <p className="text-sm text-quiet">{shared.length} needs on every day</p>
          </div>
          <ul className="mt-4 grid gap-x-8 gap-y-1 sm:grid-cols-2">
            {shared.map((s) => (
              <li key={s._id}>
                <Link
                  to={`vendors/${s._id}`}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-[10px] px-3 py-2.5 transition hover:bg-accent-soft/50"
                >
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="truncate text-[0.95rem]">{s.title}</span>
                    <span className="text-xs text-quiet">{money(s.budget, wedding.currency)}</span>
                  </span>
                  <StatusChip status={s.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <aside className="grid content-start gap-4 lg:col-start-2 lg:row-start-2">
        <section className="card p-5" aria-labelledby="guests-h">
          <h2 id="guests-h" className="display text-lg">Guests</h2>
          <p className="mt-1.5 text-sm text-muted">
            {stats.guestCounts?.yes ?? 0} yes · {stats.guestCounts?.no ?? 0} no · {stats.guestCounts?.pending ?? 0} pending
          </p>
          <Link to="guests" className="btn-quiet btn-sm mt-4">
            Manage guests <Icon name="arrow" size={15} />
          </Link>
        </section>
        <ActivityFeed weddingId={weddingId} />
      </aside>
    </div>
  );
}
