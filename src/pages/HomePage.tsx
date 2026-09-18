import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { longDate, money } from "../lib/format";
import { Icon } from "../components/ui/Icon";

/** The illustrations, used as the print inside each polaroid. */
const PLATES = ["/plate-1.jpg", "/plate-6.jpg", "/plate-3.jpg", "/plate-5.jpg", "/plate-4.jpg", "/plate-2.jpg"];
const TILTS = ["-2.5deg", "1.8deg", "-1.2deg", "2.4deg", "-1.9deg", "1.3deg"];

export function HomePage() {
  const mine = useQuery(api.weddings.listMine);
  const { signOut } = useAuthActions();
  const has = mine && mine.length > 0;

  return (
    <div className="min-h-screen bg-paper">
      {/* A wash of colour behind the top of the page, so it never reads as a blank sheet. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[460px] bg-[radial-gradient(120%_100%_at_15%_0%,var(--color-accent-soft)_0%,transparent_62%),radial-gradient(90%_80%_at_85%_0%,var(--color-sage)_0%,transparent_58%)]"
      />

      <main id="main" className="relative mx-auto w-full max-w-[74rem] px-5 py-8 md:px-8">
        <header className="flex items-center justify-between gap-4">
          <Link to="/" className="display text-2xl tracking-tight text-accent" aria-label="PlusOne home">
            Plus<em>One</em>
          </Link>
          <button onClick={() => void signOut()} className="text-sm text-muted hover:text-accent">
            Sign out
          </button>
        </header>

        {mine === undefined ? (
          <p className="mt-16 text-sm text-muted">Loading…</p>
        ) : !has ? (
          /* Nothing planned yet: the page carries the invitation, not an empty box. */
          <section className="mt-8 grid items-center gap-10 md:mt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:gap-16">
            <div className="max-w-[34rem]">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Your wedding, in one place</p>
              <h1 className="mt-3 text-[2.6rem] leading-[1.06] md:text-[3.2rem]">
                Let's plan <em>something lovely</em>
              </h1>
              <p className="mt-4 text-[1.05rem] leading-relaxed text-muted">
                Tell PlusOne about your celebration — the days, the guests, roughly what you'd like to spend. It lays out
                every function, splits the budget, finds the vendors each day needs and writes to them for you.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <Link to="/new" className="btn-primary">
                  Start planning <Icon name="arrow" size={17} />
                </Link>
                <p className="text-sm text-quiet">About two minutes.</p>
              </div>
              <ul className="mt-9 grid gap-2.5 text-sm text-muted sm:grid-cols-2">
                {[
                  "Every function, with its own guests and budget",
                  "Real vendors, read off their own websites",
                  "The top three ranked, with the reason why",
                  "Emails sent, chased and read for you",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <Icon name="check" size={15} className="mt-0.5 shrink-0 text-accent" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            <Collage />
          </section>
        ) : (
          <section className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-[2.4rem] leading-tight">
                  Your <em>weddings</em>
                </h1>
                <p className="mt-1.5 text-sm text-muted">
                  {mine.length === 1 ? "One celebration on the go." : `${mine.length} celebrations on the go.`}
                </p>
              </div>
            </div>

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
                      <span className="shrink-0 pb-0.5 text-[0.78rem] text-muted">{money(wedding.totalBudget, wedding.currency)}</span>
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
                  className="group flex h-full min-h-[15rem] flex-col items-center justify-center gap-2 rounded-[6px] border border-dashed border-rule bg-cream/60 p-6 text-center transition hover:border-accent hover:bg-accent-soft/40"
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
          </section>
        )}
      </main>
    </div>
  );
}

/** Three prints, pinned at slight angles, drifting very slowly. */
function Collage() {
  const cards = [
    { src: "/plate-1.jpg", cap: "The two of you", cls: "z-30 w-[62%] rotate-[-4deg]" },
    { src: "/plate-6.jpg", cap: "The party", cls: "z-20 ml-auto -mt-[22%] w-[58%] rotate-[5deg]" },
    { src: "/plate-5.jpg", cap: "Everyone who makes it happen", cls: "z-10 ml-[14%] -mt-[14%] w-[52%] rotate-[-2deg]" },
  ];
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[27rem] lg:-mt-8">
      {cards.map((c, i) => (
        <figure key={c.src} className={`polaroid relative ${c.cls}`} style={{ animationDelay: `${i * 140}ms` }}>
          <span className="block overflow-hidden rounded-[3px] bg-line">
            <img src={c.src} alt="" className="plate-img aspect-[4/5] w-full object-cover" />
          </span>
          <figcaption className="mt-2.5 truncate px-1 text-[0.72rem] text-quiet">{c.cap}</figcaption>
        </figure>
      ))}
    </div>
  );
}
