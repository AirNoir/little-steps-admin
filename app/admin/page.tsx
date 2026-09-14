import { supabaseAdmin } from '@/lib/supabase/admin';
import { fmt, n, day, pct } from '@/lib/format';
import { StatCard } from '@/components/StatCard';
import { Section } from '@/components/Section';
import { Table } from '@/components/Table';
import { DailyChart } from '@/components/charts/DailyChart';

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  const [active, subs, feature, daily, mix, cost] = await Promise.all([
    supabaseAdmin.from('v_active_summary').select('*').maybeSingle(),
    supabaseAdmin.from('v_subscription_summary').select('*').maybeSingle(),
    supabaseAdmin.from('v_feature_adoption').select('*').maybeSingle(),
    supabaseAdmin.from('v_daily_overview').select('*').order('day', { ascending: true }),
    supabaseAdmin.from('v_session_type_mix').select('*').order('recordings', { ascending: false }),
    supabaseAdmin.from('v_cost_estimate').select('*').order('month', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const a = active.data ?? {};
  const s = subs.data ?? {};
  const f = feature.data ?? {};
  const c = cost.data ?? {};
  const days = (daily.data ?? []).slice(-30);
  const last7 = days.slice(-7);
  const sum = (rows: Record<string, unknown>[], k: string) => rows.reduce((t, r) => t + n(r[k]), 0);

  return (
    <>
      <header>
        <h1 className="text-xl font-semibold">概況</h1>
        <p className="text-sm text-muted">{new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })} 更新</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="7 日活躍" value={fmt(a.active_7d)} hint={`30 日 ${fmt(a.active_30d)}・90 日 ${fmt(a.active_90d)}`} />
        <StatCard label="近 7 日錄音" value={fmt(sum(last7, 'recordings'))} hint={`30 日 ${fmt(a.recordings_30d)}・累計 ${fmt(a.recordings_total)}`} />
        <StatCard label="Pro 訂閱" value={fmt(s.pro_count)} hint={`${fmt(s.total_profiles)} 位使用者中 ${pct(s.pro_pct)}・年繳 ${fmt(s.yearly)}／月繳 ${fmt(s.monthly)}`} />
        <StatCard label="本月 OpenAI 成本" value={`US$${fmt(c.usd_estimate, 2)}`} hint={`${fmt(c.recordings)} 筆・${fmt(c.minutes, 1)} 分鐘`} />
      </div>

      <Section title="近 30 天" subtitle="新註冊、活躍使用者與錄音數（每日）">
        <DailyChart
          data={days.map((r) => ({
            day: day(String(r.day)),
            signups: n(r.signups),
            active_users: n(r.active_users),
            recordings: n(r.recordings),
          }))}
        />
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="功能採用" subtitle={`共 ${fmt(f.total_children)} 個孩子`}>
          <Table
            head={['功能', '數量']}
            rows={[
              ['有里程碑紀錄的孩子', fmt(f.children_with_milestone)],
              ['有回家練習的孩子', fmt(f.children_with_program)],
              ['練習打卡次數', fmt(f.programs_checked_in)],
              ['共同照顧者連結', fmt(f.caregiver_links)],
              ['邀請碼建立', fmt(f.caregiver_invites_created)],
              ['治療師連結', fmt(f.therapist_links)],
            ]}
          />
        </Section>
        <Section title="錄音類型" subtitle="日常觀察 vs 治療類">
          <Table
            head={['類型', '錄音', '使用者', '最近使用']}
            rows={(mix.data ?? []).map((r) => [
              String(r.session_type ?? '（未標記）'),
              fmt(r.recordings),
              fmt(r.users),
              r.last_used ? String(r.last_used).slice(0, 10) : '—',
            ])}
          />
        </Section>
      </div>
    </>
  );
}
