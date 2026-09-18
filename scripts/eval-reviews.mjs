#!/usr/bin/env node
/**
 * Phase 2b verification: the review lookup, on its own.
 *
 * For each vendor found by the earlier pipeline eval, look up its public rating the
 * way `convex/firecrawl.ts:lookupReviews` does, then check the recorded number by
 * hand: re-read the page it claims to come from and look for the figure in the text.
 *
 * Two strategies run side by side so the change is measured, not guessed:
 *   A — what ships today: two searches, restricted to eight review directories.
 *   B — a wider directory list and a third, unrestricted search that still refuses
 *       the vendor's own site as a source.
 *   C — B, but it reads every result before choosing, keeps the listing backed by the
 *       most reviews, and refuses employment and encyclopedia pages outright.
 *
 * Usage: FIRECRAWL_API_KEY=... node scripts/eval-reviews.mjs [--only B] [--limit 16]
 * Writes docs/research/reviews-eval.json.
 */
import Firecrawl from "firecrawl";
import fs from "node:fs";

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const only = arg("only", null);
const limit = Number(arg("limit", 99));

const fc = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });

// Firecrawl's plan here allows about 40 requests a minute, and the first run of this
// script burned through that in seconds, leaving mostly rate-limit errors. Every call
// goes through one gate: a minimum gap between requests, plus a wait-and-retry when
// the API says we are over.
const MIN_GAP_MS = Number(arg("gap", 2100));
let lastCall = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function limited(label, fn, tries = 4) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    const wait = lastCall + MIN_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const m = /retry after (\d+)s/i.exec(msg);
      if (!/rate limit/i.test(msg) || attempt === tries) throw err;
      const back = (m ? Number(m[1]) : 5) * 1000 + 1500 * attempt;
      console.warn(`    rate limited on ${label}, waiting ${Math.round(back / 1000)}s`);
      await sleep(back);
    }
  }
}

// A: exactly what convex/firecrawl.ts ships today.
const DOMAINS_A = [
  "theknot.com", "weddingwire.com", "weddingwire.in", "yelp.com",
  "wedmegood.com", "hitched.co.uk", "trustpilot.com", "justdial.com",
];
// B: adds the directories that cover the markets where A found nothing —
// the UK and Ireland especially, plus the US listings beyond The Knot.
const DOMAINS_B = [
  ...DOMAINS_A,
  "bridebook.com", "guidesforbrides.co.uk", "weddingsonline.ie", "onefabday.com",
  "zola.com", "eventective.com", "weddingrule.com", "bark.com",
  "google.com", "facebook.com", "weddingz.in", "shaadisaga.com",
];

// Pages that carry a "rating" which has nothing to do with being a wedding vendor.
// Portland Parks & Recreation scored 4/5 on Indeed in run 1 — that is its staff rating.
const BLOCKED_HOSTS = [
  "indeed.com", "glassdoor.com", "linkedin.com", "ziprecruiter.com", "simplyhired.com",
  "wikipedia.org", "youtube.com", "reddit.com", "pinterest.com", "tiktok.com",
];

const SCHEMA = {
  type: "object",
  properties: {
    rating: { type: ["number", "null"], description: "Average rating out of 5 shown on this page for this exact business" },
    reviewCount: { type: ["number", "null"], description: "Number of reviews shown on this page" },
    highlights: { type: "array", items: { type: "string" }, description: "Up to 4 short phrases reviewers repeat, quoted from the page" },
  },
};

const normalise = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return null; } };

/** The name check that stops a rating being taken off some other business's page. */
function namesThisBusiness(name, url, title) {
  const haystack = normalise(`${url ?? ""} ${title ?? ""}`);
  const slug = normalise(name);
  if (haystack.includes(slug)) return true;
  return slug.split("-").filter((w) => w.length > 3).some((w) => haystack.includes(w));
}

