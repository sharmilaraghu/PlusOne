import type { CultureTemplate, EventType } from "./validators";

export type TemplateEvent = {
  name: string;
  /** Relative share of the total budget. */
  weight: number;
  /** Default guest count. */
  guestCount: number;
  description?: string;
};

export type TemplateSlot = {
  category: string;
  title: string;
  /** Percent of totalBudget planned for this slot. */
  pct: number;
  /** Restrict to events whose name matches one of these; all events when omitted. */
  eventNames?: string[];
};

export const EVENT_COLORS = [
  "#e11d48", // rose
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
];

const SOUTH_ASIAN: CultureTemplate[] = ["hindu", "muslim", "sikh"];

export const TEMPLATE_EVENTS: Record<CultureTemplate, TemplateEvent[]> = {
  hindu: [
    { name: "Mehndi", weight: 1, guestCount: 60, description: "Henna, music and snacks for close family and friends." },
    { name: "Sangeet", weight: 2.5, guestCount: 150, description: "Music, dance performances and dinner." },
    { name: "Haldi", weight: 0.7, guestCount: 50, description: "Turmeric ceremony, usually at home, morning." },
    { name: "Ceremony", weight: 3, guestCount: 200, description: "Baraat, mandap ceremony and lunch." },
    { name: "Reception", weight: 3, guestCount: 250, description: "Evening reception with dinner and dancing." },
  ],
  muslim: [
    { name: "Mehndi", weight: 1.5, guestCount: 80, description: "Henna night with music and dinner." },
    { name: "Nikah", weight: 3, guestCount: 200, description: "Nikah ceremony followed by a meal." },
    { name: "Walima", weight: 3.5, guestCount: 250, description: "Reception hosted by the groom's family." },
  ],
  sikh: [
    { name: "Mehndi", weight: 1, guestCount: 60 },
    { name: "Sangeet", weight: 2.5, guestCount: 150 },
    { name: "Anand Karaj", weight: 2.5, guestCount: 200, description: "Ceremony at the Gurdwara followed by langar." },
    { name: "Reception", weight: 3, guestCount: 250 },
  ],
  western: [
    { name: "Rehearsal Dinner", weight: 1, guestCount: 40 },
    { name: "Ceremony", weight: 2, guestCount: 120 },
    { name: "Reception", weight: 4, guestCount: 120 },
  ],
  jewish: [
    { name: "Shabbat Dinner", weight: 1, guestCount: 50 },
    { name: "Ceremony & Reception (Chuppah)", weight: 5, guestCount: 150 },
    { name: "Sheva Brachot", weight: 1, guestCount: 40 },
  ],
  fusion: [
    { name: "Welcome Party", weight: 1, guestCount: 80 },
    { name: "Ceremony 1", weight: 2, guestCount: 150 },
    { name: "Ceremony 2", weight: 2, guestCount: 150 },
    { name: "Reception", weight: 3, guestCount: 200 },
  ],
  custom: [{ name: "Ceremony", weight: 1, guestCount: 100 }],
};

/** The days of every occasion that is not a wedding. Most are one day; all can be added to. */
export const TYPE_EVENTS: Record<Exclude<EventType, "wedding">, TemplateEvent[]> = {
  engagement: [{ name: "Engagement party", weight: 1, guestCount: 60 }],
  birthday: [{ name: "Birthday party", weight: 1, guestCount: 40 }],
  anniversary: [{ name: "Anniversary dinner", weight: 1, guestCount: 50 }],
  baby_shower: [{ name: "Baby shower", weight: 1, guestCount: 30 }],
  graduation: [{ name: "Graduation party", weight: 1, guestCount: 50 }],
  corporate: [{ name: "Team event", weight: 1, guestCount: 40 }],
  party: [{ name: "Party", weight: 1, guestCount: 40 }],
};

