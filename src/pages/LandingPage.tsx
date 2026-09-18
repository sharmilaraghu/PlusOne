import { Link } from "react-router-dom";
import { AppPreview } from "../components/landing/AppPreview";
import { Icon } from "../components/landing/Icon";
import { steps } from "../components/landing/howItWorks";
import "../landing.css";

const days = [
  { name: "Mehndi", when: "Friday", guests: 80, note: "Henna artist quoted $850" },
  { name: "Sangeet", when: "Friday", guests: 150, note: "Caterer contacted" },
  { name: "Ceremony", when: "Saturday", guests: 200, note: "Photographer quoted $4,200" },
  { name: "Reception", when: "Sunday", guests: 220, note: "Venue booked" },
];

export function LandingPage() {

  return (
    <div className="lp">
      <a href="#main" className="lp-skip">Skip to content</a>
      <section className="hero" aria-labelledby="hero-title">
        <header className="hero__nav">
          <Link to="/" className="brand" aria-label="PlusOne home">
            Plus<em>One</em>
          </Link>
          <nav aria-label="Main" className="hero__links">
            <a href="#how" className="hero__link hero__link--how">How it works</a>
            <a href="#how" className="hero__link hero__link--tour">How it works</a>
          </nav>
          <Link to="/signin" className="pill pill--outline hero__signin">Sign in</Link>
          <Link to="/signin" className="hero__signin-text">Sign in</Link>
          <Link to="/signin?new=1" className="pill pill--wine hero__cta">Start planning</Link>
          <span className="hero__rule" aria-hidden="true" />
        </header>

        <main id="main" className="hero__body">
          <h1 id="hero-title" className="hero__title">
            Your AI copilot for{" "}
            <br />
            the <em>perfect</em> wedding.
          </h1>
          <p className="hero__lede">
            PlusOne finds your vendors, emails them from your own wedding inbox, reads every reply and keeps your budget honest.
          </p>
          <Link to="/signin?new=1" className="pill pill--wine hero__primary">Start planning</Link>
          <a href="#how" className="pill pill--outline hero__secondary">See how it works</a>
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

      <section className="sec sec--sage" aria-labelledby="days-title">
        <div className="wrap split">
          <div className="sec__head">
            <h2 id="days-title" className="h2">Every day of the celebration, <em>in one place</em></h2>
            <p className="sec__lede">Weddings are rarely one afternoon. Start from your tradition and PlusOne lays out each day with its own guests, budget and vendors.</p>
            <p className="traditions">Hindu · Muslim · Sikh · Western · Jewish · Fusion · your own</p>
          </div>
          <ul className="daylist" aria-label="Example celebration">
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
            <p className="quote__mail">“For your ceremony day our Single Day package is <strong>$4,200</strong> for eight hours, with a <strong>$500 deposit</strong> to hold the date.”</p>
            <dl className="quote__facts">
              <div><dt>Total</dt><dd>$4,200</dd></div>
              <div><dt>Deposit</dt><dd>$500</dd></div>
              <div><dt>Includes</dt><dd>8 hours, editing</dd></div>
            </dl>
            <p className="quote__added"><Icon name="check" size={16} /> Added to your budget</p>
            <p className="quote__example">Example</p>
          </div>
        </div>
      </section>

      <section className="sec sec--blush" aria-labelledby="together-title">
        <div className="wrap split">
          <div className="sec__head">
            <h2 id="together-title" className="h2">Plan <em>together</em></h2>
            <p className="sec__lede">Invite your partner, parents and wedding party with a link. Planners can search and send; family can simply watch the plan come together, live.</p>
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
            <p className="shared__live"><span className="shared__dot" aria-hidden="true" />Sam shortlisted Henna House <span className="shared__when">just now</span></p>
          </div>
        </div>
      </section>

      <section className="closing" aria-labelledby="close-title">
        <div className="wrap closing__inner">
          <h2 id="close-title" className="h2">Ready when <em>you are</em></h2>
          <p className="sec__lede">Describe your wedding in about two minutes, then let PlusOne start the legwork.</p>
          <div className="closing__actions">
            <Link to="/signin?new=1" className="pill pill--wine btn-lg">Start planning</Link>
            <a href="#how" className="pill pill--outline btn-lg">How it works</a>
          </div>
        </div>
      </section>

      <footer className="foot">
        <div className="wrap foot__inner">
          <p className="brand brand--static">Plus<em>One</em></p>
          <p>Built for the Convex All Gas Hackathon with Convex, OpenAI, Firecrawl and AgentMail.</p>
        </div>
      </footer>

    </div>
  );
}
