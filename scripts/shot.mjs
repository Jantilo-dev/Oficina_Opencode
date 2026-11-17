import { chromium } from "playwright-core";

const url = process.argv[2] ?? "http://127.0.0.1:5180";
const out = process.argv[3] ?? "screenshot.png";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
page.on("console", (message) => {
  if (message.type() === "error") console.log("[console]", message.text());
});
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(3500);
const info = await page.evaluate(() => ({
  sessions: document.querySelectorAll(".row").length,
  title: document.title,
  canvas: Boolean(document.querySelector("canvas"))
}));
console.log(JSON.stringify(info));
await page.screenshot({ path: out });
await browser.close();
console.log(`screenshot: ${out}`);
