import { supabaseAdmin } from '@/lib/supabase/admin';
import { fmt, n, month } from '@/lib/format';
import { PageHeader, Chip } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { Section } from '@/components/Section';
import { Table } from '@/components/Table';
import { CostChart } from '@/components/charts/CostChart';
import { unstable_cache } from 'next/cache';
import { ts } from '@/lib/sort';

export const dynamic = 'force-dynamic';

// v_cost_estimate 聚合全 voice_logs。路由因 auth 是 dynamic，故快取查詢本身 5 分鐘。
const getCost = unstable_cache(
  async () => supabaseAdmin.from('v_cost_estimate').select('*').order('month', { ascending: true }),
  ['admin-cost'],
  { revalidate: 300 },
);

export default async function CostPage() {
  const { data } = await getCost();
  const rows = data ?? [];
  const total = rows.reduce((t, r) => t + n(r.usd_estimate), 0);
  const cur = rows[rows.length - 1] ?? {};
  const perRec = n(cur.recordings) ? n(cur.usd_estimate) / n(cur.recordings) : 0;

  return (
    <>
      <PageHeader title="成本" subtitle="OpenAI 轉錄＋整理的估算，依 analyze-voice 記錄的時長推算" right={<Chip>累計 US${fmt(total, 2)}</Chip>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="本月估算" value={`US$${fmt(cur.usd_estimate, 2)}`} hint={month(String(cur.month ?? ''))} />
        <StatCard label="本月錄音" value={fmt(cur.recordings)} hint={`${fmt(cur.minutes, 1)} 分鐘`} />
        <StatCard label="每筆平均" value={`US$${fmt(perRec, 3)}`} hint="含 STT 與 GPT 整理" />
      </div>
      <Section title="每月估算">
        <CostChart data={rows.map((r) => ({ month: month(String(r.month)), usd: n(r.usd_estimate), minutes: n(r.minutes) }))} />
      </Section>
      <Section title="明細">
        <Table
          head={['月份', '錄音數', '分鐘', '每筆平均', 'US$']}
          align={['left', 'right', 'right', 'right', 'right']}
          rows={[...rows].reverse().map((r) => [
            month(String(r.month)),
            fmt(r.recordings),
            fmt(r.minutes, 1),
            n(r.recordings) ? `US$${fmt(n(r.usd_estimate) / n(r.recordings), 3)}` : '—',
            <span key="u" className="font-medium">US${fmt(r.usd_estimate, 2)}</span>,
          ])}
          sortValues={[...rows].reverse().map((r) => [
            ts(String(r.month)),
            n(r.recordings),
            n(r.minutes),
            n(r.recordings) ? n(r.usd_estimate) / n(r.recordings) : null,
            n(r.usd_estimate),
          ])}
          defaultSort={{ col: 0, dir: 'desc' }}
        />
      </Section>
    </>
  );
}
