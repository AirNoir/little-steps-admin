import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fmt, n } from '@/lib/format';
import { ariaSort, sortBy, ts, type SortDir, type SortValue } from '@/lib/sort';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/Badge';
import { StatCard } from '@/components/StatCard';
import { Section } from '@/components/Section';
import { ConfirmButton } from '@/components/ConfirmButton';
import { SortIcon, sortTriggerClass } from '@/components/SortIcon';
import { setPro } from './actions';

export const dynamic = 'force-dynamic';

type Profile = {
  id: string;
  email: string | null;
  is_pro: boolean | null;
  subscription_id: string | null;
  subscription_expires_at: string | null;
  last_platform: string | null;
  last_device_model: string | null;
  last_os_version: string | null;
  last_app_version: string | null;
  last_seen_at: string | null;
};

const PLAN_LABEL: Record<string, string> = { pro_monthly: '月繳', pro_yearly: '年繳', admin_comp: '後台開通' };
const PLAN_RANK: Record<string, number> = { pro_yearly: 4, pro_monthly: 3, admin_comp: 2 };
const PLATFORM_LABEL: Record<string, string> = { ios: 'iOS', android: 'Android' };
const tw = (v: string | null | undefined) => (v ? new Date(v).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' }) : '—');
const twFull = (v: string) => new Date(v).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });
const ago = (v: string, now: number) => {
  const m = Math.max(0, Math.round((now - new Date(v).getTime()) / 60_000));
  if (m < 1) return '剛剛';
  if (m < 60) return `${m} 分鐘前`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} 小時前`;
  const d = Math.round(h / 24);
  return d <= 30 ? `${d} 天前` : tw(v);
};

type User = {
  id: string;
  email: string | null;
  anonymous: boolean;
  providers: string[];
  created: string;
  lastSignIn: string | null;
  kids: number;
  logs: number;
  isPro: boolean;
  plan: string | null;
  expires: string | null;
  platform: 'ios' | 'android' | null;
  model: string | null;
  osVersion: string | null;
  appVersion: string | null;
  lastSeen: string | null;
};

// 排序在伺服器端、對「篩選後的完整清單」做完才分頁，所以換頁不會打亂順序。
// dir：第一次點該欄時的方向（文字升冪、數字與日期降冪）。null／空值永遠排最後。
const SORTS = {
  email: { dir: 'asc', value: (u) => (u.anonymous ? null : u.email) },
  created: { dir: 'desc', value: (u) => ts(u.created) },
  provider: { dir: 'asc', value: (u) => (u.anonymous ? '匿名' : u.providers.join(',') || null) },
  device: { dir: 'asc', value: (u) => u.model ?? (u.platform ? PLATFORM_LABEL[u.platform] : null) },
  lastSignIn: { dir: 'desc', value: (u) => ts(u.lastSignIn) },
  lastSeen: { dir: 'desc', value: (u) => ts(u.lastSeen) },
  kids: { dir: 'desc', value: (u) => u.kids },
  logs: { dir: 'desc', value: (u) => u.logs },
  plan: { dir: 'desc', value: (u) => (u.isPro ? (PLAN_RANK[u.plan ?? ''] ?? 1) : u.anonymous ? -1 : 0) },
  expires: { dir: 'asc', value: (u) => ts(u.expires) },
} satisfies Record<string, { dir: SortDir; value: (u: User) => SortValue }>;
type SortKey = keyof typeof SORTS;
const DEFAULT_SORT: SortKey = 'lastSignIn';
const DEFAULT_DIR: SortDir = 'desc';

const OS_FILTERS = [
  { key: 'all', label: '全部裝置' },
  { key: 'ios', label: 'iOS' },
  { key: 'android', label: 'Android' },
  { key: 'unknown', label: '未回報' },
] as const;

export default async function UsersPage({ searchParams }: PageProps<'/admin/users'>) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '');
  const q = str(sp.q).trim().toLowerCase();
  const plan = str(sp.plan) || 'all';
  const os = OS_FILTERS.some((o) => o.key === str(sp.os)) ? str(sp.os) : 'all';
  const sort: SortKey = Object.hasOwn(SORTS, str(sp.sort)) ? (str(sp.sort) as SortKey) : DEFAULT_SORT;
  const dir: SortDir = sp.dir === 'asc' || sp.dir === 'desc' ? sp.dir : sort === DEFAULT_SORT ? DEFAULT_DIR : SORTS[sort].dir;

  // 逐人的錄音數／孩子數改由 DB view v_admin_users 在 SQL 端聚合，
  // 不再整表撈 voice_logs + children 回來用 JS 數——那是 Disk IO 與 1000 筆上限的來源。
  // last_* 裝置欄位由 App 1.3.0 起回報（App repo migration 20261001_profiles_device.sql），之前的人都是 null。
  const [{ data: authData }, { data: profiles }, { data: counts }] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    supabaseAdmin
      .from('profiles')
      .select('id,email,is_pro,subscription_id,subscription_expires_at,last_platform,last_device_model,last_os_version,last_app_version,last_seen_at'),
    supabaseAdmin.from('v_admin_users').select('id,recording_count,child_count'),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p as Profile]));
  const kidCount = new Map((counts ?? []).map((r) => [r.id as string, n(r.child_count)]));
  const logCount = new Map((counts ?? []).map((r) => [r.id as string, n(r.recording_count)]));

  const users: User[] = (authData?.users ?? [])
    .map((u) => {
      const p = profileById.get(u.id);
      const platform: User['platform'] = p?.last_platform === 'ios' || p?.last_platform === 'android' ? p.last_platform : null;
      return {
        id: u.id,
        email: u.email ?? p?.email ?? null,
        anonymous: !!u.is_anonymous,
        providers: ((u.app_metadata?.providers as string[] | undefined) ?? [u.app_metadata?.provider as string | undefined]).filter((p): p is string => !!p && p !== 'anonymous'),
        created: u.created_at,
        lastSignIn: u.last_sign_in_at ?? null,
        kids: kidCount.get(u.id) ?? 0,
        logs: logCount.get(u.id) ?? 0,
        isPro: !!p?.is_pro,
        plan: p?.subscription_id ?? null,
        expires: p?.subscription_expires_at ?? null,
        platform,
        model: p?.last_device_model || null,
        osVersion: p?.last_os_version || null,
        appVersion: p?.last_app_version || null,
        lastSeen: p?.last_seen_at ?? null,
      };
    })
    // 基準順序：註冊新→舊；後面的排序是穩定排序，同值時保留這個順序。
    .sort((a, b) => b.created.localeCompare(a.created));

  const now = Date.now();
  const month = now - 30 * 86400_000;
  const platformCount = {
    ios: users.filter((u) => u.platform === 'ios').length,
    android: users.filter((u) => u.platform === 'android').length,
  };
  const stats = {
    total: users.length,
    guests: users.filter((u) => u.anonymous).length,
    pro: users.filter((u) => u.isPro).length,
    active30: users.filter((u) => u.lastSignIn && new Date(u.lastSignIn).getTime() > month).length,
    reported: platformCount.ios + platformCount.android,
  };

  const filtered = users.filter((u) => {
    if (plan === 'pro' && !u.isPro) return false;
    if (plan === 'free' && (u.isPro || u.anonymous)) return false;
    if (plan === 'guest' && !u.anonymous) return false;
    if (os === 'ios' && u.platform !== 'ios') return false;
    if (os === 'android' && u.platform !== 'android') return false;
    if (os === 'unknown' && u.platform) return false;
    if (q && !(u.email ?? '').toLowerCase().includes(q) && !u.id.startsWith(q)) return false;
    return true;
  });
  const shown = sortBy(filtered, SORTS[sort].value, dir);

  // 分頁：搜尋/篩選/排序都在完整清單上做完，再切出當頁列。切換 tab/搜尋/排序會回到第 1 頁。
  const PAGE_SIZE = 50;
  const page = Math.max(1, Number(str(sp.page) || '1') || 1);
  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // 所有連結都從這裡組，保留目前的 plan／os／q／排序；預設值不寫進網址。沒指定 page 就回第 1 頁。
  const href = (over: { plan?: string; os?: string; sort?: SortKey; dir?: SortDir; page?: number }) => {
    const v = { plan, os, sort, dir, page: 1, ...over };
    const params = new URLSearchParams();
    if (v.plan !== 'all') params.set('plan', v.plan);
    if (v.os !== 'all') params.set('os', v.os);
    if (q) params.set('q', q);
    if (v.sort !== DEFAULT_SORT || v.dir !== DEFAULT_DIR) {
      params.set('sort', v.sort);
      params.set('dir', v.dir);
    }
    if (v.page > 1) params.set('page', String(v.page));
    const s = params.toString();
    return `/admin/users${s ? `?${s}` : ''}`;
  };

  const tab = (key: string, label: string) => (
    <Link
      key={key}
      href={href({ plan: key })}
      aria-current={plan === key ? 'page' : undefined}
      className={`rounded-full px-3 py-1 text-xs font-medium transition ${plan === key ? 'bg-primary text-white' : 'border border-line bg-surface text-muted hover:text-ink'}`}
    >
      {label}
    </Link>
  );
  const osCount = (key: string) =>
    key === 'all' ? null : key === 'unknown' ? stats.total - stats.reported : platformCount[key as 'ios' | 'android'];

  // 表頭排序連結：點同一欄切換升降冪，點別欄用該欄的預設方向。
  const sortLink = (key: SortKey, label: string, align: 'left' | 'right' = 'left') => {
    const active = sort === key;
    const next: SortDir = active ? (dir === 'asc' ? 'desc' : 'asc') : SORTS[key].dir;
    return (
      <Link
        href={href({ sort: key, dir: next })}
        scroll={false}
        className={sortTriggerClass(active, align)}
        title={`依「${label}」${next === 'asc' ? '升冪' : '降冪'}排序`}
      >
        <span>{label}</span>
        <SortIcon active={active} dir={dir} />
      </Link>
    );
  };
  // 一格表頭可以放兩個排序鍵（對應格子裡的第二行），減少欄數、避免表格在筆電上過寬
  const th = (keys: SortKey[], children: React.ReactNode, align: 'left' | 'right' = 'left') => (
    <th
      scope="col"
      aria-sort={keys.length ? ariaSort(keys.includes(sort), dir) : undefined}
      className={`label-caps whitespace-nowrap border-b border-line pb-2 pr-4 ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      {children}
    </th>
  );
  const sep = <span aria-hidden className="mx-1.5 text-line">/</span>;

  return (
    <>
      <PageHeader title="使用者" subtitle="帳號、登入方式、裝置、使用量與訂閱狀態；Pro 可在這裡手動開通或取消" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="使用者" value={fmt(stats.total)} hint={`訪客（匿名）${fmt(stats.guests)}`} />
        <StatCard label="30 日內登入" value={fmt(stats.active30)} />
        <StatCard label="Pro" value={fmt(stats.pro)} />
        <StatCard label="有錄音的帳號" value={fmt(users.filter((u) => u.logs > 0).length)} />
        <StatCard
          label="已回報裝置"
          value={fmt(stats.reported)}
          hint={`iOS ${fmt(platformCount.ios)}・Android ${fmt(platformCount.android)}${stats.reported === 0 ? '・App 1.3.0 起回報' : ''}`}
        />
      </div>

      <Section title="名單" subtitle="點表頭排序（預設依最近登入）。訂閱交易明細以 RevenueCat 後台為準（App User ID = 這裡的使用者 ID）">
        <form className="mb-4 flex flex-wrap items-center gap-2" action="/admin/users" method="get">
          {plan !== 'all' ? <input type="hidden" name="plan" value={plan} /> : null}
          {os !== 'all' ? <input type="hidden" name="os" value={os} /> : null}
          {sort !== DEFAULT_SORT || dir !== DEFAULT_DIR ? (
            <>
              <input type="hidden" name="sort" value={sort} />
              <input type="hidden" name="dir" value={dir} />
            </>
          ) : null}
          <input
            name="q"
            defaultValue={q}
            placeholder="搜尋 Email 或使用者 ID"
            className="w-64 rounded-xl border border-line bg-bg/60 px-3 py-1.5 text-sm outline-none transition focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/15"
          />
          <button className="rounded-xl border border-line bg-surface px-3 py-1.5 text-sm hover:bg-bg" type="submit">搜尋</button>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="flex gap-1">{tab('all', '全部')}{tab('pro', 'Pro')}{tab('free', '免費')}{tab('guest', '訪客')}</div>
            <div className="flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5" role="group" aria-label="裝置平台">
              {OS_FILTERS.map((o) => {
                const c = osCount(o.key);
                return (
                  <Link
                    key={o.key}
                    href={href({ os: o.key })}
                    aria-current={os === o.key ? 'page' : undefined}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${os === o.key ? 'bg-primary-soft text-primary' : 'text-muted hover:text-ink'}`}
                  >
                    {o.label}
                    {c != null ? <span className="ml-1 tabular-nums opacity-60">{fmt(c)}</span> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        </form>

        {shown.length === 0 ? (
          <p className="text-sm text-muted">沒有符合的使用者</p>
        ) : (
          <>
          <div className="-mx-2 overflow-x-auto px-2">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {th(['email', 'created'], <>{sortLink('email', '使用者')}{sep}{sortLink('created', '註冊')}</>)}
                  {th(['provider'], sortLink('provider', '登入方式'))}
                  {th(['device'], sortLink('device', '裝置'))}
                  {th(['lastSignIn', 'lastSeen'], <>{sortLink('lastSignIn', '最近登入')}{sep}{sortLink('lastSeen', '上線')}</>)}
                  {th(['kids'], sortLink('kids', '孩子', 'right'), 'right')}
                  {th(['logs'], sortLink('logs', '錄音', 'right'), 'right')}
                  {th(['plan', 'expires'], <>{sortLink('plan', '方案')}{sep}{sortLink('expires', '到期')}</>)}
                  {th([], <span className="sr-only">操作</span>)}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((u) => (
                  <tr key={u.id} className="border-b border-line/60 transition-colors last:border-0 hover:bg-bg/60">
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-3">
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${u.anonymous ? 'bg-bg text-subtle' : 'bg-primary-soft text-primary'}`}>
                          {u.anonymous ? '訪' : (u.email ?? '?').slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="max-w-[220px] truncate" title={u.email ?? undefined}>{u.anonymous ? <span className="text-muted">訪客（匿名）</span> : u.email ?? '—'}</div>
                          <div className="whitespace-nowrap text-[11px] text-subtle">
                            <span className="font-mono" title={u.id}>{u.id.slice(0, 8)}</span>
                            <span className="mx-1">·</span>
                            <span title={twFull(u.created)}>註冊 {tw(u.created)}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex flex-wrap gap-1">{u.anonymous ? <Badge>匿名</Badge> : u.providers.length ? u.providers.map((p) => <Badge key={p} tone="info">{p}</Badge>) : <span className="text-subtle">—</span>}</div>
                    </td>
                    <td className="py-2.5 pr-4">
                      {u.platform || u.model ? (
                        <div className="min-w-[140px]">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <span>{u.model ?? (u.platform ? PLATFORM_LABEL[u.platform] : '—')}</span>
                            {u.platform ? (
                              <span className={`rounded px-1.5 py-px text-[10px] font-semibold tracking-wide ${u.platform === 'ios' ? 'bg-info-soft text-[#3a5a7a]' : 'bg-success-soft text-success'}`}>
                                {PLATFORM_LABEL[u.platform]}
                              </span>
                            ) : null}
                          </div>
                          <div className="whitespace-nowrap text-[11px] text-subtle">
                            {[u.osVersion ? `${u.platform ? PLATFORM_LABEL[u.platform] : 'OS'} ${u.osVersion}` : null, u.appVersion ? `App ${u.appVersion}` : null].filter(Boolean).join(' · ') || '—'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-subtle" title="App 1.3.0 起才會回報裝置">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 whitespace-nowrap">
                      <div title={u.lastSignIn ? twFull(u.lastSignIn) : undefined}>{u.lastSignIn ? tw(u.lastSignIn) : <span className="text-subtle">—</span>}</div>
                      {u.lastSeen ? (
                        <div className="text-[11px] text-subtle" title={twFull(u.lastSeen)}>上線 {ago(u.lastSeen, now)}</div>
                      ) : null}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{u.kids || <span className="text-subtle">0</span>}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{u.logs || <span className="text-subtle">0</span>}</td>
                    <td className="py-2.5 pr-4 whitespace-nowrap">
                      {u.isPro ? (
                        <Badge tone={u.plan === 'admin_comp' ? 'accent' : 'success'}>Pro・{PLAN_LABEL[u.plan ?? ''] ?? u.plan ?? '—'}</Badge>
                      ) : (
                        <span className="text-subtle">{u.anonymous ? '訪客' : '免費'}</span>
                      )}
                      {u.expires ? <div className="mt-0.5 text-[11px] text-subtle">到期 {tw(u.expires)}</div> : null}
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      {u.isPro ? (
                        <form action={setPro} className="inline">
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="value" value="false" />
                          <ConfirmButton message={`取消 ${u.email ?? u.id.slice(0, 8)} 的 Pro？`} className="rounded-full border border-danger/30 px-2.5 py-1 text-xs text-danger transition hover:bg-danger-soft">取消 Pro</ConfirmButton>
                        </form>
                      ) : (
                        <form action={setPro} className="inline">
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="value" value="true" />
                          <input type="hidden" name="months" value="1" />
                          <ConfirmButton message={`開通 ${u.email ?? u.id.slice(0, 8)} 的 Pro 一個月？`} className="rounded-full border border-primary/30 px-2.5 py-1 text-xs text-primary transition hover:bg-primary-soft">開通 Pro 1 個月</ConfirmButton>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3 text-sm">
              {page > 1 ? (
                <Link href={href({ page: page - 1 })} className="rounded-xl border border-line bg-surface px-3 py-1.5 hover:bg-bg">← 上一頁</Link>
              ) : (
                <span className="rounded-xl border border-line px-3 py-1.5 text-subtle opacity-50">← 上一頁</span>
              )}
              <span className="text-muted">第 {page} / {totalPages} 頁（共 {fmt(shown.length)} 筆）</span>
              {page < totalPages ? (
                <Link href={href({ page: page + 1 })} className="rounded-xl border border-line bg-surface px-3 py-1.5 hover:bg-bg">下一頁 →</Link>
              ) : (
                <span className="rounded-xl border border-line px-3 py-1.5 text-subtle opacity-50">下一頁 →</span>
              )}
            </div>
          )}
          </>
        )}
      </Section>
    </>
  );
}
