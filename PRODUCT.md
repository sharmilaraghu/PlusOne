# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: someone hosting their own event. A couple planning a wedding, a parent planning a first birthday, a daughter planning her parents' fortieth anniversary, a friend planning a baby shower, the person at work who was asked to organise the team offsite. They plan from a laptop in the evening and a phone in between. They are not event professionals, and most do this once or a few times in their lives. Their job is to book the right vendors within budget, keep the plan straight, and keep guests informed, without spending their nights in email threads and spreadsheets.

Secondary, confirmed: the people the host plans with (a partner, parents, friends, colleagues), invited as collaborators. Planners can edit and send; viewers only watch. They are never the account owner.

Not a target: professional event planners running events for clients.

Regions: the United States and Canada, and India. These are separate markets with separate pricing and vendor landscapes. An Indian wedding held in the US or Canada is a tradition choice, not a region.

## Product Purpose

PlusOne does the legwork of planning an event. It turns a two-minute description of the occasion into a plan with a budget, then researches vendors on the open web, emails them from the event's own inbox, reads the replies and quotes, nudges vendors who go quiet, and collects guest RSVPs by email. Everyone on the plan sees changes the moment they happen.

Success for the host: fewer hours on admin, decisions made with real prices side by side, nothing forgotten, and a budget that stays honest. Success for the business: hosts start a trial, see their first vendor quotes arrive without writing an email, and stay subscribed until the event.

## Positioning

PlusOne does the emailing. Other planners give hosts checklists and directories; PlusOne gives each event a real inbox, writes and sends the vendor inquiries, reads what comes back, extracts the quote into the budget, and follows up on its own. Its vendor research reads vendor websites directly, so every price links to the page it came from rather than a paid directory listing.

It works for any event with guests and vendors: weddings, engagements, birthdays, anniversaries, baby showers, graduations, team events and parties. An event can be one evening or several days, and weddings keep their tradition templates (Western, Jewish, Hindu, Muslim, Sikh, Fusion, Custom).

## Operating Context

- An event is one or more days. Each day has a date, guest count, budget and colour. Vendor needs attach to one or more days.
- Each event gets its own email address (AgentMail inbox). Vendor replies, guest RSVPs and forwarded contracts all arrive there and are routed by thread or sender.
- Vendor research is a background job: a plain-language request becomes web searches, vendor sites are read, and cards appear one by one with prices, packages, highlights and source links.
- Outreach has an approval gate: the host confirms the shortlist before anything is sent. Follow-ups after silence are automatic, capped at three.
- Money: quotes extracted from replies set the committed amount per need; the budget bar and warnings update live for everyone on the plan.
- Roles: owner, planner, viewer. Invites are links, optionally emailed from the event inbox.
- A sample event can be opened without signing up; its vendors are fictional and its email is simulated.
- Being built next, not yet live: event types beyond weddings in onboarding and in the AI's wording, subscriptions with a 14-day trial, and WhatsApp contact with vendors. Until event types ship, the product's data model, onboarding and vendor emails still assume a wedding with two partners.

## Capabilities and Constraints

Confirmed capabilities:
- Onboarding with dates, city, currency, budget, guests, vendor needs and style.
- Overview: day board, budget bar with warnings, vendor needs, live activity feed.
- Vendor research, shortlist, manual vendor entry, drafted inquiries, confirm and send.
- Inbox: threads per vendor, extracted quotes, quote comparison per need, mark booked, pass, needs-attention handling.
- Automatic follow-ups, guest list with email invites and plain-language RSVP parsing, contract red-flag check on forwarded PDFs, spreadsheet import, an assistant with tools, collaboration with roles.

Technical constraints:
- Backend is Convex (queries, mutations, actions, workflows, workpool, crons, HTTP webhooks, file storage). Frontend is a Vite + React + Tailwind v4 single-page app served by Convex static hosting at a `*.convex.site` URL until a custom domain is chosen.
- OpenAI via the Vercel AI SDK for drafting, extraction, classification and the assistant. Firecrawl for search and scraping. AgentMail for inboxes, sending, receiving and webhooks.
- Convex Auth: password and Google sign-in, plus anonymous guests for the sample event.
- Vendors without a discoverable email cannot be contacted until the host adds one.
- Inbound mail from unknown senders never gets an automatic reply unless the sender is a known guest.
- In code, an event is still called a `wedding` and its days are `events`. Customer-facing text says "event" and "day".

Terminology (customer-facing): event (the whole occasion), day (one function within it), need (a vendor the host has to find), vendor, thread, quote, guest, RSVP, host, planner, viewer, event inbox.

## Brand Commitments

- Name: **PlusOne** is a working name. A rename is planned; do not build the identity around the name's wedding connotation, and keep the wordmark typographic so it can be swapped.
- No tagline is fixed. The old one ("Your AI Copilot for the Perfect Wedding") is retired.
- Voice (binding): warm, calm, competent. Like a friend who is good at organising: reassuring, plain words, no hype, never cutesy. Vendor emails read as if the host wrote them. Errors say what happened and what to do next.
- No logo exists. Do not invent an elaborate mark.
- The previous visual identity ("The Wedding Stationer's Desk": wine ink, blush and sage washes on ivory, bride-and-groom line drawings) is retired. It is evidence of what the product is, not a look to preserve.

## Evidence on Hand

- PlusOne placed second in the Convex All Gas hackathon (September 2026). This may be stated plainly.
- Measured, from the team's own evaluation: reading a vendor's contact and pricing pages instead of only its home page raised emails found from 25% to 63% and prices found from 13% to 50%, on 16 vendors.
- No customers, testimonials, case studies, press, or real events. All example content is demo data and must read as such. Never invent social proof, customer logos, review counts or "trusted by" claims.
- No prices have been set. Do not show a price.

## Product Principles

1. **Do the work, keep the decision.** PlusOne researches, drafts, sends and follows up; the host confirms the shortlist and makes every booking call.
2. **Every number has a source.** Prices link to the vendor page, quotes link to the email, the budget shows what moved it.
3. **Calm over clever.** The product's job is to lower stress about money and logistics; copy and behaviour should reassure, not perform.
4. **One plan, many eyes.** Everyone planning together sees the same live truth with the right level of access.
5. **Every kind of occasion.** A wedding weekend and a child's birthday are both first-class. Language stays neutral about who is hosting and why.

## Accessibility & Inclusion

No formal standard has been mandated. Confirmed expectations: usable on a 360px phone and on a laptop, keyboard-operable forms with visible labels, live regions for background progress (research, sending), and copy that does not assume a bride and groom, a couple, or a particular culture. Currency and date formatting follow the event's own settings.
