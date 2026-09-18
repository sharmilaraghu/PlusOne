# PlusOne: phase-by-phase build plan

This plan builds PlusOne one working piece at a time. Every phase has three parts, in this order:

1. **Prove the engine alone.** Before any screen is built, test the one service the phase depends on by itself, with real inputs, and check the output by hand.
2. **Build the flow.** Add the screens and connect them to the verified engine.
3. **Check the flow end to end.** Walk through it as a couple would, and only then move on.

The four technologies each have one clear job:

| Technology | Its job in PlusOne, in plain words |
|---|---|
| **Convex** | The shared memory and the clock. It stores the wedding, days, vendors, emails, quotes and guests, updates every open screen instantly, and runs scheduled jobs such as "follow up in three days". |
| **OpenAI (the LLM)** | The reader and writer. It turns a sentence into a search, reads vendor websites into tidy cards, writes personal emails, reads replies to pull out prices, and understands guest RSVPs written in plain words. |
| **Firecrawl** | The eyes on the web. It searches the internet for vendors and reads their actual websites: packages, prices, capacity and contact email. |
| **AgentMail** | The wedding's mailbox. It creates one real email address per wedding, sends vendor and guest emails, and hands every reply back to PlusOne the moment it arrives. |

## How the application flows

A couple's journey, which every phase serves:

1. **Arrive and understand.** The landing page and a short tour explain what PlusOne does.
2. **Sign up and describe the wedding.** Enter date, city, tradition, guest count and budget. PlusOne lays out the days and the vendors each day needs.
3. **Find vendors.** Ask in plain words. PlusOne reads real vendor websites and shows cards with prices and sources.
4. **Contact vendors.** Pick vendors, review the drafted emails, send from the wedding inbox.
5. **Replies come back.** PlusOne reads them, extracts the quote and updates the budget. Quiet vendors get a polite nudge.
6. **Decide.** Compare quotes side by side and mark one as booked.
7. **Invite guests.** Guests reply in plain words, and the guest list updates itself.
8. **Plan together.** Partner and family join by link and see everything live.

---

## Phase 0: Clean start, design and first-time guidance

**Goal:** a calm, minimal, wedding-appropriate look, plus a first visit that makes clear where to start.

What we do:
- Remove the demo wedding and its seed data entirely. Every couple starts with their own empty wedding.
- Agree the visual direction. It leans toward YourDay's soft, editorial calm and Loverly's romantic tone, and is chosen from design comps before any building.
- Rebuild the landing page with a "Take the tour" walkthrough explaining the five steps: describe, find, contact, compare, decide.
- Give every app screen one clear next step, in the spirit of YourDay's "Next up".

Where each technology is used:
- **Convex** holds accounts and stores whether a person has seen the tour.
- **No AI or email** in this phase.

**Verify independently:**
- Sign up on a phone and on a laptop.
- No demo data appears anywhere.
- A first-time visitor can say what PlusOne does and what to do first after the tour, with no other help. Test this with at least two people who have not seen the app.

**Done when:** the design is approved, the demo is gone, and the tour works on desktop and phone.

## Phase 1: The wedding profile and the multi-day plan

**Goal:** a couple describes their wedding in about two minutes and sees their days, budget and vendor needs laid out.

What we do:
- A short onboarding asks for names, dates, city, tradition, guest count and budget. It starts with one question, the date, like Loverly.
- The tradition template creates the days. For example, Hindu creates Mehndi, Sangeet, Haldi, Ceremony and Reception.
- The budget is split across days and vendor needs.
- An overview board shows every day, with a zoom into each one.

Where each technology is used:
- **Convex** saves the wedding and shows the board live to everyone on it.
- **The LLM** suggests a sensible budget split and a starter checklist for the chosen tradition and city, which the couple can edit.

**Verify independently:**
- Before building screens, run the LLM budget and checklist suggestion on at least six sample weddings: different traditions, cities, budgets and currencies.
- Check by hand that the numbers add up to the total, the vendor needs fit the tradition, and nothing is culturally wrong.

