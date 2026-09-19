import { useState } from "react";
import { useQuery } from "convex/react";
import { Icon } from "./ui/Icon";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { timeAgo } from "../lib/format";
import { usePrivacy } from "../lib/privacy";

type IconName = Parameters<typeof Icon>[0]["name"];

const icons: Record<string, IconName> = {
  wedding_created: "heart",
  inbox_ready: "mail",
  research_started: "search",
  vendor_found: "search",
  inquiry_sent: "send",
  vendor_replied: "reply",
  quote_received: "send",
  follow_up_sent: "mail",
  booked: "check",
  guest_rsvp: "guests",
  member_joined: "people",
  task_done: "check",
  note: "pen",
};

/** Newest few on the page; the rest one click away, in a scrolling list rather than a longer page. */
const FIRST = 6;

export function ActivityFeed({ weddingId, limit = 40 }: { weddingId: Id<"weddings">; limit?: number }) {
  const items = useQuery(api.activity.list, { weddingId, limit });
  const privacy = usePrivacy();
  const [open, setOpen] = useState(false);
  const shown = items && !open ? items.slice(0, FIRST) : items;
  const hidden = items ? items.length - FIRST : 0;
  return (
    <section aria-labelledby="activity-h" className="card p-4">
      <div className="flex items-center justify-between">
        <h2 id="activity-h" className="text-base">Activity</h2>
        <span className="flex items-center gap-1 text-[11px] text-muted">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden /> live
        </span>
      </div>
      {items === undefined ? (
        <p className="mt-2 text-sm text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Nothing yet. Research a vendor to get things moving.</p>
      ) : (
        <>
        <ul className={`mt-3 space-y-3 ${open ? "max-h-[26rem] overflow-y-auto pr-1" : ""}`}>
          {(shown ?? []).map((a) => (
            <li key={a._id} className="flex gap-2 text-sm">
              <span aria-hidden className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                <Icon name={icons[a.type] ?? "dot"} size={13} />
              </span>
              <div className="min-w-0">
                <p className="line-clamp-2 leading-snug" title={privacy.text(a.text)}>{privacy.text(a.text)}</p>
                <p className="text-[11px] text-quiet">{a.actorLabel} · {timeAgo(a._creationTime)}</p>
              </div>
            </li>
          ))}
        </ul>
        {hidden > 0 && (
          <button
            type="button"
            className="mt-3 w-full rounded-full py-1.5 text-xs text-accent transition hover:bg-accent-soft"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
          >
            {open ? "Show less" : `Show ${hidden} earlier`}
          </button>
        )}
        </>
      )}
    </section>
  );
}
