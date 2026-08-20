import { useMemo, useState } from "react";
import { Card, Btn, Badge, Icon, StatusPill, Switch, Select, Field, Input, TextArea, Tabs, Modal, Empty, SearchInput } from "../components/ui.jsx";
import { useStore } from "../store.jsx";
import { MODULE_DEFS } from "../data/seed.js";
import { eventAnalysis, eventBalance, eventModules, shoppingList, configFromMenu, consumptionChecks } from "../lib/cost.js";
import { money, dateStr, daysUntil, kg, units, todayISO, addDaysISO } from "../lib/format.js";
import { uid } from "../lib/id.js";
import { clamp } from "../lib/num.js";
import { DocumentView } from "../components/Document.jsx";

const STATUS_FLOW = ["consulta", "tentativo", "confirmado", "cerrado"];

export function EventosPage() {
  const { db, navigate, nav, add } = useStore();
  const [filter, setFilter] = useState("todos");
  const [q, setQ] = useState("");
  const [nuevo, setNuevo] = useState(!!nav.params.nuevo);
  const [form, setForm] = useState({
    clientId: db.clients[0]?.id || "",
    name: "",
    date: addDaysISO(todayISO(), 21),
    guests: 40,
    menuId: nav.params.menuId || db.menus[0]?.id,
    status: "consulta",
  });

  const list = db.events
    .filter((e) => (filter === "todos" ? true : e.status === filter))
    .filter((e) => `${e.name} ${db.clients.find((c) => c.id === e.clientId)?.name || ""}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.date.localeCompare(b.date));

  const menu = db.menus.find((m) => m.id === form.menuId);
  const create = () => {
    if (!form.name.trim()) return;
    const id = uid("e");
    add("events", {
      id,
      clientId: form.clientId,
      name: form.name.trim(),
      date: form.date,
      guests: clamp(form.guests, 1),
      status: form.status,
      menuId: form.menuId,
      seña: db.settings.señaReference,
      señaDate: addDaysISO(form.date, -10),
      confirmDate: addDaysISO(form.date, -7),
      notes: "",
      specials: [],
      modules: configFromMenu(menu),
    });
    setNuevo(false);
    navigate("evento", { id });
  };

  const counts = {
    todos: db.events.length,
    consulta: db.events.filter((e) => e.status === "consulta").length,
    tentativo: db.events.filter((e) => e.status === "tentativo").length,
    confirmado: db.events.filter((e) => e.status === "confirmado").length,
    cerrado: db.events.filter((e) => e.status === "cerrado").length,
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Eventos</h2>
          <p className="muted">{db.events.length} eventos cargados</p>
        </div>
        <Btn icon="plus" onClick={() => setNuevo(true)}>Nuevo evento</Btn>
      </div>

      <Tabs
        tabs={[
          { id: "todos", label: "Todos", count: counts.todos },
          { id: "consulta", label: "Consulta", count: counts.consulta },
          { id: "tentativo", label: "Tentativo", count: counts.tentativo },
          { id: "confirmado", label: "Confirmado", count: counts.confirmado },
          { id: "cerrado", label: "Cerrado", count: counts.cerrado },
        ]}
        active={filter}
        onChange={setFilter}
      />

      <SearchInput value={q} onChange={setQ} placeholder="Buscar por evento o cliente…" />

      {list.length === 0 ? (
        <Card><Empty title="No hay eventos" text="Creá un evento nuevo o cambiá el filtro." /></Card>
      ) : (
        <Card pad={false}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Invitados</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((e) => {
                  const client = db.clients.find((c) => c.id === e.clientId);
                  const bal = eventBalance(e, db);
                  const due = daysUntil(e.date);
                  return (
                    <tr key={e.id} className="clickable" onClick={() => navigate("evento", { id: e.id })}>
                      <td>
                        <strong>{e.name}</strong>
                        {due !== null && due >= 0 && due <= 10 && <Badge tone="amber" icon="clock">en {due} d</Badge>}
                      </td>
                      <td>{client?.name || "—"}</td>
                      <td>{dateStr(e.date)}</td>
                      <td>{e.guests}</td>
                      <td>{money(bal.price)}</td>
                      <td><StatusPill status={e.status} /></td>
                      <td><Icon name="chevronR" size={16} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={nuevo} onClose={() => setNuevo(false)} title="Nuevo evento">
        <div className="form">
          <Field label="Cliente">
            <Select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              {db.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Nombre del evento">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Cumpleaños de 70" />
          </Field>
          <div className="grid-2">
            <Field label="Fecha">
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="Invitados">
              <Input type="number" min="1" value={form.guests} onChange={(e) => setForm({ ...form, guests: e.target.value })} />
            </Field>
          </div>
          <Field label="Menú">
            <Select
              value={form.menuId}
              onChange={(e) => setForm({ ...form, menuId: e.target.value })}
            >
              {db.menus.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </Field>
          <Field label="Estado inicial">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUS_FLOW.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
        </div>
        <div className="form-actions">
          <Btn onClick={create} disabled={!form.name.trim()}>Crear evento</Btn>
        </div>
      </Modal>
    </div>
  );
}

function StatusStepper({ event }) {
  const { db, add, remove, patch, setSettings } = useStore();
  const idx = STATUS_FLOW.indexOf(event.status);
  return (
    <div className="stepper">
      {STATUS_FLOW.map((s, i) => (
        <button key={s} className={`step ${i === idx ? "current" : i < idx ? "done" : ""}`} onClick={() => patch("events", event.id, { status: s })}>
          <span className="step-dot">{i < idx ? "✓" : i + 1}</span>
          <span>{s}</span>
        </button>
      ))}
    </div>
  );
}

function ResumenTab({ event }) {
  const { db, navigate, patch } = useStore();
  const client = db.clients.find((c) => c.id === event.clientId);
  const bal = eventBalance(event, db);
  const menu = db.menus.find((m) => m.id === event.menuId);
  const [form, setForm] = useState({ ...event });

  const save = () => {
    patch("events", event.id, {
      name: form.name, date: form.date, guests: clamp(form.guests, 1),
      seña: clamp(form.seña, 0), señaDate: form.señaDate, confirmDate: form.confirmDate, notes: form.notes,
    });
  };

  const applyMenu = () => {
    const m = db.menus.find((x) => x.id === form.menuId);
    if (!m) return;
    patch("events", event.id, { menuId: form.menuId, modules: configFromMenu(m) });
  };

  const señaDue = daysUntil(event.señaDate);
  const confDue = daysUntil(event.confirmDate);

  return (
    <div className="stack">
      <Card title="Estado del evento">
        <StatusStepper event={event} />
        <div className="grid-3 reminder-row">
          <div className="reminder">
            <Icon name="bell" size={15} />
            <span>Seña: <strong>{dateStr(event.señaDate)}</strong></span>
            {señaDue !== null && <Badge tone={señaDue <= 5 ? "red" : señaDue <= 15 ? "amber" : "green"}>{señaDue <= 0 ? "vencida" : `en ${señaDue} d`}</Badge>}
          </div>
          <div className="reminder">
            <Icon name="clock" size={15} />
            <span>Confirmación: <strong>{dateStr(event.confirmDate)}</strong></span>
            {confDue !== null && <Badge tone={confDue <= 7 ? "amber" : "green"}>{confDue <= 0 ? "hoy" : `en ${confDue} d`}</Badge>}
          </div>
          <div className="reminder">
            <Icon name="calendar" size={15} />
            <span>Evento: <strong>{dateStr(event.date)}</strong></span>
          </div>
        </div>
      </Card>

      <div className="stats-grid">
        <StatBox label="Total del evento" value={money(bal.price)} />
        <StatBox label="Pagado" value={money(bal.total)} tone={bal.total > 0 ? "green" : ""} />
        <StatBox label="Saldo pendiente" value={money(bal.saldo)} tone={bal.saldo > 0 ? "amber" : "green"} />
        <StatBox label="Precio por persona" value={money(eventAnalysis(event, db).pricePerPerson)} />
      </div>

      <Card title="Datos del evento" actions={<Btn variant="outline" size="sm" icon="check" onClick={save}>Guardar cambios</Btn>}>
        <div className="form grid-2">
          <Field label="Nombre del evento">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Cliente">
            <Input value={client?.name || "—"} disabled />
          </Field>
          <Field label="Fecha">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Invitados">
            <Input type="number" min="1" value={form.guests} onChange={(e) => setForm({ ...form, guests: e.target.value })} />
          </Field>
          <Field label="Menú">
            <Select value={form.menuId} onChange={(e) => setForm({ ...form, menuId: e.target.value })}>
              {db.menus.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </Field>
        </div>
        <div className="form-actions">
          <Btn variant="outline" size="sm" icon="sparkle" onClick={applyMenu}>Aplicar menú</Btn>
          <span className="muted">Reemplaza los módulos del evento por los de este menú.</span>
        </div>
        <div className="form grid-2">
          <Field label="Seña (valor de referencia: 1 tarjeta = {money(db.settings.señaReference)})">
            <Input type="number" value={form.seña} onChange={(e) => setForm({ ...form, seña: e.target.value })} />
          </Field>
          <Field label="Fecha límite de seña">
            <Input type="date" value={form.señaDate} onChange={(e) => setForm({ ...form, señaDate: e.target.value })} />
          </Field>
          <Field label="Fecha de confirmación de invitados">
            <Input type="date" value={form.confirmDate} onChange={(e) => setForm({ ...form, confirmDate: e.target.value })} />
          </Field>
        </div>
        <Field label="Notas">
          <TextArea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        <div className="form-actions">
          <Btn size="sm" icon="check" onClick={save}>Guardar cambios</Btn>
        </div>
      </Card>

      <Card title="Ficha del cliente" actions={<Btn variant="outline" size="sm" icon="users" onClick={() => navigate("cliente", { id: event.clientId })}>Ver ficha</Btn>}>
        <div className="client-meta">
          <span><Icon name="users" size={14} /> {client?.name}</span>
          <span><Icon name="phone" size={14} /> {client?.phone}</span>
          <span><Icon name="file" size={14} /> {client?.email || "sin email"}</span>
          <span><Icon name="sparkle" size={14} /> Menú: {menu?.name}</span>
        </div>
        {client?.notes && <p className="muted">{client.notes}</p>}
      </Card>
    </div>
  );
}

function StatBox({ label, value, tone }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${tone || ""}`}>{value}</span>
    </div>
  );
}

