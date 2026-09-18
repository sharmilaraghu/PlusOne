#!/usr/bin/env node
/**
 * Phase 2 verification, v2 pipeline: per vendor, find the contact and pricing pages,
 * scrape them with the homepage, and look up reviews on directories.
 * Reuses the candidates from docs/research/firecrawl-eval.json (no new searches).
 */
import Firecrawl from "firecrawl";
import fs from "node:fs";

const fc = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });
const prev = JSON.parse(fs.readFileSync("docs/research/firecrawl-eval.json", "utf8"));
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const JUNK_EMAIL = /(example|sentry|wixpress|\.png|\.jpg|@2x|placeholder)/i;
const REVIEW_DOMAINS = ["theknot.com", "weddingwire.com", "yelp.com", "wedmegood.com", "hitched.co.uk", "trustpilot.com", "google.com"];

const DETAIL_SCHEMA = {
  type: "object",
  properties: {
    businessName: { type: "string" },
    contactEmail: { type: ["string", "null"] },
    phone: { type: ["string", "null"] },
    hasContactFormOnly: { type: ["boolean", "null"], description: "true if the page offers only a form, no email address" },
    startingPrice: { type: ["number", "null"] },
    priceText: { type: ["string", "null"] },
    currency: { type: ["string", "null"] },
    packages: { type: "array", items: { type: "object", properties: { name: { type: "string" }, price: { type: ["number", "null"] }, description: { type: ["string", "null"] } }, required: ["name"] } },
    servesCity: { type: ["string", "null"] },
    isWeddingVendor: { type: "boolean" },
  },
  required: ["businessName", "isWeddingVendor"],
};
const REVIEW_SCHEMA = {
  type: "object",
  properties: {
    rating: { type: ["number", "null"], description: "Average rating out of 5 shown on the page for this business" },
    reviewCount: { type: ["number", "null"] },
    highlights: { type: "array", items: { type: "string" }, description: "Short phrases reviewers repeat" },
  },
};

const pick = (arr, re, n) => [...new Set((arr ?? []).filter((l) => re.test(l)))].slice(0, n);
const clean = (list) => [...new Set(list.filter((e) => !JUNK_EMAIL.test(e)))];

const results = [];
for (const c of prev.cases) {
  for (const s of c.scrapes) {
    const rec = { need: c.need, city: c.city, host: s.host, url: s.url, pages: [], emails: [], price: null, priceText: null, packages: 0, rating: null, reviewCount: null, formOnly: null, ms: 0 };
    const t0 = Date.now();
    // 1. discover the vendor's own contact and pricing pages
    let links = [];
    try {
      const m = await fc.map(`https://${s.host}`, { limit: 60 });
      links = (m.links ?? []).map((l) => (typeof l === "string" ? l : l.url)).filter(Boolean);
    } catch { /* map unsupported on some sites; fall back to the homepage links */ }
    const targets = [s.url, ...pick(links, /contact|get-in-touch|enquir|inquir/i, 1), ...pick(links, /pricing|price|investment|package|rates|services/i, 1)].slice(0, 3);
    rec.pages = targets;
    // 2. scrape them together
    for (const url of targets) {
      try {
        const doc = await fc.scrape(url, { formats: ["markdown", "links", { type: "json", schema: DETAIL_SCHEMA, prompt: "Extract the wedding vendor's contact email, phone, starting price, packages and whether only a contact form is offered." }], onlyMainContent: true, timeout: 60000 });
        const j = doc.json ?? {};
        rec.emails.push(...clean([...(doc.markdown?.match(EMAIL_RE) ?? []), ...(doc.links ?? []).filter((l) => l.startsWith("mailto:")).map((l) => l.slice(7).split("?")[0]), ...(j.contactEmail ? [j.contactEmail] : [])]));
        rec.price ??= j.startingPrice ?? null;
        rec.priceText ??= j.priceText ?? null;
        rec.packages += (j.packages ?? []).length;
        if (j.hasContactFormOnly != null) rec.formOnly = j.hasContactFormOnly;
        rec.name ??= j.businessName;
      } catch (e) { rec.error = e.message; }
    }
    rec.emails = clean(rec.emails).slice(0, 3);
    // 3. reviews: directories are allowed here, unlike discovery
    try {
      const rs = await fc.search(`"${rec.name ?? s.host}" ${c.need} reviews`, { limit: 3, includeDomains: REVIEW_DOMAINS, scrapeOptions: { formats: [{ type: "json", schema: REVIEW_SCHEMA, prompt: `Find the average rating out of 5 and number of reviews shown for ${rec.name ?? s.host}.` }] } });
      for (const item of rs.web ?? []) {
        const j = item.json ?? {};
        if (j.rating != null) { rec.rating = j.rating; rec.reviewCount = j.reviewCount ?? null; rec.reviewSource = item.url ?? item.metadata?.sourceURL; break; }
      }
    } catch (e) { rec.reviewError = e.message; }
    rec.ms = Date.now() - t0;
    results.push(rec);
    console.log(`· ${rec.host}: email=${rec.emails.length > 0} price=${rec.price ?? rec.priceText ?? "-"} rating=${rec.rating ?? "-"} (${Math.round(rec.ms / 1000)}s)`);
  }
}
fs.writeFileSync("docs/research/firecrawl-eval-v2.json", JSON.stringify({ ranAt: new Date().toISOString(), results }, null, 2));
const n = results.length;
const pct = (k) => `${Math.round((k / Math.max(1, n)) * 100)}%`;
const withEmail = results.filter((r) => r.emails.length).length;
const withPrice = results.filter((r) => r.price != null || r.priceText || r.packages > 0).length;
const withRating = results.filter((r) => r.rating != null).length;
const contactable = results.filter((r) => r.emails.length || r.formOnly === true).length;
console.log(`\nV2 over ${n} vendors: email ${withEmail} (${pct(withEmail)}) · price or packages ${withPrice} (${pct(withPrice)}) · rating ${withRating} (${pct(withRating)}) · reachable (email or form) ${contactable} (${pct(contactable)})`);