**Done when:** six varied sample weddings produce correct, editable plans, and two browsers see the same board update instantly.

## Phase 2: Vendor research from the open web

**Goal:** a couple types "henna artist in Austin under $1,000" and gets real vendors with prices and sources.

What we do:
- A search box on each vendor need.
- Vendor cards appear one by one, each showing name, starting price, packages, highlights, email if found, and links to the pages the details came from.
- Shortlist a vendor, add a vendor you already know, or add a missing email by hand.

Where each technology is used:
- **The LLM** turns the couple's sentence into good web searches.
- **Firecrawl** runs those searches, skips directories and social media, and reads each vendor's own website.
- **The LLM** reads what Firecrawl collected, throws away pages that aren't real vendors, and writes a tidy card for each.
- **Convex** stores the cards, shows them as they arrive, and remembers results for the same city and category so repeat searches are fast.

**Verify independently (Firecrawl first):**
- Before any screen, run Firecrawl alone on at least ten category and city pairs across two or three countries.
- Record in a simple sheet:
  - How many results are real vendor sites rather than directories.
  - Whether a price was found, and whether it matches the website when checked by hand.
  - Whether a contact email was found.
- Then run the LLM card-writing step on the same pages and compare its cards with the sheet.
- Target: most results are genuine vendors, and no price appears that isn't on the page.

**Done when:** the sheet meets the target, and the search screen shows sourced cards within about half a minute.

## Phase 3: The wedding inbox and vendor outreach

**Goal:** the couple approves personalised emails, and they go out from the wedding's own address.

What we do:
- Every wedding gets its own email address, shown in the app.
- Select vendors and press "Request quotes". PlusOne drafts one personal email per vendor.
- The couple reviews and edits the drafts, then sends. Nothing is sent without approval.
- Each vendor gets its own conversation thread.

Where each technology is used:
- **AgentMail** creates the inbox, sends the emails, and keeps each vendor's thread together.
- **The LLM** writes each email using the wedding's dates, the right day, the guest count and sensible questions for that type of vendor.
- **Convex** stores drafts and sent emails, prevents the same email going out twice, and shows sending status live.

**Verify independently (AgentMail first):**
- Before any screen, use AgentMail alone to:
  - create an inbox;
  - send an email to a team member's own address;
  - reply to it from a personal email account;
  - confirm the reply arrives back and joins the same thread.
- Separately, review ten LLM-drafted emails for different vendor types. Check they are accurate, polite, in the couple's voice, and have no invented details.

**Done when:** a real round trip works, the drafts pass review, and sending twice never produces a duplicate email.

## Phase 4: Reading replies, comparing quotes and moving the budget

**Goal:** when a vendor replies, the quote appears, the budget moves, and the couple can compare and book.

What we do:
- Replies show in a clean inbox grouped by vendor.
- Each reply is summarised: price, deposit, availability, what's included, what isn't, and any deadline.
- A side-by-side quote comparison for each vendor need.
- "Mark as booked" updates the plan and the budget.

Where each technology is used:
- **AgentMail** delivers each reply to PlusOne the moment it arrives.
- **The LLM** reads the reply, decides what kind of reply it is (a quote, a question, not available, or declined), and pulls out the numbers and terms.
- **Convex** matches the reply to the right vendor and wedding, saves the quote, updates the budget, and refreshes every screen instantly.

**Verify independently (the LLM first):**
- Before any screen, collect at least fifteen realistic vendor replies. Include tricky ones: several packages, prices in words, a deposit but no total, "we're booked that day", a question back, and a PDF price list.
- Run the reading step on each and compare the result with a hand-written answer. Target: no invented prices, and unclear cases flagged for the couple instead of guessed.

**Done when:** the fifteen replies are read correctly or flagged, and a real reply sent to the wedding inbox shows up as a quote and moves the budget within a minute.

## Phase 5: Automatic follow-ups

**Goal:** vendors who go quiet get a polite nudge, and the couple is told when to step in.

