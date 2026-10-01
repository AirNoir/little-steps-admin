import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fmt, n } from '@/lib/format';
import { PageHeader, Chip } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { Section } from '@/components/Section';
import { Table } from '@/components/Table';
import { Badge } from '@/components/Badge';
import { ts } from '@/lib/sort';

export const dynamic = 'force-dynamic';

const TYPE: Record<string, { label: string; tone: 'success' | 'primary' | 'danger' | 'neutral' | 'accent' | 'info' }> = {
  INITIAL_PURCHASE: { label: '首購', tone: 'success' },
  RENEWAL: { label: '續訂', tone: 'primary' },
  NON_RENEWING_PURCHASE: { label: '一次性購買', tone: 'success' },
  PRODUCT_CHANGE: { label: '換方案', tone: 'info' },
  UNCANCELLATION: { label: '恢復續訂', tone: 'primary' },
  CANCELLATION: { label: '取消續訂', tone: 'danger' },
  EXPIRATION: { label: '到期', tone: 'neutral' },
  BILLING_ISSUE: { label: '扣款失敗', tone: 'danger' },
  SUBSCRIPTION_PAUSED: { label: '暫停', tone: 'accent' },
  TRANSFER: { label: '轉移', tone: 'info' },
  SUBSCRIBER_ALIAS: { label: '別名', tone: 'neutral' },
};
const PLAN: Record<string, string> = { pro_monthly: '月繳', pro_yearly: '年繳', admin_comp: '後台開通' };
const tw = (v: string | null | undefined) => (v ? new Date(v).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');

export default async function SubscriptionsPage({ searchParams }: PageProps<'/admin/subscriptions'>) {
  const sp = await searchParams;
  const env = sp.env === 'all' ? 'all' : 'production';
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  const [{ data: pros }, { data: events }] = await Promise.all([
    supabaseAdmin.from('profiles').select('id,email,is_pro,subscription_id,subscription_expires_at,updated_at').eq('is_pro', true).order('subscription_expires_at', { ascending: true }),
    supabaseAdmin.from('subscription_events').select('*').order('created_at', { ascending: false }).limit(300),
  ]);
  // 只撈事件涉及的使用者 email（≤300 筆），不再整表掃 profiles。
  const eventUserIds = [...new Set((events ?? []).map((e) => e.user_id).filter(Boolean) as string[])];
  const { data: emailRows } = eventUserIds.length
    ? await supabaseAdmin.from('profiles').select('id,email').in('id', eventUserIds)
    : { data: [] as { id: string; email: string | null }[] };
  const emailOf = new Map((emailRows ?? []).map((p) => [p.id, p.email as string | null]));
  const all = events ?? [];
  const shown = all.filter((e) => env === 'all' || (e.environment ?? 'PRODUCTION') !== 'SANDBOX');
  const prod = all.filter((e) => (e.environment ?? 'PRODUCTION') !== 'SANDBOX');
  const thisMonth = prod.filter((e) => new Date(String(e.created_at)) >= monthStart);
  const count = (types: string[]) => thisMonth.filter((e) => types.includes(String(e.type))).length;
  const revenue = thisMonth.filter((e) => ['INITIAL_PURCHASE', 'RENEWAL', 'NON_RENEWING_PURCHASE'].includes(String(e.type))).reduce((t, e) => t + n(e.price_usd), 0);

  return (
    <>
      <PageHeader
        title="訂閱"
        subtitle="目前 Pro 名單與 RevenueCat 事件流水（首購／續訂／取消／到期）"
        right={
          <div className="flex gap-1">
            <Link href="/admin/subscriptions" className={`rounded-full px-3 py-1 text-xs ${env === 'production' ? 'bg-primary text-white' : 'border border-line bg-surface text-muted'}`}>正式</Link>
            <Link href="/admin/subscriptions?env=all" className={`rounded-full px-3 py-1 text-xs ${env === 'all' ? 'bg-primary text-white' : 'border border-line bg-surface text-muted'}`}>含沙盒</Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="目前 Pro" value={fmt((pros ?? []).length)} hint={`月繳 ${(pros ?? []).filter((p) => p.subscription_id === 'pro_monthly').length}・年繳 ${(pros ?? []).filter((p) => p.subscription_id === 'pro_yearly').length}・後台開通 ${(pros ?? []).filter((p) => p.subscription_id === 'admin_comp').length}`} />
        <StatCard label="本月首購" value={fmt(count(['INITIAL_PURCHASE', 'NON_RENEWING_PURCHASE']))} hint="正式環境" />
        <StatCard label="本月續訂" value={fmt(count(['RENEWAL']))} hint={`取消 ${count(['CANCELLATION'])}・到期 ${count(['EXPIRATION'])}・扣款失敗 ${count(['BILLING_ISSUE'])}`} />
        <StatCard label="本月營收" value={`US$${fmt(revenue, 2)}`} hint="RevenueCat 報價，首購＋續訂，未扣 Apple 分潤" />
      </div>

      <Section title="目前 Pro 名單" subtitle="依到期日排序；「後台開通」為手動補償，會被商店狀態覆寫">
        <Table
          head={['使用者', '方案', '到期', '最後更新']}
          rows={(pros ?? []).map((p) => [
            <div key="u"><div>{p.email ?? <span className="text-muted">（無 Email）</span>}</div><div className="font-mono text-[11px] text-subtle">{String(p.id).slice(0, 8)}</div></div>,
            <Badge key="p" tone={p.subscription_id === 'admin_comp' ? 'accent' : 'success'}>{PLAN[String(p.subscription_id)] ?? p.subscription_id ?? '—'}</Badge>,
            tw(p.subscription_expires_at),
            tw(p.updated_at),
          ])}
          sortValues={(pros ?? []).map((p) => [
            p.email ?? null,
            PLAN[String(p.subscription_id)] ?? p.subscription_id ?? null,
            ts(p.subscription_expires_at),
            ts(p.updated_at),
          ])}
          defaultSort={{ col: 2, dir: 'asc' }}
          empty="目前沒有 Pro 使用者"
        />
      </Section>

      <Section title="事件流水" subtitle={`最新 ${shown.length} 筆${env === 'production' ? '（已隱藏沙盒測試）' : ''}`} right={<Chip>webhook → subscription_events</Chip>}>
        <Table
          head={['時間', '事件', '使用者', '產品', '商店', '金額', '到期']}
          align={['left', 'left', 'left', 'left', 'left', 'right', 'left']}
          rows={shown.map((e) => {
            const t = TYPE[String(e.type)] ?? { label: String(e.type), tone: 'neutral' as const };
            const uid = e.user_id ? String(e.user_id) : null;
            return [
              <span key="t" className="whitespace-nowrap text-muted">{tw(String(e.created_at))}</span>,
              <span key="b" className="inline-flex items-center gap-1.5"><Badge tone={t.tone}>{t.label}</Badge>{e.environment === 'SANDBOX' ? <Badge tone="neutral">沙盒</Badge> : null}</span>,
              <div key="u">{uid ? (emailOf.get(uid) ?? <span className="text-muted">訪客</span>) : '—'}{uid ? <div className="font-mono text-[11px] text-subtle">{uid.slice(0, 8)}</div> : null}</div>,
              PLAN[String(e.product_id)] ?? e.product_id ?? '—',
              e.store ? String(e.store).replace('APP_STORE', 'App Store').replace('PLAY_STORE', 'Google Play') : '—',
              e.price_usd != null ? `US$${fmt(e.price_usd, 2)}${e.currency && e.currency !== 'USD' ? `（${e.currency} ${fmt(e.price_local, 0)}）` : ''}` : '—',
              e.expiration_at ? String(e.expiration_at).slice(0, 10) : '—',
            ];
          })}
          sortValues={shown.map((e) => {
            const uid = e.user_id ? String(e.user_id) : null;
            return [
              ts(String(e.created_at)),
              TYPE[String(e.type)]?.label ?? String(e.type),
              uid ? (emailOf.get(uid) ?? uid) : null,
              PLAN[String(e.product_id)] ?? e.product_id ?? null,
              e.store ?? null,
              e.price_usd != null ? n(e.price_usd) : null,
              ts(e.expiration_at ? String(e.expiration_at) : null),
            ];
          })}
          defaultSort={{ col: 0, dir: 'desc' }}
          empty="還沒有事件。webhook 從 2026-09-14 起開始寫入，之前的交易請看 RevenueCat 後台。"
        />
      </Section>
    </>
  );
}
