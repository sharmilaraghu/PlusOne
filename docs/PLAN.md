# Wedding planner hackathon build plan (YourDay as the base)

## Context

The project pivoted from RefundChaser to wedding planning (brief in `docs/WEDDING_IDEA.md`). You found https://yourdayplanned.com/ ("YourDay: Plan your multi-day wedding without the chaos") and want it as the base, not a copy. I extracted its single-file React landing page: it sells a **multi-day wedding overview** (Kanban per event day, list, calendar, budget of $X / $Y), **natural-language vendor search** with shortlist cards, **AI email drafts sent to N vendors at once + a smart inbox** that extracts quotes and updates the budget, **role-based collaboration with a live activity feed**, a **wedding assistant** that remembers context and offers to draft inquiries, and **spreadsheet import**. It is South Asian-first (Mehndi, Sangeet, Haldi, Nikah, Walima, Anand Karaj, fusion).

Decisions you made: multi-event for any culture (cultural templates, not South Asian-only marketing); Convex Auth password + invite link with roles; all four extras in scope (RSVPs by email, auto follow-ups, contract red-flag check, spreadsheet import); I propose three names.

Deadline: Sept 22, 12:00 PM PT (~6 days). Judging weights: everyday usefulness, Convex depth, real work by OpenAI / Firecrawl / AgentMail, live convex.site URL, `hackathon.md`, video, social post.

**Reuse from the RefundChaser plan (`docs/PLAN.md`)**: static-hosting root-mount routing, Convex Auth password setup + headless JWT keys, `lib/svix.ts` Web Crypto webhook verification, `scripts/agentmail-setup.mjs` + `scripts/fake-webhook.mjs`, workflow component config, send-idempotency pattern, cron follow-up sweep, runtime split (`"use node"` only for Firecrawl/AgentMail SDK files). These are already designed; only the domain changes.

## Name

**PlusOne — Your AI Copilot for the Perfect Wedding** (final, chosen by the user on 2026-09-16). Earlier candidates Baraat, Vowline and Aisle are retired.

## What we borrow from YourDay, what we change

| YourDay | Ours | Why |
|---|---|---|
| Multi-day overview: events as Kanban columns, budget per event | Same model: **Wedding → Events (days) → Vendor slots → Quotes**. Kanban + list + budget bar, live via `useQuery`. | Core differentiator; maps cleanly to Convex live queries. |
| "Verified" vendor directory | **Open-web vendor research via Firecrawl**: search + scrape vendor sites into structured cards with source links. No directory to maintain. | Makes Firecrawl essential, not decorative. |
| AI email drafts + smart inbox | Same, but every wedding gets a **real AgentMail inbox**; replies arrive by webhook, quotes extracted by OpenAI, budget updates live. Plus **auto follow-ups** and **guest RSVP by email**. | AgentMail does the two-way work the reference only mocks. |
| Wedding Assistant chat | **Assistant with tools**: it can search vendors (Firecrawl), draft/send inquiries (AgentMail), adjust budget, answer culture/timeline questions. Remembers wedding profile. | OpenAI is the "brain" wiring the other two. |
| Collaboration + activity feed | Password auth + invite link with roles (`owner`, `planner`, `viewer`) + live activity feed. | Convex depth: auth, multi-user live updates. |
| Import spreadsheet | CSV/XLSX upload → OpenAI maps rows to events/vendors/costs/guests. | Kept, low priority. |
| South Asian-only | **Cultural templates**: Hindu (Mehndi/Sangeet/Haldi/Ceremony/Reception), Muslim (Nikah/Walima), Sikh (Anand Karaj/Reception), Western (Rehearsal/Ceremony/Reception), Jewish, Fusion, Custom. | Broader appeal, still multi-day. |
| Not in YourDay | **Contract/quote red-flag check** on forwarded PDFs. | Our idea; cheap once inbox attachments exist. |

## Sponsor weightage (every feature names its engine)

| Feature | Convex | OpenAI | Firecrawl | AgentMail |
|---|---|---|---|---|
| Onboarding + cultural template → events | schema, mutations | vision → event plan + budget split | inspiration URL (Pinterest/blog) → style summary | inbox created for the wedding |
| Vendor research | cache vendor cards per city/category | query → search terms; rank + summarize scraped pages into cards | **search + scrape** vendor sites (price, packages, capacity, reviews) | — |
| Outreach | drafts table, live status | personalised inquiry per vendor from wedding profile | — | **send** from wedding inbox, one thread per vendor |
| Smart inbox | webhook → `inboundEvents`, live timeline | extract price/availability/deposit/exclusions; classify reply | scrape a link the vendor sends back (price list page) | **receive** via webhook, attachments |
| Follow-ups | cron + workflow | draft nudge | — | reply in thread |
| Guest RSVPs | guests table, live counts | parse "yes, 2 of us, one vegan" | — | bulk send + receive replies |
| Contract check | file storage | red-flag extraction from PDF | — | forwarded attachment intake |
| Assistant | chat table, tool calls run as actions | tool-calling model | tool: `searchVendors` | tool: `draftInquiries`/`send` |
| Collaboration | Convex Auth, roles, activity feed | — | — | invite email sent from wedding inbox |
| Import | storage + mutations | row → entity mapping | — | — |

