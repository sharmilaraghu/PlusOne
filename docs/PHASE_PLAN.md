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

## Status of existing work

Much of the backend for phases 1 to 6 and 8 was written earlier. It is not yet verified, and it still contains the demo wedding. Following this plan means treating that code as a draft:
- Each phase starts with the independent verification above.
- Code that fails the check is fixed before its screens are rebuilt in the new design.
