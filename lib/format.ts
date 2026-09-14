export const n = (v: unknown) => Number(v ?? 0);
export const fmt = (v: unknown, digits = 0) =>
  n(v).toLocaleString('zh-TW', { maximumFractionDigits: digits, minimumFractionDigits: digits });
export const pct = (v: unknown, digits = 1) => `${fmt(n(v) * 100, digits)}%`;
export const day = (v: string) => v.slice(5, 10).replace('-', '/');
export const month = (v: string) => v.slice(0, 7);
