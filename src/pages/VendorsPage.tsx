import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";
import { flattenSlots, money, statusLabel, timeAgo, type FlatSlot } from "../lib/format";
import { SUGGESTED_CATEGORIES } from "../../convex/lib/templates";
import { Icon } from "../components/ui/Icon";
import { VendorCard } from "../components/VendorCard";

type WeddingData = NonNullable<FunctionReturnType<typeof api.weddings.get>>;

export function VendorsPage() {
  const { wedding, role, events } = useOutletContext<WeddingData>();
  const weddingId = wedding._id as Id<"weddings">;
  const { slotId } = useParams<{ slotId: string }>();
  const navigate = useNavigate();
  const slots = flattenSlots(useQuery(api.slots.list, { weddingId }));
  const canEdit = role !== "viewer";

  useEffect(() => {
    if (!slotId && slots && slots.length > 0) navigate(`/w/${weddingId}/vendors/${slots[0]._id}`, { replace: true });
  }, [slotId, slots, navigate, weddingId]);

  const slot = slots?.find((s) => s._id === slotId);

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside>
        <h1 className="text-2xl">Vendors</h1>
        <p className="text-xs text-muted">One slot per thing you need to book.</p>
        <ul className="mt-3 space-y-1">
          {(slots ?? []).map((s) => (
            <li key={s._id}>
              <Link
                to={`/w/${weddingId}/vendors/${s._id}`}
                aria-current={s._id === slotId ? "page" : undefined}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${s._id === slotId ? "bg-accent-soft text-accent" : "hover:bg-sand"}`}
              >
                <span className="truncate">{s.title}</span>
                <span className="ml-2 text-[11px] text-muted">{statusLabel(s.status)}</span>
              </Link>
            </li>
          ))}
        </ul>
        {canEdit && <AddSlot weddingId={weddingId} events={events} currency={wedding.currency} />}
      </aside>

      <section className="min-w-0">
        {!slot ? (
          <p className="text-muted">Pick a slot to start.</p>
        ) : (
          <SlotPanel key={slot._id} slot={slot} wedding={wedding} events={events} canEdit={canEdit} />
        )}
      </section>
    </div>
  );
}

type Slot = FlatSlot;

function SlotPanel({
  slot,
  wedding,
  events,
  canEdit,
}: {
  slot: Slot;
  wedding: WeddingData["wedding"];
  events: WeddingData["events"];
  canEdit: boolean;
}) {
  const vendors = useQuery(api.vendors.listBySlot, { slotId: slot._id });
  const run = useQuery(api.research.latestForSlot, { slotId: slot._id });
  const drafts = useQuery(api.outreach.listDrafts, { slotId: slot._id })?.map((d) => ({ ...d.message, vendor: d.vendor }));
  const quotes = useQuery(api.quotes.compareForSlot, { slotId: slot._id })?.map((q) => ({ ...q.quote, vendorName: q.vendor.name, isBooked: q.isBooked }));
  const startResearch = useMutation(api.research.start);
  const toggleShortlist = useMutation(api.vendors.toggleShortlist);
  const setEmail = useMutation(api.vendors.setEmail);
  const addManual = useMutation(api.vendors.addManual);
  const draft = useMutation(api.outreach.draft);
  const updateDraft = useMutation(api.outreach.updateDraft);
  const send = useMutation(api.outreach.send);
  const markBooked = useMutation(api.slots.markBooked);

  const defaultQuery = `${slot.category} in ${wedding.city} for a ${wedding.template === "western" ? "" : wedding.template + " "}wedding under ${money(slot.budget, wedding.currency)}`;
  const [query, setQuery] = useState(defaultQuery);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [manual, setManual] = useState({ name: "", email: "", website: "" });
  const [error, setError] = useState<string | null>(null);

  // The busiest day this need has to cover: what a per-head price must be multiplied by.
  const guestCount = Math.max(0, ...events.filter((e) => slot.eventIds.includes(e._id)).map((e) => e.guestCount));

  const researching = run?.status === "running";
  const selectable = useMemo(() => (vendors ?? []).filter((v) => !!v.email), [vendors]);
  // `listBySlot` already returns top picks first, then by score. The split here is
  // only about how they are shown: the three PlusOne would choose, then the rest.
  const topPicks = useMemo(() => (vendors ?? []).filter((v) => v.isTopPick), [vendors]);
  const others = useMemo(() => (vendors ?? []).filter((v) => !v.isTopPick), [vendors]);
  const topPickable = useMemo(() => topPicks.filter((v) => !!v.email), [topPicks]);
  const ranked = (vendors ?? []).some((v) => v.score !== undefined);

  function toggleSelected(vendorId: string, next: boolean) {
    setSelected((prev) => {
      const s = new Set(prev);
      if (next) s.add(vendorId);
      else s.delete(vendorId);
      return s;
    });
  }

  async function requestQuotes() {
    setError(null);
    setDrafting(true);
    try {
      await draft({ slotId: slot._id, vendorIds: Array.from(selected) as Id<"vendors">[] });
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not draft emails.");
    } finally {
      setDrafting(false);
    }
  }

  async function sendAll() {
    if (!drafts?.length) return;
    setError(null);
    setSending(true);
    try {
      await send({ messageIds: drafts.map((d) => d._id) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl">{slot.title}</h2>
          <p className="text-sm text-muted">
            {slot.category} · planned {money(slot.budget, wedding.currency)} · <span className="capitalize">{statusLabel(slot.status)}</span>
            {slot.bookedVendor ? ` · booked ${slot.bookedVendor.name}` : ""}
          </p>
        </div>
        {canEdit && <RemoveSlot slot={slot} weddingId={wedding._id as Id<"weddings">} />}
      </header>

      {canEdit && (
        <section className="card p-5">
          <label htmlFor="q" className="label">Research the open web</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input id="q" className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Documentary photographers in Austin under $3,500" />
            <button className="btn-primary shrink-0" disabled={researching || !query.trim()} onClick={() => void startResearch({ slotId: slot._id, query: query.trim() })}>
              {researching ? "Researching…" : "Research"}
            </button>
          </div>
          {run && (
            <p className="mt-2 text-xs text-muted" aria-live="polite">
              {run.status === "running" && <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden />}
              {run.step}
              {run.status === "failed" && run.error ? ` — ${run.error}` : ""}
              {run.status === "done" ? ` · ${run.foundCount} vendors · ${timeAgo(run.finishedAt)}` : ""}
            </p>
          )}
          <p className="mt-2 text-[11px] text-muted">Firecrawl reads each vendor's own website. Every price links back to the page it came from.</p>
        </section>
      )}

      <section aria-labelledby="found-h">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 id="found-h" className="text-lg">Vendors {vendors ? `(${vendors.length})` : ""}</h3>
            {ranked && (
              <p className="text-xs text-quiet">
                Ranked on what reviewers say, price against your {money(slot.budget, wedding.currency)} budget, and fit.
              </p>
            )}
          </div>
          {canEdit && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted">{selected.size} selected</span>
              <button className="btn-primary btn-sm" disabled={selected.size === 0 || drafting} onClick={() => void requestQuotes()}>
                {drafting ? "Drafting…" : "Request quotes"}
              </button>
            </div>
          )}
        </div>
        {vendors === undefined ? (
          <p className="mt-3 text-sm text-muted">Loading…</p>
        ) : vendors.length === 0 ? (
          <div className="card mt-3 p-6 text-sm text-muted">
            {researching ? "Reading vendor websites… cards appear as each one is read." : "No vendors yet. Run a search above, or add one you already know below."}
          </div>
        ) : (
          <>
            {topPicks.length > 0 && (
              <>
                <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h4 className="display text-[1.15rem]">
                    {topPicks.length === 1 ? "The best match" : `The top ${topPicks.length === 2 ? "two" : "three"}`}
                  </h4>
                  {canEdit && topPickable.length > 0 && (
                    <button
                      className="text-xs text-accent underline underline-offset-2"
                      onClick={() => setSelected(new Set(topPickable.map((v) => v._id)))}
                    >
                      {topPickable.length === 1 ? "Select this one for quotes" : `Select these ${topPickable.length} for quotes`}
                    </button>
                  )}
                </div>
                <ul className="mt-3 grid items-start gap-4 xl:grid-cols-2">
                  {topPicks.map((v, i) => (
                    <VendorCard
                      key={v._id}
                      vendor={v}
                      rank={i + 1}
                      slotBudget={slot.budget}
                      currency={wedding.currency}
                      guestCount={guestCount}
                      fallbackCity={wedding.city}
                      canEdit={canEdit}
                      selected={selected.has(v._id)}
                      onToggleSelected={(next) => toggleSelected(v._id, next)}
                      onToggleShortlist={() => void toggleShortlist({ vendorId: v._id })}
                      onSetEmail={(email) => void setEmail({ vendorId: v._id, email })}
                    />
                  ))}
                </ul>
              </>
            )}

            {others.length > 0 && (
              <>
                <h4 className="mt-7 display text-[1.15rem]">
                  {topPicks.length > 0 ? `Also found (${others.length})` : `Found (${others.length})`}
                </h4>
                <ul className="mt-3 grid items-start gap-4 xl:grid-cols-2">
                  {others.map((v) => (
                    <VendorCard
                      key={v._id}
                      vendor={v}
                      slotBudget={slot.budget}
                      currency={wedding.currency}
                      guestCount={guestCount}
                      fallbackCity={wedding.city}
                      canEdit={canEdit}
                      selected={selected.has(v._id)}
                      onToggleSelected={(next) => toggleSelected(v._id, next)}
                      onToggleShortlist={() => void toggleShortlist({ vendorId: v._id })}
                      onSetEmail={(email) => void setEmail({ vendorId: v._id, email })}
                    />
                  ))}
                </ul>
              </>
            )}
          </>
        )}
        {canEdit && selectable.length > 0 && selected.size === 0 && (
          <button className="mt-3 text-xs text-muted underline" onClick={() => setSelected(new Set(selectable.map((v) => v._id)))}>
            {selectable.length === 1 ? "Select the one with an email" : `Select all ${selectable.length} with an email`}
          </button>
        )}
      </section>

      {canEdit && drafts && drafts.length > 0 && (
        <section aria-labelledby="drafts-h" className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="drafts-h" className="text-lg">Review {drafts.length} {drafts.length === 1 ? "email" : "emails"}</h3>
            <button className="btn-primary" disabled={sending} onClick={() => void sendAll()}>
              {sending ? "Sending…" : `Send from ${wedding.inboxAddress ?? "your wedding inbox"}`}
            </button>
          </div>
          <ul className="mt-4 space-y-4">
            {drafts.map((d) => (
              <li key={d._id} className="rounded-xl border border-line p-4">
                <p className="text-xs text-muted">To {d.toAddress}</p>
                <input
                  className="input mt-2 font-medium"
                  defaultValue={d.subject}
                  aria-label="Subject"
                  onBlur={(e) => e.target.value !== d.subject && void updateDraft({ messageId: d._id, subject: e.target.value })}
                />
                <textarea
                  className="input mt-2 min-h-40 font-mono text-xs"
                  defaultValue={d.bodyText}
                  aria-label="Email body"
                  onBlur={(e) => e.target.value !== d.bodyText && void updateDraft({ messageId: d._id, bodyText: e.target.value })}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {quotes && quotes.length > 0 && (
        <section aria-labelledby="quotes-h" className="card overflow-x-auto p-5">
          <h3 id="quotes-h" className="text-lg">Quotes side by side</h3>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="py-2 pr-4">Vendor</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 pr-4">Deposit</th>
                <th className="py-2 pr-4">Includes</th>
                <th className="py-2 pr-4">Watch out</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {quotes.map((q) => (
                <tr key={q._id}>
                  <td className="py-2 pr-4 font-medium">{q.vendorName}</td>
                  <td className="py-2 pr-4">{money(q.total, q.currency)}</td>
                  <td className="py-2 pr-4">{q.deposit ? money(q.deposit, q.currency) : "—"}</td>
                  <td className="py-2 pr-4 text-xs text-muted">{q.includes.slice(0, 3).join(", ") || "—"}</td>
                  <td className="py-2 pr-4 text-xs text-warn">{q.redFlags.slice(0, 2).join("; ") || "—"}</td>
                  <td className="py-2 text-right">
                    {canEdit && slot.status !== "booked" && (
                      <button className="btn-ghost btn-sm" onClick={() => void markBooked({ slotId: slot._id, vendorId: q.vendorId })}>Mark booked</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {canEdit && (
        <details className="card p-5">
          <summary className="cursor-pointer text-sm font-medium">Add a vendor you already know</summary>
          <form
            className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              if (!manual.name.trim()) return;
              void addManual({ weddingId: wedding._id, slotId: slot._id, name: manual.name.trim(), email: manual.email.trim() || undefined, website: manual.website.trim() || undefined }).then(() =>
                setManual({ name: "", email: "", website: "" }),
              );
            }}
          >
            <input className="input" placeholder="Name" value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} aria-label="Vendor name" />
            <input className="input" type="email" placeholder="Email" value={manual.email} onChange={(e) => setManual({ ...manual, email: e.target.value })} aria-label="Vendor email" />
            <input className="input" type="url" placeholder="Website" value={manual.website} onChange={(e) => setManual({ ...manual, website: e.target.value })} aria-label="Vendor website" />
            <button className="btn-ghost">Add</button>
          </form>
        </details>
      )}

      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
    </div>
  );
}

function AddSlot({ weddingId, events, currency }: { weddingId: Id<"weddings">; events: WeddingData["events"]; currency: string }) {
  const add = useMutation(api.slots.add);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [budget, setBudget] = useState(1000);
  const [eventIds, setEventIds] = useState<string[]>(events.map((e) => e._id));
  const [busy, setBusy] = useState(false);
  const taken = new Set<string>();

  function submit() {
    if (!title.trim() || eventIds.length === 0) return;
    setBusy(true);
    void add({
      weddingId,
      title: title.trim(),
      category: category.trim() || title.trim(),
      eventIds: eventIds as Id<"events">[],
      budget: Number(budget) || 0,
    }).finally(() => {
      setBusy(false);
      setOpen(false);
      setTitle("");
      setCategory("");
    });
  }

  if (!open) {
    return (
      <button type="button" className="btn-quiet btn-sm mt-4 w-full" onClick={() => setOpen(true)}>
        <Icon name="plus" size={15} /> Add a vendor need
      </button>
    );
  }

  return (
    <section className="card mt-4 p-4" aria-label="Add a vendor need">
      <p className="label">Common needs</p>
      <ul className="flex flex-wrap gap-1.5">
        {SUGGESTED_CATEGORIES.filter((c) => !taken.has(c.title)).map((c) => (
          <li key={c.title}>
            <button
              type="button"
              title={c.hint}
              onClick={() => { setTitle(c.title); setCategory(c.category); }}
              className={`rounded-full px-3 py-1.5 text-xs transition ${
                title === c.title ? "bg-accent text-paper" : "bg-cream text-ink shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-accent-soft"
              }`}
            >
              {c.title}
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-4 grid gap-3">
        <div>
          <label className="label" htmlFor="slot-title">What do you need?</label>
          <input id="slot-title" className="input" placeholder="Dhol player" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="slot-budget">Budget ({currency})</label>
          <input id="slot-budget" className="input" type="number" min={0} step={100} value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
        </div>
        <fieldset>
          <legend className="label">Which days?</legend>
          <div className="flex flex-wrap gap-1.5">
            {events.map((ev) => {
              const on = eventIds.includes(ev._id);
              return (
                <button
                  key={ev._id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setEventIds(on ? eventIds.filter((x) => x !== ev._id) : [...eventIds, ev._id])}
                  className={`rounded-full px-3 py-1.5 text-xs transition ${on ? "bg-accent text-paper" : "bg-cream text-ink shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-accent-soft"}`}
                >
                  {ev.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      <div className="mt-4 flex gap-2">
        <button type="button" className="btn-primary btn-sm" onClick={submit} disabled={busy || !title.trim() || eventIds.length === 0}>
          {busy ? "Adding…" : "Add it"}
        </button>
        <button type="button" className="btn-quiet btn-sm" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </section>
  );
}

/** Drop a need you no longer have. Booked needs are refused by the backend. */
function RemoveSlot({ slot, weddingId }: { slot: Slot; weddingId: Id<"weddings"> }) {
  const remove = useMutation(api.slots.remove);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!window.confirm(`Remove ${slot.title} from your plan? Its budget goes back to the rest.`)) return;
    setBusy(true);
    setError(null);
    try {
      await remove({ slotId: slot._id });
      navigate(`/w/${weddingId}/vendors`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "That need couldn't be removed.");
      setBusy(false);
    }
  }

  return (
    <div className="text-right">
      <button
        type="button"
        className="text-sm text-muted underline underline-offset-2 transition hover:text-bad"
        onClick={() => void submit()}
        disabled={busy}
      >
        Remove this need
      </button>
      {error && <p role="alert" className="mt-1 max-w-xs text-sm text-bad">{error}</p>}
    </div>
  );
}
