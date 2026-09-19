#!/usr/bin/env bash
# Start PlusOne locally: the Vite dev server and `convex dev` side by side.
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "node is not installed — install Node 20+ and try again." >&2
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install
fi

if [ ! -f .env.local ] || ! grep -q '^CONVEX_DEPLOYMENT=' .env.local; then
  cat >&2 <<'MSG'
No Convex deployment yet. Run this once, in another terminal:

  npx convex dev        # log in and create a dev deployment

It writes CONVEX_DEPLOYMENT and VITE_CONVEX_URL into .env.local. Backend keys
(OpenAI, Firecrawl, AgentMail) are set on the deployment — see .env.example.
MSG
  exit 1
fi

for key in OPENAI_API_KEY FIRECRAWL_API_KEY AGENTMAIL_API_KEY; do
  if ! npx convex env get "$key" >/dev/null 2>&1; then
    echo "warning: $key is not set on the Convex deployment — npx convex env set $key=..." >&2
  fi
done

echo "Web: http://localhost:5173"
exec npm run dev
