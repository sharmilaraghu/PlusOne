import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Nudge vendors who have gone quiet; escalate after three nudges.
crons.hourly("vendor follow-ups", { minuteUTC: 7 }, internal.followups.tick, {});

// Clear out old demos, old inbound-email records and searches that died mid-run.
crons.interval("housekeeping", { hours: 1 }, internal.housekeeping.sweep, {});

export default crons;
