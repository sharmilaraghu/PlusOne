---
name: PlusOne
description: Your AI copilot for the perfect wedding, shown as a calm editorial page where the plan itself is the hero.
colors:
  wine: "#74162a"
  wine-deep: "#5e1122"
  ivory: "#fefcf7"
  card: "#fffdfa"
  paper: "#fbfaf8"
  blush: "#fcebea"
  blush-soft: "#f8eceb"
  sage-wash: "#f2f6ef"
  sage-pill: "#e3eadf"
  sage-ink: "#202e1e"
  ink: "#1e1e1e"
  ink-head: "#222221"
  ink-soft: "#4f504f"
  hair: "#ece7e2"
  rule-strong: "#d9cfc8"
typography:
  display:
    fontFamily: "EB Garamond Variable, EB Garamond, Georgia, serif"
    fontSize: "calc(94 / 20.48 * 1cqw)"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "0.012em"
  headline:
    fontFamily: "EB Garamond Variable, EB Garamond, Georgia, serif"
    fontSize: "clamp(2.1rem, 3.6vw, 3.2rem)"
    fontWeight: 400
    lineHeight: 1.08
    letterSpacing: "-0.01em"
  title:
    fontFamily: "EB Garamond Variable, EB Garamond, Georgia, serif"
    fontSize: "1.55rem"
    fontWeight: 400
    lineHeight: 1.15
  accent-italic:
    fontFamily: "EB Garamond Variable, EB Garamond, Georgia, serif"
    fontSize: "inherit"
    fontWeight: 400
  body:
    fontFamily: "Work Sans Variable, Work Sans, system-ui, sans-serif"
    fontSize: "clamp(1.05rem, 1.3vw, 1.2rem)"
    fontWeight: 400
    lineHeight: 1.65
    fontFeature: "'tnum' 1"
  label:
    fontFamily: "Work Sans Variable, Work Sans, system-ui, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  sm: "12px"
  md: "14px"
  lg: "18px"
  dialog: "22px"
  pill: "999px"
spacing:
  gutter: "clamp(20px, 4vw, 48px)"
  container: "1180px"
  section: "clamp(72px, 9vw, 128px)"
  card-pad: "28px"
components:
  button-primary:
    backgroundColor: "{colors.wine}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.pill}"
    padding: "0 28px"
    height: "52px"
  button-primary-hover:
    backgroundColor: "{colors.wine-deep}"
  button-outline:
    textColor: "{colors.wine}"
    rounded: "{rounded.pill}"
    padding: "0 28px"
    height: "52px"
  button-outline-hover:
    backgroundColor: "{colors.blush-soft}"
  status-pill-sage:
    backgroundColor: "{colors.sage-pill}"
    textColor: "{colors.sage-ink}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  role-pill:
    textColor: "{colors.wine}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card-pad}"
  tour-dialog:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.dialog}"
    padding: "28px"
    width: "min(560px, calc(100vw - 32px))"
---

# Design System: PlusOne

## Overview

**Creative North Star: "The Wedding Stationer's Desk"**

PlusOne reads like good wedding stationery laid next to a working planner: warm ivory paper, a single deep wine ink for the brand and every decision point, and soft blush and sage washes that separate sections the way tissue separates cards in an invitation suite. Headlines are set in EB Garamond, with one italic word per headline carried in wine. Everything you read or operate is set in Work Sans.

The density is calm and editorial. Sections breathe (72 to 128px of block padding), content sits in a 1180px column, and proof is shown rather than described: the product's own vendor table, quotes, day list and shared plan appear as quiet cards with hairline borders and soft, diffused, warm-tinted shadows. Motion is one gentle settle, used when something in the plan actually changes.

The world refuses the couple-photo marketplace hero and the generic SaaS feature grid, and it replaced a rejected "Departures Board" world (marigold and navy split-flap signage) that read as an airport. None of that vocabulary returns.

**Key Characteristics:**
- Warm ivory ground with full-width blush and sage section washes.
- One wine accent: brand, primary pills, the italic headline word, active states, focus.
- EB Garamond headlines with a single wine italic accent word.
- Pill buttons only: filled wine or thin wine outline.
- Rounded cards (12 to 18px) with hairline borders and soft diffused shadows.
- Status as soft pills (sage for good news, blush for pending); people and vendors as round thumbnails.
- Tabular numerals across the whole surface.

## Colors

A warm, low-chroma paper palette with one saturated ink.

### Primary
- **Bordeaux Wine** (wine): the brand wordmark, filled primary pills, outline pill strokes, the italic accent word in headlines, step numerals, active nav rows, progress fills, selection and focus rings.
- **Deep Bordeaux** (wine-deep): hover state of the filled pill only.

