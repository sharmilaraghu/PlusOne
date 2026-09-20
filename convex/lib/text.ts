/** Small pure helpers shared by default-runtime and node files. */

export const MAX_BODY_CHARS = 100_000;

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "\n…[truncated]";
}

/** "Priya Shah <priya@example.com>" -> "priya@example.com" (lower-cased). */
export function extractEmail(input: string | undefined | null): string {
  if (!input) return "";
  const m = input.match(/<([^>]+)>/);
  const raw = (m ? m[1] : input).trim();
  const found = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return (found ? found[0] : raw).toLowerCase();
}

export function findEmails(text: string): string[] {
  const seen = new Set<string>();
  const re = /(?:mailto:)?([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const e = m[1].toLowerCase();
    if (/\.(png|jpg|jpeg|gif|svg|webp)$/.test(e)) continue;
    if (e.includes("example.com") || e.includes("sentry") || e.includes("wixpress")) continue;
    seen.add(e);
  }
  return [...seen];
}

/** Normalised host for dedupe: lower-case, no leading "www.". */
export function hostOf(url: string): string | null {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Canonical website value stored on vendors (also the dedupe key). */
export function canonicalWebsite(url: string): string | null {
  const host = hostOf(url);
  return host ? `https://${host}` : null;
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00Z`).getTime();
  const b = new Date(`${end}T00:00:00Z`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount)}`;
  }
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

export const DAY_MS = 86_400_000;
export const FOLLOW_UP_DELAY_MS = 3 * DAY_MS;

/**
 * Find the thing a person meant by name: an exact match first, then either side
 * containing the other, so "the barn" finds "The Oak Barn at Driftwood".
 */
export function matchByName<T>(list: T[], wanted: string | null | undefined, key: (item: T) => string): T | undefined {
  const needle = wanted?.trim().toLowerCase();
  if (!needle) return undefined;
  return (
    list.find((item) => key(item).trim().toLowerCase() === needle) ??
    list.find((item) => {
      const name = key(item).trim().toLowerCase();
      return name.includes(needle) || needle.includes(name);
    })
  );
}

