import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fmt, n } from '@/lib/format';
import { PageHeader, Chip } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { Section } from '@/components/Section';
import { Table } from '@/components/Table';
import { DailyChart } from '@/components/charts/DailyChart';

export const dynamic = 'force-dynamic';

// 「活躍」= 當天（台北時間）有開 App 或任何操作，一人一天算一次。
// 定義與資料來源在 App repo migration 20261006_user_active_days.sql：
// App 1.3.1 起開 App 會呼叫 mark_active()；之前的日子由錄音、事件、建孩子、里程碑等操作推導（只開沒操作的天數會漏）。
// 兩個 view 都是物化，每 30 分重算。
const getActivity = unstable_cache(
  async () =>
    Promise.all([
      supabaseAdmin.from('v_activity_daily').select('*').order('day', { ascending: true }),
      supabaseAdmin.from('v_activity_weekly').select('*').order('week', { ascending: true }),
      // 官網 /go/<管道> 追蹤連結（App repo migration 20261006_link_clicks.sql）
      supabaseAdmin.from('v_link_clicks_daily').select('*'),
    ]),
  ['admin-activity'],
  { revalidate: 300 },
);

type Counts = { signups: number; signups_guest: number; active_users: number; active_guest: number; recorders: number; recordings: number };
type Daily = Counts & { day: string };
type Weekly = Counts & { week: string; active_user_days: number };

const COUNT_KEYS = ['signups', 'signups_guest', 'active_users', 'active_guest', 'recorders', 'recordings'] as const;
const toCounts = (r: Record<string, unknown>): Counts =>
  Object.fromEntries(COUNT_KEYS.map((k) => [k, n(r[k])])) as Counts;

const md = (key: string) => `${Number(key.slice(5, 7))}/${Number(key.slice(8, 10))}`;
const wd = (key: string) => ['日', '一', '二', '三', '四', '五', '六'][new Date(`${key}T12:00:00Z`).getUTCDay()];
const addDays = (key: string, d: number) => new Date(new Date(`${key}T12:00:00Z`).getTime() + d * 86400_000).toISOString().slice(0, 10);
const delta = (cur: number, prev: number) => (prev === 0 ? (cur === 0 ? 0 : null) : Math.round(((cur - prev) / prev) * 100));
const activeAll = (r?: Counts) => (r ? r.active_users + r.active_guest : 0);
const signupAll = (r?: Counts) => (r ? r.signups + r.signups_guest : 0);

const both = (main: number, guest: number) => (
  <span className="whitespace-nowrap tabular-nums">
    {fmt(main)}
    <span className="ml-1.5 text-xs text-subtle">＋訪客 {fmt(guest)}</span>
  </span>
);

