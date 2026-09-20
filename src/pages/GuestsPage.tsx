import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useOutletContext } from "react-router-dom";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { timeAgo } from "../lib/format";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { Icon } from "../components/ui/Icon";
import { usePrivacy } from "../lib/privacy";

type WeddingData = NonNullable<FunctionReturnType<typeof api.weddings.get>>;
type Guest = FunctionReturnType<typeof api.guests.list>[number];

const RSVP: Record<Guest["rsvp"], { label: string; cls: string }> = {
  yes: { label: "Coming", cls: "chip-ok" },
  no: { label: "Can't come", cls: "chip-quiet" },
  maybe: { label: "Maybe", cls: "chip-warn" },
  pending: { label: "No answer yet", cls: "chip-quiet" },
};

export function GuestsPage() {
  const privacy = usePrivacy();
  const { wedding, role, events } = useOutletContext<WeddingData>();
  const weddingId = wedding._id as Id<"weddings">;
  const guests = useQuery(api.guests.list, { weddingId });
  const add = useMutation(api.guests.add);
  const update = useMutation(api.guests.update);
  const remove = useMutation(api.guests.remove);
  const sendInvites = useMutation(api.guests.sendInvites);
  const canEdit = role !== "viewer";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [side, setSide] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const counts = useMemo(() => {
    const list = guests ?? [];
    return {
      total: list.length,
      yes: list.filter((g) => g.rsvp === "yes").length,
      no: list.filter((g) => g.rsvp === "no").length,
      pending: list.filter((g) => g.rsvp === "pending").length,
      heads: list.reduce((sum, g) => sum + (g.rsvp === "yes" ? g.attendingCount : 0), 0),
      invitable: list.filter((g) => g.email && !g.lastInvitedAt).length,
    };
  }, [guests]);

  async function addGuest() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await add({
        weddingId,
        name: name.trim(),
        email: email.trim() || undefined,
        side: side.trim() || undefined,
        partySize: Number(partySize) || 1,
      });
      setName("");
      setEmail("");
      setPartySize(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That guest could not be added.");
    } finally {
      setBusy(false);
    }
  }

  /** Invite everyone who has an address and has not been written to yet. */
  async function inviteAll() {
    const ids = (guests ?? []).filter((g) => g.email && !g.lastInvitedAt).map((g) => g._id);
    if (ids.length === 0) return;
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const result = await sendInvites({ weddingId, guestIds: ids });
      setNote(
        `${result.queued} ${result.queued === 1 ? "invitation is" : "invitations are"} on the way` +
          (result.skipped > 0 ? `, ${result.skipped} skipped` : "") +
          ". Replies come back here in plain words — PlusOne reads them.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Those invitations could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[58rem]">
      <PageHeader
        title="Guests"
        meta="Add everyone, send the invitations from your wedding inbox, and let PlusOne read the replies."
        action={
          canEdit && counts.invitable > 0 ? (
            <button className="btn-primary" onClick={() => void inviteAll()} disabled={busy}>
              {busy ? "Sending…" : `Invite ${counts.invitable}`} <Icon name="send" size={16} />
            </button>
          ) : undefined
        }
      />

      {guests !== undefined && guests.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-4" aria-label="Where the replies stand">
          <Stat label="Invited" value={`${counts.total}`} note={`${counts.heads} coming so far`} />
          <Stat label="Coming" value={`${counts.yes}`} tone="ok" note={counts.yes > 0 ? "including their plus ones" : "no yeses yet"} />
          <Stat label="Can't come" value={`${counts.no}`} note={counts.no > 0 ? "with apologies" : "none so far"} />
          <Stat label="No answer" value={`${counts.pending}`} note={counts.pending > 0 ? "a nudge may help" : "everyone has replied"} />
        </section>
      )}

      {note && <p className="mt-4 rounded-[12px] bg-ok-bg px-4 py-3 text-sm text-ok" aria-live="polite">{note}</p>}
      {error && <p role="alert" className="mt-4 text-sm text-bad">{error}</p>}

      {canEdit && <ImportGuests weddingId={weddingId} />}

      {canEdit && (
        <section className="card mt-6 p-5 md:p-6" aria-labelledby="add-guest">
          <h2 id="add-guest" className="display text-lg">Add a guest</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1.2fr_1.4fr_0.8fr_auto] sm:items-end">
            <label className="grid gap-1">
              <span className="label mb-0">Name</span>
              <input className="input" value={name} placeholder="Jane Fletcher" onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="label mb-0">Email</span>
              <input
                className="input"
                type="email"
                value={email}
                placeholder="so PlusOne can invite them"
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="grid gap-1">
              <span className="label mb-0">Party of</span>
              <input
                className="input"
                type="number"
                min={1}
                max={12}
                value={partySize}
                onChange={(e) => setPartySize(Number(e.target.value))}
              />
            </label>
            <button className="btn-ghost" onClick={() => void addGuest()} disabled={busy || !name.trim()}>
              <Icon name="plus" size={16} /> Add
            </button>
          </div>
          <label className="mt-3 grid max-w-[16rem] gap-1">
            <span className="label mb-0">Side</span>
            <input className="input" value={side} placeholder="Optional — e.g. Jack's family" onChange={(e) => setSide(e.target.value)} />
          </label>
        </section>
      )}

      {guests === undefined ? (
        <p className="mt-6 text-sm text-muted">Loading your guests…</p>
      ) : guests.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon="guests"
            title="Nobody on the list yet"
            body="Add your guests above. Anyone with an email address can be invited from your wedding inbox, and when they reply in their own words — “we'd love to, two of us” — PlusOne updates the list for you."
          />
        </div>
      ) : (
        <>
        <KitchenNotes guests={guests} />
        <section className="card mt-6 overflow-hidden" aria-label="Your guests">
          <ul className="divide-y divide-line">
            {guests.map((g) => (
              <li key={g._id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 md:px-6">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.98rem]">{g.name}</span>
                  <span className="block truncate text-xs text-quiet">
                    {privacy.email(g.email) ?? "no email — invite them yourself"}
                    {g.side ? ` · ${g.side}` : ""}
                    {g.partySize > 1 ? ` · party of ${g.partySize}` : ""}
                    {g.dietary ? ` · ${g.dietary}` : ""}
                  </span>
                  {(g.allergies ?? []).length > 0 && (
                    <span className="mt-1 flex flex-wrap gap-1">
                      {(g.allergies ?? []).map((a) => (
                        <span
                          key={a}
                          className={`rounded-full px-2 py-0.5 text-[11px] ${/severe/.test(a) ? "bg-bad/10 text-bad" : "bg-warn-bg text-warn"}`}
                        >
                          Allergy: {a}
                        </span>
                      ))}
                    </span>
                  )}
                </span>

                <span className={RSVP[g.rsvp].cls}>
                  {RSVP[g.rsvp].label}
                  {g.rsvp === "yes" && g.attendingCount > 1 ? ` · ${g.attendingCount}` : ""}
                </span>

                <span className="w-28 shrink-0 text-right text-xs text-quiet">
                  {g.lastInvitedAt ? `invited ${timeAgo(g.lastInvitedAt)}` : g.email ? "not invited yet" : ""}
                </span>

                {canEdit && (
                  <span className="flex shrink-0 gap-1">
                    {g.rsvp !== "yes" && (
                      <button
                        className="btn-quiet btn-sm"
                        title="Mark as coming"
                        onClick={() => void update({ guestId: g._id, patch: { rsvp: "yes", attendingCount: g.partySize } })}
                      >
                        Coming
                      </button>
                    )}
                    <button
                      className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-accent-soft hover:text-bad"
                      aria-label={`Remove ${g.name}`}
                      onClick={() => {
                        if (window.confirm(`Remove ${g.name} from the list?`)) void remove({ guestId: g._id });
                      }}
                    >
                      <Icon name="close" size={15} />
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
        </>
      )}

      {guests !== undefined && guests.length > 0 && (
        <p className="mt-4 text-sm text-quiet">
          {events.length > 1
            ? `Everyone here is invited to all ${events.length} days for now; per-day invitations are coming.`
            : "Replies arrive in your wedding inbox and are read back onto this list automatically."}
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, note, tone }: { label: string; value: string; note: string; tone?: "ok" }) {
  return (
    <div className="card px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-quiet">{label}</p>
      <p className={`display mt-1 text-[1.8rem] leading-none ${tone === "ok" ? "text-ok" : ""}`}>{value}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">{note}</p>
    </div>
  );
}

/**
 * Everything the caterer must plan around, gathered from the replies: allergies first,
 * severe ones marked, with who has them so the couple can check.
 */
function KitchenNotes({ guests }: { guests: Guest[] }) {
  const coming = guests.filter((g) => g.rsvp !== "no");
  const allergies = coming.flatMap((g) => (g.allergies ?? []).map((a) => ({ a, who: g.name })));
  const prefs = coming.filter((g) => g.dietary).map((g) => ({ d: g.dietary as string, who: g.name }));
  if (allergies.length === 0 && prefs.length === 0) return null;
  const severe = allergies.filter((x) => /severe/.test(x.a)).length;
  return (
    <section className="card mt-6 p-5 md:p-6" aria-label="Food needs for the caterer">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="display text-xl">For the caterer</h2>
        <p className="text-xs text-quiet">
          PlusOne shares these with food vendors when they ask: allergens and numbers, never names.
        </p>
      </div>
      {allergies.length > 0 && (
        <>
          <p className="mt-3 text-sm">
            <strong className="font-medium">{allergies.length} {allergies.length === 1 ? "allergy" : "allergies"}</strong>
            {severe > 0 && <span className="text-bad">, {severe} severe</span>}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {allergies.map(({ a, who }) => (
              <li
                key={`${who}-${a}`}
                className={`rounded-full px-3 py-1 text-xs ${/severe/.test(a) ? "bg-bad/10 text-bad" : "bg-warn-bg text-warn"}`}
              >
                {a} <span className="opacity-70">· {who}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {prefs.length > 0 && (
        <p className="mt-3 text-sm text-muted">
          Also: {prefs.map(({ d, who }) => `${d} (${who})`).join(", ")}.
        </p>
      )}
    </section>
  );
}

/**
 * A whole list at once: a spreadsheet, a PDF or a paste. PlusOne reads it into names
 * and emails, and nobody is added until the couple has looked at what it read.
 */
function ImportGuests({ weddingId }: { weddingId: Id<"weddings"> }) {
  const uploadUrl = useMutation(api.guests.generateUploadUrl);
  const startImport = useMutation(api.guests.startImport);
  const commitImport = useMutation(api.guests.commitImport);
  const [importId, setImportId] = useState<Id<"guestImports"> | null>(null);
  const [open, setOpen] = useState(false);
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [dropped, setDropped] = useState<Set<string>>(new Set());
  const result = useQuery(api.guests.getImportForCouple, importId ? { importId } : "skip");

  async function read(file: File | null) {
    setError(null);
    setDone(null);
    setBusy(true);
    try {
      let id;
      if (file) {
        const res = await fetch(await uploadUrl({ weddingId }), { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
        if (!res.ok) throw new Error("That file didn't upload. Try again.");
        const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
        id = await startImport({ weddingId, storageId, filename: file.name });
      } else {
        id = await startImport({ weddingId, rawText: pasted });
      }
      setDropped(new Set());
      setImportId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const rows = (result?.guests ?? []).map((g, i) => ({ ...g, key: `${i}-${g.email ?? g.name}` }));
  const keeping = rows.filter((r) => !dropped.has(r.key));

  if (!open) {
    return (
      <p className="mt-4 text-sm text-muted">
        Have a list already?{" "}
        <button type="button" className="text-accent underline underline-offset-2" onClick={() => setOpen(true)}>
          Bring in a spreadsheet, a PDF or a paste
        </button>{" "}
        instead of typing them one by one.
      </p>
    );
  }

  return (
    <section className="card mt-6 p-5 md:p-6" aria-labelledby="import-h">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="import-h" className="display text-lg">Bring in your guest list</h2>
        <button type="button" className="text-xs text-quiet underline underline-offset-2" onClick={() => setOpen(false)}>Close</button>
      </div>
      <p className="mt-1 text-sm text-muted">
        A spreadsheet (.xlsx or .csv), a PDF, or paste the names below. PlusOne picks out names and email addresses,
        and shows you what it read before anyone is added.
      </p>

      {!result || result.status === "committed" ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
            <textarea
              rows={3}
              className="input resize-y"
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder={"Olivia Carter, olivia@example.com\nThe Bennett family (4), noah@example.com"}
              aria-label="Paste your guest list"
            />
            <div className="grid gap-2">
              <button type="button" className="btn-primary btn-sm" disabled={busy || !pasted.trim()} onClick={() => void read(null)}>
                {busy ? "Reading…" : "Read this list"}
              </button>
              <label className="btn-quiet btn-sm cursor-pointer">
                <Icon name="plus" size={15} />
                Choose a file
                <input
                  type="file"
                  accept=".csv,.tsv,.txt,.xlsx,.xlsm,.pdf,text/csv,application/pdf"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    e.target.value = "";
                    if (file) void read(file);
                  }}
                />
              </label>
            </div>
          </div>
          {done && <p className="mt-3 text-sm text-ok" aria-live="polite">{done}</p>}
        </>
      ) : result.status === "pending" ? (
        <p className="mt-4 text-sm text-muted" aria-live="polite">
          Reading {result.filename ?? "your list"}…
        </p>
      ) : result.status === "failed" ? (
        <div className="mt-4">
          <p role="alert" className="text-sm text-bad">PlusOne couldn't read that: {result.error}</p>
          <button type="button" className="btn-quiet btn-sm mt-2" onClick={() => setImportId(null)}>Try another list</button>
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-4">
          <p role="alert" className="text-sm text-bad">
            PlusOne couldn't find any guests in {result.filename ?? "that list"}. A spreadsheet or PDF with a name and an
            email per row works best.
          </p>
          <button type="button" className="btn-quiet btn-sm mt-2" onClick={() => setImportId(null)}>Try another list</button>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm">
            <strong className="font-medium">{keeping.length} {keeping.length === 1 ? "guest" : "guests"}</strong> read from{" "}
            {result.filename ?? "your list"}. Drop anyone who shouldn't be here, then add them.
          </p>
          {result.note && <p className="mt-1 text-xs text-quiet">{result.note}</p>}
          <ul className="mt-3 max-h-[22rem] divide-y divide-line overflow-y-auto rounded-[12px] border border-line">
            {rows.map((r) => {
              const out = dropped.has(r.key);
              return (
                <li key={r.key} className={`flex items-center gap-3 px-3 py-2 text-sm ${out ? "opacity-45" : ""}`}>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate ${out ? "line-through" : ""}`}>{r.name}</span>
                    <span className="block truncate text-xs text-quiet">
                      {r.email ?? "no email"}
                      {r.side ? ` · ${r.side}` : ""}
                      {r.partySize > 1 ? ` · party of ${r.partySize}` : ""}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="text-xs text-quiet underline underline-offset-2 hover:text-accent"
                    onClick={() =>
                      setDropped((d) => {
                        const next = new Set(d);
                        if (out) next.delete(r.key);
                        else next.add(r.key);
                        return next;
                      })
                    }
                  >
                    {out ? "Keep" : "Drop"}
                  </button>
                </li>
              );
            })}
          </ul>
          {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
          <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
            <button type="button" className="btn-quiet btn-sm" onClick={() => setImportId(null)}>Cancel</button>
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={busy || keeping.length === 0 || !importId}
              onClick={() => {
                if (!importId) return;
                setBusy(true);
                setError(null);
                void commitImport({ importId, guests: keeping.map(({ key: _key, ...g }) => g) })
                  .then(({ added, skipped }) => {
                    setImportId(null);
                    setPasted("");
                    setDone(
                      `Added ${added} ${added === 1 ? "guest" : "guests"}${skipped > 0 ? `, skipped ${skipped} already on your list` : ""}.`,
                    );
                  })
                  .catch((e: unknown) => setError(e instanceof Error ? e.message : "They didn't save."))
                  .finally(() => setBusy(false));
              }}
            >
              {busy ? "Adding…" : `Add ${keeping.length} to the list`}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
