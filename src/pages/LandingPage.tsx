import { Link } from "react-router-dom";
import { AppPreview } from "../components/landing/AppPreview";
import { Icon } from "../components/landing/Icon";
import { steps } from "../components/landing/howItWorks";
import { WEDDING_SITE } from "../lib/sites";
import "../landing.css";

const days = [
  { name: "Welcome drinks", when: "Friday", guests: 30, note: "Bar quoted $380" },
  { name: "Dinner", when: "Saturday", guests: 40, note: "Photographer quoted $600" },
  { name: "The party", when: "Saturday", guests: 60, note: "Venue booked" },
  { name: "Brunch", when: "Sunday", guests: 25, note: "Caterer contacted" },
];

export function LandingPage() {

  return (
    <div className="lp">
      <a href="#main" className="lp-skip">Skip to content</a>
      <section className="hero" aria-labelledby="hero-title">
        {/* Scenes from different occasions, drifting behind the promise. Paused for reduced motion. */}
        <div className="hero__reel" aria-hidden="true">
          {["/plate-4.jpg", "/plate-6.jpg", "/plate-3.jpg", "/plate-8.jpg"].map((src, i) => (
            <img key={src} src={src} alt="" style={{ animationDelay: `${i * 7}s` }} loading={i === 0 ? "eager" : "lazy"} />
          ))}
          <span className="hero__reel-veil" />
        </div>
        <header className="hero__nav">
          <Link to="/" className="brand" aria-label="PlusOne for All home">
            Plus<em>One</em><span className="brand-for">for All</span>
          </Link>
          <Link to="/signin" className="pill pill--outline hero__signin">Sign in</Link>
          <Link to="/signin" className="hero__signin-text">Sign in</Link>
          <Link to="/signin?new=1" className="pill pill--solid hero__cta">Start planning</Link>
          <span className="hero__rule" aria-hidden="true" />
        </header>

        <main id="main" className="hero__body">
          <h1 id="hero-title" className="hero__title">
            Your AI copilot for{" "}
            <br />
            <em>every</em> occasion.
          </h1>
          <p className="hero__lede">
            PlusOne finds your vendors, emails them from your event's own inbox, reads every reply and keeps your budget honest.
          </p>
          <Link to="/signin?new=1" className="pill pill--solid hero__primary">Start planning</Link>
          <Link to="/demo" className="pill pill--outline hero__secondary">See the demo</Link>
          <span className="hero__band" aria-hidden="true" />
          <AppPreview />
        </main>
      </section>

      <section id="how" className="sec sec--ivory" aria-labelledby="how-title">
        <div className="wrap">
          <div className="sec__head sec__head--center">
            <h2 id="how-title" className="h2">Five calm steps, <em>start to booked</em></h2>
            <p className="sec__lede">You make the decisions. PlusOne does the searching, writing, reading and chasing in between.</p>
          </div>
          <ol className="steps">
            {steps.map((s, i) => (
              <li key={s.title} className="step">
                <span className="step__num">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="step__title">{s.title}</h3>
                <p className="step__line">{s.line}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="days" className="sec sec--sage" aria-labelledby="days-title">
        <div className="wrap split">
          <div className="sec__head">
            <h2 id="days-title" className="h2">Every part of the occasion, <em>in one place</em></h2>
            <p className="sec__lede">One evening or a whole weekend. PlusOne lays out each part with its own guests, budget and vendors.</p>
            <p className="traditions">Birthdays · Anniversaries · Baby showers · Graduations · Team events · Parties</p>
            <p className="traditions traditions--aside">
              Planning a wedding? <a href={WEDDING_SITE} className="lp-footer__link">PlusOne for weddings</a> is built just for that.
            </p>
          </div>
          <ul className="daylist" aria-label="Example weekend">
            {days.map((d) => (
              <li key={d.name} className="day">
                <span className="day__when">{d.when}</span>
                <span className="day__name">{d.name}</span>
                <span className="day__meta">{d.guests} guests · {d.note}</span>
              </li>
            ))}
            <li className="daylist__label">Example</li>
          </ul>
        </div>
      </section>

      <section className="sec sec--ivory" aria-labelledby="source-title">
        <div className="wrap split split--reverse">
          <div className="sec__head">
            <h2 id="source-title" className="h2">Every price shows <em>where it came from</em></h2>
            <p className="sec__lede">No mystery numbers. Quotes link back to the reply they arrived in, and prices link to the vendor page they were read from, so you can check before you book.</p>
          </div>
          <div className="quote" aria-label="Example quote">
            <p className="quote__from"><Icon name="mail" size={18} /> Reply from Lumen &amp; Lace Photography</p>
            <p className="quote__mail">“For your dinner our Evening package is <strong>$600</strong> for three hours, with a <strong>$100 deposit</strong> to hold the date.”</p>
            <dl className="quote__facts">
              <div><dt>Total</dt><dd>$600</dd></div>
              <div><dt>Deposit</dt><dd>$100</dd></div>
              <div><dt>Includes</dt><dd>3 hours, editing</dd></div>
            </dl>
            <p className="quote__added"><Icon name="check" size={16} /> Added to your budget</p>
            <p className="quote__example">Example</p>
          </div>
        </div>
      </section>

      <section className="sec sec--wash" aria-labelledby="together-title">
        <div className="wrap split">
          <div className="sec__head">
            <h2 id="together-title" className="h2">Plan <em>together</em></h2>
            <p className="sec__lede">Invite whoever you're planning with by sending a link. Planners can search and send; everyone else can simply watch the plan come together, live.</p>
          </div>
          <div className="shared" aria-label="Example shared plan">
            <p className="shared__example">Example</p>
            <ul className="shared__people">
              {[
                { who: "Priya", initials: "P", role: "Owner" },
                { who: "Sam", initials: "S", role: "Planner" },
                { who: "Mum", initials: "M", role: "Viewer" },
              ].map((p) => (
                <li key={p.who}>
                  <span className="shared__avatar" aria-hidden="true">{p.initials}</span>
                  <span className="shared__who">{p.who}</span>
                  <span className="shared__role">{p.role}</span>
                </li>
              ))}
            </ul>
            <p className="shared__live"><span className="shared__dot" aria-hidden="true" />Sam shortlisted Wildrose Florals <span className="shared__when">just now</span></p>
          </div>
        </div>
      </section>

      <section className="closing" aria-labelledby="close-title">
        <div className="wrap closing__inner">
          <h2 id="close-title" className="h2">Ready when <em>you are</em></h2>
          <p className="sec__lede">Describe your event in about two minutes, then let PlusOne start the legwork.</p>
          <div className="closing__actions">
            <Link to="/signin?new=1" className="pill pill--solid btn-lg">Start planning</Link>
          </div>
        </div>
      </section>

      <footer className="foot">
        <div className="wrap foot__inner">
          <p className="brand brand--static">Plus<em>One</em><span className="brand-for">for All</span></p>
          <p>
            <Link to="/how-it-works" className="lp-footer__link">How it works</Link>
            <span aria-hidden="true"> · </span>
            <Link to="/privacy" className="lp-footer__link">Privacy</Link>
            <span aria-hidden="true"> · </span>
            <a href={WEDDING_SITE} className="lp-footer__link">Planning a wedding?</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
