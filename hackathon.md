# Hackathon log

- **Project:** PlusOne
- **Event:** Convex All Gas Hackathon
- **What it does:** Multi-event wedding planner that researches vendors from the open web, emails them from a per-wedding inbox, reads their replies into quotes, and keeps every day, budget line and guest in one live plan.
- **Live app:** https://rapid-albatross-416.convex.site
- **Repo:** https://github.com/sharmilaraghu/PlusOne
- **Frontend:** Convex static hosting
- **Convex deployment:** https://rapid-albatross-416.convex.cloud
- **Components:** @convex-dev/workflow, @convex-dev/workpool, @convex-dev/static-hosting
- **Convex features:** schema, tables, indexes, queries, mutations, actions, internal functions, HTTP actions, scheduled functions, crons, file storage, realtime queries, workflows, workpool
- **Auth:** Convex Auth
- **AI models:** gpt-5.6-luna, gpt-5.6-terra; gpt-image-2 through ElevenLabs for the illustrations
- **Started:** 2026-09-15T15:25:44Z
- **Last updated:** 2026-09-20T04:58:19Z

## Log

### 2026-09-15 - 4a80a0e
Started the project under the name RefundChaser. First commit adds `README.md`;
the branch is `main` and pushed to GitHub. Added hackathon requirement notes under `docs/`
(`docs/requirements.md`, `docs/HackathonDetails.md`), set up the Convex plugin for
Claude Code and the hackathon build-log skill (`.claude/skills/convex-hackathon-skill/`).
No app code or Convex backend existed yet.

### 2026-09-16 - working tree
Pivoted the idea from refund chasing to wedding planning and renamed the project PlusOne
(`package.json`, `README.md`). Wrote the product brief and a six-day build plan
(`docs/WEDDING_IDEA.md`, `docs/PLAN.md`): multi-day events per wedding, vendor research via
Firecrawl, outreach and replies through an AgentMail inbox per wedding, OpenAI for drafting and
quote extraction, Convex for live shared state. Scaffolded Vite + React + Tailwind and the app
pages (sign-in, onboarding with cultural templates, overview with day board and budget bar,
vendors, inbox, people, join). Backend work in progress: 18-table schema with indexes
(`convex/schema.ts`), Convex Auth password sign-in (`convex/auth.ts`, `convex/auth.config.ts`),
workflow, workpool and static-hosting components registered (`convex/convex.config.ts`), first
queries and mutations for weddings, events, slots, vendors, research, quotes, budget and
activity, a Web Crypto Svix verifier for the AgentMail webhook (`convex/lib/svix.ts`), and
helper scripts to register the webhook and replay a signed test event (`scripts/`). Later in the
same session: vendor outreach drafts, an approval gate before sending, and per-message sends queued
on a workpool with retries disabled so no email goes out twice (`convex/outreach.ts`,
`convex/messages.ts`, `convex/lib/pools.ts`); thread list, detail, status and attention handling
(`convex/threads.ts`); invite links that schedule an invite email (`convex/invites.ts`); guest list
groundwork (`convex/guests.ts`); an hourly cron file for follow-ups (`convex/crons.ts`). Installed
Convex project AI files (`npx convex ai-files install`). No Convex deployment yet; nothing deployed.

### 2026-09-18 - a3cb6c0, 01944f4
Shipped the first working app and merged it to `main`. Backend: 18 tables with indexes,
Convex Auth password sign-in, five workflows for onboarding, vendor research, inbound replies,
follow-ups and RSVPs (`convex/workflows.ts`), an hourly follow-up cron, a signed AgentMail
webhook on an HTTP action (`convex/http.ts`, `convex/lib/svix.ts`), and file storage for reply
attachments. Firecrawl searches and scrapes vendor sites (`convex/firecrawl.ts`); OpenAI drafts,
extracts and classifies (`convex/openai.ts`). Deployed to production on Convex static hosting.

### 2026-09-18 - 8c21476, 3c20bb5, 384b02b, 497921f
Rebuilt the signed-in app on one calm palette and rewrote onboarding to ask for the real plan:
which functions on which days, guests per function, the budget split across them, and the feel
the couple is after. The style answers are not decoration — vibes, colours and formality feed
`weddingBrief()`, which is the single context builder behind search planning, vendor cards and
every email PlusOne writes. Added a settings screen so all of it can be changed later.

