import { MODULE_DEFS } from "../data/seed.js";

export function recipeCost(recipe, ingredients) {
  if (!recipe) return 0;
  return recipe.items.reduce((sum, it) => {
    const ing = ingredients.find((i) => i.id === it.ingredientId);
    if (!ing) return sum;
    if (it.u) return sum + it.u * ing.cost;
    return sum + (it.g / 1000) * ing.cost;
  }, 0);
}

export function dishCost(dish, db) {
  if (!dish) return 0;
  const r = db.recipes.find((x) => x.id === dish.recipeId);
  return recipeCost(r, db.ingredients);
}

export function dishPrice(dish, db) {
  return dishCost(dish, db) * (1 + (dish?.margin ?? 0));
}

export function eventModules(event) {
  return MODULE_DEFS.map((def) => {
    const m = event.modules[def.key] || { on: false };
    return { ...def, ...m };
  });
}

export function emptyModules() {
  const out = {};
  MODULE_DEFS.forEach((def) => {
    if (def.kind === "dish") out[def.key] = { on: false, dishId: null };
    else if (def.kind === "recipes") out[def.key] = { on: false, recipeIds: [] };
    else out[def.key] = { on: false, dishIds: [] };
  });
  return out;
}

export function configFromMenu(menu) {
  if (!menu) return emptyModules();
  const out = emptyModules();
  MODULE_DEFS.forEach((def) => {
    const m = menu.modules?.[def.key];
    if (m) out[def.key] = { ...out[def.key], ...m };
  });
  return out;
}

export function specialGuests(event) {
  return (event.specials || []).reduce((s, x) => s + Math.max(0, x.qty || 0), 0);
}

export function specialItems(event, db) {
  const { dishes, recipes, ingredients } = db;
  return (event.specials || []).map((sp) => {
    const dish = sp.dishId ? dishes.find((d) => d.id === sp.dishId) : null;
    const recipe = dish
      ? recipes.find((r) => r.id === dish.recipeId)
      : sp.recipeId
        ? recipes.find((r) => r.id === sp.recipeId)
        : null;
    const c = recipeCost(recipe, ingredients);
    const p = c * (1 + (dish?.margin ?? 0));
    const qty = Math.max(0, sp.qty || 0);
    return {
      id: sp.id,
      label: sp.label || dish?.name || recipe?.name || "Especial",
      ref: dish?.name || recipe?.name || sp.label || "—",
      qty,
      costPerUnit: c,
      pricePerUnit: p,
      cost: c * qty,
      price: p * qty,
      dish,
      recipe,
    };
  });
}

export function eventAnalysis(event, db) {
  const { dishes, recipes, ingredients, settings } = db;
  const safety = settings.buffetSafety;
  const rows = [];
  let cost = 0;
  let price = 0;

  eventModules(event).forEach((mod) => {
    const base = { key: mod.key, label: mod.label, short: mod.short, kind: mod.kind, on: !!mod.on };
    if (!mod.on) {
      rows.push({ ...base, active: false, cost: 0, price: 0, items: [] });
      return;
    }

    const items = [];
    let mCost = 0;
    let mPrice = 0;

    if (mod.kind === "dish") {
      const dish = dishes.find((d) => d.id === mod.dishId);
      const r = dish && recipes.find((x) => x.id === dish.recipeId);
      const c = recipeCost(r, ingredients);
      const p = c * (1 + (dish?.margin ?? 0));
      mCost += c;
      mPrice += p;
      items.push({ ref: dish?.name || "—", cost: c, price: p, recipe: r, dish });
    } else if (mod.kind === "recipes") {
      (mod.recipeIds || []).forEach((rid) => {
        const r = recipes.find((x) => x.id === rid);
        if (!r) return;
        const c = recipeCost(r, ingredients);
        items.push({ ref: r.name, cost: c, price: c, recipe: r });
        mCost += c;
      });
      mCost = mCost * (1 + safety);
      mPrice = mCost * (1 + settings.buffetPriceMargin);
      items.forEach((it) => {
        it.cost = it.cost * (1 + safety);
        it.price = it.cost;
      });
    } else if (mod.kind === "dishes") {
      (mod.dishIds || []).forEach((did) => {
        const dish = dishes.find((d) => d.id === did);
        const r = dish && recipes.find((x) => x.id === dish.recipeId);
        if (!r) return;
        const c = recipeCost(r, ingredients);
        const p = c * (1 + (dish?.margin ?? 0));
        items.push({ ref: dish?.name || r.name, cost: c, price: p, recipe: r, dish });
        mCost += c;
        mPrice += p;
      });
    }

    rows.push({ ...base, active: true, cost: mCost, price: mPrice, items });
    cost += mCost;
    price += mPrice;
  });

  const specials = specialItems(event, db);
  const standardGuests = Math.max(0, event.guests - specialGuests(event));
  const specialCost = specials.reduce((s, x) => s + x.cost, 0);
  const specialPrice = specials.reduce((s, x) => s + x.price, 0);

  return {
    rows,
    specials,
    standardGuests,
    costPerPerson: cost,
    pricePerPerson: price,
    cost: cost * standardGuests + specialCost,
    price: price * standardGuests + specialPrice,
  };
}

