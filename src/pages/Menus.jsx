import { useState } from "react";
import { Card, Btn, Badge, Icon, Select, Field, Input, Tabs, Empty, Money } from "../components/ui.jsx";
import { useStore } from "../store.jsx";
import { MODULE_DEFS } from "../data/seed.js";
import { menuVariantAnalysis, configFromVariant, eventAnalysis, consumptionChecks, dishCost, dishPrice } from "../lib/cost.js";
import { money } from "../lib/format.js";
import { todayISO, addDaysISO } from "../lib/format.js";

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

function CombosTab() {
  const { db, navigate, patch } = useStore();
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

      <Card title="Platos y recetas con margen de ganancia editable">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Plato</th><th>Módulo</th><th className="right">Costo/pers.</th><th className="right">Margen</th><th className="right">Precio/pers.</th></tr>
            </thead>
            <tbody>
              {db.dishes.map((d) => (
                <tr key={d.id}>
                  <td><strong>{d.name}</strong></td>
                  <td>{MODULE_DEFS.find((m) => m.key === d.module)?.short}</td>
                  <td className="right">{money(dishCost(d, db))}</td>
                  <td className="right">
                    <input
                      className="input input-xs right"
                      type="number"
                      step="0.05"
                      min="0"
                      value={d.margin}
                      onChange={(e) => patch("dishes", d.id, { margin: Number(e.target.value) })}
                    /> %
                  </td>
                  <td className="right"><strong>{money(dishPrice(d, db))}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
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
    const id = `e${Date.now()}`;
    add("events", {
      id, clientId: db.clients[0].id, name: `${menu.name} · ${variant?.name}`, date: addDaysISO(todayISO(), 21),
      guests: Number(guests) || 1, status: "consulta", menuId, variantId, seña: db.settings.señaReference,
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
              step="0.05"
              value={db.settings.buffetSafety}
              onChange={(e) => setSettings({ buffetSafety: Number(e.target.value) })}
            />
          </Field>
          <Field label="Margen de ganancia buffet (%)" hint="Sobre el costo con seguridad">
            <Input
              type="number"
              step="0.05"
              value={db.settings.buffetPriceMargin}
              onChange={(e) => setSettings({ buffetPriceMargin: Number(e.target.value) })}
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
        <p className="muted">El margen de ganancia por plato se edita en la pestaña "Combos".</p>
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

function recipeCostHere(recipe, db) {
  return recipe.items.reduce((sum, it) => {
    const ing = db.ingredients.find((i) => i.id === it.ingredientId);
    if (!ing) return sum;
    return sum + (it.u ? it.u * ing.cost : (it.g / 1000) * ing.cost);
  }, 0);
}

export default function MenusPage() {
  const [tab, setTab] = useState("combos");
  const tabs = [
    { id: "combos", label: "Combos y precios", icon: "utensils" },
    { id: "calculador", label: "Calculador de costos", icon: "sparkle" },
    { id: "tabla", label: "Tabla de consumo y márgenes", icon: "grid" },
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
    </div>
  );
}
