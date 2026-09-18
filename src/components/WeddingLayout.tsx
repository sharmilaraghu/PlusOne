import { useQuery } from "convex/react";
import { NavLink, Outlet, useParams, Link } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { longDate } from "../lib/format";

const nav = [
  { to: "", label: "Overview", end: true },
  { to: "vendors", label: "Vendors" },
  { to: "inbox", label: "Inbox" },
  { to: "guests", label: "Guests" },
  { to: "assistant", label: "Assistant" },
  { to: "members", label: "People" },
];

export function WeddingLayout() {
  const { weddingId } = useParams<{ weddingId: string }>();
  const data = useQuery(api.weddings.get, weddingId ? { weddingId: weddingId as Id<"weddings"> } : "skip");
  const { signOut } = useAuthActions();

  if (data === undefined) {
    return <div className="grid min-h-screen place-items-center text-muted">Loading your wedding…</div>;
  }
  if (data === null) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <p className="text-lg">You don't have access to this wedding.</p>
          <Link to="/" className="btn-ghost mt-4">Back to my weddings</Link>
        </div>
      </div>
    );
  }
  const { wedding, role } = data;

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-line bg-white/70 backdrop-blur md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-4 md:block">
          <Link to="/" className="display text-xl tracking-tight">
            Plus<span className="text-accent">One</span>
          </Link>
          <button onClick={() => void signOut()} className="text-xs text-muted hover:text-ink md:hidden">Sign out</button>
        </div>
        <div className="px-4 pb-3">
          <p className="display text-lg leading-tight">{wedding.name}</p>
          <p className="text-xs text-muted">
            {longDate(wedding.startDate)} · {wedding.city}
          </p>
          {wedding.inboxAddress ? (
            <p className="mt-2 truncate rounded-lg bg-accent-soft px-2 py-1 font-mono text-[11px] text-accent" title={wedding.inboxAddress}>
              {wedding.inboxAddress}
            </p>
          ) : (
            <p className="mt-2 text-[11px] text-muted">Setting up your wedding inbox…</p>
          )}
        </div>
        <nav aria-label="Wedding sections" className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:pb-4">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-2 text-sm ${isActive ? "bg-accent-soft font-medium text-accent" : "text-ink hover:bg-sand"}`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden px-4 pb-4 text-xs text-muted md:block">
          <p>You are a <span className="font-medium text-ink">{role}</span></p>
          <button onClick={() => void signOut()} className="mt-2 hover:text-ink">Sign out</button>
        </div>
      </aside>
      <main id="main" className="min-w-0 px-4 py-6 md:px-8">
        <Outlet context={data} />
      </main>
    </div>
  );
}
