# Hackathon log

- **Project:** PlusOne
- **Event:** Convex All Gas Hackathon
- **What it does:** Multi-event wedding planner that researches vendors from the open web, emails them from a per-wedding inbox, extracts their quotes, and keeps every day, budget line and guest in one live plan.
- **Live app:** not deployed
- **Repo:** https://github.com/sharmilaraghu/RefundChaser
- **Frontend:** Convex static hosting
- **Convex deployment:** not deployed
- **Components:** @convex-dev/workflow, @convex-dev/workpool, @convex-dev/static-hosting
- **Convex features:** schema, tables, indexes, queries, mutations, crons, scheduled functions, realtime queries
- **Auth:** Convex Auth
- **AI models:** none
- **Started:** 2026-09-15T15:25:44Z
- **Last updated:** 2026-09-16T15:18:33Z

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