### Secondary
- **Rose Tissue Blush** (blush): full-width section wash (hero band behind the app preview, Plan together).
- **Pale Blush** (blush-soft): hover fill of outline pills, active sidebar row, avatar and tour icon grounds.

### Tertiary
- **Sage Wash** (sage-wash): full-width section wash (Every day of the celebration).
- **Sage Leaf** (sage-pill) with **Deep Moss** (sage-ink): positive status pills ("Quote received", "Added to your budget") and the live-dot halo.

### Neutral
- **Ivory Paper** (ivory): page ground, nav, closing and footer.
- **Card Cream** (card): app preview window, notification and shared-plan cards.
- **Soft Paper** (paper): inner tables, quote and day-list cards, tour dialog.
- **Letterpress Ink** (ink / ink-head): body text and serif headings.
- **Graphite** (ink-soft): secondary reading text.
- **Hairline** (hair): nav rule, card borders, inactive tour progress.
- **Stitched Rule** (rule-strong): the stronger top rule of the How it works sequence.

### Named Rules
**The One Ink Rule.** Wine is the only saturated color. It marks the brand, the next action and the one italic word; it never fills a section or a card.

**The Wash Rule.** Blush and sage are grounds and soft status fills, never text colors. A section takes one wash edge to edge; cards inside it stay cream.

## Typography

**Display Font:** EB Garamond (with Georgia)
**Accent Italic:** EB Garamond Italic 500
**Body Font:** Work Sans Variable (with system-ui)

**Character:** A high-contrast bookish serif for promises and names, paired with a plain, friendly humanist sans for everything functional.

### Hierarchy
- **Display** (400, container-scaled to 94px at the 2048px comp frame, clamp(2.3rem, 10.5vw, 3rem) below 820px, 1.02): the hero headline only. Slight positive tracking (0.012em) and a hairline text-stroke (0.7px at comp scale, 0.4px on phones) add ink weight to the hairline Display cut; this is a hero-only treatment.
- **Headline** (400, clamp(2.1rem, 3.6vw, 3.2rem), 1.08, balanced wrap): section heads.
- **Title** (400, 1.35 to 2rem, 1.1 to 1.15): step titles, day names, quote text, tour titles, preview window title.
- **Body** (400, clamp(1.05rem, 1.3vw, 1.2rem), 1.65, max 38rem): section ledes and reading text; 1rem / 1.55 inside steps and cards.
- **Label** (400, 0.8 to 0.95rem): table cells, pill text, meta lines, "Example" disclosures, footer.

