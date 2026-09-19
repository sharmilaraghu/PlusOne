import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { NavLink, Outlet, useParams, Link } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { longDate } from "../lib/format";
import { Icon } from "./ui/Icon";
import { UserChip } from "./ui/UserChip";
import { Walkthrough, shouldOfferWalkthrough } from "./Walkthrough";

const nav = [
  { to: "", label: "Overview", icon: "home" as const, end: true },
  { to: "vendors", label: "Vendors", icon: "search" as const, tour: "nav-vendors" },
  { to: "decisions", label: "Decisions", icon: "check" as const, tour: "nav-decisions" },
  { to: "inbox", label: "Inbox", icon: "mail" as const, tour: "nav-inbox" },
  { to: "guests", label: "Guests", icon: "guests" as const },
  { to: "assistant", label: "Assistant", icon: "heart" as const },
  { to: "members", label: "People", icon: "people" as const },
  { to: "settings", label: "Settings", icon: "settings" as const, tour: "nav-settings" },
];

export function WeddingLayout() {
  const { weddingId } = useParams<{ weddingId: string }>();
  const data = useQuery(api.weddings.get, weddingId ? { weddingId: weddingId as Id<"weddings"> } : "skip");
  const { signOut } = useAuthActions();
  const [walking, setWalking] = useState(false);

  // Shown once, and only once the wedding is actually on screen: a tour that points at
  // empty space explains nothing.
  useEffect(() => {
    if (!data || !shouldOfferWalkthrough()) return;
    const t = setTimeout(() => setWalking(true), 900);
    return () => clearTimeout(t);
  }, [data]);

  if (data === undefined) {
    return <div className="grid min-h-screen place-items-center text-muted">Loading your wedding…</div>;
  }
  if (data === null) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <p className="display text-xl">You don't have access to this wedding.</p>
          <Link to="/" className="btn-ghost mt-5">Back to my weddings</Link>
        </div>
      </div>
    );
  }
  const { wedding, role } = data;

  return (
    <div className="min-h-screen md:grid md:grid-cols-[252px_1fr]">
      <aside className="border-b border-line bg-cream md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-5 py-5 md:block">
          <Link to="/" className="display text-2xl tracking-tight text-accent" aria-label="PlusOne home">
            Plus<em>One</em>
          </Link>
          <UserChip className="mx-3 max-w-[10rem] md:mx-0 md:mt-4 md:flex md:max-w-none" />
          <button onClick={() => void signOut()} className="btn-quiet btn-sm gap-1.5 md:hidden">
            <Icon name="signout" size={15} />
            Sign out
          </button>
        </div>

        <div className="px-5 pb-5">
          <p className="display text-lg leading-tight">{wedding.name}</p>
          <p className="mt-1 text-xs text-quiet">
            {longDate(wedding.startDate)} · {wedding.city}
          </p>
        </div>

        <nav aria-label="Wedding sections" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-5">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              data-tour={"tour" in n ? n.tour : undefined}
              className={({ isActive }) =>
                `flex items-center gap-2.5 whitespace-nowrap rounded-[10px] px-3 py-2.5 text-sm transition ${
                  isActive ? "bg-accent-soft font-medium text-accent" : "text-ink hover:bg-accent-soft/60"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={n.icon} size={19} className={isActive ? "text-accent" : "text-muted"} />
                  {n.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="hidden px-5 pb-6 text-xs text-quiet md:block">
          <p>You are a <span className="font-medium text-ink">{role}</span></p>
          <button onClick={() => setWalking(true)} className="mt-2 block hover:text-accent">Show me around</button>
          <button onClick={() => void signOut()} className="btn-quiet btn-sm mt-4 w-full gap-1.5">
            <Icon name="signout" size={15} />
            Sign out
          </button>
        </div>
      </aside>

      <main id="main" className="min-w-0 px-5 py-8 md:px-8 md:py-10">
        <div className="page">
          <Outlet context={data} />
        </div>
      </main>

      {walking && <Walkthrough onClose={() => setWalking(false)} />}
    </div>
  );
}