async function attempt(query, domains, { ownHost } = {}) {
  let results;
  try {
    results = await limited("search", () => fc.search(query, {
      limit: 3,
      ...(domains ? { includeDomains: domains } : {}),
      scrapeOptions: {
        formats: [{ type: "json", schema: SCHEMA, prompt: `Find the average rating out of 5 and the number of reviews shown on this page. If this page is not about the business named in the query, return null for every field.` }],
      },
    }));
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
  return { items: results.web ?? [] };
}

/**
 * Strategy C: read every attempt, then choose. A rating is only as good as the number
 * of reviews behind it, so 4.7 from 19 reviews beats 5.0 from 2 — which is the choice
 * the first-hit-wins version got wrong for Union Pine and Lakeside Gardens.
 */
async function lookupBest(name, need, city, { domains, ownHost }) {
  const started = Date.now();
  const queries = [`"${name}" ${need} ${city} reviews`, `"${name}" ${need} reviews`, `"${name}" ${city} rating reviews`];
  const candidates = [];

  for (let qi = 0; qi < queries.length; qi++) {
    const isLast = qi === queries.length - 1;
    const { items, error } = await attempt(queries[qi], isLast ? null : domains);
    if (error) { console.warn(`    search failed: ${error}`); continue; }
    for (const item of items) {
      const json = item.json ?? {};
      const rating = typeof json.rating === "number" ? json.rating : undefined;
      if (rating === undefined || !Number.isFinite(rating) || rating <= 0 || rating > 5) continue;
      const count = typeof json.reviewCount === "number" && Number.isFinite(json.reviewCount) ? json.reviewCount : undefined;
      if (count === 0) continue; // a directory listing with no reviews behind its stars
      const url = item.url ?? item.metadata?.sourceURL;
      const host = hostOf(url ?? "");
      if (!host || host === ownHost) continue;
      if (BLOCKED_HOSTS.some((b) => host === b || host.endsWith(`.${b}`))) continue;
      if (!namesThisBusiness(name, url, item.title ?? item.metadata?.title)) continue;
      candidates.push({
        rating: Math.round(rating * 10) / 10,
        reviewCount: count,
        reviewSource: url,
        host,
        highlights: Array.isArray(json.highlights) ? json.highlights.filter((h) => typeof h === "string").slice(0, 4) : [],
        viaQuery: qi + 1,
      });
    }
    // Enough evidence already: stop paying for searches we do not need.
    if (candidates.some((c) => (c.reviewCount ?? 0) >= 10)) break;
  }

  if (candidates.length === 0) return { ms: Date.now() - started, candidates: 0 };
  candidates.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0) || a.viaQuery - b.viaQuery);
  return { ...candidates[0], candidates: candidates.length, ms: Date.now() - started };
}

async function lookup(name, need, city, { domains, unrestricted, ownHost }) {
  const started = Date.now();
  const queries = [`"${name}" ${need} ${city} reviews`, `"${name}" ${need} reviews`];
  if (unrestricted) queries.push(`"${name}" ${city} rating reviews`);

  for (let qi = 0; qi < queries.length; qi++) {
    const isLast = unrestricted && qi === queries.length - 1;
    const { items, error } = await attempt(queries[qi], isLast ? null : domains, { ownHost });
    if (error) { console.warn(`    search failed: ${error}`); continue; }
    for (const item of items) {
      const json = item.json ?? {};
      const rating = typeof json.rating === "number" ? json.rating : undefined;
      if (rating === undefined || !Number.isFinite(rating) || rating <= 0 || rating > 5) continue;
      const url = item.url ?? item.metadata?.sourceURL;
      const host = hostOf(url ?? "");
      // Never let the vendor's own site be the source of its own rating.
      if (isLast && ownHost && host === ownHost) continue;
      if (!namesThisBusiness(name, url, item.title ?? item.metadata?.title)) continue;
      return {
        rating: Math.round(rating * 10) / 10,
        reviewCount: typeof json.reviewCount === "number" ? json.reviewCount : undefined,
        reviewSource: url,
        host,
        highlights: Array.isArray(json.highlights) ? json.highlights.filter((h) => typeof h === "string").slice(0, 4) : [],
        viaQuery: qi + 1,
        ms: Date.now() - started,
      };
    }
  }
  return { ms: Date.now() - started };
}

