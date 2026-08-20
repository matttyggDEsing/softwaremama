import { useState } from "react";
import { Card, Badge, Icon, Select, Field, Empty, SearchInput, Dot, Btn, Input, Modal } from "../components/ui.jsx";
import { useStore } from "../store.jsx";
import { shoppingList } from "../lib/cost.js";
import { money, kg, units, dateStr } from "../lib/format.js";
import { uid } from "../lib/id.js";
import { clamp } from "../lib/num.js";

const COMPONENTES = [
  { key: "proteina", label: "Proteína" },
  { key: "guarnicion", label: "Guarnición" },
  { key: "ensalada", label: "Ensalada" },
  { key: "postre", label: "Postre" },
  { key: "otro", label: "Otro" },
];

const UNIDADES = ["kg", "l", "uni"];

function stockTone(stock, min) {
  if (stock < min) return { tone: "red", label: "Bajo" };
  return { tone: "green", label: "OK" };
}

function emptyForm(db) {
  return {
    name: "",
    component: "otro",
    cat: "Almacén",
    unit: "kg",
    cost: "",
    stock: "",
    min: "",
    supplierId: db.suppliers[0]?.id || "",
  };
}

function IngredienteForm({ initial, onSubmit, onCancel, submitLabel }) {
  const { db } = useStore();
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.name.trim() !== "";

  const save = () => {
    if (!valid) return;
    onSubmit({
      name: form.name.trim(),
      component: form.component,
      cat: form.cat.trim() || "Otros",
      unit: form.unit,
      cost: clamp(form.cost, 0),
      stock: clamp(form.stock, 0),
      min: clamp(form.min, 0),
      supplierId: form.supplierId,
    });
  };

  return (
    <div className="form">
      <Field label="Nombre">
        <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ej. Filet de merluza" autoFocus />
      </Field>
      <div className="grid-2">
        <Field label="Componente">
          <Select value={form.component} onChange={(e) => set("component", e.target.value)}>
            {COMPONENTES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </Select>
        </Field>
        <Field label="Categoría">
          <Input value={form.cat} onChange={(e) => set("cat", e.target.value)} placeholder="Ej. Carnes" />
        </Field>
      </div>
      <div className="grid-2">
        <Field label="Unidad">
          <Select value={form.unit} onChange={(e) => set("unit", e.target.value)}>
            {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
          </Select>
        </Field>
        <Field label="Proveedor de referencia">
          <Select value={form.supplierId} onChange={(e) => set("supplierId", e.target.value)}>
            {db.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
      </div>
      <div className="grid-3">
        <Field label="Costo por unidad">
          <Input type="number" min="0" step="50" value={form.cost} onChange={(e) => set("cost", e.target.value)} placeholder="0" />
        </Field>
        <Field label="Stock actual">
          <Input type="number" min="0" value={form.stock} onChange={(e) => set("stock", e.target.value)} placeholder="0" />
        </Field>
        <Field label="Mínimo">
          <Input type="number" min="0" value={form.min} onChange={(e) => set("min", e.target.value)} placeholder="0" />
        </Field>
      </div>
      <div className="form-actions">
        <Btn onClick={save} disabled={!valid}>{submitLabel}</Btn>
        <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
      </div>
    </div>
  );
}

function StockTab() {
  const { db, add, patch, remove } = useStore();
  const [q, setQ] = useState("");
  const [nuevo, setNuevo] = useState(false);
  const [editando, setEditando] = useState(null);
  const [borrando, setBorrando] = useState(null);

  const insumos = db.ingredients
    .filter((i) => `${i.name} ${i.cat}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name));
  const lowInsumos = db.ingredients.filter((i) => i.stock < i.min).length;
  const lowEq = db.equipment.filter((e) => e.qty < e.min).length;

  const usedBy = (id) => db.recipes.filter((r) => r.items.some((it) => it.ingredientId === id));
  const enUso = borrando ? usedBy(borrando.id) : [];
  const valorStock = db.ingredients.reduce((s, i) => s + i.stock * i.cost, 0);

  const create = (data) => {
    add("ingredients", { id: uid("ing"), ...data });
    setNuevo(false);
  };

  const saveEdit = (data) => {
    patch("ingredients", editando.id, data);
    setEditando(null);
  };

  const confirmarBorrado = () => {
    remove("ingredients", borrando.id);
    setBorrando(null);
  };

  return (
    <div className="stack">
      <div className="stats-grid">
        <div className="stat"><span className="stat-label">Insumos en stock</span><span className="stat-value">{db.ingredients.length}</span><span className="stat-sub">{lowInsumos} bajo mínimo</span></div>
        <div className="stat"><span className="stat-label">Equipamiento</span><span className="stat-value">{db.equipment.length}</span><span className="stat-sub">{lowEq} bajo mínimo</span></div>
        <div className="stat"><span className="stat-label">Valor de stock (insumos)</span><span className="stat-value">{money(valorStock)}</span></div>
      </div>

      <Card
        title="Insumos"
        actions={
          <>
            <Badge tone={lowInsumos > 0 ? "red" : "green"} icon={lowInsumos > 0 ? "bell" : "check"}>{lowInsumos > 0 ? `${lowInsumos} bajos` : "stock OK"}</Badge>
            <Btn icon="plus" onClick={() => setNuevo(true)}>Nuevo insumo</Btn>
          </>
        }
      >
        <div className="card-toolbar">
          <SearchInput value={q} onChange={setQ} placeholder="Buscar insumo…" />
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Componente</th>
                <th className="right">Costo</th>
                <th className="right">Stock</th>
                <th className="right">Mínimo</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {insumos.map((i) => {
                const st = stockTone(i.stock, i.min);
                return (
                  <tr key={i.id}>
                    <td>
                      <strong>{i.name}</strong>
                      <span className="muted"> · {i.cat}</span>
                    </td>
                    <td>{COMPONENTES.find((c) => c.key === i.component)?.label || i.component}</td>
                    <td className="right">{money(i.cost)}/{i.unit}</td>
                    <td className="right">
                      <input
                        className="input input-xs right"
                        type="number"
                        min="0"
                        value={i.stock}
                        onChange={(e) => patch("ingredients", i.id, { stock: clamp(e.target.value, 0) })}
                      />
                    </td>
                    <td className="right">{i.min} {i.unit}</td>
                    <td><Badge tone={st.tone}><Dot tone={st.tone} /> {st.label}</Badge></td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn" onClick={() => setEditando(i)} aria-label="Editar"><Icon name="edit" size={16} /></button>
                        <button className="icon-btn danger" onClick={() => setBorrando(i)} aria-label="Eliminar"><Icon name="trash" size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {insumos.length === 0 && <tr><td colSpan={7} className="muted">Sin resultados.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Equipamiento (vajilla, mesas, servicio)" pad={false}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Elemento</th><th>Categoría</th><th className="right">Cantidad</th><th className="right">Mínimo</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {db.equipment.map((e) => {
                const st = stockTone(e.qty, e.min);
                return (
                  <tr key={e.id}>
                    <td><strong>{e.name}</strong></td>
                    <td>{e.cat}</td>
                    <td className="right">
                      <input
                        className="input input-xs right"
                        type="number"
                        min="0"
                        value={e.qty}
                        onChange={(ev) => patch("equipment", e.id, { qty: clamp(ev.target.value, 0) })}
                      />
                    </td>
                    <td className="right">{e.min}</td>
                    <td><Badge tone={st.tone}><Dot tone={st.tone} /> {st.label}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={nuevo} onClose={() => setNuevo(false)} title="Nuevo insumo">
        <IngredienteForm
          initial={emptyForm(db)}
          onSubmit={create}
          onCancel={() => setNuevo(false)}
          submitLabel="Crear insumo"
        />
      </Modal>

      <Modal open={!!editando} onClose={() => setEditando(null)} title={`Editar: ${editando?.name || ""}`}>
        {editando && (
          <IngredienteForm
            initial={{
              name: editando.name,
              component: editando.component,
              cat: editando.cat,
              unit: editando.unit,
              cost: editando.cost,
              stock: editando.stock,
              min: editando.min,
              supplierId: editando.supplierId,
            }}
            onSubmit={saveEdit}
            onCancel={() => setEditando(null)}
            submitLabel="Guardar cambios"
          />
        )}
      </Modal>

      <Modal open={!!borrando} onClose={() => setBorrando(null)} title={`Eliminar: ${borrando?.name || ""}`}>
        {enUso.length > 0 ? (
          <div className="form">
            <p className="muted">
              Este insumo se usa en las siguientes recetas. <strong>No se puede eliminar</strong> porque rompería su costo:
            </p>
            <ul className="usage-list">
              {enUso.map((r) => <li key={r.id}><Icon name="utensils" size={15} /> {r.name}</li>)}
            </ul>
            <div className="form-actions">
              <Btn variant="outline" onClick={() => setBorrando(null)}>Entendido</Btn>
            </div>
          </div>
        ) : (
          <div className="form">
            <p className="muted">¿Eliminar este insumo? La operación no se puede deshacer.</p>
            <div className="form-actions">
              <Btn variant="danger" onClick={confirmarBorrado}><Icon name="trash" size={16} /> Eliminar</Btn>
              <Btn variant="ghost" onClick={() => setBorrando(null)}>Cancelar</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ComprasTab() {
  const { db } = useStore();
  const active = db.events.filter((e) => e.status !== "cerrado");
  const [eventId, setEventId] = useState(active[0]?.id || db.events[0]?.id);
  const [done, setDone] = useState(() => new Set());
  const event = db.events.find((e) => e.id === eventId);

  const list = event ? shoppingList(event, db) : [];
  const toBuy = list.filter((it) => it.toBuy > 0);
  const toggle = (id) => {
    const next = new Set(done);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setDone(next);
  };

  return (
    <div className="stack">
      <Card title="Lista de compras por evento">
        <Field label="Evento">
          <Select value={eventId} onChange={(e) => setEventId(e.target.value)}>
            {db.events.map((e) => <option key={e.id} value={e.id}>{e.name} · {dateStr(e.date)}</option>)}
          </Select>
        </Field>
        <p className="muted">
          Generada desde el menú del evento ({event?.guests} invitados). Descuenta el stock actual.{" "}
          <strong>En el modo offline de la versión final, esta lista se sincroniza con el stock sin conexión.</strong>
        </p>
        {list.length === 0 ? (
          <Empty title="Sin insumos" text="Activá módulos del menú en el evento para generar la lista." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th className="ck-col" /><th>Insumo</th><th>Necesario</th><th className="right">Stock</th><th className="right">Comprar</th><th>Categoría</th></tr>
              </thead>
              <tbody>
                {list.map((it) => (
                  <tr key={it.ingredientId} className={done.has(it.ingredientId) ? "row-done" : ""}>
                    <td className="ck-col"><input type="checkbox" className="ck" checked={done.has(it.ingredientId)} onChange={() => toggle(it.ingredientId)} /></td>
                    <td><strong>{it.name}</strong></td>
                    <td>{it.unit === "uni" ? units(it.needed) : kg(it.needed * 1000)}</td>
                    <td className="right">{it.unit === "uni" ? units(it.stock) : kg(it.stock * 1000)}</td>
                    <td className={`right ${it.toBuy > 0 ? "tone-amber" : "tone-green"}`}>{it.unit === "uni" ? units(it.toBuy) : kg(it.toBuy * 1000)}</td>
                    <td>{it.cat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {toBuy.length > 0 && (
          <div className="form-actions">
            <Badge tone="amber" icon="box">{toBuy.length} insumos para comprar</Badge>
          </div>
        )}
      </Card>
    </div>
  );
}

function emptySup() {
  return { name: "", phone: "", categories: "" };
}

function ProveedorForm({ initial, onSubmit, onCancel, submitLabel }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.name.trim() !== "";

  const save = () => {
    if (!valid) return;
    onSubmit({
      name: form.name.trim(),
      phone: form.phone.trim(),
      categories: form.categories.trim(),
    });
  };

  return (
    <div className="form">
      <Field label="Nombre">
        <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ej. Carnicería El Punto" autoFocus />
      </Field>
      <div className="grid-2">
        <Field label="Teléfono">
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Ej. 911 555 0101" />
        </Field>
        <Field label="Rubro / categorías">
          <Input value={form.categories} onChange={(e) => set("categories", e.target.value)} placeholder="Ej. Carnes" />
        </Field>
      </div>
      <div className="form-actions">
        <Btn onClick={save} disabled={!valid}>{submitLabel}</Btn>
        <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
      </div>
    </div>
  );
}

function ProveedoresTab() {
  const { db, add, patch, remove } = useStore();
  const [nuevo, setNuevo] = useState(false);
  const [editando, setEditando] = useState(null);
  const [borrando, setBorrando] = useState(null);

  const countFor = (id) => db.ingredients.filter((i) => i.supplierId === id).length;
  const enUso = borrando ? countFor(borrando.id) : 0;

  const create = (data) => {
    add("suppliers", { id: uid("sup"), ...data });
    setNuevo(false);
  };

  const saveEdit = (data) => {
    patch("suppliers", editando.id, data);
    setEditando(null);
  };

  const confirmarBorrado = () => {
    remove("suppliers", borrando.id);
    setBorrando(null);
  };

  return (
    <div className="stack">
      <Card
        title="Proveedores"
        actions={<Btn icon="plus" onClick={() => setNuevo(true)}>Nuevo proveedor</Btn>}
      >
        <p className="muted">Cada insumo tiene asignado un proveedor de referencia para la lista de compras.</p>
        {db.suppliers.length === 0 ? (
          <Empty title="Sin proveedores" text="Creá un proveedor para asignarlo a los insumos." />
        ) : (
          <div className="grid-2">
            {db.suppliers.map((s) => {
              const count = countFor(s.id);
              return (
                <div className="supplier" key={s.id}>
                  <div className="supplier-head">
                    <div className="supplier-name">
                      <span className="supplier-avatar"><Icon name="box" size={16} /></span>
                      <div>
                        <strong>{s.name}</strong>
                        <span className="muted">{s.categories}</span>
                      </div>
                    </div>
                    <div className="row-actions">
                      <button className="icon-btn" onClick={() => setEditando(s)} aria-label="Editar proveedor"><Icon name="edit" size={16} /></button>
                      <button className="icon-btn danger" onClick={() => setBorrando(s)} aria-label="Eliminar proveedor"><Icon name="trash" size={16} /></button>
                    </div>
                  </div>
                  <div className="supplier-meta">
                    <span><Icon name="phone" size={14} /> {s.phone || "—"}</span>
                    <Badge tone="humo">{count} {count === 1 ? "insumo" : "insumos"}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal open={nuevo} onClose={() => setNuevo(false)} title="Nuevo proveedor">
        <ProveedorForm
          initial={emptySup()}
          onSubmit={create}
          onCancel={() => setNuevo(false)}
          submitLabel="Crear proveedor"
        />
      </Modal>

      <Modal open={!!editando} onClose={() => setEditando(null)} title={`Editar: ${editando?.name || ""}`}>
        {editando && (
          <ProveedorForm
            initial={{ name: editando.name, phone: editando.phone, categories: editando.categories }}
            onSubmit={saveEdit}
            onCancel={() => setEditando(null)}
            submitLabel="Guardar cambios"
          />
        )}
      </Modal>

      <Modal open={!!borrando} onClose={() => setBorrando(null)} title={`Eliminar: ${borrando?.name || ""}`}>
        {enUso > 0 ? (
          <div className="form">
            <p className="muted">
              Este proveedor tiene <strong>{enUso} {enUso === 1 ? "insumo asignado" : "insumos asignados"}</strong>.{" "}
              <strong>No se puede eliminar</strong>: primero reasigná esos insumos a otro proveedor.
            </p>
            <div className="form-actions">
              <Btn variant="outline" onClick={() => setBorrando(null)}>Entendido</Btn>
            </div>
          </div>
        ) : (
          <div className="form">
            <p className="muted">¿Eliminar este proveedor? La operación no se puede deshacer.</p>
            <div className="form-actions">
              <Btn variant="danger" onClick={confirmarBorrado}><Icon name="trash" size={16} /> Eliminar</Btn>
              <Btn variant="ghost" onClick={() => setBorrando(null)}>Cancelar</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function InventarioPage() {
  const { nav } = useStore();
  const [tab, setTab] = useState(nav.params.tab || "stock");
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Inventario y compras</h2>
          <p className="muted">Stock de insumos y equipamiento, listas de compra y proveedores</p>
        </div>
      </div>
      <TabsLocal tab={tab} setTab={setTab} />
      {tab === "stock" && <StockTab />}
      {tab === "compras" && <ComprasTab />}
      {tab === "proveedores" && <ProveedoresTab />}
    </div>
  );
}

function TabsLocal({ tab, setTab }) {
  const items = [
    { id: "stock", label: "Stock", icon: "box" },
    { id: "compras", label: "Listas de compras", icon: "check" },
    { id: "proveedores", label: "Proveedores", icon: "people" },
  ];
  return (
    <div className="tabs" role="tablist">
      {items.map((t) => (
        <button key={t.id} role="tab" aria-selected={tab === t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
          <Icon name={t.icon} size={16} /> {t.label}
        </button>
      ))}
    </div>
  );
}