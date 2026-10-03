---
name: PlusOne
description: A calm editorial planner for any occasion you host yourself, where the plan itself is the hero.
colors:
  accent: "#1f4d3f"
  accent-deep: "#173a30"
  accent-soft: "#eaf1ec"
  wash: "#f4efe4"
  paper: "#fefcf7"
  cream: "#fffdfa"
  ink: "#1e1e1e"
  ink-deep: "#222221"
  muted: "#4f504f"
  quiet: "#6f6e6b"
  line: "#ece7e2"
  rule: "#d9cfc8"
  rose: "#fbefe3"
  sage: "#f2f6ef"
  sand: "#f8f4e8"
  sky: "#eef3f7"
  ok: "#202e1e"
  ok-bg: "#e3eadf"
  warn: "#7a5a12"
  warn-bg: "#f6efd9"
  bad: "#8a2a2a"
  bad-bg: "#fbe7e4"
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
  page-title:
    fontFamily: "EB Garamond Variable, EB Garamond, ui-serif, Georgia, serif"
    fontSize: "2.4rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.005em"
  title:
    fontFamily: "EB Garamond Variable, EB Garamond, ui-serif, Georgia, serif"
    fontSize: "1.4rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.005em"
  accent-italic:
    fontFamily: "EB Garamond Variable, EB Garamond, ui-serif, Georgia, serif"
    fontSize: "inherit"
    fontWeight: 400
  body:
    fontFamily: "Work Sans Variable, Work Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.05rem, 1.3vw, 1.2rem)"
    fontWeight: 400
    lineHeight: 1.65
    fontFeature: "'tnum' 1"
  body-ui:
    fontFamily: "Work Sans Variable, Work Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
    fontFeature: "'tnum' 1"
  label:
    fontFamily: "Work Sans Variable, Work Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
  field-label:
    fontFamily: "Work Sans Variable, Work Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "0.08em"
rounded:
  print: "6px"
  row: "10px"
  field: "12px"
  panel: "14px"
  card: "18px"
  pill: "999px"
spacing:
  container: "1180px"
  gutter: "clamp(20px, 4vw, 48px)"
  section: "clamp(72px, 9vw, 128px)"
  card-pad: "24px"
  sidebar: "252px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.paper}"
    typography: "{typography.body-ui}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.accent-deep}"
  button-ghost:
    textColor: "{colors.accent}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "44px"
  button-ghost-hover:
    backgroundColor: "{colors.accent-soft}"
  button-quiet:
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "44px"
  button-quiet-hover:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
  button-sm:
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "36px"
  button-lg:
    rounded: "{rounded.pill}"
    padding: "0 28px"
    height: "52px"
  input:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    typography: "{typography.body-ui}"
    rounded: "{rounded.field}"
    padding: "10px 14px"
  chip-ok:
    backgroundColor: "{colors.ok-bg}"
    textColor: "{colors.ok}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  chip-pending:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  chip-quiet:
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  chip-warn:
    backgroundColor: "{colors.warn-bg}"
    textColor: "{colors.warn}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  card:
    backgroundColor: "{colors.cream}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-pad}"
  card-quiet:
    backgroundColor: "{colors.cream}"
    rounded: "{rounded.panel}"
  nav-row:
    textColor: "{colors.ink}"
    typography: "{typography.body-ui}"
    rounded: "{rounded.row}"
    padding: "10px 12px"
  nav-row-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
  polaroid:
    backgroundColor: "#ffffff"
    rounded: "{rounded.print}"
    padding: "10px 10px 12px"
---

# Design System: PlusOne

## Overview

**Creative North Star: "The Host's Notebook"**

PlusOne reads like the notebook a well-organised host keeps for an occasion: warm ivory paper, one forest-green ink for the name on the cover and every decision point, and loose line drawings of the day itself (lanterns going up, a table being laid, a toast) drawn in that same ink. Headings are set in EB Garamond with a single italic word carried in green. Everything you read at length or operate is set in Work Sans.

The density is calm and editorial. The public page breathes in full-width bands (72 to 128px of block padding) inside a 1180px column, and it proves the product by showing it: a vendor table, a quoted reply, a list of days and a shared plan appear as quiet cream cards, each marked "Example". The signed-in app is the same notebook put to work: a cream sidebar, cream cards with hairline borders on ivory, soft pill buttons and status chips, and one event per pinned, slightly tilted print on the home screen. Motion is one gentle settle, used when something in the plan arrives or changes, and a slow left-to-right draw when an illustration appears.