export function consumptionChecks(recipe, ingredients, type, table) {
  if (!recipe) return [];
  const grams = {};
  recipe.items.forEach((it) => {
    const ing = ingredients.find((i) => i.id === it.ingredientId);
    if (!ing || !it.g) return;
    if (ing.component === "otro") return;
    grams[ing.component] = (grams[ing.component] || 0) + it.g;
  });
  return Object.keys(grams).map((c) => {
    const ref = table[c];
    const range = ref ? ref[type] || ref.mesa : null;
    const g = Math.round(grams[c]);
    return {
      component: c,
      label: ref?.label || c,
      grams: g,
      range,
      ok: range ? g >= range[0] && g <= range[1] : true,
    };
  });
}

export function shoppingList(event, db) {
  const { ingredients, recipes, dishes } = db;
  const safety = db.settings.buffetSafety;
  const acc = {};

  const addRecipe = (recipe, qty) => {
    if (!recipe || qty <= 0) return;
    recipe.items.forEach((it) => {
      const ing = ingredients.find((i) => i.id === it.ingredientId);
      if (!ing) return;
      const q = it.u ? it.u * qty : (it.g / 1000) * qty;
      if (!acc[ing.id]) {
        acc[ing.id] = {
          ingredientId: ing.id,
          name: ing.name,
          cat: ing.cat,
          unit: ing.unit,
          needed: 0,
          stock: ing.stock,
          supplierId: ing.supplierId,
        };
      }
      acc[ing.id].needed += q;
    });
  };

  const standardGuests = Math.max(0, event.guests - specialGuests(event));

  eventModules(event).forEach((mod) => {
    if (!mod.on) return;
    const factor = mod.key === "buffet" ? 1 + safety : 1;
    let refs = [];
    if (mod.kind === "dish") refs = mod.dishId ? [mod.dishId] : [];
    else if (mod.kind === "recipes") refs = mod.recipeIds || [];
    else refs = mod.dishIds || [];

    refs.forEach((refId) => {
      let recipeId = null;
      if (mod.kind === "recipes") recipeId = refId;
      else {
        const dish = dishes.find((d) => d.id === refId);
        recipeId = dish?.recipeId;
      }
      addRecipe(recipes.find((r) => r.id === recipeId), standardGuests * factor);
    });
  });

  specialItems(event, db).forEach((sp) => {
    addRecipe(sp.recipe, sp.qty);
  });

  return Object.values(acc)
    .map((x) => ({ ...x, toBuy: Math.max(0, x.needed - x.stock) }))
    .sort((a, b) => a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name));
}

// Lista efectiva de compras de un evento: parte de la lista automática y le aplica la edición
// manual persistida por evento (ajustes de cantidad, ítems quitados e ítems manuales agregados).
// event.shopping = { overrides: { [ingredientId]: qty }, removed: [ingredientId], manual: [{ id, label, unit, qty, supplierId }] }
export function effectiveShoppingList(event, db) {
  const auto = shoppingList(event, db);
  const s = event.shopping || { overrides: {}, manual: [], removed: [] };
  const overrides = s.overrides || {};
  const removed = new Set(s.removed || []);

  const rows = auto
    .filter((it) => !removed.has(it.ingredientId))
    .map((it) => {
      const ov = overrides[it.ingredientId];
      const needed = typeof ov === "number" && ov >= 0 ? ov : it.needed;
      return { ...it, needed, toBuy: Math.max(0, needed - it.stock), overridden: typeof ov === "number" && ov >= 0 };
    });

  const manual = (s.manual || []).map((m) => {
    const qty = Math.max(0, Number(m.qty) || 0);
    return {
      id: m.id,
      ingredientId: m.id,
      name: m.label || "Ítem manual",
      cat: "Manual",
      unit: m.unit || "kg",
      needed: qty,
      toBuy: qty,
      stock: 0,
      supplierId: m.supplierId || null,
      overridden: true,
      manual: true,
    };
  });

  return [...rows, ...manual].sort(
    (a, b) => (a.manual ? 1 : 0) - (b.manual ? 1 : 0) || a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name)
  );
}

export function eventBalance(event, db) {
  const pays = db.payments.filter((p) => p.eventId === event.id);
  const total = pays.reduce((s, p) => s + p.amount, 0);
  const analysis = eventAnalysis(event, db);
  return { total, saldo: analysis.price - total, price: analysis.price, count: pays.length };
}

export function eventProfit(event, db) {
  const a = eventAnalysis(event, db);
  const staffCost = db.assignments
    .filter((x) => x.eventId === event.id)
    .reduce((s, x) => s + (x.pay || 0), 0);
  const fixedCosts = (event.fixedCosts || []).reduce((s, f) => s + Math.max(0, Number(f.amount) || 0), 0);
  const costoDirecto = a.cost;
  const costoTotal = costoDirecto + staffCost + fixedCosts;
  const margen = a.price - costoTotal;
  return {
    ...a,
    staffCost,
    fixedCosts,
    costoDirecto,
    costoTotal,
    margen,
    marginPct: a.price ? margen / a.price : 0,
  };
}

export function menuAnalysis(menu, guests, db) {
  const event = { id: "tmp", guests, modules: configFromMenu(menu) };
  return eventAnalysis(event, db);
}