import { Link } from "react-router-dom";

const steps = [
  { t: "Describe the celebration", d: "Partners, dates, city, tradition and budget. PlusOne lays out each day, splits the budget and lists the vendors you'll need." },
  { t: "Research from the open web", d: "Ask for “documentary photographers in Austin under $3,500”. PlusOne reads real vendor websites and turns them into cards with prices, packages and a source link for every fact." },
  { t: "Email from your wedding inbox", d: "Pick vendors, review the personalised drafts, send. Replies land in your inbox, quotes are extracted, and the budget moves on its own." },
  { t: "Never chase again", d: "Silent vendors get a polite nudge after three days. Guests reply to invites in plain words and the guest list updates itself." },
];

export function HowItWorksPage() {
  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/" className="display text-2xl tracking-tight">
        Plus<span className="text-accent">One</span>
      </Link>
      <h1 className="mt-6 text-3xl">How PlusOne works</h1>
      <ol className="mt-6 space-y-4">
        {steps.map((s, i) => (
          <li key={s.t} className="card flex gap-4 p-5">
            <span className="display text-3xl text-accent">{i + 1}</span>
            <div>
              <h2 className="text-lg">{s.t}</h2>
              <p className="mt-1 text-sm text-muted">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-8 text-sm text-muted">
        Under the hood: Convex keeps everything live for everyone on the plan, OpenAI reads and writes, Firecrawl reads vendor websites, and AgentMail runs the wedding inbox.
      </p>
      <Link to="/" className="btn-primary mt-6">Start planning</Link>
    </main>
  );
}
