import { MODULE_DEFS } from "../data/seed.js";

const CURRENT = 2;

function moduleKind(key) {
  return MODULE_DEFS.find((m) => m.key === key)?.kind || "dish";
}

function emptyConfig() {
  const out = {};
  MODULE_DEFS.forEach((def) => {
    if (def.kind === "dish") out[def.key] = { on: false, dishId: null };
    else if (def.kind === "recipes") out[def.key] = { on: false, recipeIds: [] };
    else out[def.key] = { on: false, dishIds: [] };
  });
  return out;
}

function normalizeModuleConfig(raw) {
  const config = emptyConfig();
  MODULE_DEFS.forEach((def) => {
    const v = raw?.[def.key];
    if (v === undefined || v === null) return;
    if (def.kind === "dish") {
      config[def.key] = { on: !!v, dishId: typeof v === "object" ? v.dishId || null : v || null };
    } else if (def.kind === "recipes") {
      const ids = Array.isArray(v) ? v : v?.recipeIds || [];
      config[def.key] = { on: ids.length > 0 || (typeof v === "object" && v.on), recipeIds: ids };
    } else {
      const ids = Array.isArray(v) ? v : v?.dishIds || (v?.dishId ? [v.dishId] : []);
      config[def.key] = { on: ids.length > 0 || (typeof v === "object" && v.on), dishIds: ids };
    }
  });
  return config;
}

function migrateDulce(modules) {
  const mods = { ...modules };
  const dulce = mods.dulce;
  delete mods.dulce;
  if (dulce && dulce.on) {
    const postre = mods.postre || { on: false };
    const ids = new Set(postre.dishIds || (postre.dishId ? [postre.dishId] : []));
    (dulce.dishIds || []).forEach((id) => ids.add(id));
    mods.postre = { on: true, dishIds: [...ids] };
  } else if (mods.postre && mods.postre.dishId !== undefined && mods.postre.dishIds === undefined) {
    mods.postre = { on: mods.postre.on, dishIds: mods.postre.dishId ? [mods.postre.dishId] : [] };
  } else if (mods.postre) {
    mods.postre = { on: mods.postre.on, dishIds: mods.postre.dishIds || [] };
  }
  return mods;
}

export function migrate(db) {
  if (!db) return null;
  const from = db.version || 1;
  if (from >= CURRENT) return db;

  let d = { ...db, version: CURRENT };

  if (from < 2) {
    d.recipes = (d.recipes || []).map((r) =>
      r.module === "dulce" ? { ...r, module: "postre" } : r
    );
    d.dishes = (d.dishes || []).map((x) =>
      x.module === "dulce" ? { ...x, module: "postre" } : x
    );

    const menus = [];
    (d.menus || []).forEach((m) => {
      if (m.variants && m.variants.length > 0) {
        m.variants.forEach((v) => {
          menus.push({
            id: v.id,
            name: `${m.name} · ${v.name}`,
            modules: normalizeModuleConfig(v.modules),
          });
        });
      } else {
        menus.push({ id: m.id, name: m.name, modules: normalizeModuleConfig(m.modules) });
      }
    });
    d.menus = menus;

    d.events = (d.events || []).map((e) => {
      const next = { ...e };
      const targetMenu = e.variantId || e.menuId;
      next.menuId = menus.find((m) => m.id === targetMenu) ? targetMenu : e.menuId;
      delete next.variantId;
      next.modules = migrateDulce(next.modules || {});
      return next;
    });
  }

  return d;
}