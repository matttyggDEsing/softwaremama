import { useState } from "react";
import { Card, Btn, Icon, Field, Input, Select, Progress } from "../components/ui.jsx";
import { useStore } from "../store.jsx";
import { eventAnalysis, eventBalance, eventProfit } from "../lib/cost.js";
import { money, dateStr } from "../lib/format.js";

export default function PagosPage() {
  const { db, navigate, setSettings } = useStore();
  const [refValue, setRefValue] = useState(db.settings.señaReference);

  const rows = db.events
    .map((e) => {
      const profit = eventProfit(e, db);
      const bal = eventBalance(e, db);
      return { event: e, profit, bal };
    })
    .sort((a, b) => b.event.date.localeCompare(a.event.date));

  const totals = rows.reduce(
    (acc, r) => ({
      ingreso: acc.ingreso + r.profit.price,
      costo: acc.costo + r.profit.costoDirecto,
      personal: acc.personal + r.profit.staffCost,
      margen: acc.margen + r.profit.margen,
    }),
    { ingreso: 0, costo: 0, personal: 0, margen: 0 }
  );

  const saveRef = () => {
    const v = Number(refValue);
    if (!isNaN(v) && v > 0) setSettings({ señaReference: v });
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Pagos y reportes</h2>
          <p className="muted">Señas, saldos y rentabilidad por evento</p>
        </div>
      </div>

      <Card title="Seña de referencia (editable)">
        <p className="muted">
          Valor de referencia <strong>"{db.settings.señaLabel || "1 tarjeta"}"</strong>: se propone como seña al crear un evento.
        </p>
        <div className="form grid-3">
          <Field label="Valor de 1 tarjeta">
            <Input type="number" value={refValue} onChange={(e) => setRefValue(e.target.value)} />
          </Field>
          <Field label="Etiqueta de referencia">
            <Input
              value={db.settings.señaLabel || "1 tarjeta"}
              onChange={(e) => setSettings({ señaLabel: e.target.value })}
            />
          </Field>
          <div className="form-actions align-end">
            <Btn size="sm" icon="check" onClick={saveRef}>Guardar</Btn>
          </div>
        </div>
      </Card>

      <Card title="Señas y saldos por evento" pad={false}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Evento</th><th>Total</th><th>Seña prevista</th><th className="right">Pagado</th><th className="right">Saldo</th><th>Estado</th><th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ event, bal }) => (
                <tr key={event.id} className="clickable" onClick={() => navigate("evento", { id: event.id })}>
                  <td><strong>{event.name}</strong><span className="muted"> · {dateStr(event.date)}</span></td>
                  <td>{money(bal.price)}</td>
                  <td>{money(event.seña)}</td>
                  <td className="right">{money(bal.total)}</td>
                  <td className={`right ${bal.saldo > 0 ? "tone-amber" : "tone-green"}`}>{money(bal.saldo)}</td>
                  <td>{event.status}</td>
                  <td><Icon name="chevronR" size={16} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Rentabilidad por evento (ingreso vs. costo directo vs. margen)" pad={false}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Evento</th><th className="right">Ingreso</th><th className="right">Costo directo</th><th className="right">Personal</th><th className="right">Costo total</th><th className="right">Margen</th><th>%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ event, profit }) => (
                <tr key={event.id} className="clickable" onClick={() => navigate("evento", { id: event.id })}>
                  <td><strong>{event.name}</strong><span className="muted"> · {dateStr(event.date)}</span></td>
                  <td className="right">{money(profit.price)}</td>
                  <td className="right">{money(profit.costoDirecto)}</td>
                  <td className="right">{money(profit.staffCost)}</td>
                  <td className="right">{money(profit.costoTotal)}</td>
                  <td className={`right ${profit.margen >= 0 ? "tone-green" : "tone-red"}`}><strong>{money(profit.margen)}</strong></td>
                  <td>
                    <div className="margin-cell">
                      <Progress pct={profit.marginPct} />
                      <span className={profit.margen >= 0 ? "tone-green" : "tone-red"}>{Math.round(profit.marginPct * 100)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="tfoot-row">
                <td><strong>Totales</strong></td>
                <td className="right"><strong>{money(totals.ingreso)}</strong></td>
                <td className="right">{money(totals.costo)}</td>
                <td className="right">{money(totals.personal)}</td>
                <td className="right">{money(totals.costo + totals.personal)}</td>
                <td className={`right ${totals.margen >= 0 ? "tone-green" : "tone-red"}`}><strong>{money(totals.margen)}</strong></td>
                <td><strong>{totals.ingreso ? Math.round((totals.margen / totals.ingreso) * 100) : 0}%</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
