import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Icon } from "../ui/Icon";
import { money } from "../../lib/format";

/**
 * A search that keeps living in the conversation: the couple watches it read vendor
 * websites, sees what came back, and writes to the ones they like — all without
 * leaving the chat. The vendors screen shows exactly the same thing.
 */
export function ResearchResult({
  slotId,
  slotTitle,
  currency,
  canEdit,
}: {
  slotId: Id<"vendorSlots">;
  slotTitle: string;
  currency: string;
  canEdit: boolean;
}) {
  const run = useQuery(api.research.latestForSlot, { slotId });
  const vendors = useQuery(api.vendors.listBySlot, { slotId });
  const drafts = useQuery(api.outreach.listDrafts, { slotId });
  const draft = useMutation(api.outreach.draft);
  const sendAll = useMutation(api.outreach.sendAllForSlot);
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const searching = run?.status === "running";
  const found = (vendors ?? []).filter((v) => v.email);
  // Until they choose, the ones PlusOne ranked highest are the ones it would write to.
  const chosen = picked ?? new Set(found.filter((v) => v.isTopPick).map((v) => v._id));
  const waiting = (drafts ?? []).length;

  return (
    <div className="mt-3 rounded-[14px] border border-line bg-cream/60 p-3.5">
      {searching ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden="true" />
          {run?.step ?? "Searching the web"}…
        </p>
      ) : (
        <p className="text-sm">
          <strong className="font-medium">{(vendors ?? []).length}</strong> found for {slotTitle.toLowerCase()}
          {run?.finishedAt ? "" : ""}
        </p>
      )}

      {(vendors ?? []).length > 0 && (
        <ul className="mt-2.5 grid gap-1.5">
          {(vendors ?? []).slice(0, 6).map((v) => {
            const on = chosen.has(v._id);
            return (
              <li key={v._id} className="flex items-center gap-2.5 rounded-[10px] bg-paper px-3 py-2">
                {canEdit && v.email && (
                  <input
                    type="checkbox"
                    checked={on}
                    aria-label={`Write to ${v.name}`}
                    onChange={(e) => {
                      const next = new Set(chosen);
                      if (e.target.checked) next.add(v._id);
                      else next.delete(v._id);
                      setPicked(next);
                    }}
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="truncate text-sm">{v.name}</span>
                    {v.isTopPick && <span className="shrink-0 text-[11px] text-accent">top pick</span>}
                  </span>
                  <span className="block truncate text-xs text-quiet">
                    {v.rating !== undefined ? `${v.rating.toFixed(1)}★` : "no rating"}
                    {v.startingPrice ? ` · from ${money(v.startingPrice, v.priceCurrency ?? currency)}` : ""}
                    {v.email ? "" : " · no email address"}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {note && <p className="mt-2 text-xs text-ok">{note}</p>}

      {canEdit && !searching && found.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {waiting > 0 ? (
            <>
              <span className="text-xs text-muted">
                {waiting} {waiting === 1 ? "email is" : "emails are"} written and waiting.
              </span>
              <button
                type="button"
                className="btn-primary btn-sm"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void sendAll({ slotId })
                    .then(({ queued }) => setNote(`Sent to ${queued} ${queued === 1 ? "vendor" : "vendors"}.`))
                    .catch(() => setNote(null))
                    .finally(() => setBusy(false));
                }}
              >
                Send {waiting === 1 ? "it" : "them"}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={busy || chosen.size === 0}
              onClick={() => {
                setBusy(true);
                setNote(null);
                void draft({ slotId, vendorIds: [...chosen] as Id<"vendors">[] })
                  .then(() => setNote("PlusOne is writing to them now…"))
                  .catch(() => setNote(null))
                  .finally(() => setBusy(false));
              }}
            >
              <Icon name="send" size={14} />
              Ask {chosen.size === 1 ? "them" : `these ${chosen.size}`} for a quote
            </button>
          )}
        </div>
      )}
    </div>
  );
}
