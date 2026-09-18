import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { longDate, money } from "../lib/format";

export function HomePage() {
  const mine = useQuery(api.weddings.listMine);
  const { signOut } = useAuthActions();

  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-10">
      <header className="flex items-center justify-between">
        <p className="display text-2xl tracking-tight">
          Plus<span className="text-accent">One</span>
        </p>
        <div className="flex items-center gap-3 text-sm">
          <Link to="/how-it-works" className="text-muted hover:text-ink">How it works</Link>
          <button onClick={() => void signOut()} className="text-muted hover:text-ink">Sign out</button>
        </div>
      </header>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-3xl">Your weddings</h1>
          <Link to="/new" className="btn-primary">Plan a wedding</Link>
        </div>

        {mine === undefined ? (
          <p className="mt-6 text-muted">Loading…</p>
        ) : mine.length === 0 ? (
          <div className="card mt-6 p-8 text-center">
            <p className="display text-2xl">Nothing here yet.</p>
            <p className="mt-2 text-muted">Tell us about the celebration and PlusOne will lay out the days, the budget and the vendors to find.</p>
            <Link to="/new" className="btn-primary mt-6">Plan our wedding</Link>
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {mine.map(({ wedding, role }) => (
              <li key={wedding._id} className="card rise p-5">
                <Link to={`/w/${wedding._id}`} className="block">
                  <p className="display text-xl">{wedding.name}</p>
                  <p className="mt-1 text-sm text-muted">
                    {longDate(wedding.startDate)} · {wedding.city}
                  </p>
                  <p className="mt-3 text-sm">Budget {money(wedding.totalBudget, wedding.currency)}</p>
                  <span className="chip mt-3 bg-sand text-muted">{role}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
