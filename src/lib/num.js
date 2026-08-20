export function clamp(v, min = 0, max = Infinity) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function int(v, fallback = 0) {
  return Math.round(num(v, fallback));
}