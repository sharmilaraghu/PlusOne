import { defineApp } from "convex/server";
import workflow from "@convex-dev/workflow/convex.config";
import workpool from "@convex-dev/workpool/convex.config";
import staticHosting from "@convex-dev/static-hosting/convex.config";

const app = defineApp();
app.use(workflow);
app.use(workpool, { name: "emailPool" });
// No httpPrefix: the app owns root routing in convex/http.ts and mounts the
// static catch-all last, so /agentmail/webhook and auth routes stay at root.
app.use(staticHosting);

export default app;
