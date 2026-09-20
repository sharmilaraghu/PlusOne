import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";
import { flattenSlots, money, statusLabel, timeAgo, type FlatSlot } from "../lib/format";
import { BookButton } from "../components/BookButton";
import { SUGGESTED_CATEGORIES } from "../../convex/lib/templates";
import { Icon } from "../components/ui/Icon";
import { VendorCard } from "../components/VendorCard";
import { ConfirmOutreach } from "../components/ConfirmOutreach";

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
        {canEdit && slots && <ResearchAll weddingId={weddingId} waiting={slots.filter((s) => s.status === "research").length} />}
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

/** One click to research every need nobody has looked into yet. */
function ResearchAll({ weddingId, waiting }: { weddingId: Id<"weddings">; waiting: number }) {
  const startAll = useMutation(api.research.startAll);
  const [state, setState] = useState<{ busy: boolean; note: string | null }>({ busy: false, note: null });
  if (waiting === 0 && !state.note) return null;
  return (
    <div className="mt-3 rounded-[14px] bg-accent-soft/60 p-3">
      {state.note ? (
        <p className="text-xs leading-relaxed text-accent">{state.note}</p>
      ) : (
        <>
          <p className="text-xs leading-relaxed text-muted">
            {waiting === 1 ? "One need hasn't" : `${waiting} needs haven't`} been looked into yet.
          </p>
          <button
            type="button"
            className="btn-primary btn-sm mt-2 w-full"
            disabled={state.busy}
            onClick={() => {
              setState({ busy: true, note: null });
              void startAll({ weddingId })
                .then(({ started }) =>
                  setState({
                    busy: false,
                    note:
                      started === 0
                        ? "Everything is already being researched."
                        : `On it. PlusOne is researching ${started} ${started === 1 ? "need" : "needs"}, one every 20 seconds or so. Each fills in as it finishes.`,
                  }),
                )
                .catch((e: unknown) => setState({ busy: false, note: e instanceof Error ? e.message : "That didn't start. Try again." }));
            }}
          >
            <Icon name="search" size={15} /> {state.busy ? "Starting…" : "Find vendors for everything"}
          </button>
        </>
      )}
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
  const markBooked = useMutation(api.slots.markBooked);

  // The couple's own words about the day, so the search starts from their style, not just the category.
  const styleWords = [...(wedding.styleVibes ?? []).slice(0, 2), wedding.stylePalette ?? ""].filter(Boolean).join(", ").toLowerCase();
  const tradition = wedding.template === "western" || wedding.template === "custom" ? "" : `${wedding.template} `;
  const defaultQuery = [
    `${slot.category} in ${wedding.area ? `${wedding.area}, ` : ""}${wedding.city}`,
    `for a ${tradition}wedding${styleWords ? ` that feels ${styleWords}` : ""}`,
    `under ${money(slot.budget, wedding.currency)}`,
  ].join(" ");
  const [query, setQuery] = useState(defaultQuery);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drafting, setDrafting] = useState(false);
  const [sentCount, setSentCount] = useState<number | null>(null);
  const [manual, setManual] = useState({ name: "", email: "", website: "" });
  const [error, setError] = useState<string | null>(null);

  // The busiest day this need has to cover: what a per-head price must be multiplied by.
  const guestCount = Math.max(0, ...events.filter((e) => slot.eventIds.includes(e._id)).map((e) => e.guestCount));

  const researching = run?.status === "running";
  const selectable = useMemo(() => (vendors ?? []).filter((v) => !!v.email), [vendors]);
  // `listBySlot` already returns top picks first, then by score. The split here is
  // only about how they are shown: the three PlusOne would choose, then the rest.
  const [onlyShortlisted, setOnlyShortlisted] = useState(false);
  const shortlistedCount = (vendors ?? []).filter((v) => v.shortlisted).length;
  const inView = useMemo(
    () => (vendors ?? []).filter((v) => !onlyShortlisted || v.shortlisted),
    [vendors, onlyShortlisted],
  );
  const topPicks = useMemo(() => inView.filter((v) => v.isTopPick), [inView]);
  const others = useMemo(() => inView.filter((v) => !v.isTopPick), [inView]);
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

      <EventsForSlot slot={slot} events={events} canEdit={canEdit} />

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
              {run.queries && run.queries.length > 0 && (
                <span className="mt-1 block text-quiet">
                  Searches: {run.queries.join(" · ")}
                </span>
              )}
            </p>
          )}
          <p className="mt-2 text-[11px] text-muted">Firecrawl reads each vendor's own website. Every price links back to the page it came from.</p>
          {(wedding.styleVibes?.length || wedding.stylePalette || wedding.styleSummary) && (
            <p className="mt-1.5 text-[11px] text-muted">
              <span className="text-accent">Matching your style:</span>{" "}
              {[
                (wedding.styleVibes ?? []).join(", "),
                wedding.stylePalette,
                wedding.styleFormality,
                wedding.styleSummary ? "your inspiration board" : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </section>
      )}

      <section aria-labelledby="found-h">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 id="found-h" className="text-lg">
              Vendors {vendors ? `(${vendors.length})` : ""}
              {shortlistedCount > 0 && (
                <button
                  type="button"
                  aria-pressed={onlyShortlisted}
                  onClick={() => setOnlyShortlisted((v) => !v)}
                  title={onlyShortlisted ? "Show everyone again" : "Show only the ones you've hearted"}
                  className={`ml-3 rounded-full px-3 py-1 text-xs align-middle transition ${
                    onlyShortlisted ? "bg-accent text-paper" : "bg-cream text-muted shadow-[inset_0_0_0_1px_var(--color-line)] hover:text-accent"
                  }`}
                >
                  ♥ {shortlistedCount} shortlisted
                </button>
              )}
            </h3>
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
        ) : inView.length === 0 ? (
          <div className="card mt-3 p-6 text-sm text-muted">
            None of these are shortlisted yet. Tap the heart on a vendor to keep it here, or{" "}
            <button type="button" className="text-accent underline underline-offset-2" onClick={() => setOnlyShortlisted(false)}>
              show everyone again
            </button>
            .
          </div>
        ) : (
          <>
            {topPicks.length > 0 && (
              <div className="mt-4 rounded-[20px] bg-accent-soft/55 p-4 md:p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <div>
                    <h4 className="display text-[1.15rem]">
                      {topPicks.length === 1 ? "The best match" : `The top ${topPicks.length === 2 ? "two" : "three"}`}
                    </h4>
                    <p className="text-xs text-muted">Ranked on their reviews, their price against your budget, and how well they fit.</p>
                  </div>
                  {canEdit && topPickable.length > 0 && (
                    <button
                      className="text-xs text-accent underline underline-offset-2"
                      onClick={() => setSelected(new Set(topPickable.map((v) => v._id)))}
                    >
                      {topPickable.length === 1 ? "Select this one for quotes" : `Select these ${topPickable.length} for quotes`}
                    </button>
                  )}
                </div>
                <ul className="mt-3 grid items-stretch gap-4 md:grid-cols-2 2xl:grid-cols-3">
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
              </div>
            )}

            {others.length > 0 && (
              <>
                <h4 className="mt-7 display text-[1.15rem]">
                  {topPicks.length > 0 ? `Also found (${others.length})` : `Found (${others.length})`}
                </h4>
                <ul className="mt-3 grid items-stretch gap-4 md:grid-cols-2 2xl:grid-cols-3">
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

            {canEdit && slot.status !== "booked" && (
              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
                <button
                  type="button"
                  className="btn-quiet btn-sm"
                  disabled={researching}
                  onClick={() => void startResearch({ slotId: slot._id, query: (run?.query ?? query).trim() || defaultQuery, more: true })}
                >
                  <Icon name="search" size={15} /> {researching ? "Looking…" : "Find more options"}
                </button>
                <p className="text-xs text-quiet">
                  {vendors.length} found so far. PlusOne searches again and skips everyone already here.
                </p>
              </div>
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
        <ConfirmOutreach
          slotId={slot._id}
          drafts={drafts}
          editable={wedding.sendMode === "review"}
          onSent={(queued) => setSentCount(queued)}
        />
      )}

      {sentCount !== null && (
        <section className="card flex flex-wrap items-center gap-x-3 gap-y-1 px-6 py-5" aria-live="polite">
          <Icon name="send" size={18} className="text-accent" />
          <p className="text-sm">
            <span className="font-medium">
              {sentCount} {sentCount === 1 ? "email is" : "emails are"} on the way.
            </span>{" "}
            <span className="text-muted">
              PlusOne chases anyone who goes quiet and turns every reply into a quote. Watch the Inbox — you do not need to do
              anything else.
            </span>
          </p>
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
                      <BookButton vendorName={q.vendorName} className="btn-ghost btn-sm" onBook={(notify) => markBooked({ slotId: slot._id, vendorId: q.vendorId, notify })} />
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

/**
 * Which days this vendor is for. Most serve every day, but a photographer might do
 * the ceremony only while the caterer does three, and that changes the guest count
 * PlusOne quotes and which day the money lands on.
 */
function EventsForSlot({ slot, events, canEdit }: { slot: Slot; events: WeddingData["events"]; canEdit: boolean }) {
  const update = useMutation(api.slots.update);
  const [error, setError] = useState<string | null>(null);
  const on = new Set(slot.eventIds as string[]);

  async function toggle(eventId: string, next: boolean) {
    const ids = next ? [...on, eventId] : [...on].filter((id) => id !== eventId);
    if (ids.length === 0) {
      setError("A vendor need has to cover at least one day. Remove the need itself if you don't want it.");
      return;
    }
    setError(null);
    try {
      await update({ slotId: slot._id, patch: { eventIds: ids as Id<"events">[] } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't save.");
    }
  }

  return (
    <section className="card p-4 md:p-5" aria-label="Which days this vendor is for">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="label mb-0">Needed for</p>
        <p className="text-xs text-quiet">
          {canEdit ? "Tick every day this vendor is for. Quotes and guest counts follow." : `${on.size} of ${events.length} days`}
        </p>
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-2">
        {events.map((e) => {
          const active = on.has(e._id);
          return (
            <li key={e._id}>
              <button
                type="button"
                disabled={!canEdit}
                aria-pressed={active}
                onClick={() => void toggle(e._id, !active)}
                className={`rounded-full px-3.5 py-1.5 text-sm transition disabled:cursor-default ${
                  active
                    ? "bg-accent text-paper"
                    : "bg-cream text-muted shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-accent-soft hover:text-accent"
                }`}
              >
                {e.name}
                <span className={`ml-2 text-xs ${active ? "opacity-80" : "text-quiet"}`}>{e.guestCount}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {error && <p role="alert" className="mt-2 text-xs text-bad">{error}</p>}
    </section>
  );
}
