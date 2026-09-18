import type { CultureTemplate } from "./validators";

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
export function spreadDayIndexes(count: number, totalDays: number): number[] {
  if (count <= 1) return [0];
  return Array.from({ length: count }, (_, i) => Math.round((i * totalDays) / (count - 1)));
}

/** Split `total` by weights into whole numbers that sum exactly to `total`. */
export function splitByWeights(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map((w) => Math.floor((total * w) / sum));
  let remainder = Math.round(total) - raw.reduce((a, b) => a + b, 0);
  for (let i = 0; remainder > 0 && i < raw.length; i++, remainder--) raw[i] += 1;
  return raw;
}

/**
 * Extra vendor needs a couple can add themselves, beyond what their tradition
 * creates. Shown as suggestions on the vendors screen.
 */
export const SUGGESTED_CATEGORIES: { category: string; title: string; hint: string }[] = [
  { category: "Live band", title: "Live band", hint: "A band for the reception or party" },
  { category: "Live band", title: "Ceremony musicians", hint: "Strings, harp, choir or a singer for the ceremony" },
  { category: "Music/DJ", title: "DJ", hint: "A DJ for dancing" },
  { category: "Cake", title: "Cake & desserts", hint: "Wedding cake, dessert table" },
  { category: "Transport", title: "Transport", hint: "Cars or coaches for you and your guests" },
  { category: "Stationery", title: "Invitations & stationery", hint: "Invites, menus, signage" },
  { category: "Celebrant", title: "Celebrant or officiant", hint: "Who leads the ceremony" },
  { category: "Videographer", title: "Videographer", hint: "Film of the day, separate from photography" },
  { category: "Bar", title: "Bar & drinks", hint: "Bar service, bartenders, drinks packages" },
  { category: "Lighting", title: "Lighting & sound", hint: "Uplighting, dance floor, PA" },
  { category: "Childcare", title: "Childcare", hint: "Someone to mind the little ones" },
  { category: "Fireworks", title: "Fireworks or sparklers", hint: "A send-off moment" },
];