### Named Rules
**The One Italic Rule.** Each headline carries at most one italic Caslon phrase, in wine (the hero's is also set at 0.88em). Never italicize body text for emphasis.

**The Serif Speaks, Sans Works Rule.** Serif is for headings, names and quoted words; buttons, tables, pills and labels are always Assistant.

## Layout

Sections are full-width bands (ivory, sage, ivory, blush, ivory) with a centered 1180px container and fluid gutters. Section heads are left-aligned in split layouts and centered for sequences and the closing call. Split sections use two equal columns with a 40 to 96px gap and alternate which side holds the proof card; they stack below 960px.

The hero is a measured frame: a 2048 x 1152 aspect box whose children are absolutely positioned from the approved comp's regions and sized in container-query units. Below 820px it abandons the frame and reflows to a normal stack: 68px nav with hairline rule, headline, lede, full-width pills, then the app preview on a blush gradient ground with the sidebar and price column dropped.

How it works is an editorial sequence, not cards: five columns, each opened by a hairline top rule, an italic wine numeral ("01"), a serif title and one line. It becomes a single column with the numeral in a 3rem gutter below 960px.

## Elevation & Depth

Depth is soft and ambient, tinted warm (wine-brown, never neutral black). Cards lift with a large blur and a negative spread so the shadow pools beneath rather than outlining the edge; hairline borders do the edge work.

### Shadow Vocabulary
- **Window lift** (`box-shadow: 0 10px 40px rgba(80,40,40,0.1), 0 1px 2px rgba(80,40,40,0.06)` at comp scale): the app preview window and its notification.
- **Card pool** (`box-shadow: 0 18px 40px -26px rgba(80,40,40,0.3)`): quote and shared-plan cards; the day list uses a sage-tinted variant `0 18px 40px -24px rgba(40,60,40,0.35)`.
- **Dialog lift** (`box-shadow: 0 40px 80px -30px rgba(60,20,30,0.45)`): the tour dialog, over a 35% wine-black backdrop with 3px blur.

### Named Rules
**The Warm Shadow Rule.** Shadows are diffused and warm-tinted. No hard offset shadows, no neutral grey drop shadows.

## Shapes

Everything interactive is a full pill (999px). Containers are gently rounded: 12px for inner fact tiles and live rows, 14px for tables and example lists, 16 to 18px for cards and the preview window, 22px for the dialog. Borders are 1 to 1.5px hairlines. People and vendors are always circles (round photo thumbnails, initial avatars, notification and tour icon grounds). Icons are a single 1.5px round-cap stroke, drawn inline.

## Components

### Buttons
- **Shape:** full pill (999px); 52px tall in sections, 46px in the tour, 50px full-width on phones.
- **Primary:** wine fill, ivory text, Assistant 400.
- **Outline:** transparent with a 1.5px inset wine stroke and wine text.
- **Hover / Focus:** primary deepens to wine-deep; outline gains a pale blush fill; 200ms ease. Focus is a 2px wine outline offset 3px, following the pill shape.
- **Disabled:** 35% opacity.

### Chips
- **Status pill:** sage-pill fill with sage-ink text for received or added states; pale blush fill for pending ("Contacted", "Awaiting reply").
- **Role pill:** wine text with a 1px inset rose stroke (#e2c9ce), 4px 12px.

### Cards / Containers
- **Corner Style:** 18px (cards), 12 to 14px (inner tiles).
- **Background:** card cream or soft paper; inner tiles white.
- **Shadow Strategy:** card pool (see Elevation).
- **Border:** 1px hairline.
- **Internal Padding:** 22 to 28px.
- Every product illustration card carries a small "Example" disclosure above its top-right corner.

### Navigation
Thin top bar on ivory: Caslon wordmark "Plus*One*" in wine (italic "One"), centered text links in ink turning wine on hover, outline Sign in pill and filled Start planning pill, a full-width hairline rule beneath. On phones the links collapse away, Sign in becomes a wine text link, and the rule becomes the bar's bottom border.

### App Preview (signature)
A cream window with a hairline-bordered sidebar (Caslon logo, 1.5px icon rows, active row in pale blush with wine icon) and a main pane: serif title, a soft-paper vendor table (round thumbnail, name, day, status pill, right-aligned price) and a budget card with a pill track filling in wine. A floating notification card (round blush icon ground with a wine unread dot) announces the new reply.

**Signature motion: the reply lands.** The notification rises 14px and fades in (700ms), the row's pill turns to Quote received with a small scale pop, the row glows pale blush once (1600ms), and the budget bar grows from 90% (1100ms), all on `cubic-bezier(0.16, 1, 0.3, 1)`. Under reduced motion the final state is shown without transitions.

### Tour Dialog
A native dialog in soft paper: "Step n of 5" count and round close button, five segmented 4px progress bars (wine current, dusty rose done, hairline pending), a round blush icon ground, serif title, body, a white example list, and Back / Next pills. Each step enters with an 8px rise over 380ms.

## Do's and Don'ts

### Do:
- **Do** keep wine as the single saturated ink: brand, primary action, one italic headline word, active and focus states.
- **Do** separate sections with full-width ivory, blush and sage washes rather than borders or cards.
- **Do** use pills for every button and status, and circles for every person or vendor image.
- **Do** show the product with realistic example data and label each illustration "Example".
- **Do** give cards hairline borders and warm, diffused, negative-spread shadows.
- **Do** keep tabular numerals on for all money and counts.
- **Do** draw icons as inline 1.5px round-cap strokes.

### Don't:
- **Don't** bring back the rejected Departures Board vocabulary: marigold, navy enamel, split-flap modules, lamps, rivets.
- **Don't** open the page with a couple-photo hero or a grid of icon feature cards.
- **Don't** use hard offset or neutral grey shadows.
- **Don't** set buttons, tables or labels in the serif, or use more than one italic accent per headline.
- **Don't** treat the signed-in app look (Fraunces, Inter, cream and brown Tailwind tokens) as a second approved style; it is pending migration to this world.

<!-- Status notes (not rules):
- Scope: only the public landing page (src/pages/LandingPage.tsx, src/landing.css) is built in this world. The signed-in app screens, SignInPage and the join page still use src/index.css (Fraunces, Inter, cream, brown); the user asked for the whole app to be redesigned, so these are an open migration. There is no demo wedding in the product.
- Finish review: two rounds; the last verdict was "fix" (mobile thumbnails regression, headline weight). Both were addressed in the build without a further reviewer pass.
- Known drift: several near-wine literals (#701429, #6f1225, #761628, #63181f, #77202e) and grey literals in landing.css should resolve to the wine / ink tokens; the "Example" labels (#8e8d8b on ivory, #949494 on cream, about 3:1) are below AA for small text and are not a recorded text color.
-->
