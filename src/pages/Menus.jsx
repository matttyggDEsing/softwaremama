import { useState } from "react";
import { Card, Btn, Badge, Icon, Select, Field, Input, Tabs, Empty, Modal, SearchInput } from "../components/ui.jsx";
import { useStore } from "../store.jsx";
import { MODULE_DEFS } from "../data/seed.js";
import { menuVariantAnalysis, configFromVariant, eventAnalysis, consumptionChecks, dishCost, dishPrice } from "../lib/cost.js";
import { money } from "../lib/format.js";
import { todayISO, addDaysISO } from "../lib/format.js";
import { uid } from "../lib/id.js";
import { clamp } from "../lib/num.js";

function TempConfigurator({ config, setConfig, guests, setGuests }) {
  const { db } = useStore();
  const setModule = (key, changes) => setConfig((c) => ({ ...c, [key]: { ...(c[key] || {}), ...changes } }));

  const dishesFor = (mod) => db.dishes.filter((d) => d.module === mod);
  const recipesFor = (mod) => db.recipes.filter((r) => r.module === mod);

  return (
    <div className="stack">
      {MODULE_DEFS.map((def) => {
        const m = config[def.key] || { on: false };
        return (
          <Card key={def.key} title={def.label} pad={false}>
            <div className="module-row">
              <label className="switch-row">
                <span className="switch-wrap">
                  <input type="checkbox" checked={!!m.on} onChange={(e) => setModule(def.key, { on: e.target.checked })} />
                  <span className="switch-track" />
                </span>
                <span className="switch-label">{m.on ? "Activo" : "Desactivado"}</span>
              </label>
              {m.on && def.kind === "dish" && (
                <Select value={m.dishId || ""} onChange={(e) => setModule(def.key, { dishId: e.target.value })} className="module-select">
                  {dishesFor(def.key).map((d) => (
                    <option key={d.id} value={d.id}>{d.name} · {money(dishPrice(d, db))}</option>
                  ))}
                </Select>
              )}
            </div>
            {m.on && def.kind === "recipes" && (
              <div className="chip-list">
                {recipesFor(def.key).map((r) => {
                  const on = (m.recipeIds || []).includes(r.id);
                  return (
                    <button key={r.id} className={`chip ${on ? "selected" : ""}`} onClick={() => setModule(def.key, { recipeIds: on ? m.recipeIds.filter((x) => x !== r.id) : [...(m.recipeIds || []), r.id] })}>
                      <Icon name="check" size={13} /> {r.name}
                    </button>
                  );
                })}
              </div>
            )}
            {m.on && def.kind === "dishes" && (
              <div className="chip-list">
                {dishesFor(def.key).map((d) => {
                  const on = (m.dishIds || []).includes(d.id);
                  return (
                    <button key={d.id} className={`chip ${on ? "selected" : ""}`} onClick={() => setModule(def.key, { dishIds: on ? m.dishIds.filter((x) => x !== d.id) : [...(m.dishIds || []), d.id] })}>
                      <Icon name="check" size={13} /> {d.name}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function MenuSelector({ menuId, variantId, setMenu, setVariant }) {
  const { db } = useStore();
  const menu = db.menus.find((m) => m.id === menuId);
  return (
    <div className="grid-2">
      <Field label="Menú">
        <Select value={menuId} onChange={(e) => { setMenu(e.target.value); const m = db.menus.find((x) => x.id === e.target.value); setVariant(m?.variants[0]?.id); }}>
          {db.menus.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </Select>
      </Field>
      <Field label="Variante">
        <Select value={variantId} onChange={(e) => setVariant(e.target.value)}>
          {menu?.variants.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </Select>
      </Field>
    </div>
  );
}

function Breakdown({ event, db, showChecks }) {
  const analysis = eventAnalysis(event, db);
  return (
    <div className="stack">
      <div className="stats-grid">
        <CardStat label="Costo directo / pers." value={money(analysis.costPerPerson)} />
        <CardStat label="Precio / pers." value={money(analysis.pricePerPerson)} />
        <CardStat label="Costo total" value={money(analysis.cost)} />
        <CardStat label="Total del evento" value={money(analysis.price)} tone="green" />
      </div>
      <Card pad={false}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Módulo</th><th>Opción(es)</th><th className="right">Costo/pers.</th><th className="right">Precio/pers.</th><th className="right">Subtotal</th></tr>
            </thead>
            <tbody>
              {analysis.rows.map((r) => (
                <tr key={r.key} className={!r.active ? "row-off" : ""}>
                  <td>{r.label}{!r.active && <span className="muted"> (desactivado)</span>}</td>
                  <td>{r.active ? r.items.map((i) => i.ref).join(", ") : "—"}</td>
                  <td className="right">{r.active ? money(r.cost) : "—"}</td>
                  <td className="right">{r.active ? money(r.price) : "—"}</td>
                  <td className="right">{r.active ? money(r.price * event.guests) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {showChecks && (
        <Card title="Control de porciones vs. tabla de consumo">
          {MODULE_DEFS.map((def) => {
            const m = event.modules[def.key];
            if (!m?.on) return null;
            let items = [];
            if (def.kind === "recipes") items = (m.recipeIds || []).map((rid) => ({ recipe: db.recipes.find((r) => r.id === rid), type: "buffet" }));
            else if (def.kind === "dishes") items = (m.dishIds || []).map((did) => ({ recipe: db.recipes.find((r) => r.id === db.dishes.find((d) => d.id === did)?.recipeId), type: "postre" }));
            else items = [{ recipe: db.recipes.find((r) => r.id === db.dishes.find((d) => d.id === m.dishId)?.recipeId), type: "mesa" }];
            return (
              <div key={def.key} className="prod-mod">
                <h3>{def.label}</h3>
                {items.filter((x) => x.recipe).map(({ recipe, type }) => {
                  const checks = consumptionChecks(recipe, db.ingredients, type, db.settings.consumption);
                  return (
                    <div key={recipe.id} className="check-recipe">
                      <strong>{recipe.name}</strong>
                      <div className="checks">
                        {checks.map((c) => (
                          <Badge key={c.component} tone={c.ok ? "green" : "red"} icon={c.ok ? "check" : "bell"}>
                            {c.label}: {c.grams} g {c.range ? `(ref. ${c.range[0]}-${c.range[1]})` : ""}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

function CardStat({ label, value, tone }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${tone || ""}`}>{value}</span>
    </div>
  );
}

function recipeCostHere(recipe, db) {
  return recipe.items.reduce((sum, it) => {
    const ing = db.ingredients.find((i) => i.id === it.ingredientId);
    if (!ing) return sum;
    return sum + (it.u ? it.u * ing.cost : (it.g / 1000) * ing.cost);
  }, 0);
}

function emptyDish(db) {
  const mod = MODULE_DEFS.find((m) => m.kind !== "recipes");
  const recetas = db.recipes.filter((r) => r.module === mod.key);
  return { name: "", module: mod.key, recipeId: recetas[0]?.id || "", margin: 0.5 };
}

function DishForm({ initial, onSubmit, onCancel, submitLabel }) {
  const { db } = useStore();
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const recetas = db.recipes.filter((r) => r.module === form.module);
  const valid = form.name.trim() !== "" && !!form.recipeId;

  const save = () => {
    if (!valid) return;
    onSubmit({
      name: form.name.trim(),
      module: form.module,
      recipeId: form.recipeId,
      margin: clamp(form.margin, 0),
    });
  };

  return (
    <div className="form">
      <Field label="Nombre del plato">
        <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ej. Pollo al champignon" autoFocus />
      </Field>
      <div className="grid-2">
        <Field label="Módulo">
          <Select
            value={form.module}
            onChange={(e) => {
              const m = e.target.value;
              const rs = db.recipes.filter((r) => r.module === m);
              set("module", m);
              set("recipeId", rs[0]?.id || "");
            }}
          >
            {MODULE_DEFS.filter((m) => m.kind !== "recipes").map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </Select>
        </Field>
        <Field label="Receta">
          <Select value={form.recipeId} onChange={(e) => set("recipeId", e.target.value)}>
            {recetas.map((r) => <option key={r.id} value={r.id}>{r.name} · {money(recipeCostHere(r, db))}</option>)}
          </Select>
          {recetas.length === 0 && <p className="field-hint">No hay recetas de "{MODULE_DEFS.find((m) => m.key === form.module)?.label}". Creá una en la pestaña Recetas.</p>}
        </Field>
      </div>
      <Field label="Margen de ganancia (%)" hint="Precio = costo × (1 + margen). Ej. 60% sobre un costo de $100 → $160.">
        <Input type="number" min="0" step="5" value={form.margin * 100} onChange={(e) => set("margin", clamp(e.target.value / 100, 0))} />
      </Field>
      <div className="form-actions">
        <Btn onClick={save} disabled={!valid}>{submitLabel}</Btn>
        <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
      </div>
    </div>
  );
}

function CombosTab() {
  const { db, navigate, patch, add, remove } = useStore();
  const [nuevoDish, setNuevoDish] = useState(false);
  const [editandoDish, setEditandoDish] = useState(null);
  const [borrandoDish, setBorrandoDish] = useState(null);

  const dishUsages = (d) => {
    const out = [];
    db.events.forEach((e) => Object.values(e.modules).forEach((mod) => {
      if (!mod) return;
      if (mod.dishId === d.id || (Array.isArray(mod.dishIds) && mod.dishIds.includes(d.id))) out.push(`Evento: ${e.name}`);
    }));
    db.menus.forEach((m) => (m.variants || []).forEach((v) => Object.values(v.modules).forEach((val) => {
      const hits = Array.isArray(val) ? val.includes(d.id) : val === d.id || val?.dishId === d.id || (val?.dishIds || []).includes(d.id);
      if (hits) out.push(`Menú ${m.name} · ${v.name}`);
    })));
    return [...new Set(out)];
  };

  const createDish = (data) => {
    add("dishes", { id: uid("d"), ...data });
    setNuevoDish(false);
  };

  const saveDish = (data) => {
    patch("dishes", editandoDish.id, data);
    setEditandoDish(null);
  };

  const confirmarDish = () => {
    remove("dishes", borrandoDish.id);
    setBorrandoDish(null);
  };

  return (
    <div className="stack">
      {db.menus.map((menu) => (
        <Card key={menu.id} title={menu.name}>
          <div className="variant-list">
            {menu.variants.map((v) => {
              const a = menuVariantAnalysis(menu.id, v.id, 1, db);
              const parts = Object.entries(v.modules).map(([k, ref]) => {
                const def = MODULE_DEFS.find((d) => d.key === k);
                const names = Array.isArray(ref)
                  ? ref.map((x) => (k === "buffet" ? db.recipes.find((r) => r.id === x)?.name : db.dishes.find((d) => d.id === x)?.name)).filter(Boolean)
                  : [db.dishes.find((d) => d.id === ref)?.name].filter(Boolean);
                return `${def?.short}: ${names.join(", ") || "—"}`;
              });
              return (
                <div className="variant" key={v.id}>
                  <div>
                    <strong>{v.name}</strong>
                    <p className="muted">{parts.join(" · ")}</p>
                  </div>
                  <div className="variant-price">
                    <span className="muted">Costo/pers.</span>
                    <strong>{money(a.costPerPerson)}</strong>
                    <span className="muted">Precio/pers.</span>
                    <strong>{money(a.pricePerPerson)}</strong>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="form-actions">
            <Btn variant="outline" size="sm" icon="calendar" onClick={() => navigate("eventos", { nuevo: true, menuId: menu.id })}>Usar en un evento</Btn>
          </div>
        </Card>
      ))}

      <Card
        title="Platos con margen de ganancia editable"
        actions={<Btn icon="plus" onClick={() => setNuevoDish(true)}>Nuevo plato</Btn>}
      >
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Plato</th><th>Módulo</th><th>Receta</th><th className="right">Costo/pers.</th><th className="right">Margen</th><th className="right">Precio/pers.</th><th /></tr>
            </thead>
            <tbody>
              {db.dishes.map((d) => {
                const rec = db.recipes.find((r) => r.id === d.recipeId);
                return (
                  <tr key={d.id}>
                    <td><strong>{d.name}</strong></td>
                    <td>{MODULE_DEFS.find((m) => m.key === d.module)?.short}</td>
                    <td className="muted">{rec?.name || "—"}</td>
                    <td className="right">{money(dishCost(d, db))}</td>
                    <td className="right">
                      <input
                        className="input input-xs right"
                        type="number"
                        min="0"
                        step="5"
                        value={Math.round(d.margin * 100)}
                        onChange={(e) => patch("dishes", d.id, { margin: clamp(e.target.value / 100, 0) })}
                      /> %
                    </td>
                    <td className="right"><strong>{money(dishPrice(d, db))}</strong></td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn" onClick={() => setEditandoDish(d)} aria-label="Editar plato"><Icon name="edit" size={16} /></button>
                        <button className="icon-btn danger" onClick={() => setBorrandoDish(d)} aria-label="Eliminar plato"><Icon name="trash" size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {db.dishes.length === 0 && <tr><td colSpan={7} className="muted">Sin platos cargados.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={nuevoDish} onClose={() => setNuevoDish(false)} title="Nuevo plato">
        <DishForm initial={emptyDish(db)} onSubmit={createDish} onCancel={() => setNuevoDish(false)} submitLabel="Crear plato" />
      </Modal>

      <Modal open={!!editandoDish} onClose={() => setEditandoDish(null)} title={`Editar: ${editandoDish?.name || ""}`}>
        {editandoDish && (
          <DishForm
            initial={{ name: editandoDish.name, module: editandoDish.module, recipeId: editandoDish.recipeId, margin: editandoDish.margin }}
            onSubmit={saveDish}
            onCancel={() => setEditandoDish(null)}
            submitLabel="Guardar cambios"
          />
        )}
      </Modal>

      <Modal open={!!borrandoDish} onClose={() => setBorrandoDish(null)} title={`Eliminar: ${borrandoDish?.name || ""}`}>
        {borrandoDish && (() => {
          const u = dishUsages(borrandoDish);
          return u.length > 0 ? (
            <div className="form">
              <p className="muted">
                Este plato se usa en los siguientes lugares. <strong>No se puede eliminar</strong> porque rompería sus cálculos:
              </p>
              <ul className="usage-list">
                {u.map((x, i) => <li key={i}><Icon name="calendar" size={15} /> {x}</li>)}
              </ul>
              <div className="form-actions">
                <Btn variant="outline" onClick={() => setBorrandoDish(null)}>Entendido</Btn>
              </div>
            </div>
          ) : (
            <div className="form">
              <p className="muted">¿Eliminar este plato? La operación no se puede deshacer.</p>
              <div className="form-actions">
                <Btn variant="danger" onClick={confirmarDish}><Icon name="trash" size={16} /> Eliminar</Btn>
                <Btn variant="ghost" onClick={() => setBorrandoDish(null)}>Cancelar</Btn>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

function CalculadorTab() {
  const { db, navigate, add } = useStore();
  const [menuId, setMenuId] = useState(db.menus[0].id);
  const [variantId, setVariantId] = useState(db.menus[0].variants[0].id);
  const [guests, setGuests] = useState(50);
  const menu = db.menus.find((m) => m.id === menuId);
  const variant = menu?.variants.find((v) => v.id === variantId);
  const [config, setConfig] = useState(() => configFromVariant(variant));
  const [saved, setSaved] = useState(null);

  const applyVariant = () => setConfig(configFromVariant(variant));
  const tempEvent = { id: "tmp", guests: Number(guests) || 1, modules: config };

  const saveAsEvent = () => {
    const id = uid("e");
    add("events", {
      id, clientId: db.clients[0].id, name: `${menu.name} · ${variant?.name}`, date: addDaysISO(todayISO(), 21),
      guests: clamp(guests, 1), status: "consulta", menuId, variantId, seña: db.settings.señaReference,
      señaDate: addDaysISO(addDaysISO(todayISO(), 21), -10), confirmDate: addDaysISO(addDaysISO(todayISO(), 21), -7),
      notes: "Creado desde el calculador de costos.", modules: config,
    });
    setSaved(id);
    navigate("evento", { id });
  };

  return (
    <div className="stack">
      <Card title="Calculador de costos por plato">
        <MenuSelector menuId={menuId} variantId={variantId} setMenu={setMenuId} setVariant={setVariantId} />
        <div className="form grid-2">
          <Field label="Cantidad de invitados">
            <Input type="number" min="1" value={guests} onChange={(e) => setGuests(e.target.value)} />
          </Field>
          <div className="form-actions align-end">
            <Btn variant="outline" size="sm" icon="sparkle" onClick={applyVariant}>Cargar variante</Btn>
            <Btn size="sm" icon="calendar" onClick={saveAsEvent}>Crear evento con este menú</Btn>
          </div>
        </div>
        {saved && <p className="tone-green">Evento creado correctamente.</p>}
      </Card>

      <Breakdown event={tempEvent} db={db} showChecks />
      <TempConfigurator config={config} setConfig={setConfig} guests={guests} setGuests={setGuests} />
    </div>
  );
}

function ConsumptionTab() {
  const { db, setSettings } = useStore();
  const { consumption } = db.settings;
  const setRange = (comp, type, idx, val) => {
    const range = [...consumption[comp][type]];
    range[idx] = Number(val) || 0;
    setSettings({ consumption: { ...consumption, [comp]: { ...consumption[comp], [type]: range } } });
  };

  return (
    <div className="stack">
      <Card title="Tabla de referencia de consumo por persona (editable)">
        <p className="muted">Base para controlar las porciones de cada receta. En buffet la porción es +20-30% que en mesa.</p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Componente</th><th colSpan={2}>Mesa servida (g)</th><th colSpan={2}>Buffet (g)</th></tr>
              <tr><th /><th>Mín</th><th>Máx</th><th>Mín</th><th>Máx</th></tr>
            </thead>
            <tbody>
              {Object.entries(consumption).map(([key, c]) => (
                <tr key={key}>
                  <td><strong>{c.label}</strong></td>
                  {["mesa", "buffet"].flatMap((type) =>
                    [0, 1].map((idx) => (
                      <td key={`${type}${idx}`}>
                        <input
                          className="input input-xs right"
                          type="number"
                          min="0"
                          value={c[type][idx]}
                          onChange={(e) => setRange(key, type, idx, e.target.value)}
                        />
                      </td>
                    ))
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Márgenes configurables">
        <div className="form grid-3">
          <Field label="Margen de seguridad buffet (%)" hint="Suma sobre el costo para cubrir la porción +20-30%">
            <Input
              type="number"
              step="5"
              value={Math.round(db.settings.buffetSafety * 100)}
              onChange={(e) => setSettings({ buffetSafety: clamp(e.target.value / 100, 0) })}
            />
          </Field>
          <Field label="Margen de ganancia buffet (%)" hint="Sobre el costo con seguridad">
            <Input
              type="number"
              step="5"
              value={Math.round(db.settings.buffetPriceMargin * 100)}
              onChange={(e) => setSettings({ buffetPriceMargin: clamp(e.target.value / 100, 0) })}
            />
          </Field>
          <Field label="Seña de referencia (1 tarjeta)">
            <Input
              type="number"
              value={db.settings.señaReference}
              onChange={(e) => setSettings({ señaReference: Number(e.target.value) })}
            />
          </Field>
        </div>
        <p className="muted">El margen de ganancia por plato se edita en la pestaña "Combos y precios".</p>
      </Card>

      <Card title="Resumen de recetas">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Receta</th><th>Módulo</th><th className="right">Costo/pers.</th></tr></thead>
            <tbody>
              {db.recipes.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.name}</strong></td>
                  <td>{MODULE_DEFS.find((m) => m.key === r.module)?.short}</td>
                  <td className="right">{money(recipeCostHere(r, db))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function emptyRecipe(db) {
  return { name: "", module: MODULE_DEFS[0].key, items: [] };
}

function recipeToForm(r) {
  return {
    name: r.name,
    module: r.module,
    items: r.items.map((it) =>
      it.u !== undefined
        ? { ingredientId: it.ingredientId, kind: "u", amount: it.u }
        : { ingredientId: it.ingredientId, kind: "g", amount: it.g }
    ),
  };
}

function RecipeForm({ initial, onSubmit, onCancel, submitLabel }) {
  const { db } = useStore();
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setItem = (idx, changes) => setForm((f) => ({ ...f, items: f.items.map((it, i) => (i === idx ? { ...it, ...changes } : it)) }));
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { ingredientId: db.ingredients[0]?.id || "", kind: "g", amount: "" }] }));
  const removeItem = (idx) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const cost = form.items.reduce((s, it) => {
    const ing = db.ingredients.find((i) => i.id === it.ingredientId);
    if (!ing) return s;
    const amount = clamp(it.amount, 0);
    return s + (it.kind === "u" ? amount * ing.cost : (amount / 1000) * ing.cost);
  }, 0);

  const valid = form.name.trim() !== "" && form.items.every((it) => it.ingredientId && clamp(it.amount, 0) > 0);

  const save = () => {
    if (!valid) return;
    onSubmit({
      name: form.name.trim(),
      module: form.module,
      items: form.items.map((it) =>
        it.kind === "u"
          ? { ingredientId: it.ingredientId, u: clamp(it.amount, 0) }
          : { ingredientId: it.ingredientId, g: clamp(it.amount, 0) }
      ),
    });
  };

  return (
    <div className="form">
      <div className="grid-2">
        <Field label="Nombre">
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ej. Pollo al champignon" autoFocus />
        </Field>
        <Field label="Módulo">
          <Select value={form.module} onChange={(e) => set("module", e.target.value)}>
            {MODULE_DEFS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Ingredientes">
        <div className="ing-list">
          {form.items.map((it, i) => (
            <div className="ing-row" key={i}>
              <Select value={it.ingredientId} onChange={(e) => setItem(i, { ingredientId: e.target.value })} className="ing-ing">
                {db.ingredients.map((ing) => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
              </Select>
              <Input type="number" min="0" step="0.1" value={it.amount} onChange={(e) => setItem(i, { amount: e.target.value })} placeholder="0" className="ing-qty" />
              <Select value={it.kind} onChange={(e) => setItem(i, { kind: e.target.value })} className="ing-unit">
                <option value="g">g</option>
                <option value="u">u</option>
              </Select>
              <button className="icon-btn danger" onClick={() => removeItem(i)} aria-label="Quitar ingrediente"><Icon name="trash" size={16} /></button>
            </div>
          ))}
          {form.items.length === 0 && <p className="muted">Sin ingredientes todavía. Agregá el primero:</p>}
          <Btn variant="outline" size="sm" icon="plus" onClick={addItem}>Agregar ingrediente</Btn>
        </div>
      </Field>
      <p className="muted">Costo por persona: <strong>{money(cost)}</strong></p>
      <div className="form-actions">
        <Btn onClick={save} disabled={!valid}>{submitLabel}</Btn>
        <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
      </div>
    </div>
  );
}

function RecetasTab() {
  const { db, add, patch, remove } = useStore();
  const [q, setQ] = useState("");
  const [nuevo, setNuevo] = useState(false);
  const [editando, setEditando] = useState(null);
  const [borrando, setBorrando] = useState(null);

  const recetas = db.recipes.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));

  const usages = (r) => {
    const out = [];
    db.dishes.filter((d) => d.recipeId === r.id).forEach((d) => out.push(`Plato: ${d.name}`));
    db.menus.forEach((m) => (m.variants || []).forEach((v) => Object.values(v.modules).forEach((val) => {
      const ids = Array.isArray(val) ? val : val?.recipeIds || [];
      if (ids.includes(r.id)) out.push(`Menú ${m.name} · ${v.name}`);
    })));
    db.events.forEach((e) => Object.values(e.modules).forEach((mod) => {
      if (mod && Array.isArray(mod.recipeIds) && mod.recipeIds.includes(r.id)) out.push(`Evento: ${e.name}`);
    }));
    return [...new Set(out)];
  };

  const create = (data) => {
    add("recipes", { id: uid("r"), ...data });
    setNuevo(false);
  };

  const saveEdit = (data) => {
    patch("recipes", editando.id, data);
    setEditando(null);
  };

  const confirmarBorrado = () => {
    remove("recipes", borrando.id);
    setBorrando(null);
  };

  return (
    <div className="stack">
      <Card title="Recetas" actions={<Btn icon="plus" onClick={() => setNuevo(true)}>Nueva receta</Btn>}>
        <div className="card-toolbar">
          <SearchInput value={q} onChange={setQ} placeholder="Buscar receta…" />
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Receta</th><th>Módulo</th><th>Ingredientes</th><th className="right">Costo/pers.</th><th /></tr>
            </thead>
            <tbody>
              {recetas.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.name}</strong></td>
                  <td>{MODULE_DEFS.find((m) => m.key === r.module)?.short}</td>
                  <td className="muted">{r.items.map((it) => db.ingredients.find((i) => i.id === it.ingredientId)?.name).filter(Boolean).join(", ") || "—"}</td>
                  <td className="right">{money(recipeCostHere(r, db))}</td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-btn" onClick={() => setEditando(r)} aria-label="Editar receta"><Icon name="edit" size={16} /></button>
                      <button className="icon-btn danger" onClick={() => setBorrando(r)} aria-label="Eliminar receta"><Icon name="trash" size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {recetas.length === 0 && <tr><td colSpan={5} className="muted">Sin resultados.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={nuevo} onClose={() => setNuevo(false)} title="Nueva receta">
        <RecipeForm initial={emptyRecipe(db)} onSubmit={create} onCancel={() => setNuevo(false)} submitLabel="Crear receta" />
      </Modal>

      <Modal open={!!editando} onClose={() => setEditando(null)} title={`Editar: ${editando?.name || ""}`}>
        {editando && (
          <RecipeForm initial={recipeToForm(editando)} onSubmit={saveEdit} onCancel={() => setEditando(null)} submitLabel="Guardar cambios" />
        )}
      </Modal>

      <Modal open={!!borrando} onClose={() => setBorrando(null)} title={`Eliminar: ${borrando?.name || ""}`}>
        {borrando && (() => {
          const u = usages(borrando);
          return u.length > 0 ? (
            <div className="form">
              <p className="muted">
                Esta receta se usa en los siguientes lugares. <strong>No se puede eliminar</strong> porque rompería sus cálculos:
              </p>
              <ul className="usage-list">
                {u.map((x, i) => <li key={i}><Icon name="utensils" size={15} /> {x}</li>)}
              </ul>
              <div className="form-actions">
                <Btn variant="outline" onClick={() => setBorrando(null)}>Entendido</Btn>
              </div>
            </div>
          ) : (
            <div className="form">
              <p className="muted">¿Eliminar esta receta? La operación no se puede deshacer.</p>
              <div className="form-actions">
                <Btn variant="danger" onClick={confirmarBorrado}><Icon name="trash" size={16} /> Eliminar</Btn>
                <Btn variant="ghost" onClick={() => setBorrando(null)}>Cancelar</Btn>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

export default function MenusPage() {
  const [tab, setTab] = useState("combos");
  const tabs = [
    { id: "combos", label: "Combos y precios", icon: "utensils" },
    { id: "calculador", label: "Calculador de costos", icon: "sparkle" },
    { id: "tabla", label: "Tabla de consumo y márgenes", icon: "grid" },
    { id: "recetas", label: "Recetas", icon: "file" },
  ];
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Menú, precios y costos</h2>
          <p className="muted">Combos, calculador por plato y referencia de consumo por persona</p>
        </div>
      </div>
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      {tab === "combos" && <CombosTab />}
      {tab === "calculador" && <CalculadorTab />}
      {tab === "tabla" && <ConsumptionTab />}
      {tab === "recetas" && <RecetasTab />}
    </div>
  );
}