import { supabaseAdmin } from '@/lib/supabase/admin';
import { fmt, n } from '@/lib/format';
import { Section } from '@/components/Section';
import { Table } from '@/components/Table';

export const dynamic = 'force-dynamic';

const LABELS: Record<string, string> = {
  paywall_viewed: '看到付費牆',
  paywall_dismissed: '關掉付費牆',
  recording_truncated: '錄音達上限被截斷',
  report_shared: '分享回診摘要',
  data_exported: '匯出資料',
  invite_sent: '送出邀請',
  invite_redeemed: '兌換邀請',
  quota_blocked: '額度被擋（伺服器）',
  analyze_failed: '分析失敗（伺服器）',
};

export default async function EventsPage() {
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  const [daily, failures] = await Promise.all([
    supabaseAdmin.from('v_event_daily').select('*').gte('day', since.slice(0, 10)),
    supabaseAdmin
      .from('app_events')
      .select('name, props, created_at')
      .in('name', ['analyze_failed', 'quota_blocked'])
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const agg = new Map<string, { events: number; users: number }>();
  for (const r of daily.data ?? []) {
    const cur = agg.get(String(r.name)) ?? { events: 0, users: 0 };
    agg.set(String(r.name), { events: cur.events + n(r.events), users: Math.max(cur.users, n(r.users)) });
  }
  const rows = [...agg.entries()].sort((a, b) => b[1].events - a[1].events);

  return (
    <>
      <header>
        <h1 className="text-xl font-semibold">事件</h1>
        <p className="text-sm text-muted">App 與伺服器記錄的行為事件，近 30 天</p>
      </header>
      <Section title="事件總覽" subtitle="使用者數為單日最高（去重）">
        <Table
          head={['事件', '次數', '使用者（單日最高）']}
          rows={rows.map(([name, v]) => [LABELS[name] ?? name, fmt(v.events), fmt(v.users)])}
          empty="近 30 天沒有事件"
        />
      </Section>
      <Section title="最近的失敗與攔截" subtitle="analyze_failed / quota_blocked，最新 50 筆">
        <Table
          head={['時間', '事件', '細節']}
          rows={(failures.data ?? []).map((r) => [
            new Date(String(r.created_at)).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }),
            LABELS[String(r.name)] ?? String(r.name),
            r.props ? JSON.stringify(r.props).slice(0, 120) : '',
          ])}
          empty="沒有失敗紀錄"
        />
      </Section>
    </>
  );
}
