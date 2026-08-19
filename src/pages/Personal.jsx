import { useState } from "react";
import { Card, Badge, Icon, Field, Input, Btn } from "../components/ui.jsx";
import { useStore } from "../store.jsx";
import { money, dateStr } from "../lib/format.js";

export default function PersonalPage() {
  const { db, navigate } = useStore();
  const byStaff = db.staff.map((s) => {
    const assigns = db.assignments.filter((a) => a.staffId === s.id);
    return { ...s, assigns, total: assigns.reduce((acc, a) => acc + (a.pay || 0), 0) };
  });

  const byEvent = db.events.map((e) => ({
    event: e,
    assigns: db.assignments.filter((a) => a.eventId === e.id),
    total: db.assignments.filter((a) => a.eventId === e.id).reduce((s, a) => s + (a.pay || 0), 0),
  }));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Personal</h2>
          <p className="muted">Equipo de trabajo y asignaciones por evento</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat"><span className="stat-label">Personas en el equipo</span><span className="stat-value">{db.staff.length}</span></div>
        <div className="stat"><span className="stat-label">Asignaciones totales</span><span className="stat-value">{db.assignments.length}</span></div>
        <div className="stat"><span className="stat-label">Costo de personal (todos los eventos)</span><span className="stat-value">{money(db.assignments.reduce((s, a) => s + (a.pay || 0), 0))}</span></div>
      </div>

      <Card title="Equipo" pad={false}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Nombre</th><th>Rol</th><th>Teléfono</th><th className="right">Pago base</th><th className="right">Asignado a</th><th className="right">Total asignado</th></tr>
            </thead>
            <tbody>
              {byStaff.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.name}</strong></td>
                  <td>{s.role}</td>
                  <td>{s.phone}</td>
                  <td className="right">{money(s.payBase)}</td>
                  <td className="right">{s.assigns.length} eventos</td>
                  <td className="right">{money(s.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Asignaciones por evento (rol/tarea y pago)" pad={false}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Evento</th><th>Fecha</th><th>Personal asignado</th><th className="right">Costo</th><th /></tr>
            </thead>
            <tbody>
              {byEvent.map(({ event, assigns, total }) => (
                <tr key={event.id} className="clickable" onClick={() => navigate("evento", { id: event.id })}>
                  <td><strong>{event.name}</strong></td>
                  <td>{dateStr(event.date)}</td>
                  <td>
                    {assigns.map((a) => {
                      const s = db.staff.find((x) => x.id === a.staffId);
                      return <Badge key={a.id} tone="humo">{s?.name} · {a.role}</Badge>;
                    })}
                    {assigns.length === 0 && <span className="muted">Sin asignar</span>}
                  </td>
                  <td className="right">{money(total)}</td>
                  <td><Icon name="chevronR" size={16} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Agregar persona al equipo">
        <NuevoStaff />
      </Card>
    </div>
  );
}

function NuevoStaff() {
  const { db, add } = useStore();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [pay, setPay] = useState("");

  const create = () => {
    if (!name.trim()) return;
    add("staff", { id: `s${Date.now()}`, name: name.trim(), role: role || "Servicio", phone, payBase: Number(pay) || 0 });
    setName(""); setRole(""); setPhone(""); setPay("");
  };

  return (
    <div className="form grid-2">
      <Field label="Nombre"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Carolina" /></Field>
      <Field label="Rol"><Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Ej. Mozo / servicio" /></Field>
      <Field label="Teléfono"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
      <Field label="Pago base por evento"><Input type="number" value={pay} onChange={(e) => setPay(e.target.value)} placeholder="30000" /></Field>
      <div className="form-actions">
        <Btn icon="plus" onClick={create} disabled={!name.trim()}>Agregar persona</Btn>
      </div>
    </div>
  );
}