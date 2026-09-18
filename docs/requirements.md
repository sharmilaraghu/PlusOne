​Requirements
​New apps only, started on or after August 25.

​Convex is the backend: database, functions, and real-time sync run on Convex.

​Built with Codex or any agent/IDE with the Convex plugin.

​Convex Auth v1 alpha is not a requirement. Apps with no auth are still a valid submission.

​Frontend runs on Convex static hosting (convex.site) or ChatGPT Sites (ChatGPT.site).

​Deployed at a live URL for the /hackathon build log in the repo.

​A public GitHub repo is required.


Quick start
Setup prompt
Copy the setup prompt into your coding agent to install the Convex integration and hackathon skill.


Copy hackathon setup prompt
Log as you build

/hackathon
Run it in your agent after each work session. It updates hackathon.md, the file judges read.

Build

npx convex dev
Deploy
convex.site


npm install @convex-dev/static-hosting

npx @convex-dev/static-hosting setup

npm run deploy
chatgpt.site

Ask Sites in the ChatGPT app.

Submission checklist
public repo
hackathon.md at root
live app URL (convex.site or chatgpt.site)
three-minute video
