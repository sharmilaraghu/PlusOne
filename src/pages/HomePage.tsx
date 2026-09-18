import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { longDate, money } from "../lib/format";
import { Icon } from "../components/ui/Icon";
import { PrintWall } from "../components/PrintWall";

/** The print inside each wedding's polaroid, in the order they were planned. */
const PLATES = ["/plate-1.jpg", "/plate-6.jpg", "/plate-5.jpg", "/plate-4.jpg", "/plate-2.jpg", "/plate-9.jpg"];
const TILTS = ["-2.5deg", "1.8deg", "-1.2deg", "2.4deg", "-1.9deg", "1.3deg"];

export function HomePage() {
  const mine = useQuery(api.weddings.listMine);
  const { signOut } = useAuthActions();
  const has = mine && mine.length > 0;

  if (mine === undefined) {
    return <div className="grid min-h-[100dvh] place-items-center bg-paper text-sm text-muted">Loading…</div>;
  }

  /* Nothing planned yet: one held moment, the whole window, nothing to scroll past. */
  if (!has) {
    return (
      <div className="relative h-[100dvh] overflow-hidden bg-paper">
        <PrintWall />

        <div className="relative flex h-full flex-col">
          <Header onSignOut={() => void signOut()} />

          <main id="main" className="flex min-h-0 flex-1 items-center justify-center px-5 pb-8">
            <div className="w-full max-w-[36rem] rounded-[18px] border border-line bg-cream px-6 py-7 text-center shadow-[0_30px_70px_-28px_rgba(70,35,35,0.55)] md:px-10 md:py-10">
              <h1 className="text-[2.2rem] leading-[1.05] md:text-[2.8rem]">
                Let's plan <em>something lovely</em>
              </h1>
              <p className="mx-auto mt-3.5 max-w-[30rem] text-[0.95rem] leading-relaxed text-muted md:text-base">
                Tell PlusOne about your day — who is coming, roughly what you would like to spend — and it lays out the
                plan, finds your vendors, and writes to them for you.
              </p>

              <Link to="/new" className="btn-primary mt-6">
                Start planning <Icon name="arrow" size={17} />
              </Link>
              <p className="mt-3 text-sm text-quiet">About two minutes, and you can change all of it later.</p>

              <ul className="mx-auto mt-7 grid max-w-[30rem] gap-2 border-t border-line pt-5 text-left text-[0.86rem] leading-snug text-muted sm:grid-cols-2 sm:gap-x-5 sm:gap-y-2.5 sm:text-sm">
                {[
                  "Every day, with its own guests and budget",
                  "Real vendors, read off their own sites",
                  "The best three, and why",
                  "Emails sent, chased and read for you",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <Icon name="check" size={15} className="mt-0.5 shrink-0 text-accent" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-paper">
      <PrintWall count={28} quiet />
      <div className="relative mx-auto w-full max-w-[74rem]">
        <Header onSignOut={() => void signOut()} />

        <main id="main" className="px-5 pb-14 md:px-8">
          <h1 className="mt-4 text-[2.4rem] leading-tight">
            Your <em>weddings</em>
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {mine.length === 1 ? "One celebration on the go." : `${mine.length} celebrations on the go.`}
          </p>

          <ul className="mt-9 grid gap-x-8 gap-y-11 sm:grid-cols-2 lg:grid-cols-3">
            {mine.map(({ wedding, role }, i) => (
              <li key={wedding._id}>
                <Link
                  to={`/w/${wedding._id}`}
                  className="polaroid group relative hover:-translate-y-1.5 hover:rotate-0 hover:shadow-[0_26px_50px_-20px_rgba(70,35,35,0.5)]"
                  style={{ transform: `rotate(${TILTS[i % TILTS.length]})` }}
                >
                  <span className="block overflow-hidden rounded-[3px] bg-line">
                    <img
                      src={PLATES[i % PLATES.length]}
                      alt=""
                      loading="lazy"
                      className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                    />
                  </span>
                  <span className="mt-3 flex items-end justify-between gap-3 px-1">
                    <span className="min-w-0">
                      <span className="block truncate display text-[1.2rem] leading-tight">{wedding.name}</span>
                      <span className="block truncate text-[0.78rem] text-quiet">
                        {longDate(wedding.startDate)} · {wedding.city}
                      </span>
                    </span>
                    <span className="shrink-0 pb-0.5 text-[0.78rem] text-muted">
                      {money(wedding.totalBudget, wedding.currency)}
                    </span>
                  </span>
                  {role !== "owner" && (
                    <span className="absolute right-3.5 top-3.5 rounded-full bg-cream/90 px-2 py-0.5 text-[11px] text-muted">
                      {role}
                    </span>
                  )}
                </Link>
              </li>
            ))}

            <li>
              <Link
                to="/new"
                className="group flex h-full min-h-[15rem] flex-col items-center justify-center gap-2 rounded-[6px] border border-dashed border-rule bg-cream/85 p-6 text-center transition hover:border-accent hover:bg-accent-soft/40"
              >
                <span className="grid h-11 w-11 place-items-center rounded-full bg-accent-soft text-accent transition group-hover:bg-accent group-hover:text-paper">
                  <Icon name="plus" size={19} />
                </span>
                <span className="display text-[1.15rem]">Plan another</span>
                <span className="max-w-[16rem] text-[0.82rem] leading-relaxed text-quiet">
                  A second celebration, a family member's, or a weekend away.
                </span>
              </Link>
            </li>
          </ul>
        </main>
      </div>
    </div>
  );
}

function Header({ onSignOut }: { onSignOut: () => void }) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-4 px-5 py-6 md:px-8">
      <Link to="/" className="display text-2xl tracking-tight text-accent" aria-label="PlusOne home">
        Plus<em>One</em>
      </Link>
      <button onClick={onSignOut} className="text-sm text-muted transition hover:text-accent">
        Sign out
      </button>
    </header>
  );
}
