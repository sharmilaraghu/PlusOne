import { useQuery } from "convex/react";
import { Link, useOutletContext } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";
import { flattenSlots, longDate, money, pct, shortDate, statusLabel, timeAgo } from "../lib/format";
import { ActivityFeed } from "../components/ActivityFeed";

type WeddingData = NonNullable<FunctionReturnType<typeof api.weddings.get>>;

export function OverviewPage() {
  const { wedding, events, stats } = useOutletContext<WeddingData>();
  const weddingId = wedding._id as Id<"weddings">;
  const slots = flattenSlots(useQuery(api.slots.list, { weddingId }));
  const budget = useQuery(api.budget.summary, { weddingId });

  const committedPct = pct(stats.committedTotal, wedding.totalBudget);
  const days = Math.max(1, Math.round((new Date(wedding.endDate).getTime() - new Date(wedding.startDate).getTime()) / 86400000) + 1);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl">{wedding.name}</h1>
            <p className="text-sm text-muted">
              {longDate(wedding.startDate)}{days > 1 ? ` → ${longDate(wedding.endDate)}` : ""} · {days} {days === 1 ? "day" : "days"} · {wedding.city}
            </p>
          </div>
          <Link to="vendors" className="btn-primary">Find vendors</Link>
        </header>

        {wedding.styleSummary && (
          <p className="rounded-xl bg-accent-soft/60 px-4 py-3 text-sm italic text-ink">“{wedding.styleSummary}”</p>
        )}

        <section aria-labelledby="budget-h" className="card p-5">
          <div className="flex items-baseline justify-between">
            <h2 id="budget-h" className="text-lg">Budget</h2>
            <p className="text-sm text-muted">
              <span className="font-medium text-ink">{money(stats.committedTotal, wedding.currency)}</span> committed of {money(wedding.totalBudget, wedding.currency)} · {committedPct}%
            </p>
          </div>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-sand" role="progressbar" aria-valuenow={committedPct} aria-valuemin={0} aria-valuemax={100}>
            <div className={`h-full rounded-full transition-all ${committedPct > 100 ? "bg-bad" : committedPct > 85 ? "bg-warn" : "bg-accent"}`} style={{ width: `${Math.min(100, committedPct)}%` }} />
          </div>
          {budget?.warnings?.length ? (
            <ul className="mt-3 space-y-1 text-sm text-warn">
              {budget.warnings.map((w: string, i: number) => <li key={i}>⚠ {w}</li>)}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-muted">Quotes from vendor replies update this bar live.</p>
          )}
        </section>

        <section aria-labelledby="days-h">
          <div className="flex items-center justify-between">
            <h2 id="days-h" className="text-lg">Your days</h2>
            <p className="text-xs text-muted">{stats.slotCounts?.booked ?? 0} booked · {stats.slotCounts?.quoted ?? 0} quoted · {stats.slotCounts?.contacted ?? 0} contacted</p>
          </div>
          <div className="-mx-4 mt-3 overflow-x-auto px-4 pb-2">
            <div className="flex min-w-max gap-4">
              {events
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((ev) => {
                  const evSlots = (slots ?? []).filter((s) => s.eventIds.includes(ev._id));
                  return (
                    <article key={ev._id} className="w-64 shrink-0 rounded-2xl border border-line p-4" style={{ background: ev.color }}>
                      <p className="text-[11px] uppercase tracking-wide text-muted">Day {ev.dayIndex + 1} · {shortDate(ev.date)}</p>
                      <h3 className="mt-1 text-lg">{ev.name}</h3>
                      <p className="text-xs text-muted">{ev.guestCount} guests · {money(ev.budget, wedding.currency)}</p>
                      <ul className="mt-3 space-y-2">
                        {evSlots.length === 0 && <li className="text-xs text-muted">No vendor needs yet.</li>}
                        {evSlots.map((s) => (
                          <li key={s._id}>
                            <Link to={`vendors/${s._id}`} className="flex items-center justify-between rounded-lg bg-white/80 px-3 py-2 text-sm hover:bg-white">
                              <span className="truncate">{s.title}</span>
                              <span className={`chip ${s.status === "booked" ? "bg-sage text-ok" : s.status === "quoted" ? "bg-sky text-ink" : s.status === "contacted" ? "bg-lilac text-ink" : "bg-sand text-muted"}`}>{statusLabel(s.status)}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </article>
                  );
                })}
            </div>
          </div>
        </section>

        <section aria-labelledby="slots-h" className="card p-5">
          <h2 id="slots-h" className="text-lg">Vendor needs</h2>
          {slots === undefined ? (
            <p className="mt-2 text-sm text-muted">Loading…</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {slots.map((s) => (
                <li key={s._id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <Link to={`vendors/${s._id}`} className="font-medium hover:underline">{s.title}</Link>
                    <p className="text-xs text-muted">
                      {s.category} · planned {money(s.budget, wedding.currency)}
                      {s.bestQuote ? ` · best quote ${money(s.bestQuote.total, s.bestQuote.currency)}` : ""}
                      {s.vendorsCount ? ` · ${s.vendorsCount} vendors found` : ""}
                    </p>
                  </div>
                  <span className={`chip ${s.status === "booked" ? "bg-sage text-ok" : s.status === "quoted" ? "bg-sky text-ink" : s.status === "contacted" ? "bg-lilac text-ink" : "bg-sand text-muted"}`}>
                    {statusLabel(s.status)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="space-y-4">
        <div className="card p-4">
          <h2 className="text-base">Guests</h2>
          <p className="mt-1 text-sm text-muted">
            {stats.guestCounts?.yes ?? 0} yes · {stats.guestCounts?.no ?? 0} no · {stats.guestCounts?.pending ?? 0} pending
          </p>
          <Link to="guests" className="btn-ghost btn-sm mt-3">Manage guests</Link>
        </div>
        <ActivityFeed weddingId={weddingId} />
        <p className="px-1 text-[11px] text-muted">Last change {timeAgo(Date.now())}</p>
      </aside>
    </div>
  );
}
