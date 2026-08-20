import { useState } from "react";
import { Card, Btn, Icon, SearchInput, Empty, Badge, StatusPill, Field, Input, TextArea, Modal } from "../components/ui.jsx";
import { useStore } from "../store.jsx";
import { shoppingList } from "../lib/cost.js";
import { money, kg, units, dateStr } from "../lib/format.js";
import { uid } from "../lib/id.js";

export function ClientesPage() {
  const { db, navigate, add } = useStore();
  const [q, setQ] = useState("");
  const [nuevo, setNuevo] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const list = db.clients.filter((c) =>
    `${c.name} ${c.phone} ${c.email}`.toLowerCase().includes(q.toLowerCase())
  );

  const create = () => {
    if (!name.trim()) return;
    const id = uid("c");
    add("clients", { id, name: name.trim(), phone, email, address: "", notes: "" });
    setNuevo(false);
    setName("");
    setPhone("");
    setEmail("");
    navigate("cliente", { id });
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Clientes</h2>
          <p className="muted">{db.clients.length} clientes registrados</p>
        </div>
        <Btn icon="plus" onClick={() => setNuevo(true)}>Nuevo cliente</Btn>
      </div>

      <SearchInput value={q} onChange={setQ} placeholder="Buscar por nombre, teléfono o mail…" />

      {list.length === 0 ? (
        <Card><Empty title="Sin resultados" text="Probá con otro término de búsqueda." /></Card>
      ) : (
        <div className="grid-2">
          {list.map((c) => {
            const eventos = db.events.filter((e) => e.clientId === c.id);
            const last = [...eventos].sort((a, b) => b.date.localeCompare(a.date))[0];
            return (
              <Card
                key={c.id}
                className="clickable-card"
                title={c.name}
                actions={<Icon name="chevronR" size={18} />}
                onClick={() => navigate("cliente", { id: c.id })}
              >
                <div className="client-meta">
                  <span><Icon name="phone" size={14} /> {c.phone || "Sin teléfono"}</span>
                  <span><Icon name="calendar" size={14} /> {eventos.length} eventos</span>
                  {last && <span><Icon name="sparkle" size={14} /> Último: {last.name}</span>}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={nuevo} onClose={() => setNuevo(false)} title="Nuevo cliente">
        <div className="form">
          <Field label="Nombre">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Familia González" />
          </Field>
          <Field label="Teléfono (WhatsApp)">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="911 555 0000" />
          </Field>
          <Field label="Email">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="mail@ejemplo.com" />
          </Field>
        </div>
        <div className="form-actions">
          <Btn onClick={create} disabled={!name.trim()}>Crear cliente</Btn>
        </div>
      </Modal>
    </div>
  );
}

export function ClienteDetail({ id }) {
  const { db, navigate, patch } = useStore();
  const client = db.clients.find((c) => c.id === id);
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(client?.notes || "");

  if (!client) {
    return (
      <div className="page">
        <Card>
          <Empty title="Cliente no encontrado" action={<Btn variant="outline" onClick={() => navigate("clientes")}>Volver a clientes</Btn>} />
        </Card>
      </div>
    );
  }

  const eventos = db.events.filter((e) => e.clientId === client.id).sort((a, b) => b.date.localeCompare(a.date));
  const lastEvent = eventos[0];

  const saveNotes = () => {
    patch("clients", client.id, { notes });
    setEditing(false);
  };

  return (
    <div className="page">
      <button className="back-btn" onClick={() => navigate("clientes")}><Icon name="back" size={16} /> Volver a clientes</button>

      <div className="page-head">
        <div>
          <h2>{client.name}</h2>
          <p className="muted">{client.phone} · {client.email || "sin email"} · {client.address || "sin dirección"}</p>
        </div>
        <Btn variant="outline" icon="edit" onClick={() => setEditing(!editing)}>{editing ? "Cancelar" : "Editar notas"}</Btn>
      </div>

      {editing && (
        <Card>
          <Field label="Notas del cliente">
            <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <div className="form-actions">
            <Btn onClick={saveNotes}>Guardar notas</Btn>
          </div>
        </Card>
      )}

      {lastEvent && (
        <Card title="Menú elegido y cantidades de insumos">
          <p className="muted">
            Último evento: <strong>{lastEvent.name}</strong> · {dateStr(lastEvent.date)} · {lastEvent.guests} invitados
          </p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Insumo</th>
                  <th>Categoría</th>
                  <th className="right">Cantidad para el evento</th>
                  <th>Unidad</th>
                </tr>
              </thead>
              <tbody>
                {shoppingList(lastEvent, db).map((it) => (
                  <tr key={it.ingredientId}>
                    <td><strong>{it.name}</strong></td>
                    <td>{it.cat}</td>
                    <td className="right">{it.unit === "uni" ? units(it.needed) : kg(it.needed * 1000)}</td>
                    <td className="muted">{it.unit}</td>
                  </tr>
                ))}
                {shoppingList(lastEvent, db).length === 0 && (
                  <tr><td colSpan={4} className="muted">El evento no tiene insumos cargados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card title="Eventos del cliente">
        {eventos.length === 0 ? (
          <Empty title="Sin eventos todavía" text="Este cliente todavía no tiene eventos cargados." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Fecha</th>
                  <th>Invitados</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {eventos.map((e) => (
                  <tr key={e.id} className="clickable" onClick={() => navigate("evento", { id: e.id })}>
                    <td><strong>{e.name}</strong></td>
                    <td>{dateStr(e.date)}</td>
                    <td>{e.guests}</td>
                    <td><StatusPill status={e.status} /></td>
                    <td><Icon name="chevronR" size={16} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}