One theme serves both surfaces. The app's colour tokens are the source of truth and the public page reads its colours from them, so the two cannot drift apart. The earlier wine, blush and bride-and-groom identity is retired and none of its vocabulary returns.

**Key Characteristics:**
- Warm ivory ground with full-width sand and sage section washes.
- One forest-green ink: wordmark, primary pills, the italic heading word, active rows, progress fills, focus.
- EB Garamond headings with a single green italic accent word; Work Sans for everything functional.
- Pill buttons: filled green, thin green outline, or quiet hairline.
- Cream cards (14 to 18px corners) with hairline borders and soft, green-neutral pooled shadows.
- Line illustrations in green ink showing many kinds of occasion, never one kind of host.
- Status as soft chips; people and vendors as circles; tabular numerals everywhere.
- Every illustration of the product with made-up data is labelled "Example".

## Colors

A warm, low-chroma paper palette with one saturated ink and a small set of quiet semantic hues.

### Primary
- **Forest Ink** (accent): the wordmark, filled pills, outline pill strokes and text, the italic accent word in headings, step numerals, active navigation rows, the unread count, progress fills, links inside cards, text selection, the caret and every focus ring.
- **Deep Forest** (accent-deep): hover state of the filled pill only.
- **Pale Leaf** (accent-soft): hover fill of outline and quiet pills, the active navigation row, round icon and avatar grounds, the "contacted" chip, the demo banner, the input focus halo, and the faint wash at the top of the home screen.

### Secondary
- **Warm Sand Wash** (wash): the broad band behind the app preview in the hero and the alternate full-width section ("Plan together").

### Tertiary
- **Apricot, Sage, Sand, Sky** (rose, sage, sand, sky): the four day tints. Each day of an event takes one, by its order, on the header strip of its card only. Sage also serves as one full-width section wash on the public page. The first tint keeps its token name `rose`; its value is a soft apricot.
- **Moss on Leaf** (ok on ok-bg): good news chips: booked, quoted, replied, yes, "Added to your budget".
- **Ochre on Straw** (warn on warn-bg): needs attention, maybe, failed.
- **Brick on Blush Paper** (bad on bad-bg): errors and destructive text actions. Brick is its own hue and is never substituted with the accent.

