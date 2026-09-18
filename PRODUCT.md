# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: an engaged couple planning their own wedding, often a multi-day one, from a laptop in the evening and a phone in between. They are not event professionals. Their job is to book the right vendors within budget, keep every day's plan straight, and keep guests informed, without spending their nights in email threads and spreadsheets.

Secondary, confirmed: family members (typically parents) and the wedding party, invited by the couple as collaborators. Planners can edit and send; viewers only watch. They are never the account owner.

Not a target: professional wedding planners running client weddings.

## Product Purpose

PlusOne is the couple's AI copilot for the whole wedding. It turns a two-minute description of the celebration into a day-by-day plan with a budget, then does the legwork: researches vendors on the open web, emails them from the couple's own wedding inbox, reads the replies and quotes, nudges vendors who go quiet, and collects guest RSVPs by email. Everyone on the plan sees changes the moment they happen.

Success for the couple: fewer hours on admin, decisions made with real prices side by side, nothing forgotten, and a budget that stays honest. Success for the project: a working, judge-openable submission to the Convex All Gas Hackathon by September 22, 2026, 12:00 PM PT, with a video under three minutes.

## Positioning

PlusOne does the emailing. Other planners give couples checklists and directories; PlusOne gives each wedding a real inbox, writes and sends the vendor inquiries, reads what comes back, extracts the quote into the budget, and follows up on its own. Its vendor research reads vendor websites directly, so every price links to the page it came from rather than a paid directory listing. The plan is multi-event by design (rehearsal dinner, ceremony, reception, plus Mehndi, Sangeet, Nikah, Walima, Anand Karaj and custom days), for any culture, not a single-day template.

## Operating Context

- A wedding is a set of events across one or more days. Each event has a date, guest count, budget and colour. Vendor needs ("slots") attach to one or more events.
- Cultural templates seed the events and slots, Western first: Western, Jewish, Hindu, Muslim, Sikh, Fusion, Custom.
- Each wedding gets its own email address (AgentMail inbox). Vendor replies, guest RSVPs and forwarded contracts all arrive there and are routed by thread or sender.
- Vendor research is a background job: a plain-language request becomes web searches, vendor sites are read, and cards appear one by one with prices, packages, highlights and source links.
- Outreach has an approval gate: the couple reviews personalised drafts before anything is sent. Follow-ups after silence are automatic, capped at three.
- Money: quotes extracted from replies set the committed amount per slot; the budget bar and warnings update live for everyone on the plan.
- Roles: owner, planner, viewer. Invites are links, optionally emailed from the wedding inbox.
- Evaluation context: hackathon judges open the live site cold on convex.site, read `hackathon.md`, and watch a short video. Two screens updating live is a core demo moment.

## Capabilities and Constraints

Confirmed capabilities (built or in the approved plan, `docs/PLAN.md`):
- Onboarding with template, dates, city, currency, budget, optional inspiration link.
- Overview: day board, budget bar with warnings, vendor needs, live activity feed.
- Vendor research, shortlist, manual vendor entry, one-click quote requests, draft review, send.
- Inbox: threads per vendor, extracted quote chips, quote comparison per slot, mark booked, pass, needs-attention handling.
- Automatic follow-ups (hourly cron, max three), guest list with email invites and plain-language RSVP parsing, contract red-flag check on forwarded PDFs, spreadsheet import, assistant with tools, collaboration with roles. Cut order if time runs short: import, contract check, guest Q&A auto-reply, assistant tools, RSVP reminders.

Technical constraints:
- Backend is Convex (queries, mutations, actions, workflows, workpool, crons, HTTP webhook, file storage). Frontend is a Vite + React + Tailwind v4 single-page app hosted on Convex static hosting at a `*.convex.site` URL.
- OpenAI via the Vercel AI SDK for drafting, extraction, classification and the assistant. Firecrawl for search and scraping. AgentMail for inboxes, sending, receiving and webhooks.
- Convex Auth password sign-in (alpha). No OAuth, no passkeys.
- Vendors without a discoverable email cannot be contacted until the couple adds one.
- Inbound mail from unknown senders never gets an automatic reply unless the sender is a known guest.

Terminology: wedding, event (a day or ceremony), slot (a vendor need), vendor, thread, quote, guest, RSVP, planner, viewer, wedding inbox.

Decided 2026-09-17 (revised the same day): there is no demo wedding. Every couple starts from their own empty wedding; a 1-minute tour on the landing page explains the five steps (describe, find, contact, compare, decide), and marketing previews use clearly labelled example content.

Undecided: the human-readable inbox address format beyond "partner names plus short id".

## Brand Commitments

- Name: **PlusOne**. Tagline: **"PlusOne — Your AI Copilot for the Perfect Wedding."** Final; do not propose renames.
- Voice (binding): warm, calm, competent. Like a trusted planner friend: reassuring, plain words, no hype, never cutesy. Vendor emails read as if the couple wrote them. Errors say what happened and what to do next.
- No logo or wordmark exists yet. The interface should not invent an elaborate mark; a typographic treatment of the name is acceptable until an asset is supplied.

## Evidence on Hand

- None beyond public market statistics cited with sources in `docs/WEDDING_IDEA.md` (average US wedding cost and vendor count from The Knot's 2026 study, budget as the top stressor). These may be quoted with attribution.
- No customers, testimonials, case studies, press, real weddings or real vendor contacts. All example content is demo data and must read as such. Never invent social proof, customer logos, review counts or "trusted by" claims.
- Demo emails in development are sent to the team's own addresses.

## Product Principles

1. **Do the work, keep the decision.** PlusOne researches, drafts, sends and follows up; the couple approves the first email and makes every booking call.
2. **Every number has a source.** Prices link to the vendor page, quotes link to the email, the budget shows what moved it.
3. **Calm over clever.** The product's job is to lower stress about money and logistics; copy and behaviour should reassure, not perform.
4. **One plan, many eyes.** Partners and family see the same live truth with the right level of access; nobody asks "did you see my message?"
5. **Every culture's days.** Multi-event structure and neutral language are defaults, not add-ons; templates adapt to the family, never the reverse.

## Accessibility & Inclusion

No formal standard has been mandated. Confirmed expectations: usable on a 360px phone and on a laptop, keyboard-operable forms with visible labels, live regions for background progress (research, sending), and copy that avoids assuming a bride and groom. Currency and date formatting follow the wedding's own settings.