### 2026-09-18 - 3e27985
Made the money add up under editing. All budget maths moved into one place
(`convex/lib/budget.ts`), so removing a function, re-splitting the budget or changing the total
leaves sum(functions) = total = sum(needs) = sum(budget lines). Verified against the dev
deployment: adding a day, setting it to a typed amount and removing it again held all three sums
equal at every step. Removing a function never destroys work — needs already contacted move to
another day instead of being deleted (`convex/events.ts`, `convex/slots.ts`).

### 2026-09-18 - ed1f0e9
Ranked shortlists, with the evidence shown. The review lookup was measured on its own over 16
vendors, three strategies compared, each recorded rating checked against the page it came from
(`scripts/eval-reviews.mjs`, `docs/research/reviews-eval.json`). Verified coverage went from 44%
to 56% with no wrong numbers, where a wider net reached 69% by importing a staff rating from a
jobs site. Prices now record what they are for, after a caterer was ranked first on a $200
per-head rate read as a total; a rate is multiplied by that day's guests before anything compares
it to the budget. Judged by hand: 9 of 9 rankings agreed with, up from 8 of 9.

### 2026-09-18 - 7e66440
Outreach went hands-off. The couple confirms a shortlist once, having seen who will be written to
and one letter in full; PlusOne sends them all, chases anyone who goes quiet and reads each reply
into a quote. `sendAllForSlot` takes the need rather than a list of message ids, so a draft
written a second later cannot be left behind, and each message keeps its own idempotency key
(`convex/outreach.ts`). A setting keeps the older read-every-email behaviour. Proven end to end
against inboxes created for the test: one confirmation produced exactly three sent messages to
three addresses, with different subjects, bodies and idempotency keys, all delivered.

### 2026-09-18 - db500d7, ccb69ec, 1455c62, e567cc4
Onboarding now asks which vendors the couple still needs and which they have already booked. A
booked need is never researched or emailed and its spend counts against the budget from the first
screen (`convex/weddings.ts`). Replaced the landing page's five-slide tour, which had gone out of
date and still promised couples they would approve every email, with a walkthrough inside the app
that finds each real element by name and so cannot drift (`src/components/Walkthrough.tsx`).
Illustrated the product with generated ink drawings and scenes, and made Western the first
tradition offered and the default.

### 2026-09-18 - 0f32be4
Added the decision screen: what has been asked, who replied and how fast, what has been quoted
and what is booked, then every vendor for a need side by side with price against budget, deposit,
what is and is not included, and Book or Pass on the row (`convex/dashboard.ts`,
`src/pages/DecisionsPage.tsx`). One Convex query, so a reply landing while the couple is reading
moves the board. Replies now carry a structured yes/no/unclear on the couple's actual dates.
Proven with three real replies through AgentMail: read into the board inside a minute as
Quoted / Quoted / They passed, cheapest marked, both deposits and red flags pulled out.

### 2026-09-18 - 576b9b5
Fixed a bug that stopped anyone but us completing the demo. The AgentMail plan caps this account
at three inboxes and all three were taken, so a new sign-up got a wedding with no inbox and every
send failed. `createInbox` now frees a slot first: it gives up the oldest inbox belonging to a
wedding that has never written to or heard from a vendor, never touches one carrying real
correspondence or the fallback, and clears the address on the wedding that gives one up
(`convex/agentmail.ts`, `convex/weddings.ts`). Verified on the live account — three weddings
created back to back each got their own address and the count held at the cap.

### 2026-09-18 - aa597c5
Brought the build log back in line with the repo, then deployed everything to production:
Convex functions pushed, the `threads.by_slotId` index added, and the site published to
Convex static hosting. Checked the live URL afterwards by signing up as a new account and
walking the whole flow — the six-step onboarding completed, the wedding was created and it
was given its own AgentMail inbox, with no page errors. The AgentMail webhook is registered
against both the production and dev deployments, so replies route to whichever holds the
thread. Also researched what four other planning products actually do, marking each feature
seen or claimed (`docs/COMPETITOR_FEATURES.md`).

Known gap: `main` is still behind; the work described above sits on `feat/functionality`.

### 2026-09-18 - 1425439
Guests and the assistant were the last two screens that were promises rather than
features: Guests called no guest API at all, and the assistant said it was "on its way".
Guests now adds people, shows who is coming against who has not answered, and invites
everyone with an address in one go (`src/pages/GuestsPage.tsx`). Proven end to end on the
dev deployment: an invitation went out from the wedding inbox, a guest replied in plain
words, the signed webhook routed it as a guest reply and the list updated itself with the
dietary note. That round trip found a bug — the parser anchored on the party size a guest
was invited for and recorded one attendee where the reply said two; it now counts the
people the reply itself names (`convex/openai.ts`).

