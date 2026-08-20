import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const PORT = 4176;
const BASE = `http://127.0.0.1:${PORT}`;
const results = [];
const shots = "qa/shots";

mkdirSync(shots, { recursive: true });

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const parseMoney = (s) => Number(String(s).replace(/[^\d]/g, "")) || 0;

const server = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--port", PORT],
  { cwd: process.cwd(), stdio: "ignore", windowsHide: true }
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(6000);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (e) => check("sin errores de consola", false, e.message));

try {
  await page.goto(BASE, { waitUntil: "networkidle" });
  check("la app carga", true);

  // --- Evento de 45 invitados (Cumpleaños de 70) ---
  await page.click("nav >> text=Eventos");
  await page.waitForSelector("tr:has-text('Cumpleaños de 70')");
  await page.click("tr:has-text('Cumpleaños de 70')");
  await page.waitForSelector("button[role=tab]:has-text('Menú y costos')");
  await page.locator("button[role=tab]:has-text('Menú y costos')").click();
  await page.waitForSelector("button:has-text('Agregar especial')");

  const statVal = (label) => page.locator(".stat", { hasText: label }).locator(".stat-value").innerText();
  const baseTotal = parseMoney(await statVal("Total del evento"));
  const pp = parseMoney(await statVal("Precio por persona"));
  check("baseline: evento 45 pers. sin especiales", baseTotal > 0 && pp > 0, `total=${baseTotal} pp=${pp}`);

  // --- Agregar especial: 3 porciones veganas de Risotto de hongos ---
  await page.click("button:has-text('Agregar especial')");
  await page.waitForSelector("input[placeholder='Ej. Opción vegana']", { state: "visible" });
  await page.fill("input[placeholder='Ej. Opción vegana']", "Vegano");
  await page.locator(".modal input[type=number]").fill("3");
  await page.locator(".modal select").nth(1).selectOption({ label: "Risotto de hongos" });
  await page.screenshot({ path: `${shots}/b5-especial-form.png` });
  await page.locator(".modal button:has-text('Agregar especial')").click();
  await page.waitForSelector("tr:has-text('Vegano')");

  const row = page.locator("tr:has-text('Vegano')");
  const rowText = await row.innerText();
  const specialTotal = parseMoney(await row.locator("td.right").nth(2).innerText());
  const specialUnit = parseMoney(await row.locator("td.right").nth(1).innerText());
  check("especial agregado con su porción", rowText.includes("3") && rowText.includes("Risotto de hongos"), rowText.replace(/\s+/g, " ").trim());
  check("especial: total = unit × qty", Math.abs(specialTotal - specialUnit * 3) <= 5, `unit=${specialUnit} × 3 = ${specialTotal}`);

  // --- La cuenta general resta las porciones especiales ---
  const labelCost = await page.locator(".stat").nth(2).locator(".stat-label").innerText();
  check("los estándar usan 45 − 3 = 42", labelCost.toLowerCase().includes("42 pers. + especiales"), labelCost);
  const afterTotal = parseMoney(await statVal("Total del evento"));
  const expected = baseTotal - pp * 3 + specialTotal;
  check("total = estándar × 42 + especial × 3", Math.abs(afterTotal - expected) <= 5, `total=${afterTotal} esperado=${expected}`);

  // --- Lista de compras: especial suma a su cantidad, no como 45 ---
  await page.locator("button[role=tab]:has-text('Compras')").click();
  await page.waitForSelector("text=Lista de compras del evento");
  const arroz = Number(await page.locator("input[aria-label='Necesario de Arroz']").inputValue());
  check("lista: arroz del especial (90g × 3 = 0,27 kg)", Math.abs(arroz - 0.27) < 0.001, `arroz=${arroz} kg`);
  const pollo = Number(await page.locator("input[aria-label='Necesario de Filet de pollo']").inputValue());
  check("lista: estándar escala a 42 (220g × 42 = 9,24 kg)", Math.abs(pollo - 9.24) < 0.001, `pollo=${pollo} kg`);

  // --- Quitar el especial restaura el total ---
  await page.locator("button[role=tab]:has-text('Menú y costos')").click();
  await page.waitForSelector("button[aria-label='Quitar especial']");
  await page.click("button[aria-label='Quitar especial']");
  await page.waitForSelector("tr:has-text('Vegano')", { state: "detached" });
  const restored = parseMoney(await statVal("Total del evento"));
  check("quitar especial: total vuelve al baseline", Math.abs(restored - baseTotal) <= 5, `restaurado=${restored} baseline=${baseTotal}`);

  await page.screenshot({ path: `${shots}/b5-sin-especial.png` });
} catch (e) {
  check("flujo del bloque 5", false, e.message);
  try { await page.screenshot({ path: `${shots}/b5-error.png` }); } catch {}
}

await browser.close();
server.kill();

const fails = results.filter((r) => !r.ok).length;
console.log(`\nRESULTADO: ${results.length - fails}/${results.length} OK`);
process.exit(fails > 0 ? 1 : 0);