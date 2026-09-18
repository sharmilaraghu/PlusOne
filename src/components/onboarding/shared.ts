import { SUGGESTED_CATEGORIES, TEMPLATE_EVENTS, defaultSlotsFor, splitByWeights } from "../../../convex/lib/templates";
import type { CultureTemplate } from "../../../convex/lib/validators";
import { addDaysIso, daysBetweenIso } from "../../lib/format";

export type FunctionRow = { key: string; name: string; date: string; guestCount: number; budget: number };

export const TRADITIONS: { id: CultureTemplate; name: string; days: string; blurb: string }[] = [
  { id: "hindu", name: "Hindu", days: "Mehndi · Sangeet · Haldi · Ceremony · Reception", blurb: "Gujarati, Punjabi, South Indian, Bengali and more." },
  { id: "muslim", name: "Muslim", days: "Mehndi · Nikah · Walima", blurb: "Officiants and vendors who know Islamic traditions." },
  { id: "sikh", name: "Sikh", days: "Mehndi · Sangeet · Anand Karaj · Reception", blurb: "Gurdwara ceremony plus the celebrations around it." },
  { id: "western", name: "Western", days: "Rehearsal dinner · Ceremony · Reception", blurb: "Classic three-part weekend." },
  { id: "jewish", name: "Jewish", days: "Shabbat dinner · Chuppah & reception · Sheva Brachot", blurb: "From Friday night through the week of blessings." },
  { id: "fusion", name: "Fusion", days: "Welcome party · Ceremony 1 · Ceremony 2 · Reception", blurb: "Two families, two traditions, one plan." },
  { id: "custom", name: "Custom", days: "Name your own days", blurb: "Start from one ceremony and add as many as you like." },
];

export const VIBES = [
  "Intimate", "Grand", "Traditional", "Modern", "Outdoors", "Candlelit",
  "Colourful", "Minimal", "Relaxed", "Glamorous", "Rustic", "Beachside",
];

export const CURRENCIES = ["USD", "INR", "GBP", "EUR", "CAD", "AUD", "AED", "SGD"];

/** Prefill the function rows from a tradition, spread across the couple's dates. */
export function rowsForTemplate(template: CultureTemplate, startDate: string, endDate: string, totalBudget: number): FunctionRow[] {
  const events = TEMPLATE_EVENTS[template] ?? TEMPLATE_EVENTS.custom;
  const span = Math.max(0, daysBetweenIso(startDate, endDate));
  const budgets = splitByWeights(totalBudget, events.map((e) => e.weight));
  return events.map((e, i) => ({
    key: `${template}-${i}-${e.name}`,
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
 * One row per vendor the couple might need, prefilled from their tradition.
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

export function needsForTemplate(template: CultureTemplate): NeedRow[] {
  return defaultSlotsFor(template).map((s, i) => ({
    key: `tpl-${i}-${s.title}`,
    category: s.category,
    title: s.title,
    pct: s.pct,
    eventNames: s.eventNames,
    state: "looking" as const,
    committed: "" as const,
  }));
}

/** The extras a couple can add on top of their tradition's list. */
export function extraNeeds(existing: NeedRow[]): { category: string; title: string; hint: string }[] {
  const taken = new Set(existing.map((n) => n.title.toLowerCase()));
  return SUGGESTED_CATEGORIES.filter((c) => !taken.has(c.title.toLowerCase()));
}
