# PlusOne — Your AI Copilot for the Perfect Wedding

> *Every couple gets a plus-one who handles the vendors, the guests, and the follow-ups.* Final name: **PlusOne**.

## The problem

Planning a wedding is mostly a part-time admin job.

- The average US couple hires about **13 vendors** and spends about **$34,200** (The Knot 2026 Real Weddings Study).
- **60%** of couples say keeping to their real budget is their #1 stressor.
- **37%** had to contact more vendors than planned, and vendors report more comparison shopping and more back-and-forth before anyone books.
- Pricing is hard to find. Many vendor sites hide it behind "contact us for a quote".

The real pain is not inspiration. Pinterest has that covered. The pain is the hundreds of emails, quotes, contracts, deadlines, and RSVPs spread across inboxes, spreadsheets, and group chats.

## The idea

PlusOne gives each couple their own wedding email address (for example `priya-and-sam@plusone...`). It does three jobs:

1. **Finds vendors.** It reads real vendor websites and pulls out prices, packages, and reviews.
2. **Talks to vendors.** It emails vendors for quotes, reads their replies, and follows up when they go quiet.
3. **Keeps everything in one live dashboard.** Both partners, and anyone they invite, see the same budget, checklist, and guest list update in real time.

The couple decides. PlusOne does the legwork.

## How each hackathon technology does real work

| Technology | What it does in PlusOne |
|---|---|
| **Convex** | The shared, live wedding "home base". Budget, vendors, guests, tasks, and timelines update instantly for everyone. Runs the scheduled follow-ups and reminders. |
| **OpenAI** | Understands the couple's vision, writes vendor emails, reads replies and quotes, compares offers, builds budgets and timelines, and answers guest questions. |
| **Firecrawl** | Visits vendor and venue websites to collect pricing, packages, capacity, availability notes, and reviews. Also reads a pasted Pinterest board, blog, or registry page. |
| **AgentMail** | The couple's wedding inbox. Sends quote requests, receives and sorts vendor replies, chases slow responders, emails guests, and accepts forwarded emails. |

## Functionalities

### 1. Wedding profile in two minutes
- The couple describes the wedding in plain words: date, city, guest count, budget, style, and must-haves.
- They can paste inspiration links, such as a Pinterest board or a blog post. PlusOne reads them and summarizes the style ("rustic outdoor, earthy tones, live acoustic music").
- **Impact:** a clear brief that drives every later step.

### 2. Smart budget that stays honest
- PlusOne splits the total budget across categories, using typical real-wedding percentages.
- Every quote, deposit, and invoice that arrives by email is added automatically.
- It warns early: "Photography quotes are 40% over the planned amount. Here are two cheaper options."
- **Impact:** directly targets the #1 stressor for couples.

### 3. Vendor discovery with real prices
- The couple asks: "Find photographers in Austin under $3,500 who do documentary style."
- PlusOne searches the web, reads vendor sites, and builds a shortlist with packages, starting prices, what's included, and review highlights.
- Every fact links back to the page it came from.
- **Impact:** hours of tab-hopping become one comparison table.

### 4. One-click quote requests
- The couple ticks five vendors and presses "Request quotes".
- PlusOne writes a personal email to each one from the wedding inbox, with date, guest count, and specific questions.
- The couple can approve the first email or let it send automatically.
- **Impact:** removes the most repetitive task in planning.

### 5. Inbox that reads itself
- Vendor replies land in the wedding inbox and are sorted by vendor and category.
- PlusOne pulls out the key facts: price, availability, deposit, deadline, and what is not included.
- Attached PDFs, such as price lists and contracts, are summarized in plain English.
- **Impact:** no more digging through threads to find "what did the florist quote again?"

### 6. Automatic follow-ups
- If a vendor has not replied in a few days, PlusOne sends a polite nudge.
- If a vendor asks a question it can answer from the wedding profile, it drafts the answer for approval.
- Payment and contract deadlines trigger reminders to the couple.
- **Impact:** nothing falls through the cracks, and couples stop being the chaser.