What we do:
- After three days with no reply, PlusOne sends a short follow-up in the same thread.
- At most three follow-ups, then a "needs you" note for the couple.
- A "Send follow-up now" button.

Where each technology is used:
- **Convex** runs the clock: it checks regularly for threads that are due and makes sure no thread is nudged twice.
- **The LLM** writes a short, friendly follow-up that fits the conversation so far.
- **AgentMail** sends the follow-up inside the original thread.

**Verify independently:**
- Temporarily shorten the waiting time to a few minutes on a test wedding.
- Confirm exactly one follow-up goes out per due thread, in the right thread.
- Confirm it stops after three and flags the couple.
- Confirm a vendor who replies is never nudged again.

**Done when:** the shortened-timer test passes three times in a row with no duplicates.

## Phase 6: Guests and RSVPs by email

**Goal:** guests reply in plain words, and the guest list updates itself.

What we do:
- Add guests by typing or pasting a list, and assign them to days.
- Send invitations from the wedding inbox.
- A guest replies "Yes, two of us, one vegetarian" and the counts and dietary notes update.
- Gentle reminders go to guests who haven't replied, and there are live totals per day.

Where each technology is used:
- **AgentMail** sends invitations and receives guest replies.
- **The LLM** understands the reply: attending or not, how many, which days, dietary needs.
- **Convex** recognises the guest by their email address, updates the list, keeps totals per day, and schedules reminders.

**Verify independently (the LLM first):**
- Before any screen, test at least twenty guest replies in varied styles: "yes!", "can't make the Sangeet but will be at the reception", "we'll be 4 with the kids", non-English greetings, and a reply that is actually a question.
- Target: correct counts and days, and questions passed to the couple rather than treated as RSVPs.

**Done when:** the twenty replies pass, and a real reply from a team member's address updates the guest list live.

**Done, 18 September 2026.** The Guests screen was the last one calling no backend at all. It now adds people, counts who is coming against who has not answered, and invites everyone with an address in one press. Verified end to end: an invitation went out from the wedding inbox, a guest replied in plain words — "there will be two of us, me and my husband David, I'm gluten free" — the webhook routed it as a guest reply and the list updated itself, dietary note included.

The round trip found a real defect. The parser anchored on the number the guest was *invited* for and recorded one attendee where the reply plainly said two; it now counts the people the reply itself names and lets that override the invitation.

## Phase 7: The inbox assistant (forward anything)

**Goal:** the couple forwards any wedding email, receipt, proposal or contract, and PlusOne files it.

What we do:
- Forward to the wedding inbox, and PlusOne works out what it is: a vendor quote, a receipt or payment, a contract, or something to read later.
- Receipts become payments in the budget, and proposals become quotes.
- Contracts get a plain-English red-flag summary covering cancellation rules, date changes, overtime, the deposit, and what happens if the vendor can't attend.

Where each technology is used:
- **AgentMail** receives the forwarded email and its attachments.
- **The LLM** classifies the item, pulls out the useful facts, and writes the red-flag summary.
- **Convex** files the result in the right place and shows it on the right vendor.

**Verify independently:**
- Test at least ten forwarded items: two receipts, two proposals, three contracts in PDF, and three unrelated emails.
- Target: correctly filed or safely set aside, no invented contract terms, and every red flag points to the sentence it came from.

**Done when:** the ten items pass, and a forwarded PDF contract shows its red flags on the vendor.

**Done, 18 September 2026.** A forwarded PDF was being stored and a `contractChecks` row created, but nothing ever read it. It is now read as it lands, and every flag must quote the sentence it came from — a warning nobody can trace back to the page is worse than no warning, because the couple cannot check it. The result appears under "Documents you forwarded" in the Inbox, ranked by severity.

Tested with a real photography agreement: eight flags, correctly ranked, nothing invented — the non-refundable half deposit, owing the full fee inside ninety days, liability capped at a refund if the supplier cannot attend, and the reschedule trap where the supplier being unavailable on the new date counts as the couple cancelling.