/** Who each kind of occasion usually needs, with a share of the budget for each. */
export const TYPE_SLOTS: Record<Exclude<EventType, "wedding">, TemplateSlot[]> = {
  engagement: [
    { category: "Venue", title: "Venue", pct: 30 },
    { category: "Catering", title: "Catering", pct: 30 },
    { category: "Photographer", title: "Photography", pct: 12 },
    { category: "Decor & Florals", title: "Decor & Florals", pct: 12 },
    { category: "Music/DJ", title: "Music / DJ", pct: 8 },
    { category: "Cake", title: "Cake & desserts", pct: 8 },
  ],
  birthday: [
    { category: "Venue", title: "Venue", pct: 30 },
    { category: "Catering", title: "Catering", pct: 30 },
    { category: "Decor & Florals", title: "Decorations", pct: 12 },
    { category: "Entertainment", title: "Music or entertainment", pct: 12 },
    { category: "Cake", title: "Cake", pct: 8 },
    { category: "Photographer", title: "Photography", pct: 8 },
  ],
  anniversary: [
    { category: "Venue", title: "Venue", pct: 30 },
    { category: "Catering", title: "Catering", pct: 35 },
    { category: "Decor & Florals", title: "Decor & Florals", pct: 12 },
    { category: "Photographer", title: "Photography", pct: 10 },
    { category: "Music/DJ", title: "Music / DJ", pct: 8 },
    { category: "Cake", title: "Cake", pct: 5 },
  ],
  baby_shower: [
    { category: "Venue", title: "Venue", pct: 30 },
    { category: "Catering", title: "Catering", pct: 35 },
    { category: "Decor & Florals", title: "Decorations", pct: 15 },
    { category: "Cake", title: "Cake & desserts", pct: 10 },
    { category: "Photographer", title: "Photography", pct: 10 },
  ],
  graduation: [
    { category: "Venue", title: "Venue", pct: 30 },
    { category: "Catering", title: "Catering", pct: 35 },
    { category: "Decor & Florals", title: "Decorations", pct: 10 },
    { category: "Music/DJ", title: "Music / DJ", pct: 10 },
    { category: "Photographer", title: "Photography", pct: 10 },
    { category: "Cake", title: "Cake", pct: 5 },
  ],
  corporate: [
    { category: "Venue", title: "Venue", pct: 35 },
    { category: "Catering", title: "Catering", pct: 35 },
    { category: "AV & sound", title: "AV & sound", pct: 10 },
    { category: "Photographer", title: "Photography", pct: 8 },
    { category: "Transport", title: "Transport", pct: 7 },
    { category: "Entertainment", title: "Entertainment", pct: 5 },
  ],
  party: [
    { category: "Venue", title: "Venue", pct: 30 },
    { category: "Catering", title: "Catering", pct: 35 },
    { category: "Music/DJ", title: "Music / DJ", pct: 15 },
    { category: "Decor & Florals", title: "Decorations", pct: 12 },
    { category: "Bar", title: "Bar & drinks", pct: 8 },
  ],
};

/** A sensible starting budget in US dollars for each kind of occasion; the host changes it freely. */
export const DEFAULT_BUDGET: Record<EventType, number> = {
  wedding: 40000,
  engagement: 5000,
  birthday: 2500,
  anniversary: 4000,
  baby_shower: 1500,
  graduation: 2500,
  corporate: 8000,
  party: 2000,
};

/** The days an occasion starts with: a wedding's come from its tradition, the rest from their type. */
export function eventsFor(eventType: EventType | undefined, template: CultureTemplate): TemplateEvent[] {
  if (!eventType || eventType === "wedding") return TEMPLATE_EVENTS[template] ?? TEMPLATE_EVENTS.custom;
  return TYPE_EVENTS[eventType];
}

/** The vendor needs an occasion starts with. */
export function slotsFor(eventType: EventType | undefined, template: CultureTemplate): TemplateSlot[] {
  if (!eventType || eventType === "wedding") return defaultSlotsFor(template);
  return TYPE_SLOTS[eventType];
}

const PARTY_EVENTS = ["Sangeet", "Reception", "Walima", "Welcome Party", "Ceremony & Reception (Chuppah)"];

export function defaultSlotsFor(template: CultureTemplate): TemplateSlot[] {
  const base: TemplateSlot[] = [
    { category: "Venue", title: "Venue", pct: 30 },
    { category: "Catering", title: "Catering", pct: 22 },
    { category: "Photographer", title: "Photography & Video", pct: 10 },
    { category: "Decor & Florals", title: "Decor & Florals", pct: 10 },
    { category: "Music/DJ", title: "Music / DJ", pct: 4, eventNames: PARTY_EVENTS },
    { category: "Live band", title: "Live band", pct: 4, eventNames: PARTY_EVENTS },
    { category: "Attire", title: "Attire", pct: 7 },
    { category: "Makeup & Hair", title: "Makeup & Hair", pct: 3 },
    { category: "Officiant", title: "Officiant", pct: 1, eventNames: ["Ceremony", "Nikah", "Anand Karaj", "Ceremony 1", "Ceremony 2", "Ceremony & Reception (Chuppah)"] },
  ];
  if (SOUTH_ASIAN.includes(template) || template === "fusion") {
    base.splice(5, 0, { category: "Mehndi artist", title: "Mehndi Artist", pct: 2, eventNames: ["Mehndi", "Welcome Party"] });
    base.push({ category: "Live band", title: "Dhol & baraat band", pct: 2, eventNames: ["Baraat", "Ceremony", "Sangeet", "Ceremony 1"] });
  }
  return base;
}