The assistant answers from the couple's own plan and can start a vendor search or add a
vendor need, with no way to send email by design (`convex/assistant.ts`,
`src/pages/AssistantPage.tsx`). Asked to write to vendors it explains that outreach goes
through the confirmation screen. Convex features: query, mutation, internal query, internal
mutation, internal action, scheduled function.

Also added an error boundary: a thrown authorization error used to unmount the app and
leave a blank page, which is what following a stale link to someone else's wedding looked
like (`src/components/ErrorBoundary.tsx`).

### 2026-09-18 - 79cec4f, efa0203
Forwarded contracts are now read. A PDF sent to the wedding inbox was being stored with a
`contractChecks` row and nothing ever opened it; it is read as it lands, and every flag
must quote the sentence it came from (`convex/openai.ts`, `convex/inbound.ts`). Tested with
a real photography agreement: eight flags, correctly ranked, nothing invented — the
non-refundable deposit, owing the full fee inside ninety days, and liability capped at a
refund if the supplier cannot attend. They appear under "Documents you forwarded" in the
Inbox.

That test exposed a worse bug than the missing feature: a known guest who forwarded
anything had it parsed as an RSVP, so forwarding a contract reset a guest's answer. An
email carrying a document is now routed as a forward whoever sent it, and the parser
answers "pending" when a message does not address attendance at all.

### 2026-09-18 - 2f98cf4
Ran the follow-up phase's own shortened-timer test and found two defects. A follow-up is
sent as a reply to the vendor's last message, which belongs to whichever inbox held it; a
wedding since given a different address cannot see it, so the reply failed and the thread
escalated to needs-attention. It now falls back to a fresh email. The failed message then
blocked every retry, because its idempotency key comes from a counter that only advances on
success — a failed message with a matching key is now rewritten and queued again
(`convex/agentmail.ts`, `convex/messages.ts`). Re-run: one follow-up, sent, counter at one,
next nudge armed three days out, no duplicates across three ticks of the cron.

### 2026-09-18 - 88ace1d, 61779aa
Design pass on the two screens that open the product. The landing hero lost its duplicate
navigation and gained a reel of wedding scenes drifting behind the headline, under a veil
that is heaviest where the type sits; measured across four frames, the darkest five percent
of the backdrop behind the lede still gives 5.5:1. The signed-in home dropped the print wall
that was draining the colour out of the page, and each wedding's polaroid now carries the
plan instead of linking to it — days to go, vendors booked of the total, committed against
the budget, and one next step derived from where the needs actually are
(`convex/weddings.ts`, `src/pages/HomePage.tsx`).

All of the above is merged to `main` and deployed; the earlier gap is closed.

### 2026-09-18 - 438620b
Put the product in the README: nine screenshots of a real wedding built in the app,
walking the flow a couple takes, from the landing page through onboarding, the day plan,
the ranked vendors, the inbox with a forwarded contract flagged clause by clause, the
decision board, the guest list and the assistant (`README.md`, `docs/screenshots/`).

Every mailbox in the images is masked. The wedding's own address keeps its shape so the
per-wedding-inbox idea still reads; our test accounts, a guest, and the real contact
addresses of the businesses the pipeline found are all replaced with placeholders. Those
last ones are small firms whose addresses were scraped from their own sites, and they do
not belong in a public repository.

Two things were corrected before shooting rather than shipped: the guest row showed a
stale attendee count left over from the RSVP bug, and the catering screen still carried a
rating sourced from a food-delivery site, captured before those hosts were refused. The
vendors screenshot uses photography instead, so the images show behaviour the code
actually has.

### 2026-09-18 - 24ef574
Added badges and a sponsor row to the top of the README: the live app and build log first,
then the stack, with Convex, Firecrawl, AgentMail and OpenAI each shown with their real mark
and one line on what they do in PlusOne. The logos are committed under `docs/logos/` rather
than hotlinked. Checked with GitHub's own markdown renderer before pushing: every badge
loads and every table-of-contents anchor resolves.

### 2026-09-18 - ed53e7f
Fixed an inbox-eviction bug that could delete another deployment's data. One AgentMail
account is shared by production and every dev deployment, and each can only see its own
weddings; the eviction treated any inbox it did not recognise as idle. It had already
fired: production, making room for a new wedding, deleted a dev deployment's inbox. Run
the other way, local testing could have deleted a real couple's inbox on production.
Only inboxes a deployment created itself and knows are idle are candidates now; anything
it does not recognise is left alone, and the new wedding shares the fallback inbox
(`convex/agentmail.ts`). Verified on the live account with the cap full: the dev
deployment asked for an inbox, left production's untouched, and fell back. Deployed.