That test exposed a worse bug than the missing feature: a known guest who forwarded anything had it parsed as an RSVP, so forwarding the contract reset a guest from "coming, two of us" back to one. An email carrying a document is now routed as a forward whoever sent it, and the parser answers "pending" when a message does not address attendance at all.

## Phase 8: Planning together

**Goal:** partner, parents and wedding party join easily and see the same live plan.

What we do:
- Invite by link, optionally emailed from the wedding inbox.
- Roles: owner, planner (can research and send), viewer (can only look).
- A live activity feed, such as "Sam shortlisted Henna House", "Lumen & Lace replied with a quote".

Where each technology is used:
- **Convex** handles accounts, roles and the live feed, and makes sure viewers can't send or change anything.
- **AgentMail** sends the invite email when an address is given.

**Verify independently:**
- Using three browsers signed in as owner, planner and viewer, confirm each can do exactly what their role allows and nothing more.
- Confirm changes appear on the other screens within a second or two.

**Done when:** the role test passes, and a viewer's attempts to send are refused with a clear message.

## Phase 9 (optional, if time allows): Assistant and inspiration

**Goal:** a helpful wedding assistant, plus a style brief from the couple's inspiration.

What we do:
- **Assistant chat.** It knows the wedding, answers cultural and planning questions, and can start a vendor search or draft inquiries when asked.
- **Paste an inspiration link** such as a Pinterest board, a blog post or a venue page. PlusOne writes a short style brief that shapes vendor searches and emails.

Where each technology is used:
- **The LLM** is the assistant's brain, and can call the same search and drafting steps built earlier.
- **Firecrawl** reads the inspiration page.
- **Convex** stores the chat and the style brief.

**Verify independently:**
- Run the assistant on twenty common questions and five action requests.
- Confirm it never sends email without the couple's approval.
- Read five inspiration links and check the style brief matches the page.

**Done, 18 September 2026.** The assistant answers from the couple's own plan and can do exactly two things: start a vendor search, and add a vendor need. It is given no way to send an email, which is the point — asked to write to vendors it explains that outreach goes through the screen where the couple confirms once.

Verified: asked what was left of the budget it answered $38,150 of $40,000 with $1,850 committed, and noticed unprompted that the DJ quote sits above its planned figure. Asked to find a photographer it started a real research run and said so on the message. Asked to email them it declined and pointed at the right screen. The inspiration half was already done in Phase I.

## Phase 10: Launch and submission

**Goal:** a public, judge-ready app before 22 September 2026, 12:00 PM PT.

What we do:
- Deploy to the public convex.site address with production keys.
- Point the AgentMail webhook at production.
- A final end-to-end run on production:
  1. Sign up.
  2. Describe a wedding.
  3. Research a vendor.
  4. Email your own address.
  5. Reply with a quote.
  6. Watch the budget move.
  7. Send a follow-up.
  8. RSVP as a guest.
- Record a demo video under three minutes.
- Update `hackathon.md`, check the repository is public, and submit.

**Verify independently:**
- A person who has never seen PlusOne opens the live link on their phone and completes the eight-step run above without help.

---

## Revision, 18 September 2026: the five-step flow

The requested flow is: enter wedding details → list everything the wedding needs → rank the top three vendors per need using reviews and prices → send the quote requests automatically → the bride confirms on one dashboard that shows who has replied, the quoted prices, availability and the comparison.

How that maps to the phases above:

| Requested step | In the plan? | Where |
|---|---|---|
| 1. Enter the wedding details | Yes | Phase 1 |
| 2. List every vendor the wedding needs | Yes | Phase 1 (a vendor need per day, from the tradition template) |
| 3. Find vendors with prices | Yes | Phase 2 |
| 3a. Read reviews and rank the top three | **No, missing** | new Phase 2b below |
| 4. Send the quote requests | Partly | Phase 3, but it asked the couple to approve every draft |
| 5. Replies read into structured quotes | Yes | Phase 4 (AgentMail delivers, the LLM extracts) |
| 5a. One decision dashboard with reply status, price and availability KPIs | **No, missing** | new Phase 4b below |
| 5b. The couple confirms and books | Yes | Phase 4 |

