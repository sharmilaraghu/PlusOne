# Firecrawl quality: measured findings

Run on 18 September 2026 against the live Firecrawl API, six real vendor needs across six cities (Austin, Brighton, Chennai, Portland, Dublin). Raw results: `firecrawl-eval.json` (v1) and `firecrawl-eval-v2.json` (v2). Scripts: `scripts/eval-firecrawl.mjs`, `scripts/eval-firecrawl-v2.mjs`.

## The numbers

| Measure | v1 (the code as written) | v2 (multi-page + reviews) |
|---|---|---|
| Search results that are a vendor's own site | 60% (29 of 48) | same search, unchanged |
| Vendors where an email was found | 25% (4 of 16) | **63% (10 of 16)** |
| Vendors where a price or package was found | 13% (2 of 16) | **50% (8 of 16)** |
| Vendors with a public rating | 0% | **38% (6 of 16)** |
| Vendors reachable at all (email or contact form) | not measured | **100%** |
| Time per vendor | about 6s | about 22s |

## Why v1 was weak

1. **It only read the page the search returned.** Wedding vendors almost never put their email or prices on the homepage. They live on `/contact`, `/pricing`, `/investment` or `/packages`. Of the 16 homepages scraped, 12 linked to a contact page that was never opened.
2. **It never looked for reviews.** The vendor card had a rating field that nothing ever filled. Ranking "by reviews" was impossible.
3. **Directories were excluded everywhere.** Right for finding vendors, wrong for ratings: The Knot, WeddingWire and Yelp are exactly where ratings live.

## What v2 changes

1. **Map, then read three pages.** Ask Firecrawl for the site's link map, pick the contact page and the pricing page, and scrape those with the original page. Merge the results.
2. **Look up reviews separately.** A second search restricted to review directories, asking only for the rating, the review count and a few repeated phrases, with the source link kept.
3. **Know when a vendor cannot be emailed.** Many sites offer only a contact form. The pipeline records that rather than pretending an address exists, so the couple can be told.

## What still needs care

- **Bad prices.** Two extractions returned meaningless numbers (a "price" of 8, and 8.833 from a government page). Fix: reject numbers outside a plausible range, require a currency on the page, and keep the price as written when in doubt.
- **Non-vendors slipping through.** A city government page and a photographer's blog listicle reached the scrape stage. The language-model filter catches these well when given the URL, title and page text, so it must run before the expensive scrape, not after.
- **Ratings at 38%.** Small local vendors often have no listing on any directory. The ranking must say "no public rating found" rather than pushing them to the bottom.
- **Speed.** About 22 seconds per vendor means six vendors take over two minutes. Vendors must stream into the screen as each one finishes, never in one batch at the end.

## Rules this sets for the build

1. Never show a price, rating or email that did not come from a page that was actually read; keep the source link for each.
2. Filter candidates before scraping, not after.
3. Treat "contact form only" as a real state of the world, not a failure.
4. Rank on evidence, and say in one line why each vendor is ranked where it is.
