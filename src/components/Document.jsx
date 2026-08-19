import { Icon, Btn } from "./ui.jsx";
import { eventAnalysis, eventBalance } from "../lib/cost.js";
import { money, dateStr, kg, units } from "../lib/format.js";
import { useStore } from "../store.jsx";

function docHeader(biz) {
  return (
    <div className="doc-head">
      <div>
        <div className="doc-logo">JAFET</div>
        <div className="doc-sub">EVENTOS · CATERING</div>
      </div>
      <div className="doc-biz">
        <strong>{biz.name}</strong>
        <span>{biz.address}</span>
        <span>{biz.phone} · {biz.instagram}</span>
      </div>
    </div>
  );
}

function eventBrief(event, client) {
  return (
    <div className="doc-brief">
      <div>
        <strong>Cliente</strong>
        <span>{client?.name || "—"}</span>
        <span>{client?.phone || ""}</span>
      </div>
      <div>
        <strong>Evento</strong>
        <span>{event.name}</span>
        <span>{dateStr(event.date)} · {event.guests} invitados</span>
      </div>
    </div>
  );
}

function Presupuesto({ event, client, analysis, biz, db }) {
  return (
    <div className="doc">
      {docHeader(biz)}
      <h2 className="doc-title">Presupuesto</h2>
      <p className="doc-meta">N° {event.id.toUpperCase()}-2026 · {dateStr(new Date().toISOString())}</p>
      {eventBrief(event, client)}
      <table className="doc-table">
        <thead>
          <tr>
            <th>Servicio</th>
            <th>Por persona</th>
            <th className="right">Cantidad</th>
            <th className="right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {analysis.rows.filter((r) => r.active).map((r) => (
            <tr key={r.key}>
              <td>
                <strong>{r.label}</strong>
                <span className="doc-sub2">{r.items.map((i) => i.ref).join(", ")}</span>
              </td>
              <td>{money(r.price)}</td>
              <td className="right">{event.guests} pers.</td>
              <td className="right">{money(r.price * event.guests)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="doc-total">
        <span>Precio por persona</span>
        <strong>{money(analysis.pricePerPerson)}</strong>
        <span className="doc-total-sep">Total del evento</span>
        <strong className="doc-total-val">{money(analysis.price)}</strong>
      </div>
      <div className="doc-notes">
        <p>Seña para reservar la fecha: {money(event.seña)} (referencia: {money(db.settings.señaReference)})</p>
        <p>Válido por 15 días. Incluye servicio, vajilla y personal.</p>
      </div>
    </div>
  );
}

function Contrato({ event, client, analysis, biz, db }) {
  return (
    <div className="doc">
      {docHeader(biz)}
      <h2 className="doc-title">Contrato de servicio</h2>
      {eventBrief(event, client)}
      <div className="doc-clauses">
        <p><strong>1.</strong> JAFET Eventos prestará el servicio de catering para el evento <strong>{event.name}</strong> el día <strong>{dateStr(event.date)}</strong> para <strong>{event.guests}</strong> invitados.</p>
        <p><strong>2.</strong> El menú acordado es: {analysis.rows.filter((r) => r.active).map((r) => `${r.label} (${r.items.map((i) => i.ref).join(", ")})`).join(" · ")}.</p>
        <p><strong>3.</strong> El precio total del servicio es de <strong>{money(analysis.price)}</strong> ({money(analysis.pricePerPerson)} por persona).</p>
        <p><strong>4.</strong> Se abona una seña de <strong>{money(event.seña)}</strong> como reserva de fecha. El saldo se paga {event.status === "cerrado" ? "al finalizar el evento" : "hasta 7 días antes del evento"}.</p>
        <p><strong>5.</strong> La cantidad final de invitados se confirma hasta 7 días antes del evento y se factura sobre esa cantidad (referencia de seña actual: {money(db.settings.señaReference)}).</p>
        <p><strong>6.</strong> El cliente puede solicitar el presupuesto y este contrato en cualquier momento por WhatsApp.</p>
      </div>
      <div className="doc-signs">
        <div>
          <span className="doc-line" />
          <p>Firma JAFET Eventos</p>
        </div>
        <div>
          <span className="doc-line" />
          <p>Firma del cliente</p>
        </div>
      </div>
    </div>
  );
}

function Produccion({ event, analysis, db }) {
  const { ingredients } = db;
  const section = (mod, type) => {
    if (mod.kind === "recipes") return "buffet";
    if (mod.kind === "dishes") return "dulce";
    return "mesa";
  };
  return (
    <div className="doc">
      <div className="doc-head">
        <div>
          <div className="doc-logo">JAFET</div>
          <div className="doc-sub">COCINA</div>
        </div>
        <div className="doc-biz">
          <strong>Lista de producción</strong>
          <span>{event.name} · {dateStr(event.date)}</span>
          <span>{event.guests} invitados</span>
        </div>
      </div>

      {analysis.rows.filter((r) => r.active).map((mod) => (
        <div className="prod-mod" key={mod.key}>
          <h3>{mod.label} <span className="prod-qty">{event.guests} pers.</span></h3>
          {mod.items.map((it) => (
            <div className="prod-recipe" key={it.ref}>
              <strong>{it.ref}</strong>
              <div className="prod-table">
                {it.recipe?.items.map((rIt) => {
                  const ing = ingredients.find((i) => i.id === rIt.ingredientId);
                  if (!ing) return null;
                  const factor = section(mod, "") === "buffet" ? 1 + db.settings.buffetSafety : 1;
                  const total = rIt.u ? rIt.u * event.guests * factor : (rIt.g / 1000) * event.guests * factor;
                  return (
                    <span key={ing.id}>
                      <em>{ing.name}</em>
                      <strong>{rIt.u ? units(total) : kg(total)}</strong>
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Recibo({ event, client, payments, biz, balance }) {
  return (
    <div className="doc">
      {docHeader(biz)}
      <h2 className="doc-title">Recibo de pago</h2>
      <p className="doc-meta">Evento: {event.name} · {dateStr(event.date)} · Cliente: {client?.name}</p>
      <div className="recibos">
        {payments.map((p, i) => (
          <div className="recibo" key={p.id}>
            <div className="recibo-top">
              <strong>Recibo N° {i + 1}</strong>
              <span>{dateStr(p.date)}</span>
            </div>
            <div className="recibo-mid">
              <span>Concepto</span>
              <strong>{p.concept}</strong>
              <span>Monto</span>
              <strong className="recibo-amount">{money(p.amount)}</strong>
            </div>
            <div className="recibo-line" />
            <span className="recibo-sig">Recibí conforme — JAFET Eventos</span>
          </div>
        ))}
        {payments.length === 0 && <p className="doc-notes">Sin pagos registrados para este evento.</p>}
      </div>
      <div className="doc-notes">
        <p>Total del evento: <strong>{money(balance.price)}</strong> · Saldo pendiente: <strong>{money(balance.saldo)}</strong></p>
      </div>
    </div>
  );
}

const DOCS = {
  presupuesto: { label: "Presupuesto", icon: "file" },
  contrato: { label: "Contrato", icon: "file" },
  produccion: { label: "Lista de producción", icon: "file" },
  recibo: { label: "Recibo de pago", icon: "file" },
};

export function DocumentView({ type, event, client }) {
  const { db } = useStore();
  const analysis = eventAnalysis(event, db);
  const balance = eventBalance(event, db);
  const biz = db.settings.business;
  const payments = db.payments.filter((p) => p.eventId === event.id);
  const clientName = client?.name || "Cliente";

  const waText = encodeURIComponent(
    `Hola ${clientName}! Te compartimos el ${DOCS[type].label.toLowerCase()} de "${event.name}":\n` +
    `- Fecha: ${dateStr(event.date)}\n- Invitados: ${event.guests}\n- Total: ${money(analysis.price)}`
  );
  const waPhone = (client?.phone || "").replace(/[^\d]/g, "");

  return (
    <div>
      <div className="doc-toolbar">
        <div className="doc-toolbar-hint">
          {type === "produccion"
            ? "Para la cocina: cantidades por receta para el total de invitados."
            : "Revisá el documento, exportalo en PDF o envialo por WhatsApp."}
        </div>
        <div className="doc-toolbar-btns">
          <Btn variant="outline" icon="print" onClick={() => window.print()}>Exportar PDF</Btn>
          <Btn
            icon="whatsapp"
            onClick={() =>
              window.open(`https://wa.me/${waPhone}?text=${waText}`, "_blank", "noopener")
            }
          >
            Enviar por WhatsApp
          </Btn>
        </div>
      </div>
      <div className="print-area">
        {type === "presupuesto" && <Presupuesto event={event} client={client} analysis={analysis} biz={biz} db={db} />}
        {type === "contrato" && <Contrato event={event} client={client} analysis={analysis} biz={biz} db={db} />}
        {type === "produccion" && <Produccion event={event} analysis={analysis} db={db} />}
        {type === "recibo" && <Recibo event={event} client={client} payments={payments} biz={biz} balance={balance} />}
      </div>
    </div>
  );
}