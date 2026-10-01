import { supabaseAdmin } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/PageHeader';
import { Section } from '@/components/Section';
import { StatCard } from '@/components/StatCard';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { setFeedbackStatus, setFeedbackNote } from './actions';
import { ArrowDownUp } from 'lucide-react';
import { compareSortValues, sortBy, ts, type SortDir, type SortValue } from '@/lib/sort';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  user_id: string | null;
  message: string;
  contact_email: string | null;
  app_version: string | null;
  os_version: string | null;
  is_pro: boolean | null;
  status: 'new' | 'in_progress' | 'done';
  admin_note: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  new: '待處理',
  in_progress: '處理中',
  done: '已完成',
};
const STATUS_RANK: Record<string, number> = { new: 0, in_progress: 1, done: 2 };

// 回饋是卡片不是表格，用「排序」切換代替點表頭。都在撈回來的 ≤200 筆上排；同值再依時間新→舊。
const SORTS: { key: string; label: string; dir: SortDir; value: (r: Row) => SortValue }[] = [
  { key: 'newest', label: '最新', dir: 'desc', value: (r) => ts(r.created_at) },
  { key: 'oldest', label: '最舊', dir: 'asc', value: (r) => ts(r.created_at) },
  { key: 'status', label: '狀態', dir: 'asc', value: (r) => STATUS_RANK[r.status] ?? null },
  { key: 'pro', label: 'Pro 優先', dir: 'desc', value: (r) => (r.is_pro ? 1 : 0) },
  { key: 'contact', label: '可回覆優先', dir: 'desc', value: (r) => (r.contact_email ? 1 : 0) },
  { key: 'version', label: 'App 版本', dir: 'desc', value: (r) => r.app_version },
];

const STATUS_TONE: Record<string, 'danger' | 'accent' | 'success'> = {
  new: 'danger',
  in_progress: 'accent',
  done: 'success',
};

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; sort?: string }>;
}) {
  const { status: filter = 'open', sort: sortParam } = await searchParams;
  const sortKey = SORTS.some((o) => o.key === sortParam) ? (sortParam as string) : 'newest';

  let query = supabaseAdmin
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (filter === 'open') query = query.neq('status', 'done');
  else if (filter !== 'all') query = query.eq('status', filter);

  const { data, error } = await query;
  const sortDef = SORTS.find((o) => o.key === sortKey)!;
  const byTime = sortBy((data ?? []) as Row[], (r) => ts(r.created_at), 'desc');
  const rows = [...byTime].sort((a, b) => compareSortValues(sortDef.value(a), sortDef.value(b), sortDef.dir));
  const href = (status: string, sort: string) => `/admin/feedback?status=${status}${sort !== 'newest' ? `&sort=${sort}` : ''}`;

  // 表還沒建立時給可操作的訊息，而不是一個空白頁
  if (error) {
    return (
      <>
        <PageHeader title="意見回饋" subtitle="App 內回報的問題" />
        <Section title="尚未啟用">
          <EmptyState text="feedback 資料表還沒建立。請在 Supabase SQL Editor 執行 supabase/migrations/20260917_feedback.sql" />
        </Section>
      </>
    );
  }

  const counts = {
    new: rows.filter((r) => r.status === 'new').length,
    in_progress: rows.filter((r) => r.status === 'in_progress').length,
  };
  const withContact = rows.filter((r) => r.contact_email).length;

  const tabs = [
    { key: 'open', label: '未完成' },
    { key: 'new', label: '待處理' },
    { key: 'in_progress', label: '處理中' },
    { key: 'done', label: '已完成' },
    { key: 'all', label: '全部' },
  ];

  return (
    <>
      <PageHeader title="意見回饋" subtitle="使用者從 App 內「回報問題」送出的訊息" />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatCard label="待處理" value={String(counts.new)} hint="還沒看過的" />
        <StatCard label="處理中" value={String(counts.in_progress)} hint="已經在處理" />
        <StatCard label="可回覆" value={String(withContact)} hint="有留聯絡信箱" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {tabs.map((t) => (
          <a
            key={t.key}
            href={href(t.key, sortKey)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
              filter === t.key
                ? 'border-primary bg-primary text-white'
                : 'border-line bg-surface text-muted hover:border-primary hover:text-primary'
            }`}
          >
            {t.label}
          </a>
        ))}
        <div className="ml-auto flex flex-wrap items-center gap-1 rounded-full border border-line bg-surface p-1" role="group" aria-label="排序">
          <span className="flex items-center gap-1 pl-2 pr-1 text-xs text-subtle"><ArrowDownUp size={12} />排序</span>
          {SORTS.map((o) => (
            <a
              key={o.key}
              href={href(filter, o.key)}
              aria-current={sortKey === o.key ? 'true' : undefined}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                sortKey === o.key ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-bg hover:text-ink'
              }`}
            >
              {o.label}
            </a>
          ))}
        </div>
      </div>

      <Section title={`${rows.length} 則回饋`} subtitle={sortKey === 'newest' ? '最新的在最上面' : `依「${sortDef.label}」排序，同值時新的在上面`}>
        {rows.length === 0 ? (
          <EmptyState text="沒有回饋。使用者從 App 設定頁的「回報問題」送出後會出現在這裡" />
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((r) => (
              <article key={r.id} className="card p-5">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                  {r.is_pro ? <Badge tone="accent">Pro</Badge> : null}
                  <span className="text-xs text-subtle tabular-nums">
                    {new Date(r.created_at).toLocaleString('zh-TW', {
                      timeZone: 'Asia/Taipei',
                      hour12: false,
                    })}
                  </span>
                  <span className="ml-auto text-xs text-subtle">
                    {r.app_version ?? '版本未知'} · {r.os_version ?? '系統未知'}
                  </span>
                </div>

                <p className="whitespace-pre-wrap text-ink leading-relaxed">{r.message}</p>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                  {r.contact_email ? (
                    <a
                      href={`mailto:${r.contact_email}?subject=${encodeURIComponent('回覆你的小步腳印回報')}`}
                      className="font-medium text-primary hover:underline"
                    >
                      回覆 {r.contact_email}
                    </a>
                  ) : (
                    <span className="text-subtle">沒有留聯絡方式</span>
                  )}
                  {r.user_id ? (
                    <a
                      href={`/admin/users?q=${r.user_id}`}
                      className="text-muted hover:text-primary hover:underline"
                    >
                      使用者 {r.user_id.slice(0, 8)}
                    </a>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                  {(['new', 'in_progress', 'done'] as const)
                    .filter((s) => s !== r.status)
                    .map((s) => (
                      <form action={setFeedbackStatus} key={s}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value={s} />
                        <button
                          type="submit"
                          className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:border-primary hover:text-primary"
                        >
                          標記為{STATUS_LABEL[s]}
                        </button>
                      </form>
                    ))}

                  <form action={setFeedbackNote} className="ml-auto flex items-center gap-2">
                    <input type="hidden" name="id" value={r.id} />
                    <input
                      name="note"
                      defaultValue={r.admin_note ?? ''}
                      placeholder="內部備註（使用者看不到）"
                      className="w-56 rounded-lg border border-line bg-cream px-3 py-1.5 text-xs text-ink placeholder:text-subtle focus:border-primary focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white transition hover:bg-primary-deep"
                    >
                      存備註
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
