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

export function configFromVariant(variant) {
  const out = {};
  MODULE_DEFS.forEach((def) => {
    const v = variant.modules[def.key];
    if (def.kind === "dish") out[def.key] = { on: !!v, dishId: v || null };
    else if (def.kind === "recipes") out[def.key] = { on: !!v, recipeIds: v || [] };
    else out[def.key] = { on: !!v, dishIds: v || [] };
  });
  return out;
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

  return {
    rows,
    costPerPerson: cost,
    pricePerPerson: price,
    cost: cost * event.guests,
    price: price * event.guests,
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
      const recipe = recipes.find((r) => r.id === recipeId);
      if (!recipe) return;
      recipe.items.forEach((it) => {
        const ing = ingredients.find((i) => i.id === it.ingredientId);
        if (!ing) return;
        const qty = it.u
          ? it.u * event.guests * factor
          : (it.g / 1000) * event.guests * factor;
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
        acc[ing.id].needed += qty;
      });
    });
  });

  return Object.values(acc)
    .map((x) => ({ ...x, toBuy: Math.max(0, x.needed - x.stock) }))
    .sort((a, b) => a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name));
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
  const costoDirecto = a.cost;
  const costoTotal = costoDirecto + staffCost;
  const margen = a.price - costoTotal;
  return {
    ...a,
    staffCost,
    costoDirecto,
    costoTotal,
    margen,
    marginPct: a.price ? margen / a.price : 0,
  };
}

export function menuVariantAnalysis(menuId, variantId, guests, db) {
  const menu = db.menus.find((m) => m.id === menuId);
  const variant = menu?.variants.find((v) => v.id === variantId);
  const event = { id: "tmp", guests, modules: configFromVariant(variant) };
  return eventAnalysis(event, db);
}