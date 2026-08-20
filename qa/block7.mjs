import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";

const PORT = 4179;
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
const demoJson = readFileSync(new URL("./demo-data.json", import.meta.url), "utf8");
await page.addInitScript((json) => { localStorage.setItem("jafet-prototipo-v2", json); }, demoJson);

try {
  await page.goto(BASE, { waitUntil: "networkidle" });
  check("la app carga", true);

  // --- Agregar costo fijo a Cumpleaños ---
  await page.click("nav >> text=Eventos");
  await page.click("tr:has-text('Cumpleaños de 70')");
  await page.locator("button[role=tab]:has-text('Menú y costos')").click();
  await page.waitForSelector("button:has-text('Agregar costo')");

  await page.locator("button:has-text('Agregar costo')").click();
  await page.fill("input[placeholder='Ej. Asada, traslado, alquiler de salón']", "Asada");
  await page.locator(".modal input[type=number]").fill("20000");
  await page.screenshot({ path: `${shots}/b7-costo-form.png` });
  await page.locator(".modal button:has-text('Agregar costo')").click();
  await page.waitForSelector("tr:has-text('Asada')");

  const costoRow = await page.locator("tr:has-text('Asada')").innerText();
  check("costo fijo agregado: Asada $20.000", costoRow.includes("20.000"), costoRow.replace(/\s+/g, " ").trim());

  const totalRow = await page.locator(".tfoot-row").innerText();
  check("total costos fijos = $20.000", totalRow.includes("20.000"), totalRow.replace(/\s+/g, " ").trim());

  // --- Persistencia ---
  await page.locator("button[role=tab]:has-text('Personal')").click();
  await sleep(400);
  await page.locator("button[role=tab]:has-text('Menú y costos')").click();
  await page.waitForSelector("tr:has-text('Asada')");
  check("persistencia: costo fijo sobrevive salir/entrar", true);

  // --- Verificar margen en Pagos ---
  await page.click("nav >> text=Pagos");
  const rentCard = page.locator(".card:has-text('Rentabilidad')");
  await rentCard.waitFor({ state: "visible" });
  await rentCard.locator("tr:has-text('Cumpleaños')").waitFor();

  const pagosRow = await rentCard.locator("tr:has-text('Cumpleaños')").innerText();
  check("Pagos rentabilidad: costo fijo = $20.000", pagosRow.includes("20.000"), pagosRow.replace(/\s+/g, " ").trim());
  check("Pagos rentabilidad: margen reducido (4.393)", pagosRow.includes("4.393"), pagosRow.replace(/\s+/g, " ").trim());

  // --- Quitar costo fijo ---
  await page.click("nav >> text=Eventos");
  await page.click("tr:has-text('Cumpleaños de 70')");
  await page.locator("button[role=tab]:has-text('Menú y costos')").click();
  await page.waitForSelector("button[aria-label='Quitar Asada']");
  await page.click("button[aria-label='Quitar Asada']");
  await page.waitForSelector("tr:has-text('Asada')", { state: "detached" });
  check("costo fijo eliminado de la card", true);

  // --- Verificar que margen restauró en Pagos ---
  await page.click("nav >> text=Pagos");
  await sleep(500);
  const rentAfter = await page.locator(".card:has-text('Rentabilidad')").locator("tr:has-text('Cumpleaños')").innerText();
  check("Pagos: fijos vuelve a $0 tras quitar", !rentAfter.includes("20.000") && rentAfter.includes("24.393"), rentAfter.replace(/\s+/g, " ").trim());

  await page.screenshot({ path: `${shots}/b7-final.png` });
} catch (e) {
  check("flujo del bloque 7", false, e.message);
  try { await page.screenshot({ path: `${shots}/b7-error.png` }); } catch {}
}

await browser.close();
server.kill();

const fails = results.filter((r) => !r.ok).length;
console.log(`\nRESULTADO: ${results.length - fails}/${results.length} OK`);
process.exit(fails > 0 ? 1 : 0);