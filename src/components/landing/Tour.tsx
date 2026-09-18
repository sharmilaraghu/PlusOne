import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "./Icon";

export const steps = [
  {
    icon: "heart" as const,
    title: "Describe your wedding",
    line: "Date, city, tradition, guests and budget.",
    body: "Tell PlusOne about the celebration in about two minutes. It lays out each day, from Mehndi to reception, splits your budget, and lists the vendors every day needs.",
    example: ["Priya & Sam · 14–16 March", "Mehndi · Sangeet · Ceremony · Reception", "Budget $60,000 across 4 days"],
  },
  {
    icon: "search" as const,
    title: "Find vendors",
    line: "We read real vendor websites.",
    body: "Ask in plain words, like “a henna artist in Austin under $1,000”. PlusOne searches the web, reads each vendor's own site, and brings back prices, packages and an email address, with a link to where every price came from.",
    example: ["Henna House · from $850", "Source: their prices page", "Email found"],
  },
  {
    icon: "send" as const,
    title: "Contact them",
    line: "Emails sent from your wedding inbox.",
    body: "Pick the vendors you like. PlusOne drafts a personal email to each one with your dates and questions. You read and approve every email before it is sent from your own wedding address.",
    example: ["To: Lumen & Lace Photography", "Photography for our wedding, 14 March", "Approve & send"],
  },
  {
    icon: "reply" as const,
    title: "Compare quotes",
    line: "Replies read, budget updated.",
    body: "When vendors reply, PlusOne reads the email, pulls out the price, deposit and what is included, and adds it to your budget. Vendors who go quiet get a polite follow-up after three days.",
    example: ["Lumen & Lace replied · $4,200", "$500 deposit · 8 hours", "Committed $22,550 of $60,000"],
  },
  {
    icon: "check" as const,
    title: "Decide",
    line: "Mark the one you love as booked.",
    body: "See quotes side by side, pass on the rest, and mark your choice as booked. Your partner and family see every change the moment it happens.",
    example: ["Mercer Hall · Booked", "Sam and Mum can see this", "Next up: book a caterer"],
  },
];

export function Tour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [i, setI] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) { setI(0); d.showModal(); }
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setI((x) => Math.min(steps.length - 1, x + 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const s = steps[i];
  const last = i === steps.length - 1;

  return (
    <dialog ref={dialog} className="tour" aria-labelledby="tour-title" onClose={onClose} onCancel={onClose}>
      <div className="tour__top">
        <p className="tour__count">Step {i + 1} of {steps.length}</p>
        <button type="button" className="tour__close" onClick={onClose} aria-label="Close the tour">
          <Icon name="close" size={20} />
        </button>
      </div>
      <ol className="tour__dots" aria-hidden="true">
        {steps.map((_, k) => <li key={k} className={k === i ? "is-on" : k < i ? "is-done" : ""} />)}
      </ol>
      <div className="tour__body" key={i}>
        <span className="tour__icon"><Icon name={s.icon} size={26} /></span>
        <h2 id="tour-title" className="tour__title">{s.title}</h2>
        <p className="tour__text">{s.body}</p>
        <ul className="tour__example" aria-label="Example">
          {s.example.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </div>
      <div className="tour__actions">
        <button type="button" className="pill pill--outline tour__btn" onClick={() => setI(i - 1)} disabled={i === 0}>Back</button>
        {last ? (
          <Link to="/signin?new=1" className="pill pill--wine tour__btn" onClick={onClose}>Start planning</Link>
        ) : (
          <button type="button" className="pill pill--wine tour__btn" onClick={() => setI(i + 1)}>Next</button>
        )}
      </div>
    </dialog>
  );
}
