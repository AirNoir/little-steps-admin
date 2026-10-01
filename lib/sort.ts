// 表格排序共用邏輯（server 與 client 都能 import，不碰任何 Supabase）。
// 規則：數字（含日期轉成的 ms）照數值比、字串用 zh-Hant collator，null／空字串永遠排最後（不論升降冪）。

export type SortValue = string | number | null;
export type SortDir = 'asc' | 'desc';

const collator = new Intl.Collator('zh-Hant', { numeric: true, sensitivity: 'base' });

const isEmpty = (v: SortValue | undefined) => v == null || v === '' || (typeof v === 'number' && Number.isNaN(v));

export function compareSortValues(a: SortValue | undefined, b: SortValue | undefined, dir: SortDir): number {
  const ea = isEmpty(a);
  const eb = isEmpty(b);
  if (ea || eb) return ea === eb ? 0 : ea ? 1 : -1;
  const r = typeof a === 'number' && typeof b === 'number' ? a - b : collator.compare(String(a), String(b));
  return dir === 'asc' ? r : -r;
}

/** 依 key 排序（穩定排序；不改原陣列）。 */
export function sortBy<T>(list: T[], key: (item: T) => SortValue, dir: SortDir): T[] {
  return [...list].sort((x, y) => compareSortValues(key(x), key(y), dir));
}

/** 日期字串 → ms，給排序用；沒有值回 null。 */
export const ts = (v: string | null | undefined): number | null => {
  if (!v) return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : t;
};

export const ariaSort = (active: boolean, dir: SortDir) => (active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none');