### Neutral
- **Ivory Paper** (paper): the page ground everywhere, and the text colour on filled green.
- **Card Cream** (cream): cards, the sidebar, the app preview window, notifications.
- **Letterpress Ink** (ink, ink-deep): body text and serif headings.
- **Graphite** (muted): secondary reading text, meta lines, resting icons.
- **Pencil** (quiet): the least emphatic text: field labels, placeholders, timestamps, "Example" marks.
- **Hairline** (line): card borders, dividers, the navigation rule, quiet-pill strokes, the empty part of a progress track.
- **Ruled Line** (rule): the stronger top rule above each step in the five-step sequence.
- White (#ffffff) appears only as the ground of inputs, inner fact tiles and pinned prints.

### Named Rules
**The One Ink Rule.** Forest green is the only brand ink. It marks the name, the next action, the one italic word and whatever is active or focused; it never fills a section or a card. Moss, ochre and brick are status signals, not second accents.

**The Wash Rule.** Sand, sage and the day tints are grounds, never text colours. A section takes one wash edge to edge and the cards inside it stay cream; a day card takes its tint on the header strip and nowhere else, and never as a coloured side border.

## Typography

**Display Font:** EB Garamond Variable (with Georgia)
**Body Font:** Work Sans Variable (with system-ui)

**Character:** A bookish old-style serif for promises, names and amounts, paired with a plain, friendly sans for everything you operate. The serif's italic is the system's one flourish.

### Hierarchy
- **Display** (400, container-scaled to 94px at the 2048px hero frame, clamp(2.3rem, 10.5vw, 3rem) below 820px, line-height 1.02): the public hero headline only. It carries slight positive tracking (0.012em) and a hairline text stroke for ink weight; both are hero-only treatments.
- **Headline** (400, clamp(2.1rem, 3.6vw, 3.2rem), 1.08, balanced wrap): section heads on the public page.
- **Page title** (500, 2rem rising to 2.4rem from 768px, tight leading): the one heading at the top of each app page.
- **Title** (500 in the app, 400 on the public page; 1.3 to 1.55rem, 1.1 to 1.25): day names, card titles, step titles, event names, quoted reply text, empty-state lines. Small serif runs (1 to 1.25rem) name the event in the sidebar and lead the demo banner.
- **Body** (400, clamp(1.05rem, 1.3vw, 1.2rem), 1.65, max 38rem): public-page ledes; 1rem / 1.55 inside steps.
- **Body UI** (400, 0.875rem): the working size of the app: rows, meta lines, buttons, navigation.
- **Label** (500, 0.75rem; 0.6875rem for the smallest counts and captions): chips, small buttons, timestamps, "Example" marks.
- **Field label** (600, 0.75rem, 0.08em tracking, uppercase, Pencil): labels above form fields and column heads of data tables. This treatment belongs to fields and columns only.

### Named Rules
**The One Italic Rule.** Each heading carries at most one italic Garamond word or phrase, in Forest Ink (the hero's is also set at 0.88em). The wordmark does the same: Plus*One*. Body text is never italicised for emphasis.

**The Serif Speaks, Sans Works Rule.** Serif is for headings, names, quoted words and the headline amount of a budget; buttons, tables, chips, fields and labels are always Work Sans.

**The Tabular Rule.** Tabular numerals are on for the whole surface, so money and counts line up without special handling.

## Layout

The public page is a stack of full-width bands (ivory, sage, ivory, sand, ivory) with a centred 1180px container and fluid gutters (20 to 48px). Section heads are centred for the five-step sequence and the closing call and left-aligned in split sections, which pair a 38rem text column with one proof card across two equal columns (40 to 96px gap), alternate sides, and stack below 960px.

The hero is a measured frame: a 2048 x 1152 aspect box whose children are positioned as percentages and sized in container-query units, so it scales as one picture. Line illustrations cross-fade behind the headline under an ivory veil that is heaviest where the type sits, and the app preview straddles the edge where ivory meets the sand band. Below 820px the frame is abandoned for a normal stack: a 68px bar with a hairline beneath, headline, lede, two full-width pills, then the preview with its sidebar and price column dropped.

The five-step sequence is editorial, not cards: five columns, each opened by a ruled line, an italic green numeral, a serif title and one line. Below 960px it becomes one column with the numeral in a 3rem gutter.

The app is a two-column shell from 768px: a sticky 252px cream sidebar with a hairline right edge (wordmark, account chip, event name and date, navigation, a tour prompt, role and sign-out at the foot) and a main column padded 32px by 40px that holds a 1180px page. Below 768px the sidebar becomes a top block and its navigation scrolls sideways. Each page opens with one serif title, one meta line and at most one action. Cards sit 16 to 24px apart, with 24px of internal padding and rows divided by hairlines. The home screen lays events out as pinned prints in a wrapping row with generous gaps (40px across, 48px down).

## Elevation & Depth

Depth is soft and ambient. Cards rest on a large-blur shadow with a strongly negative spread, so the shadow pools beneath the card rather than outlining it, and the hairline border does the edge work. Shadows are tinted a dark neutral green (rgba(40, 50, 42, ...)), never black. Quiet cards, chips, inputs and navigation are flat.

### Shadow Vocabulary
- **Card pool** (`box-shadow: 0 18px 40px -26px rgba(40, 50, 42, 0.28)`): the standard card. Public-page proof cards use the same shape at 0.3.
- **Print drop** (`box-shadow: 0 16px 34px -18px rgba(40, 50, 42, 0.42)`): a pinned print at rest; on hover it lifts to `0 30px 56px -22px rgba(40, 50, 42, 0.5)`.
- **Window lift** (`box-shadow: 0 10px 40px rgba(40, 50, 42, 0.1), 0 1px 2px rgba(40, 50, 42, 0.06)`, at hero-frame scale): the app preview window; its notification uses `0 12px 34px rgba(40, 50, 42, 0.12), 0 1px 2px rgba(40, 50, 42, 0.05)`.
- **Inset stroke** (`box-shadow: inset 0 0 0 1.5px` accent, or `inset 0 0 0 1px` line): how outline and quiet pills draw their edge without changing size.
- **Focus halo** (`box-shadow: 0 0 0 3px` accent-soft): inputs on focus, with the border turning accent.

### Named Rules
**The Pooled Shadow Rule.** Shadows are diffused, pooled beneath the surface and tinted green-neutral. No hard offset shadows, no black or warm-red drop shadows.

## Shapes

Everything pressed like a button is a full pill (999px), and so is every chip and progress track. Containers are gently rounded and step with their size: 10px for navigation rows, 12px for inputs and inner fact tiles, 14px for quiet cards, tables and banners, 18px for cards and the preview window. Borders are 1px hairlines (1.5px for the outline pill's stroke). People and vendors are always circles: photo thumbnails, initial avatars, icon grounds. Pinned prints are the one sharp-cornered object (6px), white-bordered and tilted a degree or two by hand, straightening on hover. Icons are a single 1.5px round-cap stroke on a 24px grid, drawn inline.

## Components

### Buttons
Refined and unhurried; nothing shouts.
- **Shape:** full pill (999px). 44px tall with 24px side padding and 0.875rem medium text; 36px small; 52px large for a section's closing call; full width and 50px on phones in the hero.
- **Primary:** Forest Ink fill, Ivory Paper text.
- **Ghost / Outline:** transparent with a 1.5px inset Forest Ink stroke and Forest Ink text; Pale Leaf fill on hover.
- **Quiet:** transparent with a 1px inset Hairline stroke and Graphite text; Pale Leaf fill and Forest Ink text on hover.
- **Hover / Focus:** primary deepens to Deep Forest; colour changes take about 200ms. Focus is a 2px Forest Ink outline offset 3px that follows the pill.
- **Disabled:** half opacity, not-allowed cursor.

### Chips
- **Style:** full pill, 0.75rem medium, 4px by 10px.
- **Tones:** Moss on Leaf for settled good news; Forest Ink on Pale Leaf for sent and waiting; Graphite on a 60% Hairline fill for drafts and not-yet; Ochre on Straw for anything that needs the host. One component maps every status to a tone, so a status never picks its own colour.
- **Role tag (public page):** Forest Ink text with a 1px inset pale green stroke.

### Cards / Containers
- **Corner Style:** 18px for cards, 14px for quiet cards.
- **Background:** Card Cream on Ivory Paper; inner tiles white.
- **Shadow Strategy:** card pool for cards; quiet cards are flat.
- **Border:** 1px Hairline, always.
- **Internal Padding:** 24px across, 12 to 20px down per row; rows separated by hairlines and washing to half-strength Pale Leaf on hover.
- **Example mark:** any card showing made-up data carries a small "Example" in Pencil at its top-right corner.

### Inputs / Fields
- **Style:** white ground, 1px Hairline border, 12px corners, 10px by 14px padding, 0.875rem text, Pencil placeholder.
- **Label:** the field label style above the field, always visible.
- **Focus:** border turns Forest Ink with a 3px Pale Leaf halo. The caret is Forest Ink.
- **Error:** a line of Brick text beneath, announced as an alert.

### Navigation
- **Public page:** a thin bar on ivory with the Garamond wordmark in Forest Ink, an outline "Sign in" pill and a filled "Start planning" pill at the right, and a full-width hairline beneath. On phones "Sign in" becomes a plain green text link.
- **App sidebar:** rows of a 19px stroke icon and a 0.875rem label, 10px corners. Resting rows are ink with Graphite icons and a faint Pale Leaf hover; the active row is Pale Leaf with Forest Ink text, icon and medium weight. A waiting count sits at the row's right as a small filled green circle.
- **Account chip:** a 36px pill with a 1px inset hairline, a round photo or Garamond initial on Pale Leaf, and the person's name.

### Day Card (signature)
A card whose header strip takes the day's tint, with a hairline beneath: the day's name in serif, then guests and budget in Graphite, and a round edit button at the right. Below, each vendor need is a hairline-divided row with its title, best quote and a status chip; a green "more needs" row closes a long list. Editing happens in place inside the strip.

### Pinned Print (signature)
An event on the home screen: a white-bordered print (6px corners, 10px border, print drop shadow) holding a line illustration, then the event name in serif, date and place, and three plain figures. Each print sits at a fixed small tilt and straightens and lifts 6px on hover over 300ms. A dashed-outline card of the same size offers "Plan another". A wall of these prints under an ivory veil is the backdrop for sign-in and reading pages.

### Illustration plates
Line drawings in Forest Ink on ivory, of people preparing and enjoying different occasions. A plate arrives with a left-to-right wipe over 1.1s, as if being drawn, then drifts very slowly (26s, alternating). In the hero four plates cross-fade on a 28s loop, each held about 7s. Under reduced motion they are still.

### App Preview (signature)
The public hero's proof: a cream window with a hairline-edged sidebar (wordmark, stroke-icon rows, the active row in Pale Leaf) and a main pane with a serif title, a vendor table (round photo, name, day, status pill, right-aligned price) and a budget tile with a pill track filling in Forest Ink. A floating notification with a round Pale Leaf icon ground and a green unread dot announces a new reply.

**Signature motion: the reply lands.** The notification rises 14px and fades in (700ms), the row's pill changes to "Quote received" with a small scale pop (600ms), the row glows pale green once (1600ms), and the budget bar grows from 90% (1100ms), all on `cubic-bezier(0.16, 1, 0.3, 1)`. New cards in the app use the same curve for an 8px rise over 350ms. Under reduced motion the final state is shown with no transition.

## Do's and Don'ts

### Do:
- **Do** keep Forest Ink as the single brand ink: wordmark, primary action, one italic heading word, active and focus states.
- **Do** take every colour from the theme tokens, on the public page as well as in the app.
- **Do** separate public-page sections with full-width ivory, sand and sage bands rather than borders or boxes.
- **Do** set headings, names and quoted words in EB Garamond and everything operable in Work Sans.
- **Do** use pills for buttons, chips and tracks, and circles for every person, vendor and icon ground.
- **Do** give cards a 1px hairline border and a pooled, green-neutral shadow.
- **Do** label every illustration of the product that uses made-up data "Example".
- **Do** show errors in Brick with a plain sentence, and keep Brick for errors and destructive actions only.
- **Do** draw icons as inline 1.5px round-cap strokes, and illustrations as green line drawings that show many kinds of occasion and host.
- **Do** honour reduced motion by showing the settled state.

### Don't:
- **Don't** introduce a second accent colour, or use Forest Ink as a section or card fill.
- **Don't** use more than one italic accent per heading, or set buttons, tables, chips or labels in the serif.
- **Don't** use hard offset shadows, black shadows or warm-red tinted shadows.
- **Don't** colour a whole day card, or mark a day with a coloured side border; the tint belongs to the header strip.
- **Don't** let a status choose its own colour outside the four chip tones.
- **Don't** bring back the retired identity: wine ink, blush washes, or drawings centred on a bride and groom.
- **Don't** show example data without its "Example" mark, or invent proof the product does not have.
- **Don't** hard-code a colour that a token already names.

<!-- Status notes (not rules):
- Scope: recorded from the built app and public page (src/index.css, src/landing.css, components and pages) after the forest-green refresh. One theme now serves both surfaces.
- Known drift, colours: src/landing.css still hard-codes neutral greys and near-tokens outside the theme: text greys (#121211, #121212, #171717, #191818, #1c1c1b, #2a2a29, #3f3f3e, #55544f, #5a5a58, #6b6a68, #8e8d8b), surfaces (#fbfaf8, #f9f8f6, #ece9e1, #f3eee4), hairlines (#efebe6, #ebe6e1, #e7e1da, #f0ebe6), green one-offs (#c4d4cb, #a9c2b5, #5f8a5a, #e6f0ea, #55604f, #6d7a66, #2c3b29, #e8eee4) and literal copies of token values (#222221, #6f6e6b, #ece7e2, #d9cfc8, #f2f6ef, #e3eadf, #202e1e). The filled pill's text there is #faf6f4 rather than the paper token. These should resolve to tokens; none is recorded as a colour of the system.
- Known drift, contrast: #8e8d8b on cream or white (fact-tile captions, timestamps) is about 3:1, below AA for small text. It is not a recorded text colour; Pencil (quiet) is the floor.
- Known drift, shadows: the in-app tour card still uses a warm-red shadow, rgba(60, 20, 20, 0.45), and the tour scrim is neutral rgba(30, 30, 30, 0.45). The public-page day list uses rgba(40, 60, 40, 0.35). The rule is the green-neutral tint.
- Known drift, weight: headings are 500 in the app and 400 on the public page. Both are recorded as built; a single weight has not been chosen.
- Not canonized: small uppercase tracked lines placed above a heading or figure (the "Day 1 · Jun 30" line on day cards, the step count in the tour, the stat captions on the guests and decisions pages, two lines in the inbox). The uppercase tracked style is recorded for field labels and table column heads only. Also not canonized: one square-cornered uppercase badge in the inbox.
- Unused: src/landing.css keeps styles for hero text links and a five-step tour dialog that no markup uses; src/styles/comp-layout.css keeps measured regions and font names from an older comp. Neither describes the built surface.
- Tints: the day tints' ruled colours in src/lib/dayTone.ts (#ebcfb4, #c9d8c4, #e6d9b4, #c8d8e4) are defined but not used by any component and are not tokens.
-->