/** The hand check, automated: read the source page and look for the figures in it. */
async function verify(found) {
  if (!found.reviewSource || found.rating === undefined) return null;
  try {
    const doc = await limited("verify scrape", () => fc.scrape(found.reviewSource, { formats: ["markdown"], timeout: 45_000 }));
    const text = (doc.markdown ?? "").replace(/\s+/g, " ");
    const r = found.rating;
    const ratingSeen =
      text.includes(r.toFixed(1)) ||
      text.includes(String(r)) ||
      (Number.isInteger(r) && text.includes(`${r}.0`));
    const countSeen = found.reviewCount === undefined ? null : text.includes(String(found.reviewCount));
    return { ratingSeen, countSeen, chars: text.length };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

const prev = JSON.parse(fs.readFileSync("docs/research/firecrawl-eval-v2.json", "utf8"));
const cases = prev.results.slice(0, limit).map((r) => ({ name: r.name, need: r.need, city: r.city, ownHost: r.host }));

const strategies = [
  { key: "A", label: "shipping today", opts: { domains: DOMAINS_A, unrestricted: false } },
  { key: "B", label: "wider directories + one unrestricted search", opts: { domains: DOMAINS_B, unrestricted: true } },
  { key: "C", label: "B, best-of by review count, junk hosts refused", opts: { domains: DOMAINS_B, best: true } },
].filter((s) => !only || s.key === only);

const out = { ranAt: new Date().toISOString(), cases: [] };
for (const c of cases) {
  console.log(`\n${c.name} — ${c.need}, ${c.city}`);
  const row = { ...c, strategies: {} };
  for (const s of strategies) {
    const found = s.opts.best
      ? await lookupBest(c.name, c.need, c.city, { ...s.opts, ownHost: c.ownHost })
      : await lookup(c.name, c.need, c.city, { ...s.opts, ownHost: c.ownHost });
    const checked = await verify(found);
    row.strategies[s.key] = { ...found, verified: checked };
    const rating = found.rating !== undefined ? `${found.rating}/5 (${found.reviewCount ?? "?"})` : "—";
    const src = found.host ?? "";
    const mark = checked?.ratingSeen === true ? "✓ on page" : checked?.ratingSeen === false ? "✗ NOT on page" : checked?.error ? "? unreadable" : "";
    console.log(`  ${s.key}: ${rating.padEnd(16)} ${src.padEnd(26)} ${mark}`);
  }
  out.cases.push(row);
}

for (const s of strategies) {
  const rows = out.cases.map((c) => c.strategies[s.key]);
  const withRating = rows.filter((r) => r.rating !== undefined);
  const verified = withRating.filter((r) => r.verified?.ratingSeen === true);
  const wrong = withRating.filter((r) => r.verified?.ratingSeen === false);
  const sourced = withRating.filter((r) => r.reviewSource);
  const counts = withRating.filter((r) => r.reviewCount !== undefined);
  const countsSeen = counts.filter((r) => r.verified?.countSeen === true);
  out[`summary${s.key}`] = {
    cases: rows.length,
    rated: withRating.length,
    ratedPct: Math.round((withRating.length / rows.length) * 100),
    ratingsWithASource: sourced.length,
    ratingsSeenOnTheirSource: verified.length,
    ratingsNotOnTheirSource: wrong.length,
    reviewCounts: counts.length,
    reviewCountsSeenOnTheirSource: countsSeen.length,
    medianMs: rows.map((r) => r.ms).sort((a, b) => a - b)[Math.floor(rows.length / 2)],
  };
  console.log(`\n== strategy ${s.key} (${s.label})`, out[`summary${s.key}`]);
}

fs.writeFileSync("docs/research/reviews-eval.json", JSON.stringify(out, null, 2));
console.log("\nwrote docs/research/reviews-eval.json");
