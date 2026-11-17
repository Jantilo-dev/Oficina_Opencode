import { chromium } from "playwright-core";

const base = process.argv[2] ?? "http://127.0.0.1:5180";
const title = `UI test ${Date.now().toString().slice(-5)}`;

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("dialog", (dialog) => dialog.accept());

await page.goto(`${base}/?theme=fuego`, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(2500);

await page.getByRole("button", { name: /NUEVA SESIÓN/ }).click();
await page.waitForTimeout(500);
await page.locator(".agent-card", { hasText: "investigador" }).first().click();
await page.locator('input[placeholder="Se toma de la instrucción"]').fill(title);
await page
  .locator(".modal-block textarea")
  .fill("Lee el archivo demo/alfa.txt y responde solo con su palabra clave en mayúsculas.");
await page.getByRole("button", { name: "Crear y enviar" }).click();

await page.locator(".chat-list").waitFor({ timeout: 15000 });
await page.waitForTimeout(14000);
await page.screenshot({ path: "screenshot-create.png" });

const messages = await page.locator(".msg").count();
const busy = await page.locator(".badge.busy").count();

await page.getByRole("button", { name: "Eliminar" }).click();
await page.waitForTimeout(2500);
await page.screenshot({ path: "screenshot-delete.png" });

console.log(JSON.stringify({ title, messages, busy, errors }));
await browser.close();