export default async function ActivityPage() {
  const [dailyRes, weeklyRes, clicksRes] = await getActivity();
  const daily: Daily[] = (dailyRes.data ?? []).map((r) => ({ day: String(r.day), ...toCounts(r) }));
  const weekly: Weekly[] = (weeklyRes.data ?? []).map((r) => ({ week: String(r.week), active_user_days: n(r.active_user_days), ...toCounts(r) }));

  const today = daily.at(-1);
  const last7 = daily.slice(-7);
  const prev7 = daily.slice(-14, -7);
  const sum = (rows: Daily[], f: (r: Daily) => number) => rows.reduce((t, r) => t + f(r), 0);
  const thisWeek = weekly.at(-1);
  const lastWeek = weekly.at(-2);
  const chartDays = daily.slice(-30);
  const weeksShown = [...weekly].slice(-12).reverse();

  // 各管道點擊：今天／近 7 天／近 30 天／全部（以 v_activity_daily 最後一天當「今天」，同為台北時間）
  const todayKey = today?.day ?? '';
  const since = (days: number) => (todayKey ? addDays(todayKey, -(days - 1)) : '');
  const clickRows = (clicksRes.data ?? []).map((r) => ({ day: String(r.day), slug: String(r.slug), clicks: n(r.clicks), ios: n(r.ios), android: n(r.android) }));
  const bySlug = new Map<string, { today: number; d7: number; d30: number; all: number; ios: number; android: number }>();
  for (const r of clickRows) {
    const cur = bySlug.get(r.slug) ?? { today: 0, d7: 0, d30: 0, all: 0, ios: 0, android: 0 };
    cur.all += r.clicks;
    cur.ios += r.ios;
    cur.android += r.android;
    if (r.day === todayKey) cur.today += r.clicks;
    if (r.day >= since(7)) cur.d7 += r.clicks;
    if (r.day >= since(30)) cur.d30 += r.clicks;
    bySlug.set(r.slug, cur);
  }
  const channels = [...bySlug.entries()].sort((a, b) => b[1].d30 - a[1].d30 || b[1].all - a[1].all);
  const updated = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <PageHeader
        title="註冊與活躍"
        subtitle="活躍 = 當天有開 App 或任何操作，一人一天算一次（台北時間）"
        right={<Chip>每 30 分重算・{updated}</Chip>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="今天活躍"
          value={fmt(activeAll(today))}
          hint={today ? `帳號 ${fmt(today.active_users)}・訪客 ${fmt(today.active_guest)}` : undefined}
          spark={daily.slice(-14).map((r) => activeAll(r))}
          accent="#e9a870"
        />
        <StatCard
          label="本週活躍（去重）"
          value={fmt(activeAll(thisWeek))}
          delta={{ pct: delta(activeAll(thisWeek), activeAll(lastWeek)), label: '對上週・本週未過完' }}
          hint={thisWeek ? `${md(thisWeek.week)} 起` : undefined}
        />
        <StatCard
          label="近 7 日新註冊"
          value={fmt(sum(last7, signupAll))}
          delta={{ pct: delta(sum(last7, signupAll), sum(prev7, signupAll)), label: 'vs 前 7 日' }}
          hint={`帳號 ${fmt(sum(last7, (r) => r.signups))}・訪客 ${fmt(sum(last7, (r) => r.signups_guest))}`}
          spark={daily.slice(-14).map(signupAll)}
        />
        <StatCard
          label="近 7 日每天平均活躍"
          value={fmt(sum(last7, activeAll) / Math.max(1, last7.length), 1)}
          delta={{ pct: delta(sum(last7, activeAll), sum(prev7, activeAll)), label: 'vs 前 7 日' }}
          hint={`其中有錄音 ${fmt(sum(last7, (r) => r.recorders) / Math.max(1, last7.length), 1)} 人/天`}
        />
      </div>

      <Section title="近 30 天" subtitle="新註冊與活躍都含訪客；有錄音 = 當天至少錄一則的人數">
        <DailyChart
          data={chartDays.map((r) => ({ day: md(r.day), active: activeAll(r), signups: signupAll(r), recorders: r.recorders }))}
          series={[
            { key: 'active', name: '活躍', color: '#e9a870' },
            { key: 'signups', name: '新註冊', color: '#8fb0ab' },
            { key: 'recorders', name: '有錄音', color: '#245e5c' },
          ]}
        />
      </Section>

      <Section title="每週" subtitle="最近 12 週，週一到週日；活躍人數是該週去重，不是每天相加。人均天數 = 這週每位活躍者平均來了幾天">
        <Table
          head={['週', '新註冊', '活躍人數', '人均活躍天數', '有錄音的人', '錄音數']}
          align={['left', 'right', 'right', 'right', 'right', 'right']}
          rows={weeksShown.map((r) => [
            <span key="w" className="whitespace-nowrap">{md(r.week)}–{md(addDays(r.week, 6))}</span>,
            both(r.signups, r.signups_guest),
            both(r.active_users, r.active_guest),
            activeAll(r) ? fmt(r.active_user_days / activeAll(r), 1) : '—',
            fmt(r.recorders),
            fmt(r.recordings),
          ])}
          sortValues={weeksShown.map((r) => [
            r.week, signupAll(r), activeAll(r), activeAll(r) ? r.active_user_days / activeAll(r) : null, r.recorders, r.recordings,
          ])}
          empty="還沒有資料"
        />
      </Section>

      <Section
        title="各管道點擊"
        subtitle="官網追蹤連結 littlestep.me/go/<管道> 的點擊數（連結預覽爬蟲不算）。只算點擊，不代表一定有下載"
      >
        <Table
          head={['管道', '連結', '今天', '近 7 天', '近 30 天', '全部', 'iPhone／Android']}
          align={['left', 'left', 'right', 'right', 'right', 'right', 'right']}
          rows={channels.map(([slug, v]) => [
            <span key="s" className="font-medium">{slug}</span>,
            <span key="u" className="font-mono text-xs text-muted">littlestep.me/go/{slug}</span>,
            fmt(v.today),
            fmt(v.d7),
            fmt(v.d30),
            fmt(v.all),
            <span key="p" className="whitespace-nowrap text-xs text-muted">{fmt(v.ios)}／{fmt(v.android)}</span>,
          ])}
          sortValues={channels.map(([slug, v]) => [slug, slug, v.today, v.d7, v.d30, v.all, v.ios])}
          empty="還沒有人點過追蹤連結"
        />
      </Section>

      <Section title="每日" subtitle="最近 30 天，新的在上">
        <Table
          head={['日期', '新註冊', '活躍人數', '有錄音的人', '錄音數']}
          align={['left', 'right', 'right', 'right', 'right']}
          rows={[...chartDays].reverse().map((r) => [
            <span key="d" className="whitespace-nowrap">{md(r.day)}<span className="ml-1 text-xs text-subtle">（{wd(r.day)}）</span></span>,
            both(r.signups, r.signups_guest),
            both(r.active_users, r.active_guest),
            fmt(r.recorders),
            fmt(r.recordings),
          ])}
          sortValues={[...chartDays].reverse().map((r) => [r.day, signupAll(r), activeAll(r), r.recorders, r.recordings])}
          empty="還沒有資料"
        />
        <p className="mt-3 text-xs text-subtle">
          App 1.3.1 之前沒有「開 App」紀錄，那段時間只算得到有操作的日子（錄音、建孩子、里程碑、看付費牆等），只打開沒操作的天數會漏算。
        </p>
      </Section>
    </>
  );
}