Three changes follow.

### Phase 2b (new): Reviews and the top three

**Goal:** for each vendor need, the couple sees a ranked shortlist of three, with a reason for the ranking.

What we do:
- Alongside each vendor's own website, PlusOne gathers what the web says about them: review scores, review counts and recurring praise or complaints.
- Each vendor gets a simple score from three things: what reviewers say, price against the budget for that need, and how well the vendor fits the request (style, city, dates).
- The three best are shown first, each with its price, its rating and a one-line reason, such as "highest rated of the six found, and $400 under your budget". The rest stay available below.
- Every rating links to where it came from, like every price does.

Where each technology is used:
- **Firecrawl** reads review pages and listing pages as well as the vendor's own site.
- **The LLM** turns those pages into a rating, a review count and a short summary, then writes the ranking reason. It never invents a rating that no page shows.
- **Convex** stores the scores so the shortlist is the same for everyone on the plan.

**Verify independently:** run the review gathering alone on at least ten vendors whose public ratings you can check by hand. Compare the recorded rating and review count against the source page. Target: no rating without a source, and ranked order that a person agrees with for at least eight of ten.

**Done, 18 September 2026.** The review lookup was measured on its own over 16 vendors, three strategies against each other, with every recorded number checked against the page it claims to come from (`scripts/eval-reviews.mjs`, raw data in `docs/research/reviews-eval.json`, written up in `docs/research/FIRECRAWL_FINDINGS.md`).

- **Ratings: 44% → 56% of vendors, and every one of them verified.** 100% have a source link, and 100% of the ratings and review counts were found on that page. The obvious wider-net version reached 69% but brought in a staff rating from Indeed and twice traded 19 reviews for 2, so what ships reads every result before choosing: most reviews wins, a vendor's own site can never be its own source, and employment, encyclopedia and food-delivery pages are refused outright.
- **Ranked order: 9 of 9 agreed with, after one real fix.** On the first pass 8 of 9 agreed. The disagreement was a caterer ranked first for a "$200 starting price" that was $200 *per head*. Prices now carry what they are for — `total`, `per_person`, `per_hour`, `per_day` — the ranking multiplies a per-head rate by the guests on that day before comparing it to the budget, and the card says "from $20 per person · about $5,000 for 250 guests · $5,031 under budget". With that in place the caterers rank 4.9/201, then 5.0/18, then 4.9/110, which is the order a person picks.
- **On screen:** the shortlist is split into "The top three" with a numbered rank and the rest below, each card carrying its rating linked to its source, its price against the budget, the one-line reason for its ranking, and what reviewers repeat. "Select these 3 for quotes" hands the shortlist straight to outreach.
- **Still true and said plainly:** 44% of vendors have no public rating anywhere. Those cards say "No public rating found for this one" and are judged on price and fit instead of being dumped to the bottom.

### Phase 3, amended: hands-off sending

The couple confirms the shortlist once, and PlusOne sends every email itself. There is no per-email approval step.
- The confirm screen shows exactly who will be emailed and one draft as a sample, so nothing is a surprise.
- A setting keeps the old behaviour ("let me read each email first") for couples who want it.
- After confirmation the couple does nothing: sending, follow-ups and reply reading all run on their own.

**Verify independently:** confirm a shortlist of three test addresses and check that exactly three emails go out, each personal to its vendor, with no duplicates.

**Done, 18 September 2026.** The per-email approval step is gone. After "Request quotes", one panel shows every vendor who will be written to with the address it will go to, one letter in full, and a single Send button; "Not yet" throws the drafts away. `outreach.sendAllForSlot` takes the need rather than a list of message ids, so a draft written a second later cannot be left behind, and each message keeps its own idempotency key. A couple who would rather read everything first chooses that in Settings → The emails, and the same panel becomes the editable list it replaced.

