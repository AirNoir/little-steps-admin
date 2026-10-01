'use client';

import { useMemo, useState } from 'react';
import { EmptyState } from './EmptyState';
import { SortIcon, sortTriggerClass } from './SortIcon';
import { ariaSort, compareSortValues, type SortDir, type SortValue } from '@/lib/sort';

type Align = 'left' | 'right' | 'center';

/**
 * 通用表格（client component，排序在瀏覽器做；資料仍由 server component 讀好再傳進來）。
 * - rows：伺服器渲染好的格子（ReactNode）。
 * - sortValues：與 rows 同形狀的排序值；某欄全是 undefined 就不可排序（例如操作按鈕）。
 *   比的是這裡的原始值（日期給 ms、數字給 number），不是畫面上的文字。null／空值永遠排最後。
 * - defaultSort：初始排序（不給就維持伺服器給的順序）。
 */
export function Table({
  head,
  rows,
  sortValues,
  defaultSort,
  empty = '沒有資料',
  align = [],
  cellClass = [],
  fullWidth = true,
}: {
  head: string[];
  rows: React.ReactNode[][];
  sortValues?: (SortValue | undefined)[][];
  defaultSort?: { col: number; dir: SortDir };
  empty?: string;
  align?: Align[];
  /** 個別欄位覆寫 td 的 padding（例如熱圖格子）。 */
  cellClass?: (string | undefined)[];
  fullWidth?: boolean;
}) {
  const [sort, setSort] = useState<{ col: number; dir: SortDir } | null>(defaultSort ?? null);

  const sortable = useMemo(() => head.map((_, j) => !!sortValues && sortValues.some((r) => r[j] !== undefined)), [head, sortValues]);
  // 第一次點：數字／日期欄先降冪（大的、新的在上面），文字欄先升冪
  const numeric = useMemo(() => head.map((_, j) => !!sortValues && sortValues.some((r) => typeof r[j] === 'number')), [head, sortValues]);

  const order = useMemo(() => {
    const idx = rows.map((_, i) => i);
    if (!sort || !sortValues) return idx;
    return idx.sort((a, b) => compareSortValues(sortValues[a]?.[sort.col], sortValues[b]?.[sort.col], sort.dir));
  }, [rows, sort, sortValues]);

  if (rows.length === 0) return <EmptyState text={empty} />;

  const onSort = (j: number) =>
    setSort((s) => (s && s.col === j ? { col: j, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col: j, dir: numeric[j] ? 'desc' : 'asc' }));

  const alignClass = (a: Align | undefined) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');

  return (
    <div className="-mx-2 overflow-x-auto px-2">
      <table className={`${fullWidth ? 'w-full' : ''} text-sm`}>
        <thead>
          <tr>
            {head.map((h, j) => {
              const active = sort?.col === j;
              return (
                <th
                  key={h + j}
                  scope="col"
                  aria-sort={sortable[j] ? ariaSort(active, sort?.dir ?? 'asc') : undefined}
                  className={`label-caps whitespace-nowrap border-b border-line pb-2 pr-4 ${alignClass(align[j])}`}
                >
                  {sortable[j] ? (
                    <button type="button" onClick={() => onSort(j)} className={sortTriggerClass(active, align[j])} title={`依「${h}」排序`}>
                      <span>{h}</span>
                      <SortIcon active={active} dir={sort?.dir ?? 'asc'} />
                    </button>
                  ) : (
                    h
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {order.map((i) => (
            <tr key={i} className="border-b border-line/60 transition-colors last:border-0 hover:bg-bg/60">
              {rows[i].map((c, j) => (
                <td
                  key={j}
                  className={`${cellClass[j] ?? 'py-2.5 pr-4'} align-middle ${align[j] === 'right' ? 'text-right tabular-nums' : align[j] === 'center' ? 'text-center' : ''}`}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
