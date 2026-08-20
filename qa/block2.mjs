import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { existsSync, mkdirSync } from "node:fs";

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

try {
  await page.goto(BASE, { waitUntil: "networkidle" });
  check("la app carga", true);

  // Navegar a Inventario → Proveedores
  await page.click("nav >> text=Inventario y compras");
  await page.click("button:has-text('Proveedores')");
  await page.waitForSelector("text=Nuevo proveedor");

  // --- Alta ---
  await page.click("button:has-text('Nuevo proveedor')");
  await page.waitForSelector("input[placeholder='Ej. Carnicería El Punto']", { state: "visible" });
  await page.fill("input[placeholder='Ej. Carnicería El Punto']", "Proveedor QA");
  await page.fill("input[placeholder='Ej. 911 555 0101']", "911 555 0999");
  await page.fill("input[placeholder='Ej. Carnes']", "Pescados");
  await page.screenshot({ path: `${shots}/b2-crear-form.png` });
  await page.click("button:has-text('Crear proveedor')");
  await page.waitForSelector(".supplier:has-text('Proveedor QA')");
  check("crear proveedor: aparece en el grid", true);

  // --- Edición ---
  const card = page.locator(".supplier", { hasText: "Proveedor QA" });
  await card.locator("button[aria-label='Editar proveedor']").click();
  await page.fill("input[placeholder='Ej. 911 555 0101']", "911 555 0888");
  await page.click("button:has-text('Guardar cambios')");
  await page.waitForSelector("text=911 555 0888");
  check("editar proveedor: cambios se persisten", true);

  // --- Baja sin insumos ---
  const card2 = page.locator(".supplier", { hasText: "Proveedor QA" });
  await card2.locator("button[aria-label='Eliminar proveedor']").click();
  await page.click("button:has-text('Eliminar')");
  await page.waitForSelector(".supplier:has-text('Proveedor QA')", { state: "detached" });
  check("borrar proveedor sin insumos: se borra sin error", true);

  // --- Baja con insumos asignados → bloqueada ---
  const used = page.locator(".supplier", { hasText: "Carnicería Los Gauchos" });
  await used.locator("button[aria-label='Eliminar proveedor']").click();
  await page.waitForSelector("text=no se puede eliminar");
  check("borrar proveedor con insumos: bloqueado con aviso", true);
  await page.screenshot({ path: `${shots}/b2-bloqueo.png` });
  await page.click("button:has-text('Entendido')");
  const still = await page.locator(".supplier", { hasText: "Carnicería Los Gauchos" }).count();
  check("borrar proveedor con insumos: sigue en el grid", still === 1, `cards=${still}`);
} catch (e) {
  check("flujo del bloque 2", false, e.message);
  try {
    await page.screenshot({ path: `${shots}/b2-error.png` });
  } catch {}
}

await browser.close();
server.kill();

const fails = results.filter((r) => !r.ok).length;
console.log(`\nRESULTADO: ${results.length - fails}/${results.length} OK`);
process.exit(fails > 0 ? 1 : 0);