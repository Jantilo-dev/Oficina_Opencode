import { chromium } from "playwright-core";

const base = process.argv[2] ?? "http://127.0.0.1:5180";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});

await page.goto(`${base}/?theme=fuego`, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(3500);
await page.screenshot({ path: "screenshot-seated.png" });

await page.goto(`${base}/?theme=fuego&breaks=fast`, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(5200);
await page.screenshot({ path: "screenshot-breaks.png" });

await page.goto(`${base}/?theme=fuego`, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(2500);
await page.locator(".row").first().click();
await page.locator(".chat-list").waitFor();
await page.locator(".icon-btn.dark").click();
await page.waitForTimeout(600);
await page.screenshot({ path: "screenshot-skin.png" });

console.log(JSON.stringify({ errors }));
await browser.close();