Demo screen time target: Firecrawl ≈ 30% (vendor research live), AgentMail ≈ 35% (send, reply lands, RSVP lands), OpenAI ≈ visible in every step, Convex ≈ everything updates on a second screen.

## Architecture

```
Browser (Vite + React + Tailwind, convex.site static hosting)
  │ useQuery / useMutation (live)                 
  ▼
Convex
  auth (Password) · schema · queries/mutations
  workflows (@convex-dev/workflow): onboarding, research, outreach, inbound, followUp, rsvp, import
  crons: follow-up sweep, RSVP reminder sweep
  http.ts: /agentmail/webhook (Svix verify) + static routes
  actions:
    openai.ts       (default runtime, ai + @ai-sdk/openai, structured outputs + tool calling)
    firecrawl.ts    ("use node", firecrawl SDK: search, scrape markdown+json)
    agentmail.ts    ("use node", agentmail SDK: inboxes.create, send, reply, get message, attachments)
```

One AgentMail inbox **per wedding** (`inboxes.create` at onboarding, e.g. `priya-sam-<id>@<domain>`), stored on the wedding. Webhook routes by `inbox_id` → wedding, then by thread → vendor thread / guest / unknown.

## Data model (`convex/schema.ts`)

- `weddings`: name, partner names, date range, city, currency, totalBudget, culture template, style summary, inboxId, inboxAddress, createdBy.
- `members`: weddingId, userId, role (`owner|planner|viewer`), invitedEmail. Index `by_weddingId`, `by_userId`.
- `invites`: weddingId, token, role, email, acceptedBy?. Index `by_token`.
- `events`: weddingId, name, dayIndex, date, guestCount, budget, color, order. Index `by_weddingId`.
- `vendorSlots` (a need, e.g. "Photographer for Sangeet+Ceremony"): weddingId, eventIds[], category, budget, status (`research|contacted|quoted|booked`). Index `by_weddingId`, `by_weddingId_and_status`.
- `vendors` (researched cards): weddingId, slotId?, name, website, email?, phone?, city, category, startingPrice?, priceNotes, packages[], capacity?, ratingText?, highlights[], sourceUrls[], scrapedAt. Index `by_weddingId`, `by_slotId`.
- `threads`: weddingId, vendorId, agentmailThreadId, status (`draft|sent|replied|quoted|booked|declined|needs_attention`), lastMessageId, nextFollowUpAt?, followUpCount. Index `by_weddingId`, `by_agentmailThreadId`, `by_status_and_nextFollowUpAt`.
- `messages`: threadId?, weddingId, direction, kind (`inquiry|follow_up|vendor_reply|rsvp_invite|rsvp_reply|guest_question|notification`), status, subject, bodyText, agentmailMessageId, attachments[{storageId,filename,contentType}], extracted? (price, deposit, availability, exclusions, deadline). Index `by_threadId`, `by_agentmailMessageId`.
- `quotes`: weddingId, slotId, vendorId, messageId, total, deposit, currency, includes[], excludes[], validUntil?, redFlags[]. Index `by_slotId`.
- `budgetLines`: weddingId, eventId?, slotId?, label, planned, committed, paid. Index `by_weddingId`.
- `guests`: weddingId, name, email, side, party size, rsvp (`pending|yes|no|maybe`), attending count, dietary, eventIds[], lastRemindedAt. Index `by_weddingId`, `by_email`.
- `tasks`: weddingId, title, dueAt, eventId?, done, autoSource?. Index `by_weddingId`.
- `chats` / `chatMessages`: assistant history per wedding (role, content, toolCalls).
- `activity`: weddingId, actorUserId?, actor label ("Vendor: Raj Photography"), type, text, refs. Index `by_weddingId` (feed = last 50).
- `inboundEvents`: dedupe on agentmailMessageId (as in RefundChaser).
- `contractChecks`: weddingId, storageId, vendorId?, summary, flags[{severity, clause, why}].

## Functions and workflows (object form, validators, `.withIndex`, all public functions check membership via `lib/auth.ts requireMember(ctx, weddingId, minRole)`)