Measured end to end against three AgentMail inboxes created for the purpose — no real vendor was written to. One confirmation produced exactly three messages, all `sent`, to three different addresses, with three different subjects, three different bodies, three different idempotency keys and three different AgentMail ids. All three arrived. Each was personal: the string band was asked about ceremony and drinks-reception sets, the DJ duo about the PA and lighting, and every letter carried the right dates and the right guest count for each function. Afterwards the need moved to "contacted" on its own and all three threads had a follow-up armed for three days later, which the hourly cron sends without anyone asking.

### Phase 4b (new): The decision dashboard

**Goal:** one screen where the couple decides, without opening an inbox.

What we do:
- A status line per vendor: emailed, replied, quoted, nudged, no answer yet.
- KPIs across the wedding: how many vendors were contacted, how many replied, how many quotes are in, the cheapest and most expensive quote per need, and the total committed against the budget.
- A comparison table per need: price, deposit, what is included, what is not, availability on your dates, and the response time.
- One button per row to book, and one to pass.

Where each technology is used:
- **Convex** keeps the whole board live, so a reply that arrives while the couple is looking updates it in place.
- **AgentMail** delivers the replies that drive every status.
- **The LLM** turns each reply into the structured fields the table compares, including whether the vendor is free on the dates.

**Verify independently:** with three test vendors, reply from three different email accounts with different prices and one "not available". Check the dashboard shows three statuses correctly, the right cheapest quote, and the unavailable vendor marked, within a minute of each reply.

**Done, 18 September 2026.** A "Decisions" screen sits between Vendors and Inbox. Four figures across the top — asked, replied (with how quickly people answer), quotes in, and booked — then one table per need: where each vendor stands, whether they are free on the couple's actual dates, their price against that need's budget with the deposit, what is and is not included, anything worth watching, and Book or Pass on every row. It is one Convex query, so a reply that lands while the couple is reading moves the board under them.

Two things had to change underneath. Replies now carry a structured `availableOnDates` — yes, no or unclear, judged against the couple's real dates — instead of only a sentence of free text, so a comparison table can hold a column for it. And the board reports **booked** money rather than `budgetLines.committed`, which tracks the latest quote until something is booked: showing "$2,400 committed · 0 booked" was a lie the first render made obvious. Where nothing is booked it says what the cheapest quotes would come to instead.

**Measured end to end.** Three replies were sent from AgentMail to the three test vendors' threads: a $1,850 quote free on both dates, a refusal that named the clash ("already booked on 15 February"), and a $2,400 quote free on both. All three routed as `vendor_reply` and were read into the board inside a minute. It showed Quoted / Quoted / They passed, marked the $1,850 as cheapest, marked the third vendor "No" with its reason, and pulled out both deposits ($462 and a non-refundable $1,200) and the red flags. Booking the cheapest from the board moved the slot, the thread and the budget line together — committed $1,850 against $949 planned — and logged it.

## Revision 2, 18 September 2026: the app redesign and detailed onboarding

Reviewing the live app, three problems with the signed-in screens:

1. **The overview is overcrowded**, reading as three competing panes, with a day board that scrolls sideways.
2. **The colour scheme is unprofessional.** Day cards use saturated primaries (red, amber, green, blue) stored per event, clashing with the rest of the product.
3. **Too much white space**, because the main area has no maximum width and spreads across the screen.

Onboarding is also too thin. It never asks how many functions there are, which day each falls on, how many guests each has, how the budget splits per function, or anything about the couple's taste. Template defaults invent those numbers silently.

Decisions taken: one calm palette with quiet tints per day; a two-column overview with the days leading; five-step onboarding capturing per-function detail; a style step capturing vibe words, palette, formality and an inspiration link; every screen redesigned, not just the landing page; and the existing test wedding deleted so nothing looks like real data the couple chose.

Two findings make this cheaper than it looks. The signed-in design system is one 42-line file that every screen renders through, so rewriting its tokens re-skins the whole app at once. And the correct fonts are already downloaded but never referenced, so the app renders in fallback faces because of two wrong values.

