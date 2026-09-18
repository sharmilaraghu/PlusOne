# PlusOne — Your AI Copilot for the Perfect Wedding

Plan every day of your wedding without the chaos. PlusOne researches vendors from the open web (Firecrawl), emails them from your own wedding inbox (AgentMail), reads their quotes (OpenAI), and keeps every event, dollar, guest and decision in one live plan (Convex).

Built for the Convex All Gas Hackathon. See `hackathon.md` for the build log and `docs/PLAN.md` for the plan.

## Run locally

```bash
npm install
npx convex dev          # first run: log in and create a dev deployment
npm run dev:web         # http://localhost:5173
```

Backend keys are set on the Convex deployment (see `.env.example`).
