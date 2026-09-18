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

// Onboarding, filling whatever the current steps ask for.
if (!page.url().includes("/w/")) {
  await page.getByRole("link", { name: /plan our wedding|plan a wedding|start/i }).first().click().catch(() => {});
  await page.waitForTimeout(1200);
  await shot("02-onboarding-step1");
  const fill = async (label, value) => { const f = page.getByLabel(label).first(); if (await f.count()) await f.fill(value); };
  await fill(/^partner$/i, "Anita");
  const partners = page.getByLabel(/^partner$/i);
  if ((await partners.count()) > 1) await partners.nth(1).fill("Sam");
  await fill(/first day/i, "2027-02-12");
  await fill(/last day/i, "2027-02-14");
  await fill(/city/i, "Austin");
  await fill(/country/i, "United States");
  await page.getByRole("button", { name: /continue/i }).first().click().catch(() => {});
  await page.waitForTimeout(800);
  await shot("03-onboarding-step2");
  await page.getByRole("button", { name: /continue/i }).first().click().catch(() => {});
  await page.waitForTimeout(800);
  await shot("04-onboarding-step3");
  await page.getByRole("button", { name: /create my plan|create/i }).first().click().catch(() => {});
  await page.waitForURL(/\/w\//, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(3000);
}

const base = page.url().split("/w/")[1]?.split("/")[0];
if (base) {
  for (const [name, path] of [["05-overview", ""], ["06-vendors", "/vendors"], ["07-inbox", "/inbox"], ["08-guests", "/guests"], ["09-people", "/members"]]) {
    await page.goto(`${url}/w/${base}${path}`, { waitUntil: "networkidle" });
    await shot(name);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${url}/w/${base}`, { waitUntil: "networkidle" });
  await shot("10-overview-mobile");
}
await browser.close();
console.log(`\nAccount: ${email} / ${password}`);
