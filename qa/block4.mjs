import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";

const PORT = 4175;
const BASE = `http://127.0.0.1:${PORT}`;
const KEY = "jafet-prototipo-v2";
const results = [];
const shots = "qa/shots";

mkdirSync(shots, { recursive: true });

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const v2legacy = {
  version: 2,
  ingredients: [{ id: "i1", name: "Papas", component: "guarnicion", cat: "Verduras", unit: "kg", cost: 1200, supplierId: "s1", stock: 10, min: 2 }],
  recipes: [{ id: "r1", name: "Papas al horno", module: "buffet", items: [{ ingredientId: "i1", g: 90 }] }],
  dishes: [{ id: "d1", name: "Cheesecake", module: "postre", recipeId: "r1", margin: 0.5 }],
  menus: [{ id: "m1", name: "Menú Legacy", variants: [{ id: "m1v1", name: "V1", modules: { buffet: ["r1"], postre: ["d1"] } }] }],
  clients: [{ id: "c1", name: "Cliente Legacy", phone: "", email: "", address: "", notes: "" }],
  equipment: [], staff: [], assignments: [], payments: [],
  events: [{
    id: "e1", clientId: "c1", name: "Evento Legacy", date: "2026-10-01", guests: 12, status: "consulta",
    menuId: "m1", variantId: "m1v1", seña: 0, señaDate: null, confirmDate: null, notes: "",
    modules: { entrada: { on: false, dishId: null }, principal: { on: false, dishId: null }, buffet: { on: true, recipeIds: ["r1"] }, postre: { on: true, dishIds: ["d1"] }, trasnoche: { on: false, dishId: null } },
  }],
  suppliers: [{ id: "s1", name: "Sup", phone: "", categories: "" }],
  settings: {
    señaReference: 100000, señaLabel: "1 tarjeta", buffetSafety: 0.25, buffetPriceMargin: 0.5,
    consumption: {
      proteina: { label: "Proteína", mesa: [200, 250], buffet: [250, 350] },
      guarnicion: { label: "Guarnición", mesa: [150, 200], buffet: [200, 250] },
      ensalada: { label: "Ensalada", mesa: [100, 150], buffet: [150, 200] },
      postre: { label: "Postre", mesa: [100, 120], buffet: [120, 150] },
    },
    business: { name: "JAFET", phone: "", address: "", instagram: "" },
  },
};

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

  // --- Navegar a Menús → Combos y precios (tab por defecto) ---
  await page.click("nav >> text=Menú y costos");
  await page.waitForSelector("button:has-text('Nuevo menú')");

  // --- Crear menú desde cero ---
  await page.click("button:has-text('Nuevo menú')");
  await page.waitForSelector("input[placeholder='Ej. Menú XL asado']", { state: "visible" });
  await page.fill("input[placeholder='Ej. Menú XL asado']", "Menú QA");
  await page.locator(".menu-module", { hasText: "Entrada / primer plato" }).locator(".switch-row").click();
  await page.locator(".menu-module", { hasText: "Entrada / primer plato" }).locator("select").selectOption({ label: "Empanadas de carne" });
  await page.locator(".menu-module", { hasText: "Segundo plato" }).locator(".switch-row").click();
  await page.locator(".menu-module", { hasText: "Segundo plato" }).locator("select").selectOption({ label: "Pollo a la crema" });
  await page.screenshot({ path: `${shots}/b4-menu-form.png` });
  await page.click("button:has-text('Crear menú')");
  await page.waitForSelector(".menu-list .card", { hasText: "Menú QA" });
  const mqaCard = page.locator(".menu-list .card", { hasText: "Menú QA" });
  const mqaText = await mqaCard.innerText();
  check("crear menú desde cero: aparece en la lista", true);
  check("crear menú: muestra módulos activos", mqaText.includes("Entrada: Empanadas de carne") && mqaText.includes("Principal: Pollo a la crema"), mqaText.split("\n").slice(0, 3).join(" "));

  // --- Editar menú existente (Menú Clásico · Casual) ---
  await page.locator(".menu-list .card", { hasText: "Menú Clásico · Casual" }).locator("button[aria-label='Editar menú']").click();
  await page.waitForSelector("input[placeholder='Ej. Menú XL asado']", { state: "visible" });
  await page.locator(".menu-module", { hasText: "Trasnoche" }).locator(".switch-row").click();
  await page.locator(".menu-module", { hasText: "Trasnoche" }).locator("select").selectOption({ label: "Sandwich de miga" });
  await page.click("button:has-text('Guardar cambios')");
  await page.waitForSelector(".menu-list .card", { hasText: "Trasnoche: Sandwich de miga" });
  const mClasico = await page.locator(".menu-list .card", { hasText: "Menú Clásico · Casual" }).innerText();
  check("editar menú: se guarda y muestra el módulo nuevo", mClasico.includes("Trasnoche: Sandwich de miga"));

  // --- Los eventos guardan su propia copia; 'Aplicar menú' la reemplaza ---
  await page.click("nav >> text=Eventos");
  await page.waitForSelector("tr:has-text('Cumpleaños de 70')");
  await page.click("tr:has-text('Cumpleaños de 70')");
  await page.waitForSelector("button[role=tab]:has-text('Menú y costos')");
  await page.locator("button[role=tab]:has-text('Menú y costos')").click();
  await page.waitForSelector("text=Control de porciones vs. tabla de consumo");
  let tTab = await page.locator(".card", { hasText: "Trasnoche" }).locator(".switch-label").innerText();
  check("editar menú no altera el evento que lo referencia", tTab.trim() === "Desactivado", `trasnoche=${tTab.trim()}`);
  await page.locator("button[role=tab]:has-text('Resumen')").click();
  await page.waitForSelector("button:has-text('Aplicar menú')");
  await page.click("button:has-text('Aplicar menú')");
  await page.locator("button[role=tab]:has-text('Menú y costos')").click();
  await page.waitForSelector(".card", { hasText: "Sandwich de miga" });
  tTab = await page.locator(".card", { hasText: "Trasnoche" }).locator(".switch-label").innerText();
  check("aplicar menú reemplaza los módulos del evento", tTab.trim() === "Activo", `trasnoche=${tTab.trim()}`);

  // --- Borrado protegido de menú en uso ---
  await page.click("nav >> text=Menú y costos");
  await page.waitForSelector("button:has-text('Nuevo menú')");
  await page.locator(".menu-list .card", { hasText: "Menú Buffet · Completo" }).locator("button[aria-label='Eliminar menú']").click();
  await page.waitForSelector("text=No se puede eliminar");
  let txt = await page.evaluate(() => document.body.innerText);
  check("no se puede borrar menú usado por un evento", txt.includes("Cena de fin de año"));
  await page.click("button:has-text('Entendido')");

  // --- Borrado de menú sin uso ---
  await page.locator(".menu-list .card", { hasText: "Menú QA" }).locator("button[aria-label='Eliminar menú']").click();
  await page.waitForSelector("button:has-text('Eliminar')");
  await page.click("button:has-text('Eliminar')");
  await page.waitForSelector("text=Menú eliminado", { state: "detached" });
  const gone = await page.locator(".menu-list .card", { hasText: "Menú QA" }).count();
  check("borrar menú sin uso: desaparece de la lista", gone === 0);

  // --- Calculador sin variantes ---
  await page.click("button:has-text('Calculador de costos')");
  await page.waitForSelector("button:has-text('Cargar menú')");
  txt = await page.evaluate(() => document.body.innerText);
  check("calculador: no hay selector de variante", !txt.includes("Variante"));

  // --- Migración v2 (con variantes) -> v3 por la UI ---
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page2 = await ctx.newPage();
  page2.on("pageerror", (e) => check("legacy v2: sin errores de consola", false, e.message));
  await page2.addInitScript(({ k, raw }) => localStorage.setItem(k, raw), { k: KEY, raw: JSON.stringify(v2legacy) });
  await page2.goto(BASE, { waitUntil: "networkidle" });
  await page2.click("nav >> text=Menú y costos");
  await page2.waitForSelector(".menu-list .card", { hasText: "V1" });
  const legacyMenu = await page2.locator(".menu-list .card", { hasText: "V1" }).innerText();
  check("v2 -> v3: la variante pasó a ser un menú propio", legacyMenu.includes("Buffet: Papas al horno"), legacyMenu.split("\n")[0]);
  txt = await page2.evaluate(() => document.body.innerText);
  check("v2 -> v3: sin rastro de 'Variante' ni 'variante'", !/variat/i.test(txt));
  await page2.click("nav >> text=Eventos");
  await page2.waitForSelector("tr:has-text('Evento Legacy')");
  await page2.click("tr:has-text('Evento Legacy')");
  await page2.waitForSelector("button[role=tab]:has-text('Resumen')");
  txt = await page2.evaluate(() => document.body.innerText);
  check("v2 -> v3: el evento conserva su menú migrado", txt.includes("V1") && !/variat/i.test(txt));
  await page2.screenshot({ path: `${shots}/b4-legacy-v3.png` });
  await ctx.close();
} catch (e) {
  check("flujo del bloque 4", false, e.message);
  try { await page.screenshot({ path: `${shots}/b4-error.png` }); } catch {}
}

await browser.close();
server.kill();

const fails = results.filter((r) => !r.ok).length;
console.log(`\nRESULTADO: ${results.length - fails}/${results.length} OK`);
process.exit(fails > 0 ? 1 : 0);