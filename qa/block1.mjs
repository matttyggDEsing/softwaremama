import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync } from "node:fs";

const PORT = 4174;
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
const demoJson = readFileSync(new URL("./demo-data.json", import.meta.url), "utf8");
await page.addInitScript((json) => { localStorage.setItem("jafet-prototipo-v2", json); }, demoJson);

try {
  await page.goto(BASE, { waitUntil: "networkidle" });
  check("la app carga", true);

  // Navegar a Inventario → Stock
  await page.click("nav >> text=Inventario y compras");
  await page.waitForSelector("text=Insumos en stock");

  // --- Alta de insumo ---
  await page.click("button:has-text('Nuevo insumo')");
  await page.waitForSelector("select", { state: "visible" });
  await page.fill("input[placeholder='Ej. Filet de merluza']", "Merluza fresca");
  await page.locator("select").first().selectOption("proteina");
  await page.fill("input[placeholder='Ej. Carnes']", "Pescados");
  await page.locator("select").nth(1).selectOption("kg");
  await page.fill("input[placeholder='0'] >> nth=0", "8000");
  await page.fill("input[placeholder='0'] >> nth=1", "5");
  await page.fill("input[placeholder='0'] >> nth=2", "2");
  await page.screenshot({ path: `${shots}/b1-crear-form.png` });
  await page.click("button:has-text('Crear insumo')");
  await page.waitForSelector("text=Merluza fresca");
  check("crear insumo: aparece en la tabla", true);

  // --- Edición ---
  const row = page.locator("tr", { hasText: "Merluza fresca" });
  await row.locator("button[aria-label='Editar']").click();
  await page.fill("input[placeholder='0'] >> nth=0", "9000");
  await page.click("button:has-text('Guardar cambios')");
  await page.waitForSelector("text=9.000");
  check("editar costo: se persiste y muestra", true);

  // --- Baja de insumo NO usado ---
  await page.click("button:has-text('Nuevo insumo')");
  await page.fill("input[placeholder='Ej. Filet de merluza']", "Temporal X");
  await page.click("button:has-text('Crear insumo')");
  await page.waitForSelector("text=Temporal X");
  const trow = page.locator("tr", { hasText: "Temporal X" });
  await trow.locator("button[aria-label='Eliminar']").click();
  await page.click("button:has-text('Eliminar')");
  await page.waitForSelector("text=Temporal X", { state: "detached" });
  check("borrar insumo no usado: se borra sin error", true);

  // --- Baja de insumo SÍ usado → bloqueada ---
  const usedRow = page.locator("tr", { hasText: "Filet de pollo" });
  await usedRow.locator("button[aria-label='Eliminar']").click();
  await page.waitForSelector("text=no se puede eliminar");
  check("borrar insumo usado: bloqueado con aviso", true);
  await page.click("button:has-text('Entendido')");
  const still = await page.locator("tr", { hasText: "Filet de pollo" }).count();
  check("borrar insumo usado: el insumo sigue en la tabla", still === 1, `filas=${still}`);

  // --- Recalculo de costos al cambiar el costo del insumo ---
  // Leer costo de la receta "Pollo a la crema" en Menús → tabla de consumo → resumen de recetas
  await page.click("nav >> text=Menú y costos");
  await page.click("button:has-text('Tabla de consumo y márgenes')");
  await page.waitForSelector("text=Resumen de recetas");
  const costRow = page.locator("tr", { hasText: "Pollo a la crema" });
  const antes = await costRow.locator("td.right").innerText();

  await page.click("nav >> text=Inventario y compras");
  await page.waitForSelector("text=Insumos en stock");
  const pRow = page.locator("tr", { hasText: "Filet de pollo" });
  await pRow.locator("button[aria-label='Editar']").click();
  await page.fill("input[placeholder='0'] >> nth=0", "10000");
  await page.click("button:has-text('Guardar cambios')");

  await page.click("nav >> text=Menú y costos");
  await page.click("button:has-text('Tabla de consumo y márgenes')");
  await page.waitForSelector("text=Resumen de recetas");
  const costRow2 = page.locator("tr", { hasText: "Pollo a la crema" });
  const despues = await costRow2.locator("td.right").innerText();
  check("costo insumo → receta se recalcula solo", antes !== despues, `${antes} → ${despues}`);
  await page.screenshot({ path: `${shots}/b1-receta-recalculada.png` });
} catch (e) {
  check("flujo del bloque 1", false, e.message);
  try {
    await page.screenshot({ path: `${shots}/b1-error.png` });
  } catch {}
}

await browser.close();
server.kill();

const fails = results.filter((r) => !r.ok).length;
console.log(`\nRESULTADO: ${results.length - fails}/${results.length} OK`);
process.exit(fails > 0 ? 1 : 0);