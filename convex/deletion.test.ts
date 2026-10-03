/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

function setup() {
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  return t;
}

type T = ReturnType<typeof setup>;
const signedInAs = (t: T, userId: Id<"users">) => t.withIdentity({ subject: `${userId}|test-session` });

async function seed(t: T) {
  return await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("users", { email: "maya@example.com" });
    const plannerId = await ctx.db.insert("users", { email: "sam@example.com" });
    const event = async (name: string, createdBy: Id<"users">) =>
      await ctx.db.insert("weddings", {
        name, partnerA: "Maya", partnerB: "", startDate: "2027-03-20", endDate: "2027-03-20", city: "Toronto",
        currency: "CAD", totalBudget: 2500, template: "custom", eventType: "birthday", createdBy,
      });
    // Maya's own event, with Sam invited as a planner.
    const mine = await event("Maya's birthday party", ownerId);
    await ctx.db.insert("members", { weddingId: mine, userId: ownerId, role: "owner" });
    await ctx.db.insert("members", { weddingId: mine, userId: plannerId, role: "planner" });
    const slotId = await ctx.db.insert("vendorSlots", { weddingId: mine, eventIds: [], category: "Cake", title: "Cake", budget: 200, status: "research" });
    await ctx.db.insert("guests", { weddingId: mine, name: "Priya", partySize: 1, rsvp: "pending", attendingCount: 0, eventIds: [] });
    const fileId = await ctx.storage.store(new Blob(["quote"], { type: "application/pdf" }));
    await ctx.db.insert("contractChecks", { weddingId: mine, storageId: fileId, filename: "quote.pdf", status: "pending", flags: [] });
    // Sam's event, which Maya co-owns.
    const shared = await event("Team offsite", plannerId);
    await ctx.db.insert("members", { weddingId: shared, userId: plannerId, role: "owner" });
    await ctx.db.insert("members", { weddingId: shared, userId: ownerId, role: "owner" });
    // Maya's sign-in records and a half-finished onboarding.
    const sessionId = await ctx.db.insert("authSessions", { userId: ownerId, expirationTime: Date.now() + 1e9 });
    await ctx.db.insert("authAccounts", { userId: ownerId, provider: "password", providerAccountId: "maya@example.com" });
    await ctx.db.insert("onboardingDrafts", { userId: ownerId, name: "Maya", step: 1, state: "{}", pictures: [], updatedAt: 0 });
    return { ownerId, plannerId, mine, shared, slotId, fileId, sessionId };
  });
}

async function finishDeleting(t: T) {
  vi.useFakeTimers();
  try {
    await t.finishAllScheduledFunctions(vi.runAllTimers);
  } catch {
    // releaseInbox is an external call and is not part of what these tests check
  } finally {
    vi.useRealTimers();
  }
}

describe("deleting an event", () => {
  test("is refused to a planner", async () => {
    const t = setup();
    const { plannerId, mine } = await seed(t);
    await expect(
      signedInAs(t, plannerId).mutation(api.weddings.remove, { weddingId: mine, confirmName: "Maya's birthday party" }),
    ).rejects.toThrow("This action requires the owner role");
  });

  test("is refused when the name typed does not match", async () => {
    const t = setup();
    const { ownerId, mine } = await seed(t);
    await expect(
      signedInAs(t, ownerId).mutation(api.weddings.remove, { weddingId: mine, confirmName: "birthday" }),
    ).rejects.toThrow("That doesn't match the event's name");
    expect(await t.run((ctx) => ctx.db.get(mine))).not.toBeNull();
  });

  test("hides it from everyone at once and then removes every row and file", async () => {
    const t = setup();
    const { ownerId, plannerId, mine, shared, slotId, fileId } = await seed(t);
    await signedInAs(t, ownerId).mutation(api.weddings.remove, { weddingId: mine, confirmName: "maya's birthday party" });
    // Gone from the planner's list straight away, before the background work runs.
    const listed = await signedInAs(t, plannerId).query(api.weddings.listMine, {});
    expect(listed.map((w) => w.wedding._id)).toEqual([shared]);
    await finishDeleting(t);
    const after = await t.run(async (ctx) => ({
      event: await ctx.db.get(mine),
      slot: await ctx.db.get(slotId),
      guests: await ctx.db.query("guests").collect(),
      file: await ctx.db.system.get(fileId),
      other: await ctx.db.get(shared),
    }));
    expect(after.event).toBeNull();
    expect(after.slot).toBeNull();
    expect(after.guests).toHaveLength(0);
    expect(after.file).toBeNull();
    expect(after.other).not.toBeNull();
  });
});

describe("deleting an account", () => {
  test("needs the word DELETE", async () => {
    const t = setup();
    const { ownerId } = await seed(t);
    await expect(signedInAs(t, ownerId).mutation(api.users.deleteAccount, { confirm: "yes" })).rejects.toThrow("Type DELETE to confirm.");
    expect(await t.run((ctx) => ctx.db.get(ownerId))).not.toBeNull();
  });

  test("removes the person, their sign-in records, their draft and the events only they own", async () => {
    const t = setup();
    const { ownerId, plannerId, mine, shared, sessionId } = await seed(t);
    await signedInAs(t, ownerId).mutation(api.users.deleteAccount, { confirm: "delete" });
    await finishDeleting(t);
    const after = await t.run(async (ctx) => ({
      user: await ctx.db.get(ownerId),
      session: await ctx.db.get(sessionId),
      accounts: await ctx.db.query("authAccounts").collect(),
      drafts: await ctx.db.query("onboardingDrafts").collect(),
      mine: await ctx.db.get(mine),
      shared: await ctx.db.get(shared),
      sharedMembers: await ctx.db.query("members").withIndex("by_weddingId", (q) => q.eq("weddingId", shared)).collect(),
      other: await ctx.db.get(plannerId),
    }));
    expect(after.user).toBeNull();
    expect(after.session).toBeNull();
    expect(after.accounts).toHaveLength(0);
    expect(after.drafts).toHaveLength(0);
    expect(after.mine).toBeNull();
    // The event with another owner stays, and only that owner is left on it.
    expect(after.shared).not.toBeNull();
    expect(after.sharedMembers.map((m) => m.userId)).toEqual([plannerId]);
    expect(after.other).not.toBeNull();
  });
});