- **Onboarding**: `weddings.create` (template → `events` rows, default `vendorSlots` per template, budget split by OpenAI) → `onboardingWorkflow`: `agentmail.createInbox` → `firecrawl.readInspiration(url?)` → `openai.summariseStyle` → activity "Your wedding inbox is ready".
- **Vendor research**: `research.start({slotId, query})` → `researchWorkflow`: `openai.planSearch` (terms, city, category) → `firecrawl.searchVendors` (search with `scrapeOptions markdown`, limit 8) → `firecrawl.scrapeVendor` top 5 (`formats: ['markdown', {type:'json', schema, prompt}]`) → `openai.buildCards` → `vendors.upsertMany` (cards appear one by one, live) → slot status `research`. Cache by `(city, category)` for 7 days.
- **Outreach**: `outreach.draft({slotId, vendorIds[]})` → `openai.draftInquiry` per vendor (personal, includes dates/guest counts/event names) → `messages` drafts. `outreach.send` (planner+) → `outreachWorkflow` per vendor: `agentmail.send` `{retry:false}` → thread `sent`, `nextFollowUpAt = +3d`, activity.
- **Inbound** (`http.ts` → `inbound.claim` → `agentmail.ingestInbound`): route by inbox → wedding; thread hit → `inboundWorkflow`: store message + attachments → `openai.extractReply` (classification: `quote|question|declined|available|other`; structured price/deposit/availability/exclusions/redFlags) → create `quotes` + update `budgetLines.committed` → thread status → activity "Raj Photography replied: $3,200, available". Guest email hit (`guests.by_email`) → `rsvpWorkflow`. Unknown sender with PDF → `contractChecks` intake; else `needs_attention`.
- **Follow-ups**: `crons.interval(1h)` → `followups.tick` → `followUpWorkflow` (max 3, `openai.draftFollowUp`, `agentmail.reply`).
- **RSVPs**: `guests.importCsv` / `guests.add`; `rsvp.sendInvites({eventIds})` (planner+) → `openai.draftInvite` once → `agentmail.send` per guest (batched via workpool, `retry:false`) ; `rsvpWorkflow` on reply → `openai.parseRsvp` → guest patched → counts live; `crons` weekly reminder to `pending`. Guest questions → `openai.answerGuest` from wedding facts, auto-reply if confident, else task for couple.
- **Contract check**: `contracts.upload` or forwarded PDF → `openai.checkContract` (file part) → flags shown on vendor card.
- **Assistant**: `assistant.ask({weddingId, text})` → `openai.assistant` action with tools `searchVendors`, `draftInquiries`, `getBudget`, `addTask`, `answerCultureQuestion`; tool results write through the same mutations, so the UI updates live while it "thinks". Streams via `chatMessages` patches.
- **Collaboration**: `invites.create({role})` → link `/join/<token>` + `agentmail.send` invite email; `invites.accept` → `members`. `activity.list` powers the feed; every mutation logs.
- **Import**: `imports.upload` → `openai.mapRows` (CSV text; XLSX parsed client-side with SheetJS to CSV) → preview → `imports.commit`.

## Frontend (Vite + React + Tailwind v4, react-router)

Pages: `SignIn`, `Onboarding` (3 steps: couple & dates → culture template & events → budget & inspiration link), `Overview` (Kanban of events with vendor slots, budget bar, "Next up" tasks, activity feed rail), `Vendors` (slot list; research panel with live cards, shortlist, "Request quotes" → draft review modal → send), `Inbox` (threads, extracted chips, quote compare table per slot, "Mark booked", attention items), `Guests` (list, RSVP counts, send invites, reminders), `Assistant` (chat with visible tool steps), `Members` (invite link, roles), `Import`, `Join/:token`, `HowItWorks`.

Design: borrow YourDay's tone (warm off-white, one accent, event colour chips) but our own layout and copy. Mobile-first, works at 360px.

## Build order (Sept 16 → 22)

**Day 0 (today)** — Scaffold + plumbing. Vite/React/Tailwind, `npx convex dev`, static hosting root-mounted, Convex Auth password (JWT keys via jose), `convex.config.ts` (workflow, workpool, staticHosting), schema, `lib/auth.ts`, sign-in, onboarding form creating wedding/events. Rename repo docs (`README.md`, `hackathon.md` header) to the new name. Set `OPENAI_API_KEY`, `FIRECRAWL_API_KEY`, `AGENTMAIL_API_KEY`, `AGENTMAIL_WEBHOOK_SECRET`. Verify: sign up → wedding with template events visible live.

**Day 1** — Overview + Vendor research (Firecrawl showcase). Kanban, budget bar, `researchWorkflow`, live vendor cards with source links, shortlist. Verify: `npx convex run firecrawl:searchVendors '{"query":"wedding photographer Austin"}'` returns cards with prices; UI fills in live.

