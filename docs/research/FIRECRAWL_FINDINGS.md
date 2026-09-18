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

---

# Review lookup, measured on its own (18 September 2026)

Phase 2b ranks vendors on what reviewers say, so the rating had to be checked before it
could be trusted with that weight. `scripts/eval-reviews.mjs` runs the review lookup
alone over the same 16 vendors the pipeline eval found, then checks every number by
hand: it re-reads the page the rating claims to come from and looks for the figure in
the text. Raw results in `docs/research/reviews-eval.json`.

Three strategies were run against each other.

| | A: shipping before today | B: wider directories + an unrestricted search | C: B, but best-of |
|---|---|---|---|
| Vendors with a rating | 44% (7 of 16) | **69% (11 of 16)** | 56% (9 of 16) |
| Ratings with a source link | 100% | 100% | 100% |
| Ratings actually found on that source page | **100%** | **100%** | **100%** |
| Review counts found on that source page | 100% | 100% | 100% |
| Ratings that are not wedding reviews | 0 | **1** | 0 |
| Median time per vendor | 4.5s | 10.0s | 7.3s |

**B looked best and was worst.** It found a rating for Portland Parks & Recreation —
4.0 out of 5 on Indeed, which is its *staff* rating, not its wedding reviews. It also
traded good evidence for thin evidence twice, taking Union Pine at 5.0 from 2 reviews on
Zola over 4.7 from 19 on WeddingWire, and Lakeside Gardens at 28 reviews over 58. First
hit wins is the wrong rule when the hits differ in quality.

**C is what ships.** Same three searches, but every result is read before one is chosen:

1. A rating is worth the reviews behind it, so the listing with the most reviews wins;
   between equals, the more specific search wins.
2. A rating from a page rating them as an *employer* is refused outright — Indeed,
   Glassdoor, LinkedIn and the rest — as are encyclopedia and social pages.
3. A vendor's own website can never be the source of its own rating.
4. A listing showing stars with zero reviews behind them is not a rating.
5. The search stops as soon as a listing with 10 or more reviews is in hand, so the
   extra coverage costs about 3 seconds a vendor, not 6.

Confirmed on the deployed action, not just in the script: Union Pine now returns 4.7/5
from 19 WeddingWire reviews, April Mae Creative 5.0 from 176 on The Knot, and Portland
Parks & Recreation returns nothing at all.

## What this means for the ranking

Coverage of 56% is the honest ceiling for small local vendors — Dublin florists and
Austin henna artists are on Instagram and nowhere else. The ranking prompt already
requires a vendor with no public rating to be judged on price and fit and to say "no
public rating found" in its reason, rather than being dumped to the bottom, and the
screen says the same thing in plain words on the card.
