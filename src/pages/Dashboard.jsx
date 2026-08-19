import { Card, Stat, Badge, Btn, Icon, Empty, StatusPill } from "../components/ui.jsx";
import { useStore } from "../store.jsx";
import { eventAnalysis, eventBalance } from "../lib/cost.js";
import { money, dateStr, daysUntil, todayISO, monthLabel } from "../lib/format.js";

function computeAlerts(db) {
  const out = [];
  db.events
    .filter((e) => e.status !== "cerrado")
    .forEach((e) => {
      const pays = db.payments.filter((p) => p.eventId === e.id).reduce((s, p) => s + p.amount, 0);
      const price = eventAnalysis(e, db).price;
      const señaDue = daysUntil(e.señaDate);
      const confirmDue = daysUntil(e.confirmDate);
      const eventDue = daysUntil(e.date);

      if (señaDue !== null && señaDue >= 0 && señaDue <= 5 && pays === 0) {
        out.push({ tone: "amber", icon: "bell", text: `${e.name}: falta cobrar la seña de ${money(e.seña)} (${dateStr(e.señaDate)})`, eventId: e.id });
      }
      if (confirmDue !== null && confirmDue >= 0 && confirmDue <= 7 && e.status !== "confirmado") {
        out.push({ tone: "humo", icon: "clock", text: `${e.name}: confirmación final de invitados ${dateStr(e.confirmDate)}`, eventId: e.id });
      }
      if (eventDue !== null && eventDue >= 0 && eventDue <= 10 && e.status !== "consulta") {
        out.push({ tone: "negro", icon: "calendar", text: `${e.name}: el evento es el ${dateStr(e.date)}`, eventId: e.id });
      }
      if (e.status === "confirmado" && price - pays > 0) {
        out.push({ tone: "red", icon: "wallet", text: `${e.name}: saldo pendiente de ${money(price - pays)}`, eventId: e.id });
      }
    });
  db.ingredients
    .filter((i) => i.stock < i.min)
    .forEach((i) => {
      out.push({ tone: "red", icon: "box", text: `Stock bajo: ${i.name} (${i.stock} ${i.unit} / mínimo ${i.min})`, page: "inventario" });
    });
  return out;
}

export default function Dashboard() {
  const { db, navigate } = useStore();
  const alerts = computeAlerts(db);

  const upcoming = db.events
    .filter((e) => e.status !== "cerrado")
    .sort((a, b) => a.date.localeCompare(b.date));

  const month = todayISO().slice(0, 7);
  const monthEvents = db.events.filter((e) => e.date.startsWith(month) && e.status !== "consulta");
  const monthSum = monthEvents.reduce(
    (acc, e) => {
      const a = eventAnalysis(e, db);
      return { ingreso: acc.ingreso + a.price, costo: acc.costo + a.cost };
    },
    { ingreso: 0, costo: 0 }
  );
  const monthMargin = monthSum.ingreso - monthSum.costo;
  const monthPct = monthSum.ingreso ? monthMargin / monthSum.ingreso : 0;

  const confirmadas = db.events.filter((e) => e.status === "confirmado").length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Panel</h2>
          <p className="muted">Resumen del negocio · {monthLabel(todayISO())}</p>
        </div>
        <div className="page-head-actions">
          <Btn icon="plus" onClick={() => navigate("eventos", { nuevo: true })}>Nuevo evento</Btn>
          <Btn variant="outline" icon="box" onClick={() => navigate("inventario", { tab: "compras" })}>Lista de compras</Btn>
        </div>
      </div>

      <div className="stats-grid">
        <Stat label="Ingreso del mes" value={money(monthSum.ingreso)} tone="green" sub={monthLabel(todayISO())} />
        <Stat label="Costo directo del mes" value={money(monthSum.costo)} sub={monthLabel(todayISO())} />
        <Stat label="Margen bruto del mes" value={money(monthMargin)} tone={monthMargin >= 0 ? "green" : "red"} sub={`${Math.round(monthPct * 100)}% del ingreso`} />
        <Stat label="Eventos confirmados" value={confirmadas} sub={`${upcoming.length} en agenda`} />
      </div>

      {alerts.length > 0 && (
        <Card title="Alertas y recordatorios" actions={<Badge tone="amber" icon="bell">{alerts.length} pendientes</Badge>}>
          <ul className="alerts">
            {alerts.map((a, i) => (
              <li key={i} className={`alert alert-${a.tone}`}>
                <Icon name={a.icon} size={17} />
                <span>{a.text}</span>
                <button
                  className="link-btn"
                  onClick={() => (a.eventId ? navigate("evento", { id: a.eventId }) : navigate(a.page || "dashboard"))}
                >
                  Ver →
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card
        title="Próximos eventos"
        actions={<Btn variant="outline" size="sm" icon="calendar" onClick={() => navigate("eventos")}>Ver todos</Btn>}
      >
        {upcoming.length === 0 ? (
          <Empty title="No hay eventos próximos" text="Creá un evento nuevo para empezar." />
        ) : (
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
                {upcoming.map((e) => {
                  const client = db.clients.find((c) => c.id === e.clientId);
                  const bal = eventBalance(e, db);
                  return (
                    <tr key={e.id} className="clickable" onClick={() => navigate("evento", { id: e.id })}>
                      <td><strong>{e.name}</strong></td>
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
        )}
      </Card>

      <div className="grid-2">
        <Card title="Accesos rápidos">
          <div className="quick-grid">
            <button className="quick" onClick={() => navigate("menus", { tab: "calculador" })}>
              <Icon name="utensils" size={20} />
              <span>Calculador de costos</span>
            </button>
            <button className="quick" onClick={() => navigate("pagos")}>
              <Icon name="wallet" size={20} />
              <span>Rentabilidad</span>
            </button>
            <button className="quick" onClick={() => navigate("clientes")}>
              <Icon name="users" size={20} />
              <span>Clientes</span>
            </button>
            <button className="quick" onClick={() => navigate("documentos")}>
              <Icon name="file" size={20} />
              <span>Documentos</span>
            </button>
          </div>
        </Card>

        <Card title="Últimos eventos cerrados">
          <ul className="mini-list">
            {db.events
              .filter((e) => e.status === "cerrado")
              .map((e) => {
                const a = eventAnalysis(e, db);
                return (
                  <li key={e.id} className="clickable" onClick={() => navigate("evento", { id: e.id })}>
                    <span>{e.name} <em>{dateStr(e.date)}</em></span>
                    <strong>{money(a.price)}</strong>
                  </li>
                );
              })}
            {db.events.filter((e) => e.status === "cerrado").length === 0 && (
              <li className="muted">Todavía no hay eventos cerrados.</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}