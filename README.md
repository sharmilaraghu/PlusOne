# PlusOne — Your AI Copilot for the Perfect Wedding

Plan every day of your wedding without the chaos. PlusOne researches vendors from the open web (**Firecrawl**), emails them from your own wedding inbox (**AgentMail**), reads their quotes (**OpenAI**), and keeps every event, dollar, guest and decision in one live plan (**Convex**).

**Live app:** https://rapid-albatross-416.convex.site
Built for the Convex All Gas Hackathon. See [`hackathon.md`](hackathon.md) for the build log and [`docs/PHASE_PLAN.md`](docs/PHASE_PLAN.md) for the plan and what was measured at each step.

![PlusOne's landing page: the headline over a drifting reel of wedding scenes, with the app preview below](docs/screenshots/01-landing.jpg)

---

## What it does

### Tell it about your wedding

Six steps: who you are, which functions fall on which days, how many guests at each, how the budget splits, which vendors you still need, and the feel you're after. Everything is editable afterwards.

![Onboarding: choosing which vendors you still need, with Looking, Booked or Not having one against each](docs/screenshots/03-onboarding.jpg)

### Every celebration on one shelf

Each wedding is a print you can read at a glance: how long you have, how many vendors are booked of the total, what is committed against the budget, and the one thing worth doing next.

![Your weddings: a polaroid per wedding carrying its countdown, vendors booked, budget committed and next step](docs/screenshots/02-home.jpg)

### Every day in one place

Each function keeps its own guests, budget and vendor needs, and the three figures always reconcile: the functions, the needs and the total all add up to the same number, whatever you change.

![Overview: a card per day with its guests, budget and vendor needs, above a budget bar](docs/screenshots/04-overview.jpg)

### Vendors found on the open web, ranked with reasons

Describe what you need in plain words. Firecrawl searches, reads each vendor's own site for prices and contact details, then looks them up on review directories. The best three come first, each with its rating linked to the page it came from, its price against that need's budget, and one line on why it ranks there.

![Vendors: the top three photographers, each with rating, price against budget and a one-line reason](docs/screenshots/05-vendors.jpg)

### Confirm once, and PlusOne does the emailing

You see exactly who will be written to and one letter in full. After that it sends them all from your own wedding inbox, chases anyone who goes quiet, and reads every reply back into a structured quote.

![Inbox: a vendor thread with the quote extracted, and forwarded contracts flagged clause by clause](docs/screenshots/07-inbox.jpg)

Forward any contract to the same inbox and it comes back in plain English, with every warning quoting the sentence it came from.

### Then you just decide

One screen: who was asked, who replied and how fast, what has been quoted, what is booked. Per need, every vendor side by side with price, deposit, whether they are free on your actual dates, and what is and isn't included. Book or pass on the row.

![Decisions: KPIs across the top and a comparison table per vendor need](docs/screenshots/06-decisions.jpg)

### Guests reply in their own words

Invitations go out from the wedding inbox. When someone writes back *"we'd love to, two of us, and I'm gluten free"*, the list updates itself.

![Guests: RSVP counts, an add-a-guest form and the list with replies read back in](docs/screenshots/08-guests.jpg)

### An assistant that knows your plan

It answers from your own numbers and can start a vendor search or add something you've forgotten. It has no way to send an email — that always goes through you.

![Assistant: answering a question about the remaining budget from the wedding's own figures](docs/screenshots/09-assistant.jpg)

---

## The stack

| | |
|---|---|
| **Convex** | 18 tables with indexes, queries and mutations, actions, HTTP action for the inbound webhook, scheduled functions, an hourly cron, file storage, live queries, Convex Auth. Components: `@convex-dev/workflow`, `@convex-dev/workpool`, `@convex-dev/static-hosting` |
| **Firecrawl** | `search` to find vendors, `map` to locate each site's contact and pricing pages, `scrape` with schema extraction to read them, and a separate pass over review directories for ratings |
| **AgentMail** | An inbox per wedding, sending and replying, and a Svix-verified webhook that routes each inbound message to the right thread, guest or forwarded document |
| **OpenAI** | Eight structured-output calls: search planning, vendor cards, ranking, inquiry drafting, follow-ups, reply extraction, RSVP parsing, contract reading |

Measured rather than assumed — the numbers behind the vendor pipeline are in [`docs/research/FIRECRAWL_FINDINGS.md`](docs/research/FIRECRAWL_FINDINGS.md).

## Run locally

```bash
npm install
npx convex dev          # first run: log in and create a dev deployment
npm run dev:web         # http://localhost:5173
```

Backend keys are set on the Convex deployment (see `.env.example`).

---

*Screenshots are of a real wedding built in the app, with the vendors and quotes produced by the live pipeline. Email addresses are masked, and the three "Test Vendor" bands are fictional ones used to prove the outreach round trip end to end.*
