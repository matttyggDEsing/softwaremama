import { MODULE_DEFS } from "../data/seed.js";

const CURRENT = 6;

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

// v1 -> v2: se elimina el módulo "dulce" (mesa dulce). Sus recetas/platos pasan a "postre"
// y las opciones dulces se fusionan dentro del módulo "postre" (que ahora admite varios).
// Acepta tanto configs de evento ({on, dishIds}) como refs planas de variante (array de ids).
function refIds(ref) {
  if (!ref) return [];
  if (Array.isArray(ref)) return ref;
  return ref.dishIds || (ref.dishId ? [ref.dishId] : []);
}

function normalizeV1Modules(modules) {
  const mods = { ...(modules || {}) };
  const dulce = mods.dulce;
  delete mods.dulce;

  const ids = [...new Set([...refIds(mods.postre), ...refIds(dulce)])];
  mods.postre = ids.length > 0 ? ids : mods.postre;

  return normalizeModuleConfig(mods);
}

// v2 -> v3: se elimina el concepto de variante. Cada variante de un menú pasa a ser un menú
// propio (id = id de la variante) y el evento se re-mapea. Un módulo de menú puede llegar como
// ref plana (string / array) o como config ({on, ...}) — se normaliza a config en ambos casos.
function valueToConfig(key, v) {
  const kind = moduleKind(key);
  if (v === undefined || v === null || v === "") {
    return kind === "dish" ? { on: false, dishId: null } : kind === "recipes" ? { on: false, recipeIds: [] } : { on: false, dishIds: [] };
  }
  if (typeof v === "object" && v !== null && "on" in v) {
    if (kind === "dish") return { on: !!v.on, dishId: v.dishId || null };
    if (kind === "recipes") return { on: !!v.on, recipeIds: v.recipeIds || [] };
    return { on: !!v.on, dishIds: v.dishIds || [] };
  }
  if (kind === "dish") return { on: !!v, dishId: v || null };
  const ids = Array.isArray(v) ? v : [];
  return { on: ids.length > 0, [kind === "recipes" ? "recipeIds" : "dishIds"]: ids };
}

function configFromRefs(refs) {
  const out = {};
  MODULE_DEFS.forEach((def) => {
    out[def.key] = valueToConfig(def.key, refs?.[def.key]);
  });
  return out;
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

    d.menus = (d.menus || []).map((m) => {
      if (m.variants && m.variants.length > 0) {
        return {
          ...m,
          variants: m.variants.map((v) => ({ ...v, modules: normalizeV1Modules(v.modules) })),
        };
      }
      return { ...m, modules: normalizeV1Modules(m.modules) };
    });

    d.events = (d.events || []).map((e) => ({
      ...e,
      modules: normalizeV1Modules(e.modules),
    }));
  }

  if (from < 3) {
    const flatMenus = (d.menus || []).flatMap((m) => {
      if (m.variants && m.variants.length > 0) {
        return m.variants.map((v) => ({
          id: v.id,
          name: v.name,
          modules: configFromRefs(v.modules),
        }));
      }
      return [{ id: m.id, name: m.name, modules: configFromRefs(m.modules) }];
    });

    const menuIds = new Set(flatMenus.map((m) => m.id));

    d.menus = flatMenus;
    d.events = (d.events || []).map((e) => {
      const { variantId, ...rest } = e;
      return { ...rest, menuId: variantId && menuIds.has(variantId) ? variantId : e.menuId };
    });
  }

  if (from < 4) {
    d.events = (d.events || []).map((e) => ({
      ...e,
      specials: e.specials || [],
    }));
  }

  if (from < 5) {
    d.events = (d.events || []).map((e) => ({
      ...e,
      shopping: e.shopping || { overrides: {}, manual: [], removed: [] },
    }));
  }

  if (from < 6) {
    d.events = (d.events || []).map((e) => ({
      ...e,
      fixedCosts: e.fixedCosts || [],
    }));
  }

  return d;
}