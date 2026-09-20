import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "chrome" });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await p.goto("https://rapid-albatross-416.convex.site/guest");
await p.waitForURL(/\/w\/[^/]+$/, { timeout: 60000 });
const base = p.url(); await p.waitForTimeout(2500);
const skip = p.getByRole("button", { name: /^Skip$/ }); if (await skip.count()) { await skip.click(); await p.waitForTimeout(500); }
await p.goto(`${base}/assistant`); await p.waitForTimeout(2000);
await p.locator("form input, form textarea").last().fill("Find us a florist in Austin");
await p.locator("form input, form textarea").last().press("Enter");
await p.getByRole("button", { name: "Do it" }).last().waitFor({ timeout: 120000 });
await p.getByRole("button", { name: "Do it" }).last().click();
await p.waitForFunction(() => /found for/.test(document.body.innerText) && /for a quote/.test(document.body.innerText), null, { timeout: 480000 }).catch(() => {});
await p.waitForTimeout(3000);
await p.screenshot({ path: "docs/submission/08-assistant-search.png", fullPage: true });
console.log("done:", (await p.locator("body").innerText()).split("\n").filter((l) => /found for|for a quote/.test(l)).join(" | "));
await b.close();
