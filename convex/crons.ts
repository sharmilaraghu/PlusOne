import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Nudge vendors who have gone quiet; escalate after three nudges.
crons.hourly("vendor follow-ups", { minuteUTC: 7 }, internal.followups.tick, {});

export default crons;
