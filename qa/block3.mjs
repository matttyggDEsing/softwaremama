import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";

const PORT = 4174;
const BASE = `http://127.0.0.1:${PORT}`;
const KEY = "jafet-prototipo-v2";
const results = [];
const shots = "qa/shots";

mkdirSync(shots, { recursive: true });

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const parseMoney = (s) => Number(String(s).replace(/[^\d]/g, "")) || 0;

const v1legacy = {
  version: 1,
  ingredients: [{ id: "i1", name: "Papas", component: "guarnicion", cat: "Verduras", unit: "kg", cost: 1200, supplierId: "s1", stock: 10, min: 2 }],
  recipes: [{ id: "r1", name: "Frutillas con crema", module: "dulce", items: [{ ingredientId: "i1", g: 90 }] }],
  dishes: [{ id: "d1", name: "Frutillas con crema", module: "dulce", recipeId: "r1", margin: 0.5 }],
  menus: [{ id: "m1", name: "Menú test", variants: [{ id: "m1v1", name: "V1", modules: { postre: "d1" } }] }],
  clients: [{ id: "c1", name: "Cliente Test", phone: "", email: "", address: "", notes: "" }],
  equipment: [],
  staff: [],
  assignments: [],
  events: [{
    id: "e1", clientId: "c1", name: "Evento legacy dulce", date: "2026-10-01", guests: 10, status: "consulta",
    menuId: "m1", variantId: "m1v1", seña: 0, señaDate: null, confirmDate: null, notes: "",
    modules: { postre: { on: false, dishId: null }, dulce: { on: true, dishIds: ["d1"] } },
  }],
  payments: [],
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

  // --- Navegar a Menús → Recetas ---
  await page.click("nav >> text=Menú y costos");
  await page.click("button:has-text('Recetas')");
  await page.waitForSelector("button:has-text('Nueva receta')");

  // --- Alta de receta con 3 ingredientes ---
  await page.click("button:has-text('Nueva receta')");
  await page.waitForSelector("input[placeholder='Ej. Pollo al champignon']", { state: "visible" });
  await page.fill("input[placeholder='Ej. Pollo al champignon']", "Receta QA");
  for (let i = 0; i < 3; i++) await page.click("button:has-text('Agregar ingrediente')");
  let rows = page.locator(".ing-row");
  await rows.nth(0).locator(".ing-ing").selectOption({ label: "Papas" });
  await rows.nth(0).locator(".ing-qty").fill("100");
  await rows.nth(1).locator(".ing-ing").selectOption({ label: "Huevos" });
  await rows.nth(1).locator(".ing-qty").fill("1");
  await rows.nth(1).locator(".ing-unit").selectOption("u");
  await rows.nth(2).locator(".ing-ing").selectOption({ label: "Crema de leche" });
  await rows.nth(2).locator(".ing-qty").fill("50");
  await page.screenshot({ path: `${shots}/b3-receta-form.png` });
  await page.click("button:has-text('Crear receta')");
  await page.waitForSelector("tr:has-text('Receta QA')");
  check("crear receta con 3 ingredientes: aparece en la tabla", true);

  // --- Edición de receta: agrega, quita, cambia cantidad → costo se recalcula ---
  const costBefore = parseMoney(await page.locator("tr:has-text('Receta QA') >> td.right").innerText());
  await page.locator("tr:has-text('Receta QA') >> button[aria-label='Editar receta']").click();
  await page.waitForSelector(".ing-row", { state: "visible" });
  await page.click("button:has-text('Agregar ingrediente')");
  rows = page.locator(".ing-row");
  await rows.nth(3).locator(".ing-ing").selectOption({ label: "Lomo" });
  await rows.nth(3).locator(".ing-qty").fill("200");
  await rows.nth(0).locator("button[aria-label='Quitar ingrediente']").click();
  rows = page.locator(".ing-row");
  await rows.nth(0).locator(".ing-qty").fill("2");
  await page.click("button:has-text('Guardar cambios')");
  await page.waitForSelector("tr:has-text('Receta QA') >> text=4.125");
  const costAfter = parseMoney(await page.locator("tr:has-text('Receta QA') >> td.right").innerText());
  check("editar receta: costo se recalcula", costBefore !== costAfter && costAfter === 4125, `${costBefore} → ${costAfter}`);

  // --- Alta de plato: precio = costo × (1 + margen) ---
  await page.click("button:has-text('Combos y precios')");
  await page.waitForSelector("button:has-text('Nuevo plato')");
  await page.click("button:has-text('Nuevo plato')");
  await page.waitForSelector("input[placeholder='Ej. Pollo al champignon']", { state: "visible" });
  await page.fill("input[placeholder='Ej. Pollo al champignon']", "Plato QA");
  await page.locator("select").nth(1).selectOption({ label: "Receta QA · $ 4.125" });
  await page.locator(".modal input[type=number]").fill("50");
  await page.screenshot({ path: `${shots}/b3-plato-form.png` });
  await page.click("button:has-text('Crear plato')");
  await page.waitForSelector("tr:has-text('Plato QA')");
  const drow = page.locator("tr:has-text('Plato QA')");
  const dCost = parseMoney(await drow.locator("td.right").nth(0).innerText());
  const dPrice = parseMoney(await drow.locator("td.right").nth(2).innerText());
  const dMargin = await drow.locator("td.right input").inputValue();
  check("plato: precio = costo × (1+margen)", dPrice === Math.round(dCost * 1.5), `costo ${dCost} → precio ${dPrice}`);
  check("plato: margen se muestra ×100", dMargin === "50", `input=${dMargin}`);

  // --- "Mesa dulce" no aparece en el editor del evento (Casamiento tenía mesa dulce) ---
  await page.click("nav >> text=Eventos");
  await page.waitForSelector("tr:has-text('Casamiento')");
  await page.click("tr:has-text('Casamiento')");
  await page.waitForSelector("button[role=tab]:has-text('Menú y costos')");
  await page.locator("button[role=tab]:has-text('Menú y costos')").click();
  await page.waitForSelector("text=Control de porciones vs. tabla de consumo");
  let txt = await page.evaluate(() => document.body.innerText);
  check("sin 'Mesa dulce' en el editor de eventos", !txt.includes("Mesa dulce"));
  check("postre incluye opciones que estaban en mesa dulce", txt.includes("Mini tortas surtidas") && txt.includes("Copa de frutas"));

  // --- Lista de compras sin "Mesa dulce" ---
  await page.locator("button[role=tab]:has-text('Compras')").click();
  await page.waitForSelector("text=Lista de compras del evento");
  txt = await page.evaluate(() => document.body.innerText);
  check("sin 'Mesa dulce' en la lista de compras", !txt.includes("Mesa dulce"));

  // --- Evento legacy v1 (con mesa dulce) no rompe tras migrar ---
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page2 = await ctx.newPage();
  page2.on("pageerror", (e) => check("legacy: sin errores de consola", false, e.message));
  await page2.addInitScript(({ k, raw }) => localStorage.setItem(k, raw), { k: KEY, raw: JSON.stringify(v1legacy) });
  await page2.goto(BASE, { waitUntil: "networkidle" });
  await page2.click("tr:has-text('Evento legacy dulce')");
  await page2.waitForSelector("button[role=tab]:has-text('Menú y costos')");
  await page2.locator("button[role=tab]:has-text('Menú y costos')").click();
  await page2.waitForSelector("text=Control de porciones vs. tabla de consumo");
  txt = await page2.evaluate(() => document.body.innerText);
  check("evento legacy (mesa dulce) migra sin romper", !txt.includes("Mesa dulce") && txt.includes("Frutillas con crema"));
  await page2.screenshot({ path: `${shots}/b3-legacy-migrado.png` });
  await ctx.close();
} catch (e) {
  check("flujo del bloque 3", false, e.message);
  try {
    await page.screenshot({ path: `${shots}/b3-error.png` });
  } catch {}
}

await browser.close();
server.kill();

const fails = results.filter((r) => !r.ok).length;
console.log(`\nRESULTADO: ${results.length - fails}/${results.length} OK`);
process.exit(fails > 0 ? 1 : 0);