### Phase B: the design tokens (about 1.5 hours)
Rewrite the signed-in theme to the approved world: ivory ground, wine accent, blush and sage tints, Libre Caslon headings, Assistant body, pill buttons, softer cards, a page container and aligned numerals. Token names stay the same so no screen needs editing.
**Verify:** every page loads with nothing brown, headings in Caslon, body in Assistant.

### Phase C: the shell (about 2 hours)
Cap the content at a readable width, which is the actual fix for the white space. Rebuild the sidebar in the approved style with line icons. Add three shared pieces: a page header, a status chip and an empty state. Replace the activity feed's emoji with line icons.
**Verify:** navigation highlights correctly, the sidebar still collapses on a phone, and no screen hand-rolls its own status colours.

### Phase D: day colours (about 45 minutes)
Derive each day's tint from its order rather than reading a stored colour, which fixes existing weddings instantly with no migration. The tint appears as a left rule and a tinted strip behind the day name, never as the whole card.
**Verify:** a five-function wedding reads blush, sage, sand, sky, blush, with no saturated colour anywhere except the wine accent.

### Phase E: the new overview (about 3 hours)
A full-width header carrying the budget, the days as the main column, and guests and activity in a narrow rail that drops beneath the days on smaller screens. Cut the vendor-needs list that repeats the days, the dead "last change" line, the separate budget card and the sideways scroll.
**Verify:** at laptop width nothing is stranded at the screen edges; at phone width nothing scrolls sideways.

### Phase F: the backend accepts a real plan (about 2.5 hours)
Wedding creation takes per-function names, dates, guest counts and budgets for every tradition, not just custom. Style fields are stored. The two budget calculations are reconciled so per-function budgets, per-vendor budgets and the total agree exactly; today they cannot. Default dates stop putting two functions on the same day.
**Verify:** create one wedding per tradition, then confirm the three budget totals match.

### Phase G: five-step onboarding (about 4 hours)
1. Couple, dates, city, neighbourhood. 2. Tradition, how many functions and which day each falls on, editable. 3. Guests per function. 4. Total budget with an editable split per function. 5. Style and feel: vibe words, palette, formality, inspiration link.
Everything is prefilled once a tradition is chosen, so the defaults path still takes two minutes.
**Verify:** one wedding per tradition; what the couple typed is what gets created; the defaults path is under two minutes.

### Phase H: editing it all later (about 3.5 hours)
Add the missing operations: remove a function, re-split the budget, remove a vendor need. Inline editing on each day card, a settings screen for the wedding details and style, and an "add a vendor need" panel using the suggestions list that already exists.
**Verify:** rename, move, re-budget and delete days; deleting a day with a booked vendor is refused; the budget totals still agree afterwards.

**Done, 18 September 2026.** The backend gained `events.remove`, `events.setBudgets`, `slots.remove` and a single `convex/lib/budget.ts` where all the money maths now lives, so every edit leaves `sum(functions) === total === sum(needs) === sum(budget lines)` true. `events.add` and `events.update` re-spread the budget too, and a budget typed on a day card is honoured exactly — the other days share what is left, in the proportions they already had. The screens gained inline day editing and "Add a day" on the overview, "Remove this need" on a vendor need, a settings screen, and an "add a vendor need" panel built from `SUGGESTED_CATEGORIES`.

Measured on the dev deployment, one wedding at a total of $40,000: adding a sixth day, setting it to 80 guests and exactly $9,000, then removing it again left all three sums at 40000 at every step, and the day kept the $9,000 that was typed. Removing a function still refuses to remove the only one, moves needs that have been contacted, quoted or booked onto another day rather than deleting them, and `slots.remove` refuses a booked need by name. Repeat edits drift the per-day figures by a dollar or two through rounding; persisting each need's original percentage would remove that, and is noted as optional.

### Phase I: style reaches the machine (about 45 minutes)
Feed the vibe, palette and formality into the one place that builds context for searches, vendor cards and emails, and let formality set the tone of the emails PlusOne writes.
**Verify:** two weddings differing only in formality produce recognisably different emails.

