import { supabaseAdmin } from '@/lib/supabase/admin';
import { fmt, n } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { Section } from '@/components/Section';
import { EmptyState } from '@/components/EmptyState';
import { Table } from '@/components/Table';
import { ts } from '@/lib/sort';
import { unstable_cache } from 'next/cache';

export const dynamic = 'force-dynamic';

type Row = { cohort_week: string; cohort_size: number; week_offset: number; retained: number };

// v_retention_weekly 最重（全 users×logs cohort）。路由因 auth 是 dynamic，
// 故快取查詢本身 5 分鐘（DB 端另有 materialized view 兜底，見 App repo migration）。
const getRetention = unstable_cache(
  async () => supabaseAdmin.from('v_retention_weekly').select('*').order('cohort_week', { ascending: false }),
  ['admin-retention'],
  { revalidate: 300 },
);

export default async function RetentionPage() {
  const { data } = await getRetention();
  const rows = (data ?? []) as Row[];
  const cohorts = [...new Map(rows.map((r) => [r.cohort_week, r.cohort_size])).entries()];
  const maxOffset = Math.min(8, Math.max(0, ...rows.map((r) => n(r.week_offset))));
  const weeks = Array.from({ length: maxOffset + 1 }, (_, i) => i);
  const cell = (week: string, offset: number) => rows.find((r) => r.cohort_week === week && n(r.week_offset) === offset);
  const ratioOf = (size: number, c: Row) => (n(size) ? n(c.retained) / n(size) : 0);

  return (
    <>
      <PageHeader title="留存" subtitle="以註冊週分群，第 N 週仍有錄音的比例" />
      <Section
        title="週留存熱圖"
        subtitle="顏色越深留存越高；樣本少於 5 人的格子只供參考。點表頭可依註冊週、人數或任一週的留存率排序"
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
          <Table
            fullWidth={false}
            head={['註冊週', '人數', ...weeks.map((i) => `W${i}`)]}
            align={['left', 'right', ...weeks.map(() => 'center' as const)]}
            cellClass={['whitespace-nowrap py-1 pr-4 text-muted', 'py-1 pr-4', ...weeks.map(() => 'px-1 py-1')]}
            defaultSort={{ col: 0, dir: 'desc' }}
            rows={cohorts.map(([week, size]) => [
              String(week).slice(0, 10),
              fmt(size),
              ...weeks.map((i) => {
                const c = cell(week, i);
                if (!c) return <div key={i} className="mx-auto h-9 w-14 rounded-lg border border-dashed border-line/70" />;
                const ratio = ratioOf(size, c);
                const weak = n(size) < 5;
                return (
                  <div
                    key={i}
                    className={`mx-auto grid h-9 w-14 place-items-center rounded-lg text-xs font-medium tabular-nums ${weak ? 'opacity-60' : ''}`}
                    style={{ backgroundColor: `rgba(36, 94, 92, ${Math.min(0.9, ratio * 0.85 + 0.06)})`, color: ratio > 0.4 ? '#fff' : '#16232b' }}
                    title={`${fmt(c.retained)} / ${fmt(size)}${weak ? '（樣本少）' : ''}`}
                  >
                    {Math.round(ratio * 100)}%
                  </div>
                );
              }),
            ])}
            sortValues={cohorts.map(([week, size]) => [
              ts(String(week)),
              n(size),
              ...weeks.map((i) => {
                const c = cell(week, i);
                return c ? ratioOf(size, c) : null;
              }),
            ])}
          />
        )}
      </Section>
    </>
  );
}
