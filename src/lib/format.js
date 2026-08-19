const moneyFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const decFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

export function money(v) {
  return `$ ${moneyFmt.format(Math.round(v))}`;
}

export function dec(v) {
  return decFmt.format(v);
}

export function pct(v) {
  return `${Math.round(v * 100)}%`;
}

export function dateStr(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function todayISO() {
  const d = new Date();
  return iso(d);
}

export function iso(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function addDaysISO(baseISO, days) {
  const [y, m, d] = baseISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return iso(dt);
}

export function daysUntil(isoDate) {
  if (!isoDate) return null;
  const [y, m, d] = isoDate.split("-").map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const now = new Date(todayISO()).getTime();
  return Math.round((target - now) / 86400000);
}

export function monthLabel(isoDate) {
  if (!isoDate) return "";
  const [y, m] = isoDate.split("-").map(Number);
  const names = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${names[m - 1]} ${y}`;
}

export function kg(g) {
  if (g < 1000) return `${Math.round(g)} g`;
  return `${dec(g / 1000)} kg`;
}

export function units(n) {
  return `${Math.round(n)} u`;
}