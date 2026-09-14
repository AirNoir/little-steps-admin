import { supabaseAdmin } from '@/lib/supabase/admin';
import { fmt, n } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { Section } from '@/components/Section';
import { EmptyState } from '@/components/EmptyState';

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
      <PageHeader title="留存" subtitle="以註冊週分群，第 N 週仍有錄音的比例" />
      <Section
        title="週留存熱圖"
        subtitle="顏色越深留存越高；樣本少於 5 人的格子只供參考"
        right={
          <div className="flex items-center gap-2 text-xs text-muted">
            0%
            <span className="h-2 w-28 rounded-full" style={{ background: 'linear-gradient(90deg, rgba(36,94,92,.06), rgba(36,94,92,.9))' }} />
            100%
          </div>
        }
      >
        {cohorts.length === 0 ? (
          <EmptyState text="還沒有足夠資料" />
        ) : (
          <div className="overflow-x-auto">
            <table className="text-sm">
              <thead>
                <tr>
                  <th className="label-caps pb-2 pr-4 text-left">註冊週</th>
                  <th className="label-caps pb-2 pr-4 text-right">人數</th>
                  {Array.from({ length: maxOffset + 1 }, (_, i) => (
                    <th key={i} className="label-caps px-1 pb-2 text-center">W{i}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohorts.map(([week, size]) => (
                  <tr key={week}>
                    <td className="whitespace-nowrap py-1 pr-4 text-muted">{String(week).slice(0, 10)}</td>
                    <td className="py-1 pr-4 text-right tabular-nums">{fmt(size)}</td>
                    {Array.from({ length: maxOffset + 1 }, (_, i) => {
                      const c = cell(week, i);
                      if (!c) return <td key={i} className="px-1 py-1"><div className="h-9 w-14 rounded-lg border border-dashed border-line/70" /></td>;
                      const ratio = n(size) ? n(c.retained) / n(size) : 0;
                      const weak = n(size) < 5;
                      return (
                        <td key={i} className="px-1 py-1">
                          <div
                            className={`grid h-9 w-14 place-items-center rounded-lg text-xs font-medium tabular-nums ${weak ? 'opacity-60' : ''}`}
                            style={{ backgroundColor: `rgba(36, 94, 92, ${Math.min(0.9, ratio * 0.85 + 0.06)})`, color: ratio > 0.4 ? '#fff' : '#16232b' }}
                            title={`${fmt(c.retained)} / ${fmt(size)}${weak ? '（樣本少）' : ''}`}
                          >
                            {Math.round(ratio * 100)}%
                          </div>
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
