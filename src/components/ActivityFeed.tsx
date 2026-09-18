import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { timeAgo } from "../lib/format";

const icons: Record<string, string> = {
  wedding_created: "✨",
  inbox_ready: "📬",
  research_started: "🔎",
  vendor_found: "📍",
  inquiry_sent: "✉️",
  vendor_replied: "💬",
  quote_received: "💵",
  follow_up_sent: "⏰",
  booked: "✅",
  guest_rsvp: "🎟️",
  member_joined: "👋",
  task_done: "☑️",
  note: "📝",
};

export function ActivityFeed({ weddingId, limit = 25 }: { weddingId: Id<"weddings">; limit?: number }) {
  const items = useQuery(api.activity.list, { weddingId, limit });
  return (
    <section aria-labelledby="activity-h" className="card p-4">
      <div className="flex items-center justify-between">
        <h2 id="activity-h" className="text-base">Activity</h2>
        <span className="flex items-center gap-1 text-[11px] text-muted">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-ok" aria-hidden /> live
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
              <span aria-hidden className="mt-0.5">{icons[a.type] ?? "•"}</span>
              <div className="min-w-0">
                <p className="leading-snug">{a.text}</p>
                <p className="text-[11px] text-muted">{a.actorLabel} · {timeAgo(a._creationTime)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
