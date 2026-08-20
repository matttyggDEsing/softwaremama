let seq = 0;

export function uid(prefix = "id") {
  seq = (seq + 1) % 4096;
  const t = Date.now().toString(36);
  const s = seq.toString(36);
  const r = Math.random().toString(36).slice(2, 6);
  return `${prefix}_${t}${s}${r}`;
}