import { chromium } from "playwright-core";

const base = process.argv[2] ?? "http://127.0.0.1:5180";
const sessionTitle = process.argv[3] ?? "Demo chat";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">
<rect width="32" height="32" fill="#2f6fbf"/>
<circle cx="16" cy="12" r="8" fill="#f0c090"/>
<rect x="8" y="6" width="16" height="5" fill="#5b3520"/>
<rect x="4" y="11" width="3" height="7" fill="#5b3520"/>
<rect x="25" y="11" width="3" height="7" fill="#5b3520"/>
<rect x="10" y="13" width="3" height="3" fill="#22262a"/>
<rect x="19" y="13" width="3" height="3" fill="#22262a"/>
<rect x="6" y="20" width="20" height="12" fill="#e86aa6"/>
</svg>`;

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});

await page.goto(`${base}/?theme=fuego`, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(2500);

await page.locator(".row", { hasText: sessionTitle }).first().click();
await page.locator(".chat-list").waitFor();
await page.locator(".icon-btn.dark").click();
await page.waitForTimeout(500);
await page.locator('.char-modal input').first().fill("Sora");
await page.locator(".avatar-card", { hasText: "Idol" }).click();
await page.screenshot({ path: "screenshot-character.png" });
await page.getByRole("button", { name: "Guardar" }).click();
await page.waitForTimeout(700);

await page.getByRole("button", { name: "EQUIPO" }).click();
await page.waitForTimeout(700);
await page.screenshot({ path: "screenshot-character-office.png" });

await page.locator(".row", { hasText: "Sora" }).first().click();
await page.locator(".icon-btn.dark").click();
await page.waitForTimeout(400);
await page.setInputFiles('input[type="file"]', {
  name: "avatar.svg",
  mimeType: "image/svg+xml",
  buffer: Buffer.from(svg, "utf8")
});
await page.waitForTimeout(600);
await page.getByRole("button", { name: "Guardar" }).click();
await page.waitForTimeout(1000);
await page.getByRole("button", { name: "EQUIPO" }).click();
await page.waitForTimeout(800);
await page.screenshot({ path: "screenshot-character-upload.png" });

const stored = await page.evaluate(() => window.localStorage.getItem("pixel-office-characters"));
const header = await page.locator(".chat-title").innerText().catch(() => "");

console.log(JSON.stringify({ header, stored, errors }));
await browser.close();
