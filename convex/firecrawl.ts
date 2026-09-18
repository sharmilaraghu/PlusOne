"use node";

import Firecrawl from "firecrawl";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { findEmails, hostOf, truncate } from "./lib/text";

const fc = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });

/** Big directories/marketplaces outrank real vendor sites; we want the vendors themselves. */
export const EXCLUDED_DOMAINS = [
  "theknot.com",
  "weddingwire.com",
  "zola.com",
  "yelp.com",
  "facebook.com",
  "instagram.com",
  "pinterest.com",
  "reddit.com",
  "youtube.com",
  "tiktok.com",
  "tripadvisor.com",
  "google.com",
];

const SEARCH_MD_CHARS = 8_000;
const PAGE_MD_CHARS = 12_000;

type Candidate = { url: string; title?: string; description?: string; markdown?: string };

export const searchVendors = internalAction({
  args: { queries: v.array(v.string()), city: v.string(), limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      url: v.string(),
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      markdown: v.optional(v.string()),
    }),
  ),
  handler: async (_ctx, args): Promise<Candidate[]> => {
    const limit = Math.max(1, Math.min(10, Math.floor(args.limit ?? 6)));
    const byHost = new Map<string, Candidate>();
    for (const query of args.queries.slice(0, 3)) {
      const q = query.toLowerCase().includes(args.city.toLowerCase()) ? query : `${query} ${args.city}`;
      let results;
      try {
        results = await fc.search(q, {
          limit,
          excludeDomains: EXCLUDED_DOMAINS,
          scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
        });
      } catch (err) {
        console.warn("firecrawl.search failed", q, err instanceof Error ? err.message : err);
        continue;
      }
      for (const item of results.web ?? []) {
        // Search returns either a bare result or a scraped Document.
        const meta = "metadata" in item ? item.metadata : undefined;
        const url = "url" in item && typeof item.url === "string" ? item.url : (meta?.sourceURL ?? meta?.url);
        if (!url) continue;
        const host = hostOf(url);
        if (!host || byHost.has(host)) continue;
        if (EXCLUDED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) continue;
        const title = "title" in item && typeof item.title === "string" ? item.title : meta?.title;
        const description = "description" in item && typeof item.description === "string" ? item.description : meta?.description;
        const markdown = "markdown" in item && typeof item.markdown === "string" ? truncate(item.markdown, SEARCH_MD_CHARS) : undefined;
        byHost.set(host, { url, title: title ?? undefined, description: description ?? undefined, markdown });
      }
    }
    return [...byHost.values()];
  },
});

const VENDOR_JSON_SCHEMA = {
  type: "object",
  properties: {
    businessName: { type: "string" },
    contactEmail: { type: ["string", "null"] },
    phone: { type: ["string", "null"] },
    startingPrice: { type: ["number", "null"], description: "Lowest numeric price mentioned" },
    packages: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          price: { type: ["number", "null"] },
          description: { type: ["string", "null"] },
        },
        required: ["name"],
      },
    },
    capacity: { type: ["string", "null"] },
    serviceArea: { type: ["string", "null"] },
  },
  required: ["businessName"],
};

export const scrapeVendor = internalAction({
  args: { url: v.string() },
  returns: v.object({
    url: v.string(),
    title: v.optional(v.string()),
    markdown: v.string(),
    json: v.optional(v.any()),
    emails: v.array(v.string()),
    links: v.array(v.string()),
  }),
  handler: async (_ctx, args): Promise<{ url: string; title?: string; markdown: string; json?: unknown; emails: string[]; links: string[] }> => {
    const doc = await fc.scrape(args.url, {
      formats: [
        "markdown",
        "links",
        {
          type: "json",
          schema: VENDOR_JSON_SCHEMA,
          prompt: "Extract this wedding vendor's business name, contact email, phone, starting price, packages with prices, capacity and service area.",
        },
      ],
      onlyMainContent: false,
      timeout: 45_000,
    });
    const markdown = doc.markdown ?? "";
    const emails = findEmails(`${markdown}\n${doc.html ?? ""}\n${JSON.stringify(doc.json ?? {})}`);
    const host = hostOf(args.url);
    // Prefer addresses on the vendor's own domain.
    emails.sort((a, b) => Number(host && b.endsWith(`@${host}`)) - Number(host && a.endsWith(`@${host}`)));
    return {
      url: doc.metadata?.sourceURL ?? args.url,
      title: doc.metadata?.title ?? undefined,
      markdown: truncate(markdown, PAGE_MD_CHARS),
      json: doc.json,
      emails: emails.slice(0, 5),
      links: (doc.links ?? []).slice(0, 50),
    };
  },
});

export const readInspiration = internalAction({
  args: { url: v.string() },
  returns: v.string(),
  handler: async (_ctx, args): Promise<string> => {
    const doc = await fc.scrape(args.url, { formats: ["markdown"], onlyMainContent: true, timeout: 45_000 });
    return truncate(doc.markdown ?? "", 20_000);
  },
});
