import { supabaseAdmin } from '@/lib/supabase/admin';
import { fmt, n, day } from '@/lib/format';
import { PageHeader, Chip } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { Section } from '@/components/Section';
import { Table } from '@/components/Table';
import { Badge } from '@/components/Badge';
import { DailyChart } from '@/components/charts/DailyChart';

export const dynamic = 'force-dynamic';

const delta = (cur: number, prev: number) => (prev === 0 ? (cur === 0 ? 0 : null) : Math.round(((cur - prev) / prev) * 100));

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
  const all = daily.data ?? [];
  const days = all.slice(-30);
  const sum = (rows: Record<string, unknown>[], k: string) => rows.reduce((t, r) => t + n(r[k]), 0);
  const series = (k: string) => all.slice(-14).map((r) => n(r[k]));
  const last7 = all.slice(-7);
  const prev7 = all.slice(-14, -7);
  const activeSet7 = sum(last7, 'active_users');
  const activePrev7 = sum(prev7, 'active_users');

  const updated = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <PageHeader title="概況" subtitle="產品健康度一眼看完：活躍、錄音、訂閱與成本" right={<Chip>更新於 {updated}</Chip>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="7 日活躍使用者"
          value={fmt(a.active_7d)}
          delta={{ pct: delta(activeSet7, activePrev7), label: 'vs 前 7 日' }}
          hint={`30 日 ${fmt(a.active_30d)}`}
          spark={series('active_users')}
          accent="#e9a870"
        />
        <StatCard
          label="近 7 日錄音"
          value={fmt(sum(last7, 'recordings'))}
          delta={{ pct: delta(sum(last7, 'recordings'), sum(prev7, 'recordings')), label: 'vs 前 7 日' }}
          hint={`累計 ${fmt(a.recordings_total)}`}
          spark={series('recordings')}
        />
        <StatCard
          label="近 7 日新註冊"
          value={fmt(sum(last7, 'signups'))}
          delta={{ pct: delta(sum(last7, 'signups'), sum(prev7, 'signups')), label: 'vs 前 7 日' }}
          hint={`其中訪客 ${fmt(sum(last7, 'signups_guest'))}`}
          spark={series('signups')}
          accent="#8fb0ab"
        />
        <StatCard
          label="Pro 訂閱"
          value={fmt(s.pro_count)}
          hint={`${fmt(s.total_profiles)} 位中 ${fmt(s.pro_pct, 1)}%・年繳 ${fmt(s.yearly)}／月繳 ${fmt(s.monthly)}・本月成本 US$${fmt(c.usd_estimate, 2)}`}
        />
      </div>

      <Section title="近 30 天走勢" subtitle="新註冊、活躍使用者與錄音數（每日）">
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
            align={['left', 'right']}
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
            align={['left', 'right', 'right', 'right']}
            rows={(mix.data ?? []).map((r) => [
              <Badge key="t" tone={r.session_type ? 'primary' : 'neutral'}>{String(r.session_type ?? '未標記')}</Badge>,
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
