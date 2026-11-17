import { chromium } from "playwright-core";

const base = process.argv[2] ?? "http://127.0.0.1:5180";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});

const setColor = async (locator, value) => {
  await locator.evaluate((element, color) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(element, color);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
};

await page.goto(`${base}/?theme=fuego`, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(2500);

await page.locator(".row", { hasText: "Demo chat" }).first().click();
await page.locator(".chat-list").waitFor();
await page.locator(".icon-btn.dark").click();
await page.waitForTimeout(500);

await page.locator(".char-modal input").first().fill("Kira");
await page.locator(".parts-grid select").nth(0).selectOption({ label: "Coletas" });
await page.locator(".parts-grid select").nth(1).selectOption({ label: "Estrella" });
const colors = page.locator('.colors-row input[type="color"]');
await setColor(colors.nth(0), "#7a3fa0");
await setColor(colors.nth(1), "#2f6fbf");
await page.waitForTimeout(400);
await page.screenshot({ path: "screenshot-parts-modal.png" });
await page.getByRole("button", { name: "Guardar" }).click();
await page.waitForTimeout(600);

await page.getByRole("button", { name: "EQUIPO" }).click();
await page.waitForTimeout(700);

const row = page.locator(".row", { hasText: "Planificacion" }).first();
if ((await row.count()) > 0) {
  await row.click();
  await page.locator(".icon-btn.dark").click();
  await page.waitForTimeout(400);
  await page.locator(".avatar-card", { hasText: "Maga" }).click();
  await page.getByRole("button", { name: "Guardar" }).click();
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "EQUIPO" }).click();
}

await page.waitForTimeout(700);
await page.screenshot({ path: "screenshot-parts-office.png" });

const stored = await page.evaluate(() => window.localStorage.getItem("pixel-office-characters"));
console.log(JSON.stringify({ stored, errors }));
await browser.close();
