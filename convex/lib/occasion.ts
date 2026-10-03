import type { CultureTemplate, EventType } from "./validators";

/**
 * What kind of occasion is being planned, and how to talk about it.
 *
 * No Convex imports here, so the browser can use the same words the emails do.
 * In code an occasion is still a `wedding` document; an older one has no
 * `eventType` and is a wedding.
 */

type Occasion = { eventType?: EventType; template?: CultureTemplate; partnerA: string; partnerB: string };

export const EVENT_TYPES: { id: EventType; name: string; blurb: string }[] = [
  { id: "wedding", name: "Wedding", blurb: "One day or a whole weekend, in any tradition." },
  { id: "engagement", name: "Engagement", blurb: "A party to mark the proposal." },
  { id: "birthday", name: "Birthday", blurb: "A milestone, a kids' party or a surprise." },
  { id: "anniversary", name: "Anniversary", blurb: "A dinner or a party for the years so far." },
  { id: "baby_shower", name: "Baby shower", blurb: "An afternoon for the parents-to-be." },
  { id: "graduation", name: "Graduation", blurb: "A party for the graduate and their people." },
  { id: "corporate", name: "Team event", blurb: "An offsite, a team dinner or a launch." },
  { id: "party", name: "Party", blurb: "A housewarming, a holiday party, a reunion, anything else." },
];

/** The noun a vendor or guest would use: "a birthday party", "their wedding". */
const NOUN: Record<EventType, string> = {
  wedding: "wedding",
  engagement: "engagement party",
  birthday: "birthday party",
  anniversary: "anniversary celebration",
  baby_shower: "baby shower",
  graduation: "graduation party",
  corporate: "team event",
  party: "party",
};

export function eventTypeOf(o: { eventType?: EventType }): EventType {
  return o.eventType ?? "wedding";
}

export function isWedding(o: { eventType?: EventType }): boolean {
  return eventTypeOf(o) === "wedding";
}

/** "wedding", "Hindu wedding", "birthday party": the occasion in a sentence. */
export function occasionNoun(o: { eventType?: EventType; template?: CultureTemplate }): string {
  const type = eventTypeOf(o);
  if (type !== "wedding") return NOUN[type];
  const tradition = !o.template || o.template === "western" || o.template === "custom" || o.template === "fusion" ? "" : o.template;
  return tradition ? `${tradition.charAt(0).toUpperCase()}${tradition.slice(1)} wedding` : "wedding";
}

/** "a birthday party", "an anniversary celebration", "an engagement party". */
export function anOccasion(o: { eventType?: EventType; template?: CultureTemplate }): string {
  const noun = occasionNoun(o);
  return `${/^[aeiou]/i.test(noun) ? "an" : "a"} ${noun}`;
}

/** "Anita & Sam", or just "Anita" when one person is hosting. */
export function hostsLabel(o: Pick<Occasion, "partnerA" | "partnerB">): string {
  const a = o.partnerA.trim();
  const b = o.partnerB.trim();
  return a && b ? `${a} & ${b}` : a || b || "The host";
}

/** True when there is more than one name to sign an email with. */
export function hasCoHost(o: Pick<Occasion, "partnerA" | "partnerB">): boolean {
  return Boolean(o.partnerA.trim() && o.partnerB.trim());
}
