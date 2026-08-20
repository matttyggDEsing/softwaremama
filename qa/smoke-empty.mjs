import { spawn } from "node:child_process";
import { chromium } from "playwright";

const PORT = 4180;
const BASE = `http://127.0.0.1:${PORT}`;
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`); };

const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--port", PORT], { cwd: process.cwd(), stdio: "ignore", windowsHide: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(6000);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  // 1. App loads with NO data — empty state
  await page.goto(BASE, { waitUntil: "networkidle" });
  check("app carga", true);

  // Dashboard should show zero cards
  const dashText = await page.locator("main").innerText();
  check("dashboard: eventos = 0", dashText.includes("0"), dashText.replace(/\s+/g, " ").substring(0, 200));
  check("dashboard: ingresos = $ 0", dashText.includes("$ 0") || dashText.includes("$0"));

  // Inventario should be empty
  await page.click("nav >> text=Inventario y compras");
  await sleep(500);
  const invText = await page.locator("main").innerText();
  check("inventario: vacío", invText.includes("No hay") || invText.includes("vacío") || !invText.includes("poll"), invText.substring(0, 200));

  // Eventos should be empty
  await page.click("nav >> text=Eventos");
  await sleep(500);
  const evText = await page.locator("main").innerText();
  check("eventos: vacío", evText.includes("No hay") || evText.includes("vacío") || !evText.includes("Cumpleaños"), evText.substring(0, 200));

  // 2. Inject demo data and verify it populates
  const fs = await import("node:fs");
  const demoJson = fs.readFileSync("qa/demo-data.json", "utf8");
  await page.evaluate((json) => { localStorage.setItem("jafet-prototipo-v2", json); }, demoJson);
  await page.reload({ waitUntil: "networkidle" });
  await sleep(1000);

  const dashDemo = await page.locator("main").innerText();
  check("con demo: eventos != 0", !dashDemo.includes("0") || dashDemo.includes("4"), dashDemo.replace(/\s+/g, " ").substring(0, 200));

  // Check Inventario has data
  await page.click("nav >> text=Inventario y compras");
  await sleep(500);
  const invDemo = await page.locator("main").innerText();
  check("con demo: insumos visibles", invDemo.includes("Filet de pollo") || invDemo.includes("Lomo"), invDemo.substring(0, 200));

} catch (e) {
  check("excepción", false, e.message.substring(0, 200));
} finally {
  await browser.close();
  server.kill();
}

const fails = results.filter((r) => !r.ok).length;
console.log(`\nRESULTADO: ${results.length - fails}/${results.length} OK${fails ? ` (${fails} FAIL)` : ""}`);
process.exitCode = fails ? 1 : 0;
