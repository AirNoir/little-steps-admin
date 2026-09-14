import { supabaseAdmin } from '@/lib/supabase/admin';
import { fmt, n, month } from '@/lib/format';
import { Section } from '@/components/Section';
import { Table } from '@/components/Table';
import { CostChart } from '@/components/charts/CostChart';

export const dynamic = 'force-dynamic';

export default async function CostPage() {
  const { data } = await supabaseAdmin.from('v_cost_estimate').select('*').order('month', { ascending: true });
  const rows = data ?? [];
  const total = rows.reduce((t, r) => t + n(r.usd_estimate), 0);

  return (
    <>
      <header>
        <h1 className="text-xl font-semibold">成本</h1>
        <p className="text-sm text-muted">OpenAI 轉錄＋整理的估算（依 analyze-voice 記錄的時長推算），累計 US${fmt(total, 2)}</p>
      </header>
      <Section title="每月估算">
        <CostChart data={rows.map((r) => ({ month: month(String(r.month)), usd: n(r.usd_estimate), minutes: n(r.minutes) }))} />
      </Section>
      <Section title="明細">
        <Table
          head={['月份', '錄音數', '分鐘', '每筆平均', 'US$']}
          rows={[...rows].reverse().map((r) => [
            month(String(r.month)),
            fmt(r.recordings),
            fmt(r.minutes, 1),
            n(r.recordings) ? `US$${fmt(n(r.usd_estimate) / n(r.recordings), 3)}` : '—',
            `US$${fmt(r.usd_estimate, 2)}`,
          ])}
        />
      </Section>
    </>
  );
}
