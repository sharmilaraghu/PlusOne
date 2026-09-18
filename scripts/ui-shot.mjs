#!/usr/bin/env node
/**
 * Sign in (or sign up) to a running PlusOne and screenshot the signed-in screens.
 * Usage: node scripts/ui-shot.mjs [--url http://localhost:4173] [--email x@y.z] [--password ...] [--out .impeccable/review/app]
 */
import { chromium } from "playwright-core";
import fs from "node:fs";

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const url = arg("url", "http://localhost:4173");
const email = arg("email", `ui-${Date.now()}@example.com`);
const password = arg("password", "plusone-test-1234");
const out = arg("out", ".impeccable/review/app");
const width = Number(arg("width", 1440));
const height = Number(arg("height", 900));
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width, height } });
const shot = async (name, full = true) => {
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: full });
  console.log(`  ${name}.png`);
};

await page.goto(`${url}/signin?new=1`, { waitUntil: "networkidle" });
await page.getByLabel(/email/i).first().fill(email);
await page.getByLabel(/password/i).first().fill(password);
await page.getByRole("button", { name: /create account|sign in/i }).first().click();
await page.waitForURL((u) => !u.pathname.startsWith("/signin"), { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(2500);
console.log(`signed in as ${email} → ${page.url()}`);
await shot("01-home");

// Onboarding: five steps, everything prefilled once a tradition is chosen.
if (!page.url().includes("/w/")) {
  await page.getByRole("link", { name: /plan our wedding|plan a wedding|start/i }).first().click().catch(() => {});
  await page.waitForTimeout(1200);
  const fill = async (label, value) => { const f = page.getByLabel(label).first(); if (await f.count()) await f.fill(value); };
  const partners = page.getByLabel(/^partner$/i);
  if (await partners.count()) { await partners.nth(0).fill("Anita"); await partners.nth(1).fill("Sam"); }
  await fill(/first day/i, "2027-02-12");
  await fill(/last day/i, "2027-02-15");
  await fill(/^city$/i, "Austin");
  await fill(/neighbourhood/i, "East Austin");
  await fill(/country/i, "United States");
  await shot("02-step1-couple");
  for (const [name, waitFor] of [["03-step2-days", 900], ["04-step3-guests", 700], ["05-step4-budget", 700], ["06-step5-feel", 700]]) {
    await page.getByRole("button", { name: /^continue$/i }).first().click().catch(() => {});
    await page.waitForTimeout(waitFor);
    await shot(name);
  }
  await page.getByRole("button", { name: /create my plan/i }).first().click().catch(() => {});
  await page.waitForURL(/\/w\//, { timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(3500);
}

const base = page.url().split("/w/")[1]?.split("/")[0];
if (base) {
  for (const [name, path] of [["07-overview", ""], ["08-vendors", "/vendors"], ["09-inbox", "/inbox"], ["10-people", "/members"]]) {
    await page.goto(`${url}/w/${base}${path}`, { waitUntil: "networkidle" });
    await shot(name);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${url}/w/${base}`, { waitUntil: "networkidle" });
  await shot("11-overview-mobile");
}
await browser.close();
console.log(`\nAccount: ${email} / ${password}`);
