---
version: 1
slug: "src-pages-landingpage-tsx"
primary_target: "src/pages/LandingPage.tsx"
related_targets: ["src/App.tsx"]
---

# Landing page (public, signed-out root)

Scope: the public page at `/` for signed-out visitors, plus `/signin`. Mode: Persuade.
Audience: hackathon judges arriving cold, then couples planning a wedding. Job: understand in seconds that PlusOne does the vendor emailing, see the app working, and start planning or take the 1-minute tour.
Proof: the app preview and tour use clearly labelled example content; no invented users, reviews, press or statistics.
Constraints (user): pretty and unmistakably wedding; minimal and thoughtful; references YourDay (soft pastel, serif with italic accent, app shown in hero) and Loverly (editorial, ivory and wine); a landing-page tour; the demo wedding is removed from the product; no generic SaaS look, nothing playful or loud, sponsor names only in the footer.
History: the earlier "Departures Board" direction (seed c880b144) was built, then rejected by the user as airport-like; this replaces it.

## Direction contract

THESIS: Your AI copilot for the perfect wedding, proven by the app itself doing the work: a calm editorial page where the vendor list, quotes and budget are the hero. Refuses both the couple-photo marketplace hero and the generic SaaS feature grid.

OWN-WORLD: Warm ivory ground (#F8F6F3), deep wine accent (#74162A) for the brand, primary pills and emphasis, blush (#F8E8E8) and sage (#EEF2EB) section washes. Libre Caslon Display headlines with one Libre Caslon italic accent word in wine; Assistant sans for reading and UI. Pill buttons (filled wine, thin wine outline), 16px rounded cards with hairline borders and soft diffused shadows, sage and blush status pills, round photo thumbnails.

STORY: The visitor reads the promise, sees a real-looking vendor list with quotes arriving and the budget moving, understands the five steps (describe, find, contact, compare, decide), sees multi-day planning and sourced prices, and starts planning or plays the tour.

FIRST VIEWPORT: Thin nav (PlusOne wordmark left; How it works, Take the tour centered; Sign in outline pill and Start planning wine pill right). Centered two-line serif headline with "perfect" in wine italic, one centered lede, Start planning and Take the 1-minute tour pills. Lower half: a wide white app preview window on a blush band showing sidebar (Overview, Vendors, Inbox, Guests), "Your vendors" table of four vendors with thumbnails, day and status pills, a committed-budget bar, an "Example" label, and a floating new-reply notification at the right edge.

FORM: Canon register executed against YourDay and Loverly, comp-led, approved comp .impeccable/mocks/landing-comp-a.png (composition A of three), seed key c880b144 (safer re-roll, canon kind). Signature interaction: shortly after load the Henna House reply lands: the notification slides in, the row's pill turns from Email sent to Quote received with its price, and the budget bar grows; reduced motion shows the final state. Tour: a five-step dialog opened from Take the tour / Play the tour.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Approved comp
.impeccable/mocks/landing-comp-a.png (approved by the user 2026-09-17; sidecar .impeccable/mocks/landing-comp-a.png.json)

## Unresolved
- The signed-in app screens and the sign-in page have not been migrated to this world yet.
- Demo wedding removal in the backend and home page is still pending.
