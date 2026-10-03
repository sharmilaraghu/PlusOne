/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { comeBack } from "./rateLimits";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

function setup() {
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  return t;
}

type T = ReturnType<typeof setup>;

async function seedEvent(t: T, opts: { demo?: boolean } = {}) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email: "maya@example.com" });
    const weddingId = await ctx.db.insert("weddings", {
      name: "Maya's birthday party",
      partnerA: "Maya",
      partnerB: "",
      startDate: "2027-03-20",
      endDate: "2027-03-20",
      city: "Toronto",
      currency: "CAD",
      totalBudget: 2500,
      template: "custom",
      eventType: "birthday",
      createdBy: userId,
      ...(opts.demo ? { demo: true } : {}),
    });
    await ctx.db.insert("members", { weddingId, userId, role: "owner" });
    for (const title of ["Venue", "Catering", "Cake", "Photography"]) {
      await ctx.db.insert("vendorSlots", { weddingId, eventIds: [], category: title, title, budget: 500, status: "research" });
    }
    return { userId, weddingId };
  });
}

function signedInAs(t: T, userId: Id<"users">) {
  return t.withIdentity({ subject: `${userId}|test-session` });
}

const ask = (t: T, userId: Id<"users">, weddingId: Id<"weddings">) =>
  signedInAs(t, userId).mutation(api.assistant.ask, { weddingId, content: "Who should we book first?" });

describe("comeBack", () => {
  test("says when to return in words a person would use", () => {
    expect(comeBack(30_000)).toBe("in a couple of minutes");
    expect(comeBack(12 * 60_000)).toBe("in about 15 minutes");
    expect(comeBack(90 * 60_000)).toBe("in about 2 hours");
    expect(comeBack(23 * 60 * 60_000)).toBe("tomorrow");
  });
});

describe("the assistant", () => {
  test("a real event can ask twenty questions in a row, and is asked to wait on the next", async () => {
    const t = setup();
    const { userId, weddingId } = await seedEvent(t);
    for (let i = 0; i < 20; i++) await ask(t, userId, weddingId);
    await expect(ask(t, userId, weddingId)).rejects.toThrow("That's a lot of questions in a short time.");
  });

  test("a demo visitor gets ten questions and is then pointed at planning their own", async () => {
    const t = setup();
    const { userId, weddingId } = await seedEvent(t, { demo: true });
    for (let i = 0; i < 10; i++) await ask(t, userId, weddingId);
    await expect(ask(t, userId, weddingId)).rejects.toThrow("That's as many questions as the demo allows.");
  });

  test("a refused question is not stored", async () => {
    const t = setup();
    const { userId, weddingId } = await seedEvent(t, { demo: true });
    for (let i = 0; i < 10; i++) await ask(t, userId, weddingId);
    await ask(t, userId, weddingId).catch(() => {});
    const stored = await t.run((ctx) => ctx.db.query("chatMessages").collect());
    expect(stored.filter((m) => m.role === "user")).toHaveLength(10);
  });
});

describe("vendor searches", () => {
  test("the demo starts two searches at a time and three in a day", async () => {
    const t = setup();
    const { userId, weddingId } = await seedEvent(t, { demo: true });
    expect(await signedInAs(t, userId).mutation(api.research.startAll, { weddingId })).toEqual({ started: 2 });
    await expect(signedInAs(t, userId).mutation(api.research.startAll, { weddingId })).rejects.toThrow(
      "That's as many vendor searches as the demo allows.",
    );
  });

  test("a real event can search for every need at once", async () => {
    const t = setup();
    const { userId, weddingId } = await seedEvent(t);
    expect(await signedInAs(t, userId).mutation(api.research.startAll, { weddingId })).toEqual({ started: 4 });
  });
});

describe("the email webhook", () => {
  afterEach(() => vi.unstubAllEnvs());
  const body = JSON.stringify({ event_type: "message.received", message: { message_id: "m1", inbox_id: "inbox1" } });

  test("is refused outright when no signing secret is configured", async () => {
    vi.stubEnv("AGENTMAIL_WEBHOOK_SECRET", "");
    const t = setup();
    const res = await t.fetch("/agentmail/webhook", { method: "POST", body });
    expect(res.status).toBe(503);
  });

  test("is refused when the signature is missing or wrong", async () => {
    vi.stubEnv("AGENTMAIL_WEBHOOK_SECRET", "whsec_dGVzdC1zZWNyZXQ=");
    const t = setup();
    const res = await t.fetch("/agentmail/webhook", {
      method: "POST",
      headers: { "svix-id": "msg_1", "svix-timestamp": String(Math.floor(Date.now() / 1000)), "svix-signature": "v1,bm9wZQ==" },
      body,
    });
    expect(res.status).toBe(401);
  });
});
