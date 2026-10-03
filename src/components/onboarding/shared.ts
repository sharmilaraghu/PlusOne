import { SUGGESTED_CATEGORIES, eventsFor, slotsFor, splitByWeights } from "../../../convex/lib/templates";
import type { CultureTemplate, EventType } from "../../../convex/lib/validators";
import { addDaysIso, daysBetweenIso } from "../../lib/format";

export type FunctionRow = { key: string; name: string; date: string; guestCount: number; budget: number };

export const TRADITIONS: { id: CultureTemplate; name: string; days: string; blurb: string }[] = [
  { id: "western", name: "Western", days: "Rehearsal dinner · Ceremony · Reception", blurb: "The classic wedding weekend, church or garden." },
  { id: "jewish", name: "Jewish", days: "Shabbat dinner · Chuppah & reception · Sheva Brachot", blurb: "From Friday night through the week of blessings." },
  { id: "hindu", name: "Hindu", days: "Mehndi · Sangeet · Haldi · Ceremony · Reception", blurb: "Gujarati, Punjabi, South Indian, Bengali and more." },
  { id: "muslim", name: "Muslim", days: "Mehndi · Nikah · Walima", blurb: "Officiants and vendors who know Islamic traditions." },
  { id: "sikh", name: "Sikh", days: "Mehndi · Sangeet · Anand Karaj · Reception", blurb: "Gurdwara ceremony plus the celebrations around it." },
  { id: "fusion", name: "Fusion", days: "Welcome party · Ceremony 1 · Ceremony 2 · Reception", blurb: "Two families, two traditions, one plan." },
  { id: "custom", name: "Custom", days: "Name your own days", blurb: "Start from one ceremony and add as many as you like." },
];

export const VIBES = [
  "Intimate", "Grand", "Traditional", "Modern", "Outdoors", "Candlelit",
  "Colourful", "Minimal", "Relaxed", "Glamorous", "Rustic", "Beachside",
];

export const CURRENCIES = ["USD", "INR", "GBP", "EUR", "CAD", "AUD", "AED", "SGD"];

/** Prefill the days from the kind of occasion (and a wedding's tradition), spread across the dates. */
export function rowsForTemplate(template: CultureTemplate, startDate: string, endDate: string, totalBudget: number, eventType?: EventType): FunctionRow[] {
  const events = eventsFor(eventType, template);
  const span = Math.max(0, daysBetweenIso(startDate, endDate));
  const budgets = splitByWeights(totalBudget, events.map((e) => e.weight));
  return events.map((e, i) => ({
    key: `${eventType ?? "wedding"}-${template}-${i}-${e.name}`,
    name: e.name,
    date: addDaysIso(startDate, events.length <= span + 1 ? i : Math.min(span, i)),
    guestCount: e.guestCount,
    budget: budgets[i],
  }));
}

export function rebalance(rows: FunctionRow[], total: number): FunctionRow[] {
  const shares = splitByWeights(total, rows.map((r) => Math.max(1, r.budget)));
  return rows.map((r, i) => ({ ...r, budget: shares[i] }));
}

/**
 * One row per vendor the host might need, prefilled from the kind of occasion.
 *
 * "Booked" is the useful half: couples usually have a venue long before they have a
 * planner, and without asking, PlusOne would research and email the venue they signed
 * with a year ago while the budget bar claimed nothing was committed.
 */
export type NeedRow = {
  key: string;
  category: string;
  title: string;
  pct?: number;
  eventNames?: string[];
  /** "looking" is the default; "none" means they don't want this at all. */
  state: "looking" | "booked" | "none";
  /** What they have already spent on a booked one, when they know it. */
  committed: number | "";
};

export function needsForTemplate(template: CultureTemplate, eventType?: EventType): NeedRow[] {
  return slotsFor(eventType, template).map((s, i) => ({
    key: `tpl-${i}-${s.title}`,
    category: s.category,
    title: s.title,
    pct: s.pct,
    eventNames: s.eventNames,
    state: "looking" as const,
    committed: "" as const,
  }));
}

/** Suggestions that only make sense where there is a ceremony. */
const CEREMONY_ONLY = new Set(["Ceremony musicians", "Celebrant or officiant"]);

/** The extras a host can add on top of the starting list. */
export function extraNeeds(existing: NeedRow[], eventType?: EventType): { category: string; title: string; hint: string }[] {
  const taken = new Set(existing.map((n) => n.title.toLowerCase()));
  const wedding = !eventType || eventType === "wedding";
  return SUGGESTED_CATEGORIES.filter((c) => !taken.has(c.title.toLowerCase()) && (wedding || !CEREMONY_ONLY.has(c.title)));
}
