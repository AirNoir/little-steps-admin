import { EmptyState } from './EmptyState';

export function Table({ head, rows, empty = '沒有資料', align = [] }: {
  head: string[]; rows: React.ReactNode[][]; empty?: string; align?: ('left' | 'right')[];
}) {
  if (rows.length === 0) return <EmptyState text={empty} />;
  return (
    <div className="-mx-2 overflow-x-auto px-2">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={h + i} className={`label-caps border-b border-line pb-2 pr-4 ${align[i] === 'right' ? 'text-right' : 'text-left'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line/60 transition-colors last:border-0 hover:bg-bg/60">
              {r.map((c, j) => (
                <td key={j} className={`py-2.5 pr-4 align-middle ${align[j] === 'right' ? 'text-right tabular-nums' : ''}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
