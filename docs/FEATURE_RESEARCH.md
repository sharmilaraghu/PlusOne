# Wedding planning platforms: feature research

Researched on 17 September 2026 for PlusOne. Sources were read directly or through Firecrawl where the site blocks automated browsers. Screenshots are in `docs/research/shots/`, and scraped page text in `docs/research/`.

| Site | Who it is for | Look and feel |
|---|---|---|
| [YourDay](https://yourdayplanned.com/) | Couples planning multi-day South Asian weddings | Soft pastel sections (lavender, blush, sage, butter), elegant serif headlines with an italic accent word, the real app shown as the hero, calm and spacious |
| [Loverly](https://loverly.com/) | US couples, free planner plus vendor marketplace | Editorial and romantic: ivory ground, deep wine colour, refined serif, large wedding photography, magazine layout |
| [planning.wedding](https://planning.wedding/) | Couples and professional planners, free, no sign-up needed | Friendly line illustrations, purple accent, a big grid of tools with plain explanations |
| [WedMeGood](https://www.wedmegood.com/) | Indian couples, vendor marketplace first | Photo-led and bold: hot pink brand bar, big joyful couple photography, vendor cards with price, rating and filters |

---

## 1. YourDay

**Planning**
- **Multi-day wedding overview.** Every event (Mehndi, Sangeet, Ceremony, Reception) is a column showing guests, budget and vendors booked, with Kanban, List and Calendar views.
- **Zoom in and out.** Open one day to see each vendor slot: booked, quotes to review, options shortlisted, or still researching.
- **"Next up" nudge.** One suggested next action, such as "Book Mehndi caterer, 3 vendors replied today".
- **Tasks per event.** Pending tasks are listed under each day.

**Vendors**
- **Natural-language vendor search.** For example, "resort-style venue in Kerala in a major city" returns matching venues with capacity, price, rating and a shortlist button.
- **Shortlist.** Save vendors while browsing.

**Communication**
- **AI email drafts.** One inquiry is drafted and sent to several vendors at once.
- **Smart inbox.** Vendor replies arrive in one place, quotes are pulled out automatically, and the budget updates as quotes come in.
- **Saved templates** for inquiries.

**People**
- **Collaboration with roles.** Full planning for your partner, view-only for parents, task-specific access for the wedding party.
- **Live activity feed** showing who did what.

**AI assistant**
- **Wedding assistant chat.** Remembers dates, guest count, budget and tradition. Answers cultural questions such as "Should we combine Mehndi and Sangeet?". Suggests venues and offers to draft inquiries.

**Getting started**
- **Import your plan.** Upload a spreadsheet, Notion export or planning doc, and it maps events, vendors, costs and guests.
- **Tradition templates.** Hindu, Muslim, Sikh and fusion ceremonies.
- **Pricing.** Monthly or annual subscription with a 14-day trial. Export your data any time.

## 2. Loverly

**AI**
- **aiSLE Assistant.** "The smartest thing to happen to your wedding inbox." Forward, clip or upload vendor proposals, receipts and inspiration, and it reads them and files everything into the planning tools automatically.

**Planning tools (free, 20+)**
- **Guest List Manager** with RSVPs per event.
- **Vendor Manager.** Store vendor details and track payments.
- **Budget Tracker.** Every expense and vendor payment in one place.
- **Wedding Checklist.** A personalised timeline based on the wedding date.
- **Vision Boards.** Save ideas from real weddings into event boards.
- **Style Quiz** to discover your wedding style.
- **"Save to Loverly" button** for saving inspiration from other websites.

**Marketplace and content**
- **Vendor directory.** 25,000+ vetted vendors in categories: venues, photographers, florists, planners, videographers, caterers, cakes, hair and makeup, officiants, rentals.
- **Real wedding albums** with editorial stories.
- **Wedding Shop** for accessories, décor, rings and stationery.
- **Planning articles** by topic.
- **Onboarding.** The first question is simply "What's your wedding date?"

## 3. planning.wedding

**Guests and RSVPs**
- **Guest list** with dietary needs and preferences.
- **RSVP tracking** through personalised online pages.

**Planning**
- **Wedding checklist** with task delegation.
- **Budget calculator.**
- **Itinerary and wedding-day timeline templates.**
- **Handy notes.** Speech ideas, questions for vendors.

**Layout and print**
- **Ceremony layout designer.**
- **Drag-and-drop seating chart maker.**
- **Print-ready stationery generated from guest data:** table cards, place and escort cards, menu cards, welcome sign, programme, and an alphabetical seating chart.

**Media**
- **Wedding website.**
- **Private online photo album** where guests upload photos.

**Collaboration**
- **Real-time collaboration without accounts.** Partner, family and friends join by invite link.
- **Private mode.** Use the tools without signing up.

**Vendors and business**
- **Vendor directory and venue search**, plus virtual venue tours.
- **Business portal** for planners, vendors and venues, with white-label options.
- An "AI agent for wedding planning" is mentioned but not described.

## 4. WedMeGood

**Marketplace**
- **Vendor search by type and city** from the home page.
- **Vendor listing pages with rich filters:** locality, number of days, services, price, awards, review count and rating.
- **Vendor cards** with photo, rating, review count, city, services, price per day, a starting package (for example "Small Function ₹50,000 for 4 hours") and vote badges such as "On Time Service: 106 votes".
- **Demand signal,** for example "In High Demand. 18 enquiries last week".
- **Reviews and awards.** "Write a review" and Users' Choice Awards.
- **Venue categories** such as banquet halls, lawns, resorts, kalyana mandapams and 4-star hotels.

**Services**
- **Genie.** A virtual planning service: "plan your dream wedding in your budget".
- **Venue booking service** with a best-price guarantee.
- **In-house services,** such as makeup at home.

**Inspiration and invitations**
- **Photo galleries** for outfits, mehndi designs, jewellery, décor and invitations.
- **Real wedding stories,** which couples can submit.
- **E-invites.** Invitation maker, save-the-dates and video invitations.

**App**
- **Mobile app** with saved ideas, a vendor shortlist and a free checklist.

---

## 5. Feature matrix

| Feature | YourDay | Loverly | planning.wedding | WedMeGood | PlusOne today |
|---|:-:|:-:|:-:|:-:|:-:|
| Multi-day / multi-event plan | ✓ | – | – | – | ✓ |
| Tradition templates | ✓ | – | – | partial | ✓ |
| Checklist / timeline | ✓ | ✓ | ✓ | app | planned |
| Budget tracker | ✓ | ✓ | ✓ | – | ✓ |
| Guest list + RSVP | ✓ | ✓ | ✓ | – | planned |
| RSVP by replying to an email | – | – | – | – | **planned, unique** |
| Vendor directory (fixed, paid listings) | verified | ✓ | ✓ | ✓ | – (by design) |
| Vendor research from the open web | – | – | – | – | **✓ unique** |
| Price linked to its source page | – | – | – | – | **✓ unique** |
| AI-drafted vendor emails | ✓ | – | – | – | ✓ |
| Sent from the couple's own wedding inbox | – | – | – | – | **✓ unique** |
| Replies read, quotes extracted | ✓ | forward only | – | – | ✓ |
| Automatic follow-ups to silent vendors | – | – | – | – | **✓ unique** |
| Forward any email, receipt or proposal to file it | – | ✓ | – | – | planned |
| Contract red-flag check | – | – | – | – | planned, unique |
| AI assistant chat | ✓ | – | mentioned | Genie (human) | planned |
| Collaboration with roles | ✓ | – | ✓ (no account) | – | ✓ |
| Live activity feed | ✓ | – | – | – | ✓ |
| Import spreadsheet / doc | ✓ | – | – | – | planned |
| Vision board / inspiration | – | ✓ | photo album | galleries | planned (optional) |
| Style quiz | – | ✓ | – | – | idea |
| Seating chart / layout | – | – | ✓ | – | out of scope |
| Printable stationery from guest data | – | – | ✓ | e-invites | out of scope |
| Wedding website | – | – | ✓ | – | out of scope |
| Reviews / awards / demand signals | – | – | – | ✓ | out of scope |
| Guided tour for first-time users | – | – | – | – | **planned** |

## 6. Unique features worth taking

**From YourDay**
- Multi-day overview with a zoom into each day.
- A single "Next up" action.
- Natural-language vendor search.
- Quotes that update the budget.
- Cultural Q&A.

**From Loverly**
- A one-question start ("What's your wedding date?").
- Forward anything to the inbox and have it filed.
- A style quiz feeding recommendations.
- An editorial, romantic visual tone.

**From planning.wedding**
- Invite collaborators by link with very little friction.
- Plain-language explanations of every tool.
- Guest data reused everywhere.

**From WedMeGood**
- Vendor cards that show a starting price, a small-function package and a rating at a glance.
- Filters by price and number of days.
- City-first search.

## 7. Where PlusOne is different

None of these products do the legwork end to end. YourDay drafts emails, and Loverly reads what you forward, but PlusOne does the whole loop:

1. **Finds vendors on the open web.** Prices come from each vendor's own site, with the source kept.
2. **Writes and sends** from a real inbox created for the wedding.
3. **Reads the replies** and moves the budget.
4. **Chases vendors who go quiet** with polite, automatic follow-ups.
5. **Collects RSVPs** when guests simply reply in plain words.