### Order
B, C, D and E first, about seven hours, because together they close all three complaints and can ship on their own. Then F and G for onboarding, H for editing, I for style. None of this touches the vendor ranking screen or the decision dashboard still to come.

## Where we are now (18 September 2026)

- **Phase 0: done.** The landing page is rebuilt in the approved design, the 1-minute tour is live, and the demo wedding is gone from the code and the database. The "watch two people use it" check has not been run.
- **Phases 1 to 6 and 8: code written, not verified.** Onboarding, vendor research, outreach, reply reading, follow-ups, guests and collaboration all exist in `convex/` and in the app screens, from an earlier single sitting. None of it has been through the independent checks above, and the app screens still use the older look.
- **Next: Phase 1 verification**, then Phase 2 and the new Phase 2b, which is where the ranking work starts.

## Status of existing work

Much of the backend for phases 1 to 6 and 8 was written earlier. It is not yet verified, and it still contains the demo wedding. Following this plan means treating that code as a draft:
- Each phase starts with the independent verification above.
- Code that fails the check is fixed before its screens are rebuilt in the new design.

## Revision 3, 18 September 2026: what Loverly does better, and an honest tour

Reviewing loverly.com's four-step sign-up against ours. On substance ours is further
ahead and deliberately so — it asks for the days, the guests per function, the budget
split and the feel, because PlusOne cannot lay out a plan without them. Three things
Loverly does better were taken.

### Phase J: Looking or booked (done, 18 September 2026)

Loverly's fourth step asks who you are hiring and lets you mark each one "Looking" or
"Booked". PlusOne invented the list from the tradition and started every need at
"research", so it would cheerfully go and email the venue a couple signed with a year
ago, while the budget bar claimed nothing was committed.

Onboarding now has a fifth step listing every need for the chosen tradition, each one
Looking, Booked, or not wanted at all, with an optional "already spent" figure on the
booked ones, plus the `SUGGESTED_CATEGORIES` chips for anything missing. A booked need
is created `booked`, is refused by research, and its spend lands on its budget line from
the first screen. A need nobody wants is never created. Because a self-declared booking
has no vendor behind it, `slots.remove` now blocks only on a real booking, so a mis-tick
can still be undone.

**Verified** by creating a Chennai wedding with the venue and attire booked and the
officiant dropped: 10 needs instead of 11, exactly those two `booked`, their spend on
their budget lines, and functions, needs and lines still summing to the total. The
budget warnings that this makes common on day one now name amounts in the couple's own
currency instead of printing raw numbers.

### Phase K: the photograph and the named steps (done, 18 September 2026)

Onboarding is a split screen: a black-and-white editorial wedding photograph beside the
form, changing as the steps go by (generated with the ElevenLabs image API, in
`public/onboarding-*.jpg`). The anonymous progress bars are now named, numbered and
clickable, the two identical "Partner" fields became "Your name" and "Your partner", and
the page says plainly that none of it is final, with "We're still deciding" pencilling in
a date a year out rather than blocking the couple.

### Phase L: an honest tour (done, 18 September 2026)

The landing page's five-slide modal was typed prose with invented examples, shown to
someone who had never seen the app — and by this afternoon it was lying, still promising
couples they would "read and approve every email before it is sent" hours after PlusOne
started sending them itself.

It is deleted. In its place, a walkthrough inside the app, shown once after the first
wedding is built and replayable from "Show me around" in the sidebar. Each step finds a
real element by its `data-tour` name, rings it, dims everything else, and explains that
one thing; a step whose element is not on the page is skipped rather than shown against
nothing. It cannot drift, because it points at the product rather than describing it.
The landing page keeps a five-line "how it works" list, rewritten to match what PlusOne
actually does now.

**Verified** on the real overview: all five steps land on screen at 1512x950, the card
flips above or beside its target rather than off the edge, the tour does not return after
a reload, and "Show me around" brings it back.