### 7. Side-by-side quote comparison
- Quotes for the same category line up in one view: total cost, hidden fees, deposit, cancellation terms, and hours of coverage.
- PlusOne gives a short recommendation with reasons, and flags red flags such as non-refundable deposits or overtime charges.
- **Impact:** faster, more confident booking decisions.

### 8. Contract red-flag check
- Forward or upload a vendor contract.
- PlusOne highlights cancellation terms, date-change rules, overtime fees, and what happens if the vendor cannot attend.
- **Impact:** protects couples from costly surprises.

### 9. Live checklist and timeline
- PlusOne creates a month-by-month plan working back from the wedding date.
- Tasks tick off automatically when something happens, for example "Caterer booked" when a signed contract email arrives.
- It builds the day-of schedule and shares it with vendors and the wedding party.
- **Impact:** the couple always knows what is next.

### 10. Guest list and RSVPs by email
- Import or type the guest list.
- PlusOne emails save-the-dates and RSVP requests. Guests just reply in plain words, such as "Yes, two of us, one vegetarian".
- Replies update the guest count, meal choices, and plus-ones live.
- Non-responders get a gentle reminder.
- **Impact:** RSVP chasing, one of the most tedious jobs, goes away.

### 11. Guest help desk
- Guests email questions like "Is there parking?" or "What's the dress code?"
- PlusOne answers from the wedding details and only passes new questions to the couple.
- **Impact:** couples stop answering the same question fifty times.

### 12. Collaboration for the whole team
- Partners, parents, and the maid of honor can join with different permissions.
- Everyone sees changes instantly: a new quote, a booked vendor, an updated seat count.
- Each person gets a short weekly email digest of what changed and what needs their decision.
- **Impact:** fewer "did you see my message?" moments between families.

### 13. Registry and deal watcher (stretch)
- Paste registry or product links. PlusOne checks prices and availability and tells the couple when something sells out or drops in price.
- **Impact:** a small, delightful extra that uses the same web-reading ability.

## Demo story (under 3 minutes)

1. Priya types: "Garden wedding in Austin, 120 guests, $30k budget, October 2027."
2. PlusOne builds the budget and checklist live on screen.
3. She asks for photographers. A comparison table with real prices appears from vendor websites.
4. She clicks "Request quotes". Emails go out from the wedding inbox.
5. A vendor reply arrives. The dashboard updates instantly with the price and a budget warning.
6. A guest replies "Yes, plus one, vegan". The guest count and meal list change live.

## Why it can win

- **Everyday app for real people.** Millions of couples marry each year, and every one of them needs this next week.
- **Every sponsor does real work.** Convex is the live shared home, OpenAI reads and writes, Firecrawl finds real vendor data, and AgentMail runs the conversations.
- **Visible "wow" moments.** Emails send and replies arrive live on screen during the demo.

## Suggested scope for the deadline

- **Must have:** features 1, 3, 4, 5, 6, and 10. That is the core loop of find, email, read, follow up, and RSVPs.
- **Should have:** features 2, 7, and 9.
- **Nice to have:** features 8, 11, 12, and 13.

## Sources

- [The Knot Worldwide 2026 Real Weddings Study](https://www.theknotww.com/press-releases/the-knot-worldwide-unveils-2026-real-weddings-study)
- [The Knot: Average wedding cost](https://www.theknot.com/content/average-wedding-cost)
- [WeddingPro: Vendor insights from the 2026 Real Weddings Study](https://pros.weddingpro.com/blog/entrepreneurship/real-wedding-study-vendor-insights/)
- [Sara Does SEO: Wedding industry statistics 2026](https://saradoesseo.com/wedding-marketing/wedding-industry-statistics/)
- [AgentMail documentation](https://docs.agentmail.to/welcome)
