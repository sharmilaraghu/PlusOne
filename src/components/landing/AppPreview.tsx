import thumb1 from "../../../assets/plates/thumb-1.jpg";
import thumb2 from "../../../assets/plates/thumb-2.jpg";
import thumb3 from "../../../assets/plates/thumb-3.jpg";
import thumb4 from "../../../assets/plates/thumb-4.jpg";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";

// Generation prompts for the first two sit beside them in assets/plates/*.prompt.txt.
const rows = [
  { thumb: thumb1, name: "Lumen & Lace Photography", day: "Dinner", status: "Quote received", tone: "sage", price: "$600" },
  { thumb: thumb2, name: "Wildrose Florals", day: "Dinner", status: "Quote received", tone: "sage", price: "$420" },
  { thumb: thumb3, name: "The Long Table", day: "Dinner", status: "Email sent", tone: "quiet", price: "" },
  { thumb: thumb4, name: "Mercer Hall", day: "All days", status: "Booked", tone: "sage", price: "" },
];

export function AppPreview() {
  // Signature moment: a vendor reply lands, its row updates and the budget grows.
  const [landed, setLanded] = useState(true);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setLanded(false);
    const t = window.setTimeout(() => setLanded(true), 1400);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <>
      <figure className={`ap${landed ? " is-landed" : ""}`} aria-labelledby="ap-caption">
        <figcaption id="ap-caption" className="sr-only">
          Example of the PlusOne app: four vendors with their status, two quotes received, and a committed budget of $3,870 of $8,000.
        </figcaption>
        <div className="ap__side" aria-hidden="true">
          <p className="ap__logo">
            Plus<em>One</em>
          </p>
          <ul className="ap__nav">
            <li className="is-active"><Icon name="home" /> Overview</li>
            <li><Icon name="search" /> Vendors</li>
            <li><Icon name="check" /> Decisions</li>
            <li><Icon name="mail" /> Inbox</li>
            <li><Icon name="people" /> Guests</li>
          </ul>
        </div>
        <div className="ap__main" aria-hidden="true">
          <p className="ap__example">Example</p>
          <p className="ap__title">Your vendors</p>
          <ul className="ap__table">
            {rows.map((r) => (
              <li key={r.name} className={`ap__row${r.name === "Wildrose Florals" ? " ap__row--live" : ""}`}>
                <span className="ap__thumbwrap"><span className="ap__thumbclip"><img className="ap__thumb" src={r.thumb} alt="" width={80} height={76} /></span></span>
                <span className="ap__name">{r.name}</span>
                <span className="ap__day">{r.day}</span>
                {r.name === "Wildrose Florals" && !landed ? (
                  <span className="ap__pill ap__pill--quiet">Email sent</span>
                ) : (
                  <span className={`ap__pill ap__pill--${r.tone}${r.name === "Wildrose Florals" ? " ap__pill--pop" : ""}`}>{r.status}</span>
                )}
                <span className="ap__price">{r.name === "Wildrose Florals" && !landed ? "" : r.price}</span>
              </li>
            ))}
          </ul>
          <div className="ap__budget">
            <p>Committed $3,870 of $8,000</p>
            <div className="ap__track"><span /></div>
          </div>
        </div>
      </figure>
      <div className={`ap-notif${landed ? " is-landed" : ""}`} aria-hidden="true">
        <span className="ap-notif__icon"><Icon name="mail" /><i /></span>
        <p>New reply from Wildrose Florals — quote added to your budget</p>
      </div>
    </>
  );
}
