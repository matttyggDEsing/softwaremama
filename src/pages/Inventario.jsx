import { useState } from "react";
import { Card, Badge, Icon, Select, Field, Empty, SearchInput, Dot } from "../components/ui.jsx";
import { useStore } from "../store.jsx";
import { shoppingList } from "../lib/cost.js";
import { money, kg, units, dateStr } from "../lib/format.js";

function stockTone(stock, min) {
  if (stock < min) return { tone: "red", label: "Bajo" };
  return { tone: "green", label: "OK" };
}

function StockTab() {
  const { db, patch } = useStore();
  const [q, setQ] = useState("");

  const insumos = db.ingredients.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()));
  const lowInsumos = db.ingredients.filter((i) => i.stock < i.min).length;
  const lowEq = db.equipment.filter((e) => e.qty < e.min).length;

  return (
    <div className="stack">
      <div className="stats-grid">
        <div className="stat"><span className="stat-label">Insumos en stock</span><span className="stat-value">{db.ingredients.length}</span><span className="stat-sub">{lowInsumos} bajo mínimo</span></div>
        <div className="stat"><span className="stat-label">Equipamiento</span><span className="stat-value">{db.equipment.length}</span><span className="stat-sub">{lowEq} bajo mínimo</span></div>
        <div className="stat"><span className="stat-label">Valor de stock (insumos)</span><span className="stat-value">{money(db.ingredients.reduce((s, i) => s + i.stock * i.cost, 0))}</span></div>
      </div>

      <Card title="Insumos" actions={<Badge tone={lowInsumos > 0 ? "red" : "green"} icon={lowInsumos > 0 ? "bell" : "check"}>{lowInsumos > 0 ? `${lowInsumos} bajos` : "stock OK"}</Badge>}>
        <SearchInput value={q} onChange={setQ} placeholder="Buscar insumo…" />
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Insumo</th><th>Componente</th><th className="right">Costo</th><th className="right">Stock</th><th className="right">Mínimo</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {insumos.map((i) => {
                const st = stockTone(i.stock, i.min);
                return (
                  <tr key={i.id}>
                    <td><strong>{i.name}</strong> <span className="muted">({i.cat})</span></td>
                    <td>{i.component}</td>
                    <td className="right">{money(i.cost)}/{i.unit}</td>
                    <td className="right">
                      <input
                        className="input input-xs right"
                        type="number"
                        min="0"
                        value={i.stock}
                        onChange={(e) => patch("ingredients", i.id, { stock: Number(e.target.value) })}
                      />
                    </td>
                    <td className="right">{i.min} {i.unit}</td>
                    <td><Badge tone={st.tone}><Dot tone={st.tone} /> {st.label}</Badge></td>
                  </tr>
                );
              })}
              {insumos.length === 0 && <tr><td colSpan={6} className="muted">Sin resultados.</td></tr>}
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
                        onChange={(ev) => patch("equipment", e.id, { qty: Number(ev.target.value) })}
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
                    <td>{it.unit === "uni" ? units(it.needed) : kg(it.needed)}</td>
                    <td className="right">{it.unit === "uni" ? units(it.stock) : kg(it.stock)}</td>
                    <td className={`right ${it.toBuy > 0 ? "tone-amber" : "tone-green"}`}>{it.unit === "uni" ? units(it.toBuy) : kg(it.toBuy)}</td>
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

function ProveedoresTab() {
  const { db } = useStore();
  return (
    <div className="stack">
      <Card title="Proveedores fijos">
        <p className="muted">Cada insumo tiene asignado un proveedor de referencia para la lista de compras.</p>
        <div className="grid-2">
          {db.suppliers.map((s) => {
            const count = db.ingredients.filter((i) => i.supplierId === s.id).length;
            return (
              <div className="supplier" key={s.id}>
                <div className="supplier-name">
                  <span className="supplier-avatar"><Icon name="box" size={16} /></span>
                  <div>
                    <strong>{s.name}</strong>
                    <span className="muted">{s.categories}</span>
                  </div>
                </div>
                <div className="supplier-meta">
                  <span><Icon name="phone" size={14} /> {s.phone}</span>
                  <Badge tone="humo">{count} insumos</Badge>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
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
