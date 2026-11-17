import { chromium } from "playwright-core";

const base = process.argv[2] ?? "http://127.0.0.1:5180";
const sessionTitle = process.argv[3] ?? "Demo chat";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});

await page.goto(`${base}/?theme=fuego`, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(2500);

await page.getByRole("button", { name: /NUEVA SESIÓN/ }).click();
await page.waitForTimeout(900);
await page.screenshot({ path: "screenshot-modal.png" });
const agentCards = await page.locator(".agent-card").count();
await page.getByRole("button", { name: "Cancelar" }).click();

const row = page.locator(".row", { hasText: sessionTitle }).first();
await row.click();
await page.locator(".chat-list").waitFor({ timeout: 10000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: "screenshot-chat.png" });

const messages = await page.locator(".msg").count();
const rows = await page.locator(".row").count();

console.log(JSON.stringify({ agentCards, rows, messages, errors }));
await browser.close();