function SpecialForm({ onSubmit, onCancel }) {
  const { db } = useStore();
  const [form, setForm] = useState({ label: "", qty: 1, kind: "dish", dishId: "", recipeId: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const itemId = form.kind === "dish" ? form.dishId : form.recipeId;
  const valid = clamp(form.qty, 0) > 0 && !!itemId;

  const save = () => {
    if (!valid) return;
    const dish = form.kind === "dish" ? db.dishes.find((d) => d.id === form.dishId) : null;
    const recipe = form.kind === "recipe" ? db.recipes.find((r) => r.id === form.recipeId) : null;
    onSubmit({
      id: uid("sp"),
      label: form.label.trim() || dish?.name || recipe?.name || "Especial",
      qty: clamp(form.qty, 1),
      dishId: form.kind === "dish" ? form.dishId : null,
      recipeId: form.kind === "recipe" ? form.recipeId : null,
    });
  };

  return (
    <div className="form">
      <div className="grid-2">
        <Field label="Etiqueta (opcional)">
          <Input value={form.label} onChange={(e) => set("label", e.target.value)} placeholder="Ej. Opción vegana" />
        </Field>
        <Field label="Cantidad de porciones">
          <Input type="number" min="1" value={form.qty} onChange={(e) => set("qty", e.target.value)} />
        </Field>
      </div>
      <div className="grid-2">
        <Field label="Tipo">
          <Select value={form.kind} onChange={(e) => set("kind", e.target.value)}>
            <option value="dish">Plato</option>
            <option value="recipe">Receta (buffet)</option>
          </Select>
        </Field>
        <Field label="Plato / Receta">
          <Select value={itemId} onChange={(e) => set(form.kind === "dish" ? "dishId" : "recipeId", e.target.value)}>
            <option value="">— Seleccionar —</option>
            {form.kind === "dish"
              ? db.dishes.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)
              : db.recipes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
        </Field>
      </div>
      <div className="form-actions">
        <Btn onClick={save} disabled={!valid}>Agregar especial</Btn>
        <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
      </div>
    </div>
  );
}

function ModuleEditor({ event }) {
  const { db, add, remove, patch, setSettings } = useStore();
  const [nuevoSpecial, setNuevoSpecial] = useState(false);
  const patchModule = (key, changes) =>
    patch("events", event.id, { modules: { ...event.modules, [key]: { ...event.modules[key], ...changes } } });

  const analysis = eventAnalysis(event, db);

  const addSpecial = (data) => {
    patch("events", event.id, { specials: [...(event.specials || []), data] });
    setNuevoSpecial(false);
  };

  const removeSpecial = (id) => {
    patch("events", event.id, { specials: (event.specials || []).filter((x) => x.id !== id) });
  };

  const dishesFor = (mod) => db.dishes.filter((d) => d.module === mod);
  const recipesFor = (mod) => db.recipes.filter((r) => r.module === mod);

  const checkType = (key) => (key === "buffet" ? "buffet" : key === "postre" ? "postre" : "mesa");

  return (
    <div className="stack">
      <div className="stats-grid">
        <StatBox label="Costo directo por persona" value={money(analysis.costPerPerson)} />
        <StatBox label="Precio por persona" value={money(analysis.pricePerPerson)} />
        <StatBox label={`Costo total (${analysis.standardGuests} pers. + especiales)`} value={money(analysis.cost)} />
        <StatBox label="Total del evento" value={money(analysis.price)} tone="green" />
      </div>

      {MODULE_DEFS.map((def) => {
        const m = event.modules[def.key] || { on: false };
        const active = m.on;
        return (
          <Card key={def.key} title={def.label} pad={false}>
            <div className="module-row">
              <Switch checked={active} onChange={(v) => patchModule(def.key, { on: v })} label={active ? "Activo" : "Desactivado"} />
              {active && def.kind === "dish" && (
                <Select
                  value={m.dishId || ""}
                  onChange={(e) => patchModule(def.key, { dishId: e.target.value })}
                  className="module-select"
                >
                  {dishesFor(def.key).map((d) => (
                    <option key={d.id} value={d.id}>{d.name} · {money(eventAnalysis({ ...event, modules: { ...event.modules, [def.key]: { on: true, dishId: d.id } } }, db).rows.find((r) => r.key === def.key)?.price || 0)}</option>
                  ))}
                </Select>
              )}
            </div>

            {active && def.kind === "recipes" && (
              <div className="chip-list">
                {recipesFor(def.key).map((r) => {
                  const on = (m.recipeIds || []).includes(r.id);
                  return (
                    <button
                      key={r.id}
                      className={`chip ${on ? "selected" : ""}`}
                      onClick={() =>
                        patchModule(def.key, {
                          recipeIds: on ? m.recipeIds.filter((x) => x !== r.id) : [...(m.recipeIds || []), r.id],
                        })
                      }
                    >
                      <Icon name="check" size={13} />
                      {r.name}
                    </button>
                  );
                })}
              </div>
            )}

            {active && def.kind === "dishes" && (
              <div className="chip-list">
                {dishesFor(def.key).map((d) => {
                  const on = (m.dishIds || []).includes(d.id);
                  return (
                    <button
                      key={d.id}
                      className={`chip ${on ? "selected" : ""}`}
                      onClick={() =>
                        patchModule(def.key, {
                          dishIds: on ? m.dishIds.filter((x) => x !== d.id) : [...(m.dishIds || []), d.id],
                        })
                      }
                    >
                      <Icon name="check" size={13} />
                      {d.name}
                    </button>
                  );
                })}
              </div>
            )}

            {active && (
              <div className="module-detail">
                <div className="table-wrap">
                  <table className="table table-sm">
                    <thead>
                      <tr><th>Opción</th><th className="right">Costo/pers.</th><th className="right">Precio/pers.</th></tr>
                    </thead>
                    <tbody>
                      {analysis.rows.find((r) => r.key === def.key)?.items.map((it, i) => (
                        <tr key={i}>
                          <td>{it.ref}</td>
                          <td className="right">{money(it.cost)}</td>
                          <td className="right">{money(it.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="module-total">
                  <span>{def.key === "buffet" ? `Incluye margen de seguridad buffet (+${Math.round(db.settings.buffetSafety * 100)}%)` : ""}</span>
                  <strong>{money(analysis.rows.find((r) => r.key === def.key)?.price * analysis.standardGuests || 0)}</strong>
                </div>
              </div>
            )}
          </Card>
        );
      })}

      <Card
        title="Platos exclusivos (vegano, celíaco, especiales)"
        actions={<Btn icon="plus" onClick={() => setNuevoSpecial(true)}>Agregar especial</Btn>}
      >
        <p className="muted">
          Restan de la cuenta general: {event.guests} invitados → {analysis.standardGuests} estándar + {analysis.specials.reduce((s, x) => s + x.qty, 0)} porciones especiales, que se facturan a su costo individual.
        </p>
        {analysis.specials.length > 0 ? (
          <div className="table-wrap">
            <table className="table table-sm">
              <thead>
                <tr><th>Especial</th><th className="right">Porciones</th><th className="right">Precio/pers.</th><th className="right">Total</th><th /></tr>
              </thead>
              <tbody>
                {analysis.specials.map((sp) => (
                  <tr key={sp.id}>
                    <td><strong>{sp.label}</strong> <span className="muted">· {sp.ref}</span></td>
                    <td className="right">{sp.qty}</td>
                    <td className="right">{money(sp.pricePerUnit)}</td>
                    <td className="right"><strong>{money(sp.price)}</strong></td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn danger" onClick={() => removeSpecial(sp.id)} aria-label="Quitar especial"><Icon name="trash" size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Sin platos exclusivos para este evento.</p>
        )}

        <Modal open={nuevoSpecial} onClose={() => setNuevoSpecial(false)} title="Agregar plato exclusivo">
          <SpecialForm onSubmit={addSpecial} onCancel={() => setNuevoSpecial(false)} />
        </Modal>
      </Card>

      <Card title="Control de porciones vs. tabla de consumo">
        <p className="muted">Compara la receta con la referencia por persona (mesa o buffet) del módulo.</p>
        {eventModules(event).filter((m) => m.on).flatMap((m) =>
          m.kind === "recipes"
            ? (m.recipeIds || []).map((rid) => ({ recipe: db.recipes.find((r) => r.id === rid), type: "buffet" }))
            : m.kind === "dishes"
              ? (m.dishIds || []).map((did) => ({ recipe: db.recipes.find((r) => r.id === db.dishes.find((d) => d.id === did)?.recipeId), type: "postre" }))
              : [{ recipe: db.recipes.find((r) => r.id === db.dishes.find((d) => d.id === m.dishId)?.recipeId), type: "mesa" }]
        )
          .filter((x) => x.recipe)
          .map(({ recipe, type }) => {
            const checks = consumptionChecks(recipe, db.ingredients, type, db.settings.consumption);
            return (
              <div key={recipe.id} className="check-recipe">
                <strong>{recipe.name}</strong>
                <div className="checks">
                  {checks.length === 0 && <span className="muted">Sin componentes a comparar.</span>}
                  {checks.map((c) => (
                    <Badge key={c.component} tone={c.ok ? "green" : "red"} icon={c.ok ? "check" : "bell"}>
                      {c.label}: {c.grams} g {c.range ? `(ref. ${c.range[0]}-${c.range[1]})` : ""}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
      </Card>
    </div>
  );
}

function ComprasTab({ event }) {
  const { db, add, remove, patch, setSettings } = useStore();
  const list = shoppingList(event, db);
  const [done, setDone] = useState(() => new Set());
  const [waOpen, setWaOpen] = useState(false);
  const toggle = (id) => {
    const next = new Set(done);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setDone(next);
  };
  const pending = list.filter((it) => !done.has(it.ingredientId) && it.needed > 0);
  const toBuy = list.filter((it) => it.toBuy > 0);
  const waPhone = db.clients.find((c) => c.id === event.clientId)?.phone?.replace(/\D/g, "");
  const waText = encodeURIComponent(
    `Lista de compras — ${event.name} (${dateStr(event.date)}, ${event.guests} invitados):\n` +
    pending.map((it) => `• ${it.name}: ${it.unit === "uni" ? units(it.needed) : kg(it.needed * 1000)}`).join("\n")
  );

  return (
    <div className="stack">
      <Card title="Lista de compras del evento" actions={
        <>
          <Btn variant="outline" size="sm" icon="whatsapp" onClick={() => setWaOpen(true)}>Enviar por WhatsApp</Btn>
        </>
      }>
        <p className="muted">
          Generada automáticamente desde el menú: {list.length} insumos · {toBuy.length} para comprar (descontando stock).
        </p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th className="ck-col" /><th>Insumo</th><th>Necesario</th><th className="right">Stock</th><th className="right">Comprar</th><th>Proveedor</th></tr>
            </thead>
            <tbody>
              {list.map((it) => {
                const sup = db.suppliers.find((s) => s.id === it.supplierId);
                return (
                  <tr key={it.ingredientId} className={done.has(it.ingredientId) ? "row-done" : ""}>
                    <td className="ck-col">
                      <input type="checkbox" className="ck" checked={done.has(it.ingredientId)} onChange={() => toggle(it.ingredientId)} />
                    </td>
                    <td><strong>{it.name}</strong> <span className="muted">({it.cat})</span></td>
                    <td>{it.unit === "uni" ? units(it.needed) : kg(it.needed * 1000)}</td>
                    <td className="right">{it.unit === "uni" ? units(it.stock) : kg(it.stock)}</td>
                    <td className={`right ${it.toBuy > 0 ? "tone-amber" : "tone-green"}`}>{it.unit === "uni" ? units(it.toBuy) : kg(it.toBuy * 1000)}</td>
                    <td>{sup?.name || "—"}</td>
                  </tr>
                );
              })}
              {list.length === 0 && <tr><td colSpan={6} className="muted">Sin módulos activos: no hay insumos para este evento.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={waOpen} onClose={() => setWaOpen(false)} title="Enviar lista por WhatsApp">
        <p className="muted">Se abre WhatsApp con el mensaje listo para enviar:</p>
        <div className="wa-preview">
          <p>Lista de compras — {event.name} ({dateStr(event.date)}, {event.guests} invitados):</p>
          {pending.map((it) => <p key={it.ingredientId}>• {it.name}: {it.unit === "uni" ? units(it.needed) : kg(it.needed * 1000)}</p>)}
        </div>
        <div className="form-actions">
          <Btn icon="whatsapp" onClick={() => window.open(`https://wa.me/${waPhone}?text=${waText}`, "_blank", "noopener")}>Abrir WhatsApp</Btn>
        </div>
      </Modal>
    </div>
  );
}

function PersonalTab({ event }) {
  const { db, add, remove, patch, setSettings } = useStore();
  const assigns = db.assignments.filter((a) => a.eventId === event.id);
  const [form, setForm] = useState({ staffId: db.staff[0]?.id || "", role: "", task: "", pay: "" });

  const addAssign = () => {
    const pay = clamp(form.pay, 0);
    add("assignments", {
      id: uid("as"), eventId: event.id, staffId: form.staffId,
      role: form.role || db.staff.find((s) => s.id === form.staffId)?.role || "Servicio",
      task: form.task || "—", pay,
    });
    setForm({ staffId: db.staff[0]?.id || "", role: "", task: "", pay: "" });
  };

  const total = assigns.reduce((s, a) => s + (a.pay || 0), 0);

  return (
    <div className="stack">
      <div className="stats-grid">
        <StatBox label="Personal asignado" value={assigns.length} />
        <StatBox label="Costo de personal" value={money(total)} />
      </div>

      <Card title="Asignaciones por evento" pad={false}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Personal</th><th>Rol</th><th>Tarea</th><th className="right">Pago</th><th /></tr>
            </thead>
            <tbody>
              {assigns.map((a) => {
                const s = db.staff.find((x) => x.id === a.staffId);
                return (
                  <tr key={a.id}>
                    <td><strong>{s?.name || "—"}</strong></td>
                    <td>{a.role}</td>
                    <td>{a.task}</td>
                    <td className="right">{money(a.pay)}</td>
                    <td><button className="icon-btn" onClick={() => remove("assignments", a.id)} aria-label="Quitar"><Icon name="trash" size={16} /></button></td>
                  </tr>
                );
              })}
              {assigns.length === 0 && <tr><td colSpan={5} className="muted">Sin personal asignado todavía.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Asignar personal">
        <div className="form grid-2">
          <Field label="Persona">
            <Select value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })}>
              {db.staff.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.role}</option>)}
            </Select>
          </Field>
          <Field label="Rol / tarea">
            <Input value={form.task} onChange={(e) => setForm({ ...form, task: e.target.value })} placeholder="Ej. Cocina — plato principal" />
          </Field>
          <Field label="Pago por evento">
            <Input type="number" value={form.pay} onChange={(e) => setForm({ ...form, pay: e.target.value })} placeholder="Ej. 30000" />
          </Field>
        </div>
        <div className="form-actions">
          <Btn icon="plus" onClick={addAssign}>Asignar</Btn>
        </div>
      </Card>
    </div>
  );
}

function PagosTab({ event }) {
  const { db, add, remove, patch, setSettings } = useStore();
  const bal = eventBalance(event, db);
  const pays = db.payments.filter((p) => p.eventId === event.id);
  const [form, setForm] = useState({ concept: "Seña", amount: "", date: todayISO() });
  const [refValue, setRefValue] = useState(db.settings.señaReference);

  const addPay = () => {
    const amount = clamp(form.amount, 0);
    if (amount <= 0) return;
    add("payments", { id: uid("p"), eventId: event.id, concept: form.concept, amount, date: form.date });
    setForm({ concept: "Seña", amount: "", date: todayISO() });
  };

  const saveRef = () => {
    const v = Number(refValue);
    if (!isNaN(v) && v > 0) setSettings({ señaReference: v });
  };

  return (
    <div className="stack">
      <Card title="Seña y referencia editable">
        <p className="muted">
          Valor de referencia "1 tarjeta": se usa como valor por defecto para la seña de cada evento.
        </p>
        <div className="form grid-2">
          <Field label="Valor de referencia de 1 tarjeta">
            <Input type="number" value={refValue} onChange={(e) => setRefValue(e.target.value)} />
          </Field>
        </div>
        <div className="form-actions">
          <Btn size="sm" icon="check" onClick={saveRef}>Guardar referencia</Btn>
        </div>
        <div className="stats-grid mini">
          <StatBox label="Seña de este evento" value={money(event.seña)} />
          <StatBox label="Pagado" value={money(bal.total)} tone={bal.total > 0 ? "green" : ""} />
          <StatBox label="Saldo pendiente" value={money(bal.saldo)} tone={bal.saldo > 0 ? "amber" : "green"} />
        </div>
      </Card>

      <Card title="Registrar pago" pad={false}>
        <div className="form grid-3 pad-inline">
          <Field label="Concepto">
            <Select value={form.concept} onChange={(e) => setForm({ ...form, concept: e.target.value })}>
              <option>Seña</option>
              <option>Saldo</option>
              <option>Otro</option>
            </Select>
          </Field>
          <Field label="Monto">
            <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
          </Field>
          <Field label="Fecha">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
        </div>
        <div className="form-actions pad-inline">
          <Btn icon="plus" onClick={addPay}>Registrar pago</Btn>
        </div>
      </Card>

      <Card title="Historial de pagos" pad={false}>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Concepto</th><th>Fecha</th><th className="right">Monto</th><th /></tr></thead>
            <tbody>
              {pays.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.concept}</strong></td>
                  <td>{dateStr(p.date)}</td>
                  <td className="right">{money(p.amount)}</td>
                  <td><button className="icon-btn" onClick={() => remove("payments", p.id)} aria-label="Eliminar"><Icon name="trash" size={16} /></button></td>
                </tr>
              ))}
              {pays.length === 0 && <tr><td colSpan={4} className="muted">Sin pagos registrados.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function DocumentosTab({ event }) {
  const { db, add, remove, patch, setSettings } = useStore();
  const client = db.clients.find((c) => c.id === event.clientId);
  const [type, setType] = useState("presupuesto");
  return (
    <div className="stack">
      <Tabs
        tabs={[
          { id: "presupuesto", label: "Presupuesto" },
          { id: "contrato", label: "Contrato" },
          { id: "produccion", label: "Lista de producción" },
          { id: "recibo", label: "Recibo de pago" },
        ]}
        active={type}
        onChange={setType}
      />
      <DocumentView type={type} event={event} client={client} />
    </div>
  );
}

export function EventoDetail({ id }) {
  const { db, navigate } = useStore();
  const event = db.events.find((e) => e.id === id);
  const [tab, setTab] = useState("resumen");
  const client = db.clients.find((c) => c.id === event?.clientId);

  if (!event) {
    return (
      <div className="page">
        <Card><Empty title="Evento no encontrado" action={<Btn variant="outline" onClick={() => navigate("eventos")}>Volver a eventos</Btn>} /></Card>
      </div>
    );
  }

  const tabs = [
    { id: "resumen", label: "Resumen", icon: "grid" },
    { id: "menu", label: "Menú y costos", icon: "utensils" },
    { id: "compras", label: "Compras", icon: "box" },
    { id: "personal", label: "Personal", icon: "people" },
    { id: "pagos", label: "Pagos", icon: "wallet" },
    { id: "documentos", label: "Documentos", icon: "file" },
  ];

  return (
    <div className="page">
      <button className="back-btn" onClick={() => navigate("eventos")}><Icon name="back" size={16} /> Volver a eventos</button>
      <div className="page-head">
        <div>
          <h2>{event.name}</h2>
          <p className="muted">{client?.name} · {dateStr(event.date)} · {event.guests} invitados</p>
        </div>
        <StatusPill status={event.status} />
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === "resumen" && <ResumenTab event={event} />}
      {tab === "menu" && <ModuleEditor event={event} />}
      {tab === "compras" && <ComprasTab event={event} />}
      {tab === "personal" && <PersonalTab event={event} />}
      {tab === "pagos" && <PagosTab event={event} />}
      {tab === "documentos" && <DocumentosTab event={event} />}
    </div>
  );
}