**Day 2** — Outreach + Inbox (AgentMail showcase). Per-wedding inbox creation, draft review, send, webhook, `inboundWorkflow`, extraction, quotes + budget update, activity feed. Verify with `fake-webhook.mjs` and a real reply from your own address; tampered signature → 401; duplicate → ignored.

**Day 3** — Follow-ups + RSVPs. Cron sweep, follow-up thread replies, guests page, invite send, RSVP parse, reminders, guest Q&A. Verify: reply "Yes, 2 of us, one vegan" → counts update on a second device.

**Day 4** — Assistant with tools + Collaboration. Tool-calling assistant that triggers research and outreach; invite links, roles, viewer restrictions, activity feed polish. Verify: viewer cannot send; assistant "find 3 DJs and email them" produces cards then sent threads.

**Day 5** — Contract check + Import + seed + prod deploy. `checkContract`, CSV import, `seed.ts` demo wedding (one quoted thread, one booked, RSVP mix), `convex-reviewer` pass, `npx convex deploy`, prod env vars, prod AgentMail webhook, `npm run deploy`. Verify on phone at the convex.site URL.

**Day 6 (Sept 22 morning)** — Video (<3 min: onboarding → research live → send → reply lands → RSVP lands → assistant), `/hackathon` log update, social post, submit at vibeapps.dev before 12:00 PT.

If behind schedule, cut in this order: Import → Contract check → guest Q&A auto-reply → assistant tools (keep chat) → RSVP reminders. Never cut: research, outreach, inbox extraction, live budget, follow-ups.

## Verification (end to end)

1. Register on a phone; onboarding creates events from the chosen template and an inbox address appears.
2. Research "wedding photographers in <city> under $3,500": cards with prices and source links appear one by one within ~30s; MCP `data` shows `vendors` rows with `sourceUrls`.
3. Select 3 vendors → "Request quotes" → review drafts → send; `threads` flip to `sent`; emails arrive (send one to your own address).
4. Reply with "Our package is $3,200, 8 hours, $500 deposit, available Mar 12": inbox shows extracted chips, `quotes` row created, budget bar moves on a second browser without refresh, activity entry appears.
5. Set `nextFollowUpAt` in the past via MCP, run `followups.tick`: a nudge lands in the same thread.
6. Add yourself as a guest, send invites, reply "yes plus one, vegetarian": guest row updates live.
7. Ask the assistant to "find caterers who do Gujarati menus and email the top two": tool steps visible, threads created.
8. Invite link as viewer: can see, cannot send. Activity feed shows both users.
9. Forward a PDF quote: red flags listed.
10. `git grep -E "whsec_|sk-|fc-|BEGIN PRIVATE"` empty; `hackathon.md` lists components, auth, models, live URL.

## Risks

- **Scope vs 6 days**: all four extras chosen; cut list above is ordered. Day-2 inbox loop is the non-negotiable demo.
- **Firecrawl noise** (directories like The Knot/Yelp rank above vendor sites): search with `-site:` exclusions for big directories, prefer pages with contact/mailto, let OpenAI discard non-vendors, always show source.
- **Vendor emails not found**: cards without an email get "add email" affordance; outreach only to vendors with an address. Demo uses your own addresses.
- **Per-wedding inbox creation limits/domain**: fall back to one shared inbox with `+wedding-id` addressing if `inboxes.create` is restricted on the plan; routing then keys on `to` address.
- **Bulk RSVP sends**: use `@convex-dev/workpool` with low parallelism and `retry:false` per send; cap demo guest list.
- **Convex Auth alpha**: same mitigations as before (root-mounted static routes, JWKS curl check first).
- **Model IDs**: verify `gpt-5.6-luna` / `gpt-5.6-terra` (or current equivalents) via `/v1/models` on Day 0; structured outputs + tool calling required.
- **Security**: webhook Svix-verified; membership checked on every public function; viewers read-only; unknown senders never get auto-replies except recognised guests.

## Files to create (representative)

`convex/schema.ts`, `convex/lib/{auth,validators,svix}.ts`, `convex/{weddings,events,slots,vendors,research,outreach,threads,messages,quotes,budget,guests,rsvp,followups,assistant,members,invites,activity,contracts,imports,seed}.ts`, `convex/{openai,firecrawl,agentmail}.ts`, `convex/{workflows,crons,http,auth,auth.config,convex.config}.ts`, `scripts/{agentmail-setup,fake-webhook}.mjs`, `src/pages/*`, `src/components/*`. Delegate all `convex/` files to the `convex-expert` subagent; run `convex-reviewer` before deploy.
