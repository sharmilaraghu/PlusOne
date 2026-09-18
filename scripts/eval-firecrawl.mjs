#!/usr/bin/env node
/**
 * Phase 2 verification: measure Firecrawl search + scrape quality on real queries.
 * Usage: FIRECRAWL_API_KEY=... OPENAI_API_KEY=... node scripts/eval-firecrawl.mjs [--cases 6] [--scrapes 3]
 * Writes docs/research/firecrawl-eval.json and a readable summary to stdout.
 */
import Firecrawl from "firecrawl";
import fs from "node:fs";

const fc = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? Number(process.argv[i + 1]) : d; };
const CASES = [
  { need: "Wedding photographer", city: "Austin, Texas", budget: "$3,500" },
  { need: "Mehndi / henna artist", city: "Austin, Texas", budget: "$1,000" },
  { need: "Wedding caterer", city: "Brighton, UK", budget: "£6,000" },
  { need: "Bridal makeup artist", city: "Chennai, India", budget: "₹40,000" },
  { need: "Wedding venue", city: "Portland, Oregon", budget: "$12,000" },
  { need: "Wedding florist", city: "Dublin, Ireland", budget: "€2,500" },
].slice(0, arg("cases", 6));
const SCRAPES = arg("scrapes", 3);

const EXCLUDED = ["theknot.com","weddingwire.com","zola.com","yelp.com","facebook.com","instagram.com","pinterest.com","reddit.com","youtube.com","tiktok.com","tripadvisor.com","google.com"];
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

const VENDOR_SCHEMA = {
  type: "object",
  properties: {
    businessName: { type: "string" },
    contactEmail: { type: ["string", "null"] },
    startingPrice: { type: ["number", "null"] },
    priceText: { type: ["string", "null"], description: "Price as written on the page, e.g. 'from $2,400'" },
    packages: { type: "array", items: { type: "object", properties: { name: { type: "string" }, price: { type: ["number", "null"] } }, required: ["name"] } },
    servesCity: { type: ["string", "null"] },
    isWeddingVendor: { type: "boolean", description: "True only if this is a vendor's own site offering this service, not a directory, blog or listicle" },
  },
  required: ["businessName", "isWeddingVendor"],
};

async function judge(items) {
  if (!process.env.OPENAI_API_KEY) return items.map(() => null);
  const body = {
    model: process.env.OPENAI_MODEL_FAST ?? "gpt-5.6-luna",
    input: [{ role: "user", content: `For each numbered result decide if it is a WEDDING VENDOR'S OWN WEBSITE for the stated service and city (not a directory, marketplace, blog, listicle, news article or unrelated business). Answer strict JSON: {"verdicts":[{"n":1,"isVendorSite":true,"why":"..."}]}\n\n${items.map((it, i) => `${i + 1}. need="${it.need}" city="${it.city}" url=${it.url} title=${JSON.stringify(it.title ?? "")} snippet=${JSON.stringify((it.snippet ?? "").slice(0, 400))}`).join("\n")}` }],
  };
  const r = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { "content-type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: JSON.stringify(body) });
  const j = await r.json();
  const text = j.output_text ?? j.output?.flatMap((o) => o.content ?? []).map((c) => c.text).join("") ?? "";
  try { return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)).verdicts; } catch { return items.map(() => null); }
}

const out = { ranAt: new Date().toISOString(), cases: [] };

for (const c of CASES) {
  const query = `${c.need} ${c.city}`;
  const rec = { ...c, query, searchMs: 0, candidates: [], scrapes: [] };
  const t0 = Date.now();
  let res;
  try {
    res = await fc.search(query, { limit: 8, excludeDomains: EXCLUDED, scrapeOptions: { formats: ["markdown"], onlyMainContent: true } });
  } catch (e) { rec.error = e.message; out.cases.push(rec); continue; }
  rec.searchMs = Date.now() - t0;
  const seen = new Set();
  for (const item of res.web ?? []) {
    const url = item.url ?? item.metadata?.sourceURL;
    if (!url) continue;
    const h = host(url);
    if (!h || seen.has(h) || EXCLUDED.some((d) => h === d || h.endsWith(`.${d}`))) continue;
    seen.add(h);
    rec.candidates.push({ url, host: h, title: item.title ?? item.metadata?.title, snippet: item.markdown?.slice(0, 500) ?? item.description, need: c.need, city: c.city });
  }
  const verdicts = await judge(rec.candidates);
  rec.candidates.forEach((cand, i) => { cand.isVendorSite = verdicts?.[i]?.isVendorSite ?? null; cand.why = verdicts?.[i]?.why; delete cand.snippet; });

  for (const cand of rec.candidates.filter((x) => x.isVendorSite !== false).slice(0, SCRAPES)) {
    const s = { url: cand.url, host: cand.host };
    const t1 = Date.now();
    try {
      const doc = await fc.scrape(cand.url, { formats: ["markdown", "links", { type: "json", schema: VENDOR_SCHEMA, prompt: "Extract this wedding vendor's details from the page. isWeddingVendor is false for directories, blogs and listicles." }], onlyMainContent: true, timeout: 60000 });
      s.ms = Date.now() - t1;
      s.mdChars = doc.markdown?.length ?? 0;
      s.json = doc.json ?? null;
      s.emailsInMarkdown = [...new Set((doc.markdown ?? "").match(EMAIL_RE) ?? [])].slice(0, 3);
      s.mailtoLinks = (doc.links ?? []).filter((l) => l.startsWith("mailto:")).slice(0, 3);
      s.contactLinks = (doc.links ?? []).filter((l) => /contact|enquir|inquir|get-in-touch|book/i.test(l)).slice(0, 3);
    } catch (e) { s.error = e.message; }
    rec.scrapes.push(s);
  }
  out.cases.push(rec);
  console.log(`· ${query}: ${rec.candidates.length} candidates, ${rec.scrapes.length} scraped`);
}

fs.mkdirSync("docs/research", { recursive: true });
fs.writeFileSync("docs/research/firecrawl-eval.json", JSON.stringify(out, null, 2));

// ---- summary ----
let vend = 0, cands = 0, withEmail = 0, withPrice = 0, scraped = 0, vendorFlag = 0;
console.log("\n| need | city | candidates | vendor sites | scraped | email | price |");
console.log("|---|---|---|---|---|---|---|");
for (const c of out.cases) {
  const v = c.candidates.filter((x) => x.isVendorSite === true).length;
  const e = c.scrapes.filter((s) => s.json?.contactEmail || s.emailsInMarkdown?.length || s.mailtoLinks?.length).length;
  const p = c.scrapes.filter((s) => s.json?.startingPrice != null || s.json?.priceText || (s.json?.packages ?? []).some((q) => q.price != null)).length;
  cands += c.candidates.length; vend += v; scraped += c.scrapes.length; withEmail += e; withPrice += p;
  vendorFlag += c.scrapes.filter((s) => s.json?.isWeddingVendor === true).length;
  console.log(`| ${c.need} | ${c.city} | ${c.candidates.length} | ${v} | ${c.scrapes.length} | ${e} | ${p} |`);
}
console.log(`\nTOTAL candidates ${cands} · judged vendor sites ${vend} (${Math.round((vend / Math.max(1, cands)) * 100)}%)`);
console.log(`TOTAL scraped ${scraped} · email found ${withEmail} (${Math.round((withEmail / Math.max(1, scraped)) * 100)}%) · price found ${withPrice} (${Math.round((withPrice / Math.max(1, scraped)) * 100)}%) · json says vendor ${vendorFlag}`);
