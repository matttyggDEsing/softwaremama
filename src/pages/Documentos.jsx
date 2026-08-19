import { useState } from "react";
import { Card, Select, Field, Empty } from "../components/ui.jsx";
import { useStore } from "../store.jsx";
import { dateStr } from "../lib/format.js";
import { DocumentView } from "../components/Document.jsx";

export default function DocumentosPage() {
  const { db } = useStore();
  const [eventId, setEventId] = useState(db.events[0]?.id || "");
  const [type, setType] = useState("presupuesto");
  const event = db.events.find((e) => e.id === eventId);
  const client = event && db.clients.find((c) => c.id === event.clientId);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Documentos</h2>
          <p className="muted">Presupuesto, contrato, lista de producción y recibos · exportables en PDF y WhatsApp</p>
        </div>
      </div>

      <Card title="Generar documento">
        <div className="grid-2">
          <Field label="Evento">
            <Select value={eventId} onChange={(e) => setEventId(e.target.value)}>
              {db.events.map((e) => <option key={e.id} value={e.id}>{e.name} · {dateStr(e.date)}</option>)}
            </Select>
          </Field>
          <Field label="Tipo de documento">
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="presupuesto">Presupuesto</option>
              <option value="contrato">Contrato de servicio</option>
              <option value="produccion">Lista de producción (cocina)</option>
              <option value="recibo">Recibo de pago</option>
            </Select>
          </Field>
        </div>
      </Card>

      {event ? (
        <DocumentView type={type} event={event} client={client} />
      ) : (
        <Card><Empty title="Sin eventos" text="Creá un evento para generar documentos." /></Card>
      )}
    </div>
  );
}