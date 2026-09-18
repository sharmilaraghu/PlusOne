import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link, useOutletContext } from "react-router-dom";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { money, pct, timeAgo } from "../lib/format";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { Icon } from "../components/ui/Icon";

type WeddingData = NonNullable<FunctionReturnType<typeof api.weddings.get>>;
type Board = NonNullable<FunctionReturnType<typeof api.dashboard.board>>;
type Need = Board["needs"][number];
type VendorRow = Need["vendors"][number];

/** How each state reads on the board, and what it looks like. */
const STATE: Record<VendorRow["state"], { label: string; cls: string }> = {
  booked: { label: "Booked", cls: "chip-ok" },
  quoted: { label: "Quoted", cls: "chip-pending" },
  replied: { label: "Replied", cls: "chip-pending" },
  chased: { label: "Chased", cls: "chip-warn" },
  emailed: { label: "Waiting", cls: "chip-quiet" },
  declined: { label: "You passed", cls: "chip-quiet" },
  needs_attention: { label: "Needs you", cls: "chip-warn" },
  not_contacted: { label: "Not asked", cls: "chip-quiet" },
};

export function DecisionsPage() {
  const { wedding, role } = useOutletContext<WeddingData>();
  const weddingId = wedding._id as Id<"weddings">;
  const board = useQuery(api.dashboard.board, { weddingId });
  const canEdit = role !== "viewer";
  const [onlyLive, setOnlyLive] = useState(true);

  if (board === undefined) {
    return (
      <>
        <PageHeader title="Decisions" meta="Everything you are waiting on, and everything you can decide." />
        <p className="text-sm text-muted">Loading the board…</p>
      </>
    );
  }

  const t = board.totals;
  // A need nobody has written to yet is noise on a decision screen.
  const shown = onlyLive ? board.needs.filter((n) => n.vendors.some((v) => v.state !== "not_contacted")) : board.needs;

  return (
    <>
      <PageHeader
        title="Decisions"
        meta="Everything you are waiting on, and everything you can decide — without opening an inbox."
        action={
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={onlyLive} onChange={(e) => setOnlyLive(e.target.checked)} />
            Only what's in motion
          </label>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Where things stand">
        <Kpi
          label="Asked"
          value={`${t.vendorsContacted}`}
          note={`${t.needsContacted} of ${t.needs} ${t.needs === 1 ? "need" : "needs"} under way`}
        />
        <Kpi
          label="Replied"
          value={`${t.vendorsReplied}`}
          note={
            t.vendorsContacted > 0
              ? `${pct(t.vendorsReplied, t.vendorsContacted)}% of those asked${t.medianReplyHours !== null ? `, usually within ${formatHours(t.medianReplyHours)}` : ""}`
              : "nobody has been asked yet"
          }
          tone={t.vendorsReplied > 0 ? "ok" : undefined}
        />
        <Kpi
          label="Quotes in"
          value={`${t.quotesIn}`}
          note={t.awaiting > 0 ? `${t.awaiting} still to answer` : t.vendorsDeclined > 0 ? `${t.vendorsDeclined} passed` : "nothing outstanding"}
        />
        <Kpi
          label="Booked"
          value={money(t.committed, board.currency)}
          note={
            t.needsBooked > 0
              ? `${t.needsBooked} of ${t.needs} needs · ${money(t.totalBudget, board.currency)} budget`
              : t.cheapestSoFar > 0
                ? `nothing booked yet · cheapest so far would be ${money(t.cheapestSoFar, board.currency)}`
                : `nothing booked yet · ${money(t.totalBudget, board.currency)} budget`
          }
          tone={t.committed > t.totalBudget ? "bad" : undefined}
        />
      </section>

      {shown.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon="send"
            title={onlyLive ? "Nothing in motion yet" : "No vendor needs yet"}
            body={
              onlyLive
                ? "Once PlusOne has written to a few vendors, this is where their answers land — prices, availability and all — so you can decide here."
                : "Add what you need on the Vendors screen and PlusOne will go looking."
            }
            action={
              <Link to="../vendors" className="btn-primary">
                Go to vendors <Icon name="arrow" size={16} />
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-7 grid gap-5">
          {shown.map((need) => (
            <NeedBoard key={need.slotId} need={need} currency={board.currency} canEdit={canEdit} />
          ))}
        </div>
      )}
    </>
  );
}

function formatHours(h: number) {
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} minutes`;
  if (h < 48) return `${Math.round(h)} ${Math.round(h) === 1 ? "hour" : "hours"}`;
  return `${Math.round(h / 24)} days`;
}

function Kpi({ label, value, note, tone }: { label: string; value: string; note: string; tone?: "ok" | "bad" }) {
  return (
    <div className="card px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-quiet">{label}</p>
      <p className={`display mt-1 text-[1.9rem] leading-none ${tone === "bad" ? "text-bad" : tone === "ok" ? "text-ok" : ""}`}>
        {value}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">{note}</p>
    </div>
  );
}

/** One need, with everyone in the running side by side. */
function NeedBoard({ need, currency, canEdit }: { need: Need; currency: string; canEdit: boolean }) {
  const markBooked = useMutation(api.slots.markBooked);
  const setStatus = useMutation(api.threads.setStatus);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const live = need.vendors.filter((v) => v.state !== "not_contacted");
  const cheapest = need.cheapest;

  async function book(v: VendorRow) {
    if (!window.confirm(`Book ${v.name} for ${need.title}?${v.quote ? ` ${money(v.quote.total, v.quote.currency)} goes onto your budget.` : ""}`)) return;
    setBusy(v.vendorId);
    setError(null);
    try {
      await markBooked({ slotId: need.slotId as Id<"vendorSlots">, vendorId: v.vendorId as Id<"vendors"> });
    } catch (e) {
      setError(e instanceof Error ? e.message : "That booking didn't save.");
    } finally {
      setBusy(null);
    }
  }

  async function pass(v: VendorRow) {
    if (!v.threadId) return;
    setBusy(v.vendorId);
    setError(null);
    try {
      await setStatus({ threadId: v.threadId as Id<"threads">, status: "declined" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't save.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="card overflow-hidden" aria-labelledby={`need-${need.slotId}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 border-b border-line px-6 py-4">
        <div className="min-w-0">
          <h2 id={`need-${need.slotId}`} className="display text-[1.3rem] leading-tight">
            {need.title}
          </h2>
          <p className="mt-0.5 text-xs text-quiet">
            {need.eventNames.length > 0 ? need.eventNames.join(" · ") : "the whole wedding"} · {money(need.budget, currency)} planned
          </p>
        </div>
        <p className="text-sm text-muted">
          {need.cheapest !== null ? (
            <>
              <span className="text-ink">{money(need.cheapest, currency)}</span>
              {need.dearest !== null && need.dearest !== need.cheapest && <> – {money(need.dearest, currency)}</>} quoted
            </>
          ) : (
            `${live.length} ${live.length === 1 ? "vendor" : "vendors"} asked, no prices yet`
          )}
        </p>
      </div>

      {error && <p role="alert" className="border-b border-line px-6 py-2.5 text-sm text-bad">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[54rem] text-sm">
          <caption className="sr-only">Everyone asked about {need.title}</caption>
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.08em] text-quiet">
              <th scope="col" className="py-2.5 pl-6 pr-4 font-semibold">Vendor</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Where it stands</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Free on your dates</th>
              <th scope="col" className="px-4 py-2.5 text-right font-semibold">Quote</th>
              <th scope="col" className="px-4 py-2.5 font-semibold">Includes</th>
              <th scope="col" className="py-2.5 pl-4 pr-6" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {live.map((v) => {
              const isCheapest = v.quote !== null && cheapest !== null && v.quote.total === cheapest && live.length > 1;
              return (
                <tr key={v.vendorId} className={v.state === "declined" ? "opacity-55" : undefined}>
                  <th scope="row" className="py-3.5 pl-6 pr-4 text-left font-normal align-top">
                    <span className="flex items-baseline gap-2">
                      <span className="font-medium">{v.name}</span>
                      {v.isTopPick && <span className="text-[11px] text-accent">top pick</span>}
                    </span>
                    {v.rating !== undefined && (
                      <span className="mt-0.5 flex items-center gap-1 text-xs text-quiet">
                        <Icon name="star" size={12} className="text-accent" />
                        {v.rating.toFixed(1)}
                        {v.reviewCount !== undefined && <> · {v.reviewCount.toLocaleString()} reviews</>}
                      </span>
                    )}
                  </th>

                  <td className="px-4 py-3.5 align-top">
                    <span className={STATE[v.state].cls}>
                      {v.state === "declined" && v.theyDeclined ? "They passed" : STATE[v.state].label}
                    </span>
                    <span className="mt-1 block text-xs text-quiet">
                      {v.repliedInHours !== null
                        ? `answered in ${formatHours(v.repliedInHours)}`
                        : v.followUpCount > 0
                          ? `chased ${v.followUpCount}×, last written ${timeAgo(v.lastOutboundAt)}`
                          : v.lastOutboundAt
                            ? `written ${timeAgo(v.lastOutboundAt)}`
                            : "—"}
                    </span>
                  </td>

                  <td className="px-4 py-3.5 align-top">
                    {v.availableOnDates === "yes" ? (
                      <span className="inline-flex items-center gap-1 text-ok">
                        <Icon name="check" size={14} /> Yes
                      </span>
                    ) : v.availableOnDates === "no" ? (
                      <span className="inline-flex items-center gap-1 text-bad">
                        <Icon name="close" size={14} /> No
                      </span>
                    ) : (
                      <span className="text-quiet">—</span>
                    )}
                    {v.availabilityNote && <span className="mt-0.5 block max-w-[16rem] text-xs text-quiet">{v.availabilityNote}</span>}
                  </td>

                  <td className="px-4 py-3.5 text-right align-top">
                    {v.quote ? (
                      <>
                        <span className={`block font-medium ${isCheapest ? "text-ok" : ""}`}>
                          {money(v.quote.total, v.quote.currency)}
                        </span>
                        <span className="block text-xs text-quiet">
                          {v.quote.deltaVsBudget <= 0
                            ? `${money(-v.quote.deltaVsBudget, currency)} under`
                            : `${money(v.quote.deltaVsBudget, currency)} over`}
                          {v.quote.deposit !== undefined && <> · {money(v.quote.deposit, v.quote.currency)} deposit</>}
                        </span>
                        {isCheapest && <span className="mt-1 inline-block text-[11px] text-ok">cheapest</span>}
                      </>
                    ) : (
                      <span className="text-quiet">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 align-top">
                    {v.quote && v.quote.includes.length > 0 ? (
                      <ul className="max-w-[18rem] text-xs leading-relaxed text-muted">
                        {v.quote.includes.slice(0, 3).map((inc, i) => <li key={i}>{inc}</li>)}
                      </ul>
                    ) : (
                      <span className="text-quiet">—</span>
                    )}
                    {v.quote && v.quote.excludes.length > 0 && (
                      <p className="mt-1 max-w-[18rem] text-xs text-quiet">Not included: {v.quote.excludes.slice(0, 2).join(", ")}</p>
                    )}
                    {v.quote && v.quote.redFlags.length > 0 && (
                      <p className="mt-1 max-w-[18rem] text-xs text-warn">{v.quote.redFlags.slice(0, 2).join("; ")}</p>
                    )}
                  </td>

                  <td className="py-3.5 pl-4 pr-6 align-top text-right">
                    {canEdit && v.state !== "declined" && (
                      <span className="inline-flex flex-col items-end gap-1.5">
                        {v.state === "booked" ? (
                          <span className="chip-ok">Yours</span>
                        ) : (
                          <button
                            type="button"
                            className="btn-primary btn-sm"
                            disabled={busy !== null || need.status === "booked"}
                            onClick={() => void book(v)}
                          >
                            {busy === v.vendorId ? "…" : "Book"}
                          </button>
                        )}
                        {v.state !== "booked" && v.threadId && (
                          <button
                            type="button"
                            className="text-xs text-quiet underline underline-offset-2 hover:text-bad"
                            disabled={busy !== null}
                            onClick={() => void pass(v)}
                          >
                            Pass
                          </button>
                        )}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
