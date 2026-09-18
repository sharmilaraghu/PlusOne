import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { longDate, money } from "../lib/format";
import { EmptyState } from "../components/ui/EmptyState";
import { Icon } from "../components/ui/Icon";

export function HomePage() {
  const mine = useQuery(api.weddings.listMine);
  const { signOut } = useAuthActions();

  return (
    <main id="main" className="mx-auto w-full max-w-[46rem] px-5 py-10">
      <header className="flex items-center justify-between gap-4">
        <Link to="/" className="display text-2xl tracking-tight text-accent" aria-label="PlusOne home">
          Plus<em>One</em>
        </Link>
        <button onClick={() => void signOut()} className="text-sm text-muted hover:text-accent">Sign out</button>
      </header>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-[2.2rem] leading-tight">Your weddings</h1>
          {mine && mine.length > 0 && (
            <Link to="/new" className="btn-primary">
              Plan another <Icon name="arrow" size={17} />
            </Link>
          )}
        </div>

        {mine === undefined ? (
          <p className="mt-6 text-sm text-muted">Loading…</p>
        ) : mine.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon="heart"
              title="Nothing here yet"
              body="Tell PlusOne about your celebration and it lays out every day, splits the budget and lists the vendors to find."
              action={<Link to="/new" className="btn-primary">Start planning</Link>}
            />
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {mine.map(({ wedding, role }) => (
              <li key={wedding._id} className="card rise">
                <Link to={`/w/${wedding._id}`} className="block p-5 transition hover:bg-accent-soft/40">
                  <p className="display text-xl">{wedding.name}</p>
                  <p className="mt-1 text-sm text-muted">
                    {longDate(wedding.startDate)} · {wedding.city}
                  </p>
                  <p className="mt-4 text-sm text-muted">
                    Budget <span className="text-ink">{money(wedding.totalBudget, wedding.currency)}</span>
                  </p>
                  <span className="chip-quiet mt-3">{role}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