### 2026-09-19 - working tree
PlusOne now carries vendor conversations itself instead of handing every reply to the
couple. A vendor question is answered from the wedding's own facts, turned into one plain
question for the couple, or left alone (thank-yous, out-of-office). The couple answers in
the Inbox and PlusOne writes and sends the email. An over-budget quote gets one polite ask
for something closer, and booking a vendor can confirm with them and thank the others. It
never agrees to pay, sign or accept a price, hands back after three automatic replies, and
review mode holds its emails as drafts (`convex/agent.ts`, `convex/workflows.ts`,
`convex/openai.ts`, `src/pages/InboxPage.tsx`, `src/components/BookButton.tsx`). The
decision prompt was checked alone on ten sample vendor emails, all routed as expected; the
full send path was not run on dev, because its vendor records carry real businesses' addresses.

Sign-in gained Google alongside email and password, and the server now rejects anything
that is not an email address (`convex/auth.ts`). Onboarding saves as the couple goes to a
per-user draft table, so it resumes on any device and is cleared when the wedding is created
(`convex/drafts.ts`). The Feel step is optional and takes inspiration as words, a link or up
to six uploaded pictures, which the style summary reads (file storage, `convex/weddings.ts`).
The budget step splits equally, by percentage sliders or by amount, and every split now rounds
to clean numbers (`convex/lib/templates.ts`). Vendors gained one button that researches every
unresearched need, staggered with scheduled functions (`convex/research.ts`). Mailbox
addresses are no longer shown anywhere the couple looks. Pushed to the dev deployment only;
not yet committed or deployed.

### 2026-09-19 - working tree
Judges can now open the app without signing up. `/guest` signs in with the Convex Auth
Anonymous provider and builds a sample wedding through the same insert path as a real one,
with fictional vendors on the reserved `.example` domain; email on a sample wedding is
recorded as sent but never handed to AgentMail (`convex/demo.ts`, `convex/auth.ts`,
`convex/agentmail.ts`). The landing page carries a judges' link to it. Checked end to end on
dev: guest sign-in, every screen, and answering a vendor question into a simulated send.

Guest replies are read for allergies as their own field (allergen, severity, who), kept even
when a reply says nothing else, and never overwritten by a later one. Checked alone on twelve
sample replies, all read correctly. The vendor agent shares allergens and counts, never
names, with food vendors only (`convex/guests.ts`, `convex/openai.ts`). Research reads up to
nine vendors and can search again past everyone already found, which added six real vendors
in a dev run (`convex/workflows.ts`, `convex/firecrawl.ts`). The Inbox shows a count of
conversations waiting on the couple, the activity feed stays short, a per-browser switch
masks every email address for screen recordings, and six illustrations were redrawn in one
style with ElevenLabs. Pushed to the dev deployment only; not yet committed or deployed.

### 2026-09-19 - bcdffba
Vendors often put the whole quote in a PDF and write "see attached". The attachment is now
read with the email, so those prices, deposits, inclusions and validity dates become a quote
card marked as read from the PDF, and only a document that really is a contract goes on to
the contract check — brochures and menus no longer do. Attachments open from the conversation
in one click (`convex/openai.ts`, `convex/agentmail.ts`, `convex/threads.ts`). Checked on
three PDFs written for the test: a quote whose prices exist only in the attachment, a
contract, and a brochure; each was routed correctly.

### 2026-09-20 - e11f634
A day of making the plan match how a real wedding is run. Needs can be moved between days,
and a need covering several days can be split into one per day — two venues, or a different
florist for the ceremony and the reception — each with its own vendors, budget and booking,
the budget divided by guest count (`convex/slots.ts`, `src/pages/VendorsPage.tsx`). Every
conversation now has a box to write to a vendor at any point, either as notes PlusOne turns
into the email or as words sent exactly; Decisions links to it from every row, booked ones
included, and a booked vendor's open question stays under "Needs you"
(`convex/agent.ts`, `src/pages/InboxPage.tsx`, `src/pages/DecisionsPage.tsx`). Research shows
all three searches it runs and starts from the couple's own style words, and the shortlist is
now counted, filterable and shown on Decisions. Deployed.
