import { useQuery } from "convex/react";
import { Icon } from "./ui/Icon";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { timeAgo } from "../lib/format";

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

export function ActivityFeed({ weddingId, limit = 25 }: { weddingId: Id<"weddings">; limit?: number }) {
  const items = useQuery(api.activity.list, { weddingId, limit });
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
        <ul className="mt-3 space-y-3">
          {items.map((a) => (
            <li key={a._id} className="flex gap-2 text-sm">
              <span aria-hidden className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                <Icon name={icons[a.type] ?? "dot"} size={13} />
              </span>
              <div className="min-w-0">
                <p className="leading-snug">{a.text}</p>
                <p className="text-[11px] text-quiet">{a.actorLabel} · {timeAgo(a._creationTime)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
