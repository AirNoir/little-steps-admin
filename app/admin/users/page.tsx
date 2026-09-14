import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fmt } from '@/lib/format';
import { StatCard } from '@/components/StatCard';
import { Section } from '@/components/Section';
import { ConfirmButton } from '@/components/ConfirmButton';
import { setPro } from './actions';

export const dynamic = 'force-dynamic';

type Profile = { id: string; email: string | null; is_pro: boolean | null; subscription_id: string | null; subscription_expires_at: string | null };

const PLAN_LABEL: Record<string, string> = { pro_monthly: '月繳', pro_yearly: '年繳', admin_comp: '後台開通' };
const tw = (v: string | null | undefined) => (v ? new Date(v).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' }) : '—');

export default async function UsersPage({ searchParams }: PageProps<'/admin/users'>) {
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q.trim().toLowerCase() : '';
  const plan = typeof sp.plan === 'string' ? sp.plan : 'all';

  const [{ data: authData }, { data: profiles }, { data: kids }, { data: logs }] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    supabaseAdmin.from('profiles').select('id,email,is_pro,subscription_id,subscription_expires_at'),
    supabaseAdmin.from('children').select('user_id'),
    supabaseAdmin.from('voice_logs').select('user_id'),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p as Profile]));
  const count = (rows: { user_id: string | null }[] | null) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) if (r.user_id) m.set(r.user_id, (m.get(r.user_id) ?? 0) + 1);
    return m;
  };
  const kidCount = count(kids);
  const logCount = count(logs);

  const users = (authData?.users ?? [])
    .map((u) => {
      const p = profileById.get(u.id);
      return {
        id: u.id,
        email: u.email ?? p?.email ?? null,
        anonymous: !!u.is_anonymous,
        providers: (u.identities ?? []).map((i) => i.provider).filter((x) => x !== 'email' || !u.is_anonymous),
        created: u.created_at,
        lastSignIn: u.last_sign_in_at ?? null,
        kids: kidCount.get(u.id) ?? 0,
        logs: logCount.get(u.id) ?? 0,
        isPro: !!p?.is_pro,
        plan: p?.subscription_id ?? null,
        expires: p?.subscription_expires_at ?? null,
      };
    })
    .sort((a, b) => (b.lastSignIn ?? b.created).localeCompare(a.lastSignIn ?? a.created));

  const month = Date.now() - 30 * 86400_000;
  const stats = {
    total: users.length,
    guests: users.filter((u) => u.anonymous).length,
    pro: users.filter((u) => u.isPro).length,
    active30: users.filter((u) => u.lastSignIn && new Date(u.lastSignIn).getTime() > month).length,
  };

  const shown = users.filter((u) => {
    if (plan === 'pro' && !u.isPro) return false;
    if (plan === 'free' && (u.isPro || u.anonymous)) return false;
    if (plan === 'guest' && !u.anonymous) return false;
    if (q && !(u.email ?? '').toLowerCase().includes(q) && !u.id.startsWith(q)) return false;
    return true;
  });

  const tab = (key: string, label: string) => (
    <Link
      key={key}
      href={`/admin/users?plan=${key}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
      className={`rounded-full px-3 py-1 text-sm ${plan === key ? 'bg-primary text-white' : 'bg-bg text-muted hover:text-ink'}`}
    >
      {label}
    </Link>
  );

  return (
    <>
      <header>
        <h1 className="text-xl font-semibold">使用者</h1>
        <p className="text-sm text-muted">帳號、登入方式、使用量與訂閱狀態；Pro 可在這裡手動開通或取消</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="使用者" value={fmt(stats.total)} hint={`訪客（匿名）${fmt(stats.guests)}`} />
        <StatCard label="30 日內登入" value={fmt(stats.active30)} />
        <StatCard label="Pro" value={fmt(stats.pro)} />
        <StatCard label="有錄音的帳號" value={fmt(users.filter((u) => u.logs > 0).length)} />
      </div>

      <Section title="名單" subtitle="依最近登入排序。訂閱交易明細以 RevenueCat 後台為準（App User ID = 這裡的使用者 ID）">
        <form className="mb-4 flex flex-wrap items-center gap-2" action="/admin/users" method="get">
          <input type="hidden" name="plan" value={plan} />
          <input
            name="q"
            defaultValue={q}
            placeholder="搜尋 Email 或使用者 ID"
            className="w-64 rounded-lg border border-line px-3 py-1.5 text-sm outline-none focus:border-primary"
          />
          <button className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-bg" type="submit">搜尋</button>
          <div className="ml-auto flex gap-1">{tab('all', '全部')}{tab('pro', 'Pro')}{tab('free', '免費')}{tab('guest', '訪客')}</div>
        </form>

        {shown.length === 0 ? (
          <p className="text-sm text-muted">沒有符合的使用者</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  {['使用者', '登入方式', '註冊', '最近登入', '孩子', '錄音', '方案', '到期', ''].map((h) => (
                    <th key={h} className="py-2 pr-4 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((u) => (
                  <tr key={u.id} className="border-b border-line/60 last:border-0">
                    <td className="py-2 pr-4">
                      <div>{u.anonymous ? <span className="text-muted">訪客（匿名）</span> : u.email ?? '—'}</div>
                      <div className="font-mono text-[11px] text-muted" title={u.id}>{u.id.slice(0, 8)}</div>
                    </td>
                    <td className="py-2 pr-4">{u.anonymous ? '匿名' : u.providers.join(', ') || '—'}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{tw(u.created)}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{tw(u.lastSignIn)}</td>
                    <td className="py-2 pr-4 tabular-nums">{u.kids}</td>
                    <td className="py-2 pr-4 tabular-nums">{u.logs}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {u.isPro ? (
                        <span className="rounded-full bg-accent/30 px-2 py-0.5 text-xs font-medium">Pro・{PLAN_LABEL[u.plan ?? ''] ?? u.plan ?? '—'}</span>
                      ) : (
                        <span className="text-muted">免費</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">{tw(u.expires)}</td>
                    <td className="py-2 text-right whitespace-nowrap">
                      {u.isPro ? (
                        <form action={setPro} className="inline">
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="value" value="false" />
                          <ConfirmButton message={`取消 ${u.email ?? u.id.slice(0, 8)} 的 Pro？`} className="text-xs text-danger hover:underline">取消 Pro</ConfirmButton>
                        </form>
                      ) : (
                        <form action={setPro} className="inline">
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="value" value="true" />
                          <input type="hidden" name="months" value="1" />
                          <ConfirmButton message={`開通 ${u.email ?? u.id.slice(0, 8)} 的 Pro 一個月？`} className="text-xs text-primary hover:underline">開通 Pro 1 個月</ConfirmButton>
                        </form>
                      )}
                    </td>
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
