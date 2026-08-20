Promise.all([
  import('file:///C:/Users/Maty/Desktop/softwaremama/src/lib/migrate.js'),
  import('file:///C:/Users/Maty/Desktop/softwaremama/src/lib/cost.js'),
  import('file:///C:/Users/Maty/Desktop/softwaremama/src/data/seed.js'),
]).then(([m, c, s]) => {
  const fail = (msg) => { console.log('FAIL', msg); process.exitCode = 1; };
  const ok = (msg) => console.log('OK  ', msg);

  // --- v1 legacy (con dulce y variantes) -> v3 ---
  const v1 = {
    version: 1,
    ingredients: [{ id: "i1", name: "Papas", component: "guarnicion", cat: "Verduras", unit: "kg", cost: 1200, supplierId: "s1", stock: 10, min: 2 }],
    recipes: [{ id: "r1", name: "Frutillas con crema", module: "dulce", items: [{ ingredientId: "i1", g: 90 }] }],
    dishes: [{ id: "d1", name: "Frutillas con crema", module: "dulce", recipeId: "r1", margin: 0.5 }],
    menus: [{ id: "m1", name: "Menú test", variants: [{ id: "m1v1", name: "V1", modules: { postre: ["d1"] } }] }],
    clients: [], equipment: [], staff: [], assignments: [], payments: [], suppliers: [],
    events: [{
      id: "e1", clientId: null, name: "Ev", date: "2026-01-01", guests: 10, status: "consulta",
      menuId: "m1", variantId: "m1v1", seña: 0, señaDate: null, confirmDate: null, notes: "",
      modules: { postre: { on: false, dishId: null }, dulce: { on: true, dishIds: ["d1"] } },
    }],
    settings: { señaReference: 1, señaLabel: "1", buffetSafety: 0.25, buffetPriceMargin: 0.5, consumption: c.consumptionDefault, business: {} },
  };
  const out1 = m.migrate(v1);
  ok(`v1 -> version ${out1.version}`);
  out1.version !== 5 && fail('version != 5');
  const menu1 = out1.menus.find((x) => x.id === "m1v1");
  if (!menu1) return fail('menu m1v1 no existe');
  if (!menu1.modules.postre.on || menu1.modules.postre.dishIds[0] !== "d1") fail('menu postre no migrado: ' + JSON.stringify(menu1.modules.postre));
  else ok('menu m1v1.modules.postre = ' + JSON.stringify(menu1.modules.postre));
  const ev1 = out1.events[0];
  if (ev1.menuId !== "m1v1" || "variantId" in ev1) fail('evento no re-mapeado: ' + JSON.stringify({ menuId: ev1.menuId, variantId: ev1.variantId }));
  else ok('evento re-mapeado a menuId=m1v1 sin variantId');
  if (!ev1.modules.postre.on || ev1.modules.postre.dishIds[0] !== "d1") fail('evento postre no migrado');
  else ok('evento postre fusiona dulce');

  // --- v2 (variantes, sin dulce) -> v3 ---
  const v2 = {
    version: 2,
    ingredients: [{ id: "i1", name: "Papas", component: "guarnicion", cat: "Verduras", unit: "kg", cost: 1200, supplierId: "s1", stock: 10, min: 2 }],
    recipes: [{ id: "r1", name: "Papas al horno", module: "buffet", items: [{ ingredientId: "i1", g: 90 }] }],
    dishes: [{ id: "d1", name: "Cheesecake", module: "postre", recipeId: "r1", margin: 0.5 }],
    menus: [
      { id: "m1", name: "Menú A", variants: [{ id: "m1v1", name: "V1", modules: { buffet: ["r1"], postre: ["d1"] } }] },
      { id: "m2", name: "Menú B", modules: { postre: { on: true, dishIds: ["d1"] } } },
    ],
    clients: [], equipment: [], staff: [], assignments: [], payments: [], suppliers: [],
    events: [{ id: "e1", clientId: null, name: "Ev", date: "2026-01-01", guests: 10, status: "consulta", menuId: "m1", variantId: "m1v1", seña: 0, señaDate: null, confirmDate: null, notes: "", modules: { postre: { on: true, dishIds: ["d1"] } } }],
    settings: { señaReference: 1, señaLabel: "1", buffetSafety: 0.25, buffetPriceMargin: 0.5, consumption: c.consumptionDefault, business: {} },
  };
  const out2 = m.migrate(v2);
  ok(`v2 -> version ${out2.version}`);
  const m1 = out2.menus.find((x) => x.id === "m1v1");
  if (!m1 || m1.modules.buffet.on !== true || m1.modules.buffet.recipeIds[0] !== "r1") fail('v2 menu buffet no migrado: ' + JSON.stringify(m1));
  else ok('v2 menu m1v1.buffet = ' + JSON.stringify(m1.modules.buffet));
  const m2 = out2.menus.find((x) => x.id === "m2");
  if (!m2 || !m2.modules.postre.on) fail('v2 menu sin variantes no migrado');
  else ok('v2 menu m2 sin variantes conserva postre');
  if (out2.events[0].menuId !== "m1v1" || "variantId" in out2.events[0]) fail('v2 evento no re-mapeado');
  else ok('v2 evento re-mapeado a m1v1');

  // --- v3 seed pasa sin cambios ---
  const db3 = s.makeSeed();
  const out3 = m.migrate(db3);
  if (out3.menus.length !== db3.menus.length) fail('seed v3 no debe tocarse');
  else ok('seed v3 intacto (' + out3.menus.length + ' menús)');
  const an = c.menuAnalysis(db3.menus[0], 45, db3);
  ok(`menuAnalysis m1v1 45 pers: precio/pers ${Math.round(an.pricePerPerson)} -> total ${Math.round(an.price)}`);

  const ev = db3.events[0];
  if (!db3.menus.find((x) => x.id === ev.menuId)) fail('evento e1 apunta a menú inexistente');
  else ok('evento e1 -> ' + ev.menuId);

  console.log(process.exitCode ? '\nCON RESULTADO: FAIL' : '\nCON RESULTADO: TODO OK');
});