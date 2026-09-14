import { supabaseAdmin } from '@/lib/supabase/admin';
import { fmt, n } from '@/lib/format';
import { Section } from '@/components/Section';

export const dynamic = 'force-dynamic';

type Row = { cohort_week: string; cohort_size: number; week_offset: number; retained: number };

export default async function RetentionPage() {
  const { data } = await supabaseAdmin.from('v_retention_weekly').select('*').order('cohort_week', { ascending: false });
  const rows = (data ?? []) as Row[];
  const cohorts = [...new Map(rows.map((r) => [r.cohort_week, r.cohort_size])).entries()];
  const maxOffset = Math.min(8, Math.max(0, ...rows.map((r) => n(r.week_offset))));
  const cell = (week: string, offset: number) => rows.find((r) => r.cohort_week === week && n(r.week_offset) === offset);

  return (
    <>
      <header>
        <h1 className="text-xl font-semibold">留存</h1>
        <p className="text-sm text-muted">以註冊週分群，第 N 週仍有錄音的比例</p>
      </header>
      <Section title="週留存" subtitle="顏色越深留存越高；樣本少於 5 人的格子只供參考">
        {cohorts.length === 0 ? (
          <p className="text-sm text-muted">還沒有足夠資料</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="py-2 pr-4 font-medium">註冊週</th>
                  <th className="py-2 pr-4 font-medium">人數</th>
                  {Array.from({ length: maxOffset + 1 }, (_, i) => (
                    <th key={i} className="px-2 py-2 text-center font-medium">W{i}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohorts.map(([week, size]) => (
                  <tr key={week} className="border-t border-line/60">
                    <td className="whitespace-nowrap py-2 pr-4">{String(week).slice(0, 10)}</td>
                    <td className="py-2 pr-4 tabular-nums">{fmt(size)}</td>
                    {Array.from({ length: maxOffset + 1 }, (_, i) => {
                      const c = cell(week, i);
                      if (!c) return <td key={i} className="px-2 py-2 text-center text-muted">—</td>;
                      const ratio = n(size) ? n(c.retained) / n(size) : 0;
                      return (
                        <td
                          key={i}
                          className="px-2 py-2 text-center tabular-nums"
                          style={{ backgroundColor: `rgba(44, 95, 93, ${Math.min(0.85, ratio * 0.9 + 0.05)})`, color: ratio > 0.45 ? '#fff' : '#1a2332' }}
                          title={`${fmt(c.retained)} / ${fmt(size)}`}
                        >
                          {Math.round(ratio * 100)}%
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}
