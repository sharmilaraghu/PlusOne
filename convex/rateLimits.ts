import { DAY, HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import { ConvexError } from "convex/values";
import { components } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { ActionCtx, MutationCtx } from "./_generated/server";

/**
 * Every limit on work that costs money or reaches someone's inbox.
 *
 * Real events are limited per event, so a busy host is never slowed by anyone else,
 * and generously: these exist to stop a runaway loop or an abusive script, not a
 * person planning. A full plan starts about a dozen searches at once, which is why
 * the search bucket holds more than that.
 *
 * The demo is different. Anyone can open it without an account, and each visit is a
 * new anonymous user, so a per-visitor allowance alone can be reset by reloading.
 * Each demo limit is therefore two: a small one per visitor, and a daily total across
 * all visitors that caps what the demo can ever cost in a day.
 */
export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // Vendor searches: each one reads a dozen web pages and calls the model several times.
  research: { kind: "token bucket", rate: 30, period: HOUR, capacity: 20 },
  researchDemo: { kind: "fixed window", rate: 3, period: DAY },
  researchDemoAll: { kind: "fixed window", rate: 150, period: DAY },

  // Questions to the assistant.
  assistant: { kind: "token bucket", rate: 60, period: HOUR, capacity: 20 },
  assistantDemo: { kind: "fixed window", rate: 10, period: DAY },
  assistantDemoAll: { kind: "fixed window", rate: 600, period: DAY },

  // Batches of inquiry drafts the model writes.
  drafting: { kind: "token bucket", rate: 30, period: HOUR, capacity: 15 },
  draftingDemo: { kind: "fixed window", rate: 5, period: DAY },
  draftingDemoAll: { kind: "fixed window", rate: 300, period: DAY },

  // Real email leaving an event's inbox, counted where it is actually sent so that
  // follow-ups and automatic replies are covered as well as the Send button. A large
  // guest list goes out in batches of 50, so the hourly bucket has room for a few.
  outboundHourly: { kind: "token bucket", rate: 150, period: HOUR, capacity: 150 },
  outboundDaily: { kind: "fixed window", rate: 500, period: DAY },

  // Emailed invitations to plan together, per person sending them.
  memberInvites: { kind: "token bucket", rate: 20, period: HOUR, capacity: 10 },

  // New demos opened, across everyone.
  demoStarts: { kind: "fixed window", rate: 2000, period: DAY },
});

type Paid = "research" | "assistant" | "drafting";

/** "in a few minutes", "in about 2 hours", "tomorrow": when to come back, in words. */
export function comeBack(retryAfterMs: number): string {
  const minutes = Math.ceil(retryAfterMs / 60_000);
  if (minutes <= 2) return "in a couple of minutes";
  if (minutes < 60) return `in about ${Math.ceil(minutes / 5) * 5} minutes`;
  const hours = Math.ceil(minutes / 60);
  if (hours >= 20) return "tomorrow";
  return `in about ${hours} hours`;
}

const WHAT: Record<Paid, string> = {
  research: "vendor searches",
  assistant: "questions",
  drafting: "emails to write",
};

/**
 * Take `count` from the allowance for a paid action, or refuse in words the person
 * can act on. Call it after the membership check and before anything is scheduled.
 */
export async function spend(
  ctx: MutationCtx,
  what: Paid,
  wedding: Doc<"weddings">,
  userId: Id<"users">,
  count = 1,
): Promise<void> {
  if (wedding.demo) {
    const mine = await rateLimiter.limit(ctx, `${what}Demo`, { key: userId, count });
    if (!mine.ok) {
      throw new ConvexError(
        `That's as many ${WHAT[what]} as the demo allows. Plan your own event to keep going.`,
      );
    }
    const everyone = await rateLimiter.limit(ctx, `${what}DemoAll`, { count });
    if (!everyone.ok) {
      throw new ConvexError("The demo is very busy right now. Try again later, or plan your own event.");
    }
    return;
  }
  const status = await rateLimiter.limit(ctx, what, { key: wedding._id, count });
  if (!status.ok) {
    throw new ConvexError(
      `That's a lot of ${WHAT[what]} in a short time. PlusOne will be ready for more ${comeBack(status.retryAfter)}.`,
    );
  }
}

/**
 * Count one real email against the event's sending allowance, at the moment it is
 * sent. Returns a sentence explaining the pause when the allowance is used up.
 */
export async function outboundPause(ctx: ActionCtx, weddingId: Id<"weddings">): Promise<string | null> {
  const hourly = await rateLimiter.limit(ctx, "outboundHourly", { key: weddingId });
  if (!hourly.ok) {
    return `PlusOne has sent a lot of email for this event in the last hour and has paused. It can send more ${comeBack(hourly.retryAfter)}.`;
  }
  const daily = await rateLimiter.limit(ctx, "outboundDaily", { key: weddingId });
  if (!daily.ok) {
    return `PlusOne has reached today's sending limit for this event. It can send more ${comeBack(daily.retryAfter)}.`;
  }
  return null;
}
