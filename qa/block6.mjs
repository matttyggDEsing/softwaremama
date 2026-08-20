import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const PORT = 4178;
const BASE = `http://127.0.0.1:${PORT}`;
const results = [];
const shots = "qa/shots";
mkdirSync(shots, { recursive: true });

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

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

const polloRow = () => page.locator("tr:has-text('Filet de pollo')");

try {
  await page.goto(BASE, { waitUntil: "networkidle" });
  check("la app carga", true);

  await page.click("nav >> text=Eventos");
  await page.waitForSelector("tr:has-text('Cumpleaños de 70')");
  await page.click("tr:has-text('Cumpleaños de 70')");
  await page.locator("button[role=tab]:has-text('Compras')").click();
  await page.waitForSelector("input[aria-label='Necesario de Filet de pollo']");

  const neededInput = page.locator("input[aria-label='Necesario de Filet de pollo']");
  const base = Number(await neededInput.inputValue());
  check("baseline: necesario automático del pollo (220g × 45 = 9,9)", base === 9.9, `necesario=${base}`);

  const stockCell = await polloRow().locator("td.right").nth(0).innerText();
  check("stock en kg correcto (12,00 kg, no '12 g')", stockCell.trim() === "12,00 kg", stockCell.trim());

  // --- Ajustar cantidad a mano ---
  await neededInput.fill("15");
  await page.waitForFunction(
    () => [...document.querySelectorAll("tr")].find((tr) => tr.textContent.includes("Filet de pollo"))?.textContent.includes("3,00 kg"),
    undefined, { timeout: 5000 }
  );
  const rowAfter = await polloRow().innerText();
  check("ajuste: necesario 15 → comprar 3,00 kg (15 − 12 de stock)", rowAfter.includes("3,00 kg"), rowAfter.replace(/\s+/g, " ").trim());
  check("ajuste: aparece el botón de revertir", (await page.locator("button[aria-label='Volver al cálculo automático']").count()) === 1);

  // --- Persistencia: no se pisa al salir y volver ---
  await page.locator("button[role=tab]:has-text('Menú y costos')").click();
  await sleep(400);
  await page.locator("button[role=tab]:has-text('Compras')").click();
  await page.waitForSelector("input[aria-label='Necesario de Filet de pollo']");
  const afterReentry = Number(await neededInput.inputValue());
  check("persistencia: el ajuste a 15 sobrevive a salir/entrar", afterReentry === 15, `necesario=${afterReentry}`);

  // --- Revertir al cálculo automático ---
  await page.click("button[aria-label='Volver al cálculo automático']");
  await page.waitForFunction(
    () => {
      const inp = document.querySelector("input[aria-label='Necesario de Filet de pollo']");
      return inp && Number(inp.value) === 9.9;
    },
    undefined, { timeout: 5000 }
  );
  check("revertir: vuelve a 9,9 automático y desaparece el botón", (await page.locator("button[aria-label='Volver al cálculo automático']").count()) === 0);

  // --- Agregar ítem manual ---
  await page.click("button:has-text('Agregar ítem manual')");
  await page.waitForSelector("input[placeholder='Ej. Servilletas de papel']");
  await page.fill("input[placeholder='Ej. Servilletas de papel']", "Servilletas de papel");
  await page.locator(".modal select").nth(0).selectOption({ label: "unidad" });
  await page.locator(".modal input[type=number]").fill("10");
  await page.locator(".modal select").nth(1).selectOption({ label: "Distribuidora San Cayetano" });
  await page.screenshot({ path: `${shots}/b6-manual-form.png` });
  await page.locator(".modal button:has-text('Agregar a la lista')").click();
  await page.waitForSelector("tr:has-text('Servilletas de papel')");
  const manRow = await page.locator("tr:has-text('Servilletas de papel')").innerText();
  check("ítem manual agregado con badge y cantidades", manRow.includes("manual") && manRow.includes("10 u") && manRow.includes("Distribuidora San Cayetano"), manRow.replace(/\s+/g, " ").trim());

  // --- Persistencia del ítem manual ---
  await page.locator("button[role=tab]:has-text('Personal')").click();
  await sleep(400);
  await page.locator("button[role=tab]:has-text('Compras')").click();
  await page.waitForSelector("tr:has-text('Servilletas de papel')");
  check("persistencia: el ítem manual sobrevive a salir/entrar", true);

  // --- Quitar el ítem manual ---
  await page.click("button[aria-label='Quitar Servilletas de papel']");
  await page.waitForSelector("tr:has-text('Servilletas de papel')", { state: "detached" });
  check("quitar ítem manual: desaparece de la lista", true);

  // --- Quitar un ítem automático (persistido) ---
  await page.click("button[aria-label='Quitar Filet de pollo']");
  await page.waitForSelector("tr:has-text('Filet de pollo')", { state: "detached" });
  await page.locator("button[role=tab]:has-text('Personal')").click();
  await sleep(400);
  await page.locator("button[role=tab]:has-text('Compras')").click();
  await page.waitForSelector("input[aria-label='Necesario de Filet de pollo']", { state: "detached" });
  check("persistencia: el ítem automático quitado no reaparece al reentrar", true);

  await page.screenshot({ path: `${shots}/b6-final.png` });
} catch (e) {
  check("flujo del bloque 6", false, e.message);
  try { await page.screenshot({ path: `${shots}/b6-error.png` }); } catch {}
}

await browser.close();
server.kill();

const fails = results.filter((r) => !r.ok).length;
console.log(`\nRESULTADO: ${results.length - fails}/${results.length} OK`);
process.exit(fails > 0 ? 1 : 0);