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
- **AI models:** gpt-5.6-luna, gpt-5.6-terra
- **Started:** 2026-09-15T15:25:44Z
- **Last updated:** 2026-09-18T20:05:00Z

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