/** Spread N events across [startDate..endDate] by day index. */
/**
 * One function per day where they fit, so a five-function celebration over three
 * days no longer lands two functions on the same date by accident. When there are
 * more functions than days, the extras share the last day.
 */
export function spreadDayIndexes(count: number, totalDays: number): number[] {
  if (count <= 1) return [0];
  if (count <= totalDays + 1) return Array.from({ length: count }, (_, i) => i);
  return Array.from({ length: count }, (_, i) => Math.min(totalDays, i));
}

/**
 * Splits one event's budget across the vendor needs that serve it, so every
 * need's budget adds up to its events' budgets and to the wedding total.
 * Without this, event budgets and slot budgets were two independent guesses.
 */
export function allocateSlotBudgets(
  eventBudgets: number[],
  slots: { pct: number; eventIndexes: number[] }[],
): number[] {
  const alloc = slots.map(() => 0);
  eventBudgets.forEach((budget, eventIndex) => {
    const serving = slots
      .map((slot, slotIndex) => ({ slotIndex, pct: slot.pct, serves: slot.eventIndexes.includes(eventIndex) }))
      .filter((x) => x.serves);
    const totalPct = serving.reduce((sum, x) => sum + x.pct, 0);
    if (serving.length === 0 || totalPct <= 0) return;
    const shares = splitByWeights(budget, serving.map((x) => x.pct));
    serving.forEach((x, i) => { alloc[x.slotIndex] += shares[i]; });
  });
  return alloc;
}

/** The rounding a person would use for a budget this size: $40,000 splits in hundreds, ₹25,00,000 in thousands. */
export function niceStep(total: number): number {
  if (total >= 1_000_000) return 1000;
  if (total >= 100_000) return 500;
  if (total >= 10_000) return 100;
  if (total >= 1_000) return 50;
  if (total >= 100) return 10;
  return 1;
}

/**
 * Split `total` by weights into round numbers that still sum exactly to `total`.
 * Each share is rounded to a sensible step; whatever rounding leaves over goes to the
 * largest share, where it is least noticeable.
 */
export function splitByWeights(total: number, weights: number[]): number[] {
  if (weights.length === 0) return [];
  const whole = Math.round(total);
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  // Too little to round across this many shares: fall back to whole units.
  const step = whole >= niceStep(whole) * weights.length * 2 ? niceStep(whole) : 1;
  const shares = weights.map((w) => Math.round((whole * w) / sum / step) * step);
  const left = whole - shares.reduce((a, b) => a + b, 0);
  const largest = shares.indexOf(Math.max(...shares));
  shares[largest] += left;
  return shares;
}

/**
 * Extra vendor needs a host can add themselves, beyond what their kind of occasion
 * starts with. Shown as suggestions on the vendors screen.
 */
export const SUGGESTED_CATEGORIES: { category: string; title: string; hint: string }[] = [
  { category: "Live band", title: "Live band", hint: "A band for the reception or party" },
  { category: "Live band", title: "Ceremony musicians", hint: "Strings, harp, choir or a singer for the ceremony" },
  { category: "Music/DJ", title: "DJ", hint: "A DJ for dancing" },
  { category: "Cake", title: "Cake & desserts", hint: "A cake or a dessert table" },
  { category: "Transport", title: "Transport", hint: "Cars or coaches for you and your guests" },
  { category: "Stationery", title: "Invitations & stationery", hint: "Invites, menus, signage" },
  { category: "Celebrant", title: "Celebrant or officiant", hint: "Who leads the ceremony" },
  { category: "Videographer", title: "Videographer", hint: "Film of the day, separate from photography" },
  { category: "Bar", title: "Bar & drinks", hint: "Bar service, bartenders, drinks packages" },
  { category: "Lighting", title: "Lighting & sound", hint: "Uplighting, dance floor, PA" },
  { category: "Childcare", title: "Childcare", hint: "Someone to mind the little ones" },
  { category: "Fireworks", title: "Fireworks or sparklers", hint: "A send-off moment" },
];
