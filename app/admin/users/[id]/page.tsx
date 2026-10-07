import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft, Baby, Bell, CheckCircle2, Circle, ClipboardCheck, CreditCard, Flag, Mic, MessageSquare,
  NotebookPen, Pill, Share2, Target, UserPlus, Users, XCircle,
} from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fmt } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { Section } from '@/components/Section';
import { StatCard } from '@/components/StatCard';
import { Badge } from '@/components/Badge';

export const dynamic = 'force-dynamic';

// 單一使用者的旅程：註冊 → 建孩子 → 紀錄 → 隔天以後又回來記。目的是看「卡在哪一步、哪天之後就沒再用」。
// 刻意不顯示錄音內容（raw_text／摘要）與孩子姓名：判斷流失只需要時間與種類，不需要讀家長寫了什麼。

const TZ = 'Asia/Taipei';
const DAY = 86400_000;
const dayKey = (v: string | number | Date) => new Date(v).toLocaleDateString('sv-SE', { timeZone: TZ }); // YYYY-MM-DD
const dayStart = (key: string) => new Date(`${key}T00:00:00+08:00`).getTime();
const hm = (v: string) => new Date(v).toLocaleTimeString('zh-TW', { timeZone: TZ, hour12: false, hour: '2-digit', minute: '2-digit' });
const twFull = (v: string) => new Date(v).toLocaleString('zh-TW', { timeZone: TZ, hour12: false });
const weekday = (key: string) => ['日', '一', '二', '三', '四', '五', '六'][new Date(`${key}T12:00:00Z`).getUTCDay()];
const dayLabel = (key: string) => `${Number(key.slice(5, 7))}/${Number(key.slice(8, 10))}（${weekday(key)}）`;

// 每次請求都是 dynamic render，取「現在」放在元件外，避開 react-hooks/purity
const currentTime = () => Date.now();

/** 兩個時間點的距離，給「註冊後多久」用 */
const gap = (from: string, to: string) => {
  const m = Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60_000));
  if (m < 60) return `${m} 分鐘`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} 小時`;
  return `${Math.round(h / 24)} 天`;
};
const daysAgo = (v: string, now: number) => {
  const d = Math.round((dayStart(dayKey(now)) - dayStart(dayKey(v))) / DAY);
  return d <= 0 ? '今天' : `${d} 天前`;
};
const duration = (s: number | null) => (s == null ? null : s < 60 ? `${s} 秒` : `${Math.floor(s / 60)} 分 ${s % 60} 秒`);
const age = (birth: string | null, at: string) => {
  if (!birth) return null;
  const [by, bm, bd] = birth.split('-').map(Number);
  const [ay, am, ad] = dayKey(at).split('-').map(Number);
  const months = (ay - by) * 12 + am - bm - (ad < bd ? 1 : 0);
  if (months < 0) return '尚未出生';
  return months < 24 ? `${months} 個月` : `${Math.floor(months / 12)} 歲 ${months % 12} 個月`;
};

const SESSION_LABEL: Record<string, string> = {
  speech_therapy: '語言治療',
  language_therapy: '語言治療',
  occupational_therapy: '職能治療',
  physical_therapy: '物理治療',
  psychological: '心理治療',
  home_practice: '在家練習',
  observation: '日常觀察',
  milestone: '里程碑',
  clinic_visit: '回診',
};

const EVENT_LABEL: Record<string, string> = {
  paywall_viewed: '打開付費牆',
  paywall_dismissed: '關掉付費牆',
  recording_truncated: '錄音達上限被截斷',
  recording_cancelled: '錄音中途取消',
  report_shared: '分享回診摘要',
  data_exported: '匯出資料',
  invite_sent: '送出家人邀請',
  invite_redeemed: '兌換家人邀請',
  reminder_toggled: '切換提醒',
  goal_created: '建立目標',
  goal_checkin: '目標打卡',
  quota_blocked: '錄音額度被擋',
  analyze_failed: '錄音分析失敗',
  admin_set_pro: '後台手動調整 Pro',
  record_tapped: '按下錄音',
  ai_consent_declined: '拒絕 AI 同意',
  mic_denied: '拒絕麥克風權限',
  first_record_nudge_set: '設定首錄提醒',
  referral_prompt: '推薦碼提示',
};

const MILESTONE_STATUS: Record<string, string> = { achieved: '做到了', not_yet: '還沒', unsure: '不確定' };

// iOS build 號碼 → 版本（ASC 查證 2026-10-07）。之後的新 build 沒列到就只顯示 build 號
const iosVersion = (build: number) =>
  build <= 16 ? '1.0.0' : build <= 19 ? '1.1.0' : build <= 23 ? '1.1.1' : build <= 25 ? '1.2.0' : build <= 28 ? '1.3.0' : build <= 31 ? '1.3.1' : null;
const clientLabel = (c: string | null) => {
  const m = /^iOS build (\d+)$/.exec(c ?? '');
  if (!m) return c ?? '未知';
  const v = iosVersion(Number(m[1]));
  return v ? `iOS ${v}（build ${m[1]}）` : `iOS build ${m[1]}`;
};
const hours = (s: number) => (s >= 3600 ? `${(s / 3600).toFixed(1)} 小時` : s >= 60 ? `${Math.round(s / 60)} 分鐘` : `${s} 秒`);
const DAYPART = [
  { label: '深夜（0–6 點）', from: 0, to: 6 },
  { label: '早上（6–12 點）', from: 6, to: 12 },
  { label: '下午（12–18 點）', from: 12, to: 18 },
  { label: '晚上（18–24 點）', from: 18, to: 24 },
];
const taipeiHour = (v: string) => Number(new Date(v).toLocaleString('en-US', { timeZone: TZ, hour: '2-digit', hour12: false })) % 24;

type Kind = 'signup' | 'child' | 'record' | 'manual' | 'paywall' | 'problem' | 'share' | 'goal' | 'practice' | 'med' | 'family' | 'feedback' | 'other';
type Item = { at: string; kind: Kind; title: string; detail?: string | null; count?: number };

const KIND_STYLE: Record<Kind, { icon: React.ComponentType<{ size?: number }>; cls: string }> = {
  signup: { icon: UserPlus, cls: 'bg-primary-soft text-primary' },
  child: { icon: Baby, cls: 'bg-accent-soft text-[#8a5a2b]' },
  record: { icon: Mic, cls: 'bg-success-soft text-success' },
  manual: { icon: NotebookPen, cls: 'bg-success-soft text-success' },
  paywall: { icon: CreditCard, cls: 'bg-info-soft text-[#3a5a7a]' },
  problem: { icon: XCircle, cls: 'bg-danger-soft text-danger' },
  share: { icon: Share2, cls: 'bg-primary-soft text-primary' },
  goal: { icon: Target, cls: 'bg-primary-soft text-primary' },
  practice: { icon: ClipboardCheck, cls: 'bg-primary-soft text-primary' },
  med: { icon: Pill, cls: 'bg-accent-soft text-[#8a5a2b]' },
  family: { icon: Users, cls: 'bg-accent-soft text-[#8a5a2b]' },
  feedback: { icon: MessageSquare, cls: 'bg-info-soft text-[#3a5a7a]' },
  other: { icon: Bell, cls: 'bg-bg text-muted' },
};

const eventKind = (name: string): Kind =>
  name.startsWith('paywall') ? 'paywall'
  : ['analyze_failed', 'quota_blocked', 'recording_cancelled', 'recording_truncated', 'ai_consent_declined', 'mic_denied'].includes(name) ? 'problem'
  : name === 'report_shared' || name === 'data_exported' ? 'share'
  : name.startsWith('goal') ? 'goal'
  : name.startsWith('invite') ? 'family'
  : 'other';

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: authData } = await supabaseAdmin.auth.admin.getUserById(id);
  const user = authData?.user;
  if (!user) notFound();

  const [{ data: profile }, { data: kids }, { data: shared }, { data: logs }, { data: events }, { data: feedback }, { data: sessions }, { data: activeDays }] = await Promise.all([
    supabaseAdmin.from('profiles').select('is_pro,last_platform,last_device_model,last_app_version,last_seen_at').eq('id', id).maybeSingle(),
    supabaseAdmin.from('children').select('id,birth_date,gender,created_at').eq('user_id', id).order('created_at'),
    supabaseAdmin.from('child_caregivers').select('child_id,role,created_at').eq('user_id', id),
    // 摘要只取來判斷「有沒有分析結果」，不顯示。治療模式的結果在 therapist_notes，沒有 summary
    supabaseAdmin
      .from('voice_logs')
      .select('created_at,session_type,duration_seconds,child_id,source:structured_json->>source,summary:structured_json->>summary,notes:structured_json->>therapist_notes')
      .eq('user_id', id)
      .order('created_at'),
    supabaseAdmin.from('app_events').select('name,props,created_at').eq('user_id', id).order('created_at').limit(1000),
    supabaseAdmin.from('feedback').select('message,created_at').eq('user_id', id),
    // 登入紀錄：auth.sessions 包成 view（App repo migration 20261007_admin_user_sessions.sql），不含 IP
    supabaseAdmin.from('v_admin_user_sessions').select('signed_in_at,last_used_at,expires_at,client').eq('user_id', id).order('signed_in_at', { ascending: false }).limit(30),
    // 活躍日（開 App 或任何操作，一天一筆；1.3.1 起含開 App）
    supabaseAdmin.from('v_user_active_days').select('day').eq('user_id', id),
  ]);

  const kidIds = [...(kids ?? []).map((k) => k.id), ...(shared ?? []).map((s) => s.child_id)];
  const [{ data: goals }, { data: milestones }, { data: meds }, { data: programs }] = await Promise.all([
    supabaseAdmin.from('child_goals').select('id,child_id,domain,status,created_at').eq('created_by', id),
    kidIds.length ? supabaseAdmin.from('milestone_records').select('child_id,status,created_at').in('child_id', kidIds) : Promise.resolve({ data: [] }),
    supabaseAdmin.from('child_medications').select('id,child_id,created_at').eq('created_by', id),
    kidIds.length ? supabaseAdmin.from('home_programs').select('id,child_id,created_at').in('child_id', kidIds) : Promise.resolve({ data: [] }),
  ]);
  const programIds = (programs ?? []).map((p: { id: string }) => p.id);
  const medIds = (meds ?? []).map((m) => m.id as string);
  const goalIds = (goals ?? []).map((g) => g.id as string);
  const [{ data: checkins }, { data: medLogs }, { data: goalCheckins }] = await Promise.all([
    programIds.length
      ? supabaseAdmin.from('practice_checkins').select('program_id,created_at').in('program_id', programIds)
      : Promise.resolve({ data: [] as { program_id: string; created_at: string }[] }),
    medIds.length
      ? supabaseAdmin.from('child_medication_logs').select('medication_id,status').in('medication_id', medIds)
      : Promise.resolve({ data: [] as { medication_id: string; status: string }[] }),
    goalIds.length
      ? supabaseAdmin.from('child_goal_checkins').select('goal_id').in('goal_id', goalIds)
      : Promise.resolve({ data: [] as { goal_id: string }[] }),
  ]);

  const kidNo = new Map((kids ?? []).map((k, i) => [k.id as string, i + 1]));
  const allLogs = (logs ?? []) as { created_at: string; session_type: string | null; duration_seconds: number | null; child_id: string | null; source: string | null; summary: string | null; notes: string | null }[];
  const voiceCount = allLogs.filter((l) => l.source !== 'manual').length;
  const created = user.created_at;
  const now = currentTime();
  const multiKid = (kids?.length ?? 0) > 1;

  // ── 時間軸 ──
  const items: Item[] = [
    { at: created, kind: 'signup' as const, title: user.is_anonymous ? '以訪客身分開始' : '註冊', detail: user.is_anonymous ? null : (user.app_metadata?.provider as string | undefined) ?? null },
    ...(kids ?? []).map((k): Item => ({
      at: k.created_at,
      kind: 'child',
      title: `新增孩子 ${kidNo.get(k.id)}`,
      detail: [age(k.birth_date, k.created_at), k.gender === 'boy' ? '男孩' : k.gender === 'girl' ? '女孩' : null].filter(Boolean).join('・') || null,
    })),
    ...(shared ?? []).map((s): Item => ({ at: s.created_at, kind: 'family', title: '加入家人共享', detail: s.role })),
    ...allLogs.map((l): Item => l.source === 'manual'
      ? { at: l.created_at, kind: 'manual', title: '快速記一筆（手動）', detail: multiKid && l.child_id ? `孩子 ${kidNo.get(l.child_id) ?? '（共享）'}` : null }
      : {
          at: l.created_at,
          kind: 'record',
          title: `錄音・${SESSION_LABEL[l.session_type ?? ''] ?? '未分類'}`,
          detail: [duration(l.duration_seconds), l.summary || l.notes ? null : '沒有分析結果', multiKid && l.child_id ? `孩子 ${kidNo.get(l.child_id) ?? '（共享）'}` : null].filter(Boolean).join('・') || null,
        }),
    ...(events ?? []).map((e): Item => ({
      at: e.created_at,
      kind: eventKind(e.name),
      title: EVENT_LABEL[e.name] ?? e.name,
      detail: e.props && Object.keys(e.props).length ? Object.entries(e.props as Record<string, unknown>).map(([k, v]) => `${k}: ${v}`).join('・') : null,
    })),
    ...(goals ?? []).map((g): Item => ({ at: g.created_at, kind: 'goal', title: '新增個別化目標', detail: g.domain })),
    ...((milestones ?? []) as { status: string | null; created_at: string }[]).map((m): Item => ({ at: m.created_at, kind: 'goal', title: '記錄里程碑', detail: MILESTONE_STATUS[m.status ?? ''] ?? m.status })),
    ...(meds ?? []).map((m): Item => ({ at: m.created_at, kind: 'med', title: '新增用藥' })),
    ...((programs ?? []) as { created_at: string }[]).map((p): Item => ({ at: p.created_at, kind: 'practice', title: '新增回家練習' })),
    ...(checkins ?? []).map((c): Item => ({ at: c.created_at, kind: 'practice', title: '回家練習打卡' })),
    ...(feedback ?? []).map((f): Item => ({ at: f.created_at, kind: 'feedback', title: '送出意見回饋', detail: f.message })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  // 同一天裡連續、標題與細節都相同的（例如一口氣勾 10 個里程碑）合成一列「×10」，時間顯示最早那筆
  const byDay = new Map<string, Item[]>();
  for (const it of items) {
    const k = dayKey(it.at);
    const list = byDay.get(k) ?? [];
    const prev = list.at(-1);
    if (prev && prev.title === it.title && prev.detail === it.detail && it.kind !== 'feedback') {
      list[list.length - 1] = { ...prev, at: it.at, count: (prev.count ?? 1) + 1 };
    } else {
      list.push(it);
    }
    byDay.set(k, list);
  }

  // ── 旅程階段 ──
  const firstChild = [kids?.[0]?.created_at, shared?.[0]?.created_at].filter((v): v is string => !!v).sort()[0] ?? null;
  const firstLog = allLogs[0]?.created_at ?? null;
  const logDays = [...new Set(allLogs.map((l) => dayKey(l.created_at)))];
  const secondDay = logDays.length >= 2 ? allLogs.find((l) => dayKey(l.created_at) === logDays[1])!.created_at : null;
  const afterWeek = allLogs.find((l) => new Date(l.created_at).getTime() >= new Date(created).getTime() + 7 * DAY)?.created_at ?? null;
  const steps = [
    { label: '註冊', at: created },
    { label: '建立孩子', at: firstChild },
    { label: '第一則紀錄', at: firstLog },
    { label: '另一天又記', at: secondDay },
    { label: '第 7 天後還在記', at: afterWeek },
  ];
  const stuckAt = steps.findIndex((s) => !s.at);
  const lastLog = allLogs.at(-1)?.created_at ?? null;
  // 「最近上線」不能只看 last_sign_in_at：session 會自動續，很多人一直沒重新登入卻天天在用。
  // 取所有已知時間點的最大值（時間軸任一筆、App 1.3.0 起回報的 last_seen_at、最近登入）。
  const lastActive = [items[0]?.at, profile?.last_seen_at, user.last_sign_in_at]
    .filter((v): v is string => !!v)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

  // ── 使用統計（只有次數、時間與種類，不含內容） ──
  const voiceLogs = allLogs.filter((l) => l.source !== 'manual');
  const totalSeconds = voiceLogs.reduce((t, l) => t + (l.duration_seconds ?? 0), 0);
  const avgSeconds = voiceLogs.length ? Math.round(totalSeconds / voiceLogs.length) : 0;
  const daypartCounts = DAYPART.map((d) => ({ ...d, n: allLogs.filter((l) => { const h = taipeiHour(l.created_at); return h >= d.from && h < d.to; }).length }));
  const topDaypart = [...daypartCounts].sort((a, b) => b.n - a.n)[0];
  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const l of allLogs) weekdayCounts[new Date(`${dayKey(l.created_at)}T12:00:00Z`).getUTCDay()] += 1;
  const activeDaySet = new Set([...(activeDays ?? []).map((d) => String(d.day)), ...logDays]);
  const active30 = [...activeDaySet].filter((d) => d > dayKey(now - 30 * DAY)).length;
  const evCount = (name: string) => (events ?? []).filter((e) => e.name === name).length;
  const featureUse: [string, number][] = [
    ['打開付費牆', evCount('paywall_viewed')],
    ['分享回診摘要', evCount('report_shared')],
    ['匯出資料', evCount('data_exported')],
    ['送出家人邀請', evCount('invite_sent')],
    ['切換提醒', evCount('reminder_toggled')],
    ['錄音中途取消', evCount('recording_cancelled')],
    ['錄音被上限截斷', evCount('recording_truncated')],
    ['拒絕 AI 同意／麥克風', evCount('ai_consent_declined') + evCount('mic_denied')],
  ];
  const sessionRows = (sessions ?? []) as { signed_in_at: string; last_used_at: string | null; expires_at: string | null; client: string | null }[];

  // ── 每個孩子 ──（只用編號、年齡、性別；不顯示姓名）
  type KidStat = { id: string; label: string; meta: string; shared: boolean };
  const kidList: KidStat[] = [
    ...(kids ?? []).map((k, i) => ({
      id: k.id as string,
      label: `孩子 ${i + 1}`,
      meta: [age(k.birth_date, dayKey(now)), k.gender === 'boy' ? '男孩' : k.gender === 'girl' ? '女孩' : null, `${dayKey(k.created_at).replaceAll('-', '/')} 建立`].filter(Boolean).join('・'),
      shared: false,
    })),
    ...(shared ?? []).map((sh, i) => ({ id: sh.child_id as string, label: `共享的孩子 ${i + 1}`, meta: `家人共享加入（${sh.role ?? '照顧者'}）`, shared: true })),
  ];
  const programChild = new Map(((programs ?? []) as { id: string; child_id: string }[]).map((p) => [p.id, p.child_id]));
  const medChild = new Map(((meds ?? []) as { id: string; child_id: string }[]).map((m) => [m.id, m.child_id]));
  const goalChild = new Map(((goals ?? []) as { id: string; child_id: string }[]).map((g) => [g.id, g.child_id]));
  const kidStats = kidList.map((k) => {
    const kl = allLogs.filter((l) => l.child_id === k.id);
    const kv = kl.filter((l) => l.source !== 'manual');
    const types = new Map<string, number>();
    for (const l of kv) types.set(SESSION_LABEL[l.session_type ?? ''] ?? '未分類', (types.get(SESSION_LABEL[l.session_type ?? ''] ?? '未分類') ?? 0) + 1);
    const ms = ((milestones ?? []) as { child_id: string; status: string | null }[]).filter((m) => m.child_id === k.id);
    const kGoals = ((goals ?? []) as { id: string; child_id: string; status: string | null }[]).filter((g) => g.child_id === k.id);
    const kPrograms = ((programs ?? []) as { id: string; child_id: string }[]).filter((p) => p.child_id === k.id);
    const kMeds = ((meds ?? []) as { id: string; child_id: string }[]).filter((m) => m.child_id === k.id);
    return {
      ...k,
      logs: kl.length,
      voice: kv.length,
      manual: kl.length - kv.length,
      seconds: kv.reduce((t, l) => t + (l.duration_seconds ?? 0), 0),
      last: kl.at(-1)?.created_at ?? null,
      types: [...types.entries()].sort((a, b) => b[1] - a[1]),
      msAchieved: ms.filter((m) => (m.status ?? 'achieved') === 'achieved').length,
      msNotYet: ms.filter((m) => m.status === 'not_yet').length,
      msUnsure: ms.filter((m) => m.status === 'unsure').length,
      goals: kGoals.length,
      goalsAchieved: kGoals.filter((g) => g.status === 'achieved').length,
      goalCheckins: ((goalCheckins ?? []) as { goal_id: string }[]).filter((c) => goalChild.get(c.goal_id) === k.id).length,
      programs: kPrograms.length,
      practiceCheckins: ((checkins ?? []) as { program_id: string }[]).filter((c) => programChild.get(c.program_id) === k.id).length,
      meds: kMeds.length,
      medGiven: ((medLogs ?? []) as { medication_id: string; status: string }[]).filter((m) => medChild.get(m.medication_id) === k.id && m.status === 'given').length,
    };
  });

  // ── 每日活動：註冊日到今天，最多 84 天（12 週） ──
  const today = dayKey(now);
  const startDay = Math.max(dayStart(dayKey(created)), dayStart(today) - 83 * DAY);
  const cells: { key: string; logs: number; other: number }[] = [];
  for (let t = startDay; t <= dayStart(today); t += DAY) {
    const k = dayKey(t);
    const list = byDay.get(k) ?? [];
    const sum = (f: (i: Item) => boolean) => list.filter(f).reduce((acc, i) => acc + (i.count ?? 1), 0);
    const logsN = sum((i) => i.kind === 'record' || i.kind === 'manual');
    cells.push({ key: k, logs: logsN, other: sum((i) => i.kind !== 'signup') - logsN });
  }
  const cellCls = (c: (typeof cells)[number]) =>
    c.logs >= 3 ? 'bg-primary text-white' : c.logs === 2 ? 'bg-primary/70 text-white' : c.logs === 1 ? 'bg-primary/35 text-primary-deep' : c.other ? 'bg-accent/40 text-[#8a5a2b]' : 'bg-bg text-subtle';

  const name = user.is_anonymous ? '訪客（匿名）' : user.email ?? id.slice(0, 8);

  return (
    <>
      <PageHeader
        title={name}
        subtitle={`${id}・註冊 ${twFull(created)}`}
        right={
          <Link href="/admin/users" className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-sm hover:bg-bg">
            <ArrowLeft size={14} /> 回名單
          </Link>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        {user.is_anonymous ? <Badge>訪客</Badge> : <Badge tone="info">{(user.app_metadata?.provider as string | undefined) ?? '—'}</Badge>}
        {profile?.is_pro ? <Badge tone="success">Pro</Badge> : <Badge>免費</Badge>}
        {profile?.last_platform ? (
          <Badge>{[profile.last_device_model ?? profile.last_platform, profile.last_app_version ? `v${profile.last_app_version}` : null].filter(Boolean).join(' · ')}</Badge>
        ) : null}
        <Badge>{`孩子 ${fmt(kids?.length ?? 0)}${shared?.length ? `（另共享 ${fmt(shared.length)}）` : ''}`}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="紀錄" value={fmt(allLogs.length)} hint={`錄音 ${fmt(voiceCount)}・手動 ${fmt(allLogs.length - voiceCount)}`} />
        <StatCard label="有紀錄的天數" value={fmt(logDays.length)} hint={firstLog ? `第一則在註冊後 ${gap(created, firstLog)}` : '還沒有紀錄'} />
        <StatCard label="最後一則紀錄" value={lastLog ? daysAgo(lastLog, now) : '—'} hint={lastLog ? twFull(lastLog) : undefined} />
        <StatCard
          label="最後一次有動作"
          value={lastActive ? daysAgo(lastActive, now) : '—'}
          hint={lastActive ? `${twFull(lastActive)}${lastActive === profile?.last_seen_at ? '・開 App' : lastActive === user.last_sign_in_at ? '・登入' : ''}` : undefined}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="登入紀錄" subtitle="每次登入一筆（登出或過期後系統可能清掉舊紀錄）。不顯示 IP">
          {sessionRows.length === 0 ? (
            <p className="text-sm text-muted">沒有登入紀錄</p>
          ) : (
            <div className="-mx-2 overflow-x-auto px-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="label-caps text-left">
                    <th className="border-b border-line pb-2 pr-4">登入時間</th>
                    <th className="border-b border-line pb-2 pr-4">最後使用</th>
                    <th className="border-b border-line pb-2">裝置／版本</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionRows.slice(0, 15).map((r, i) => (
                    <tr key={`${r.signed_in_at}-${i}`} className="border-b border-line/60 last:border-0">
                      <td className="whitespace-nowrap py-2 pr-4 tabular-nums">{twFull(r.signed_in_at)}</td>
                      <td className="whitespace-nowrap py-2 pr-4 tabular-nums text-muted">
                        {r.last_used_at ? `${twFull(r.last_used_at)}` : '—'}
                      </td>
                      <td className="py-2">{clientLabel(r.client)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sessionRows.length > 15 ? <p className="mt-2 text-xs text-subtle">只列最近 15 筆，共 {fmt(sessionRows.length)} 筆</p> : null}
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-xl bg-bg/60 p-3"><div className="label-caps">近 30 天活躍天數</div><div className="mt-1 text-lg font-semibold tabular-nums">{fmt(active30)}</div></div>
            <div className="rounded-xl bg-bg/60 p-3"><div className="label-caps">累計活躍天數</div><div className="mt-1 text-lg font-semibold tabular-nums">{fmt(activeDaySet.size)}</div></div>
            <div className="rounded-xl bg-bg/60 p-3"><div className="label-caps">登入次數</div><div className="mt-1 text-lg font-semibold tabular-nums">{fmt(sessionRows.length)}{sessionRows.length >= 30 ? '+' : ''}</div></div>
          </div>
        </Section>

        <Section title="使用統計" subtitle="只有次數、時間與種類，不含任何紀錄內容">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="label-caps">錄音總長度</dt><dd className="mt-0.5 tabular-nums">{voiceLogs.length ? hours(totalSeconds) : '—'}</dd></div>
            <div><dt className="label-caps">平均每則</dt><dd className="mt-0.5 tabular-nums">{voiceLogs.length ? duration(avgSeconds) : '—'}</dd></div>
            <div><dt className="label-caps">最常記錄的時段</dt><dd className="mt-0.5">{allLogs.length ? `${topDaypart.label}・${topDaypart.n} 則` : '—'}</dd></div>
            <div>
              <dt className="label-caps">星期分布（日→六）</dt>
              <dd className="mt-1 flex items-end gap-1">
                {weekdayCounts.map((c, i) => (
                  <span key={i} className="flex flex-col items-center gap-0.5" title={`週${['日', '一', '二', '三', '四', '五', '六'][i]}：${c} 則`}>
                    <span className="w-4 rounded-sm bg-primary/60" style={{ height: `${4 + (Math.max(...weekdayCounts) ? (c / Math.max(...weekdayCounts)) * 28 : 0)}px` }} />
                    <span className="text-[10px] text-subtle">{['日', '一', '二', '三', '四', '五', '六'][i]}</span>
                  </span>
                ))}
              </dd>
            </div>
          </dl>
          <div className="mt-5">
            <div className="label-caps mb-2">功能使用次數</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              {featureUse.map(([label, n]) => (
                <div key={label} className="flex justify-between border-b border-line/50 pb-1">
                  <span className="text-muted">{label}</span>
                  <span className={`tabular-nums ${n ? '' : 'text-subtle'}`}>{fmt(n)}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>

      <Section title="每個孩子" subtitle="這位使用者自己記的部分；只用編號、年齡與性別，不顯示姓名">
        {kidStats.length === 0 ? (
          <p className="text-sm text-muted">還沒有建立孩子</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {kidStats.map((k) => (
              <div key={k.id} className="rounded-2xl border border-line bg-bg/40 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-semibold">{k.label}</h3>
                  <span className="text-xs text-muted">{k.meta}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-xl bg-surface p-2.5"><div className="label-caps">紀錄</div><div className="mt-0.5 text-lg font-semibold tabular-nums">{fmt(k.logs)}</div><div className="text-[11px] text-subtle">錄音 {k.voice}・手動 {k.manual}</div></div>
                  <div className="rounded-xl bg-surface p-2.5"><div className="label-caps">錄音長度</div><div className="mt-0.5 text-lg font-semibold tabular-nums">{k.voice ? hours(k.seconds) : '—'}</div></div>
                  <div className="rounded-xl bg-surface p-2.5"><div className="label-caps">最後一則</div><div className="mt-0.5 text-lg font-semibold">{k.last ? daysAgo(k.last, now) : '—'}</div></div>
                </div>
                {k.types.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {k.types.map(([t, n]) => <Badge key={t}>{t} {n}</Badge>)}
                  </div>
                ) : null}
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div className="flex justify-between"><dt className="text-muted">里程碑</dt><dd className="tabular-nums">做到 {k.msAchieved}・還沒 {k.msNotYet}・不確定 {k.msUnsure}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">個別化目標</dt><dd className="tabular-nums">{k.goals} 個（達成 {k.goalsAchieved}）・打卡 {k.goalCheckins}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">回家練習</dt><dd className="tabular-nums">{k.programs} 項・打卡 {k.practiceCheckins}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">用藥</dt><dd className="tabular-nums">{k.meds} 種・已餵 {k.medGiven}</dd></div>
                </dl>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="使用旅程" subtitle="停在哪一步；每一步標出距離註冊多久">
        <ol className="grid gap-3 sm:grid-cols-5">
          {steps.map((s, i) => {
            const done = !!s.at;
            const stuck = i === stuckAt;
            return (
              <li
                key={s.label}
                className={`rounded-2xl border p-3 ${done ? 'border-primary/25 bg-primary-soft/50' : stuck ? 'border-danger/30 bg-danger-soft/60' : 'border-line bg-bg/50'}`}
              >
                <div className={`flex items-center gap-1.5 text-sm font-medium ${done ? 'text-primary' : stuck ? 'text-danger' : 'text-subtle'}`}>
                  {done ? <CheckCircle2 size={16} /> : stuck ? <Flag size={16} /> : <Circle size={16} />}
                  {s.label}
                </div>
                <div className="mt-1 text-xs text-muted">
                  {s.at ? (i === 0 ? twFull(s.at) : `註冊後 ${gap(created, s.at)}`) : stuck ? '停在這一步' : '—'}
                </div>
              </li>
            );
          })}
        </ol>
      </Section>

      <Section
        title="每日活動"
        subtitle={cells.length >= 84 ? '最近 12 週（台北時間）' : '從註冊那天到今天（台北時間）'}
        right={
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1"><i className="h-3 w-3 rounded-[4px] bg-primary/35" />有紀錄</span>
            <span className="flex items-center gap-1"><i className="h-3 w-3 rounded-[4px] bg-accent/40" />只有其他操作</span>
            <span className="flex items-center gap-1"><i className="h-3 w-3 rounded-[4px] bg-bg ring-1 ring-line" />沒動靜</span>
          </div>
        }
      >
        <div className="flex flex-wrap gap-1">
          {cells.map((c) => (
            <div
              key={c.key}
              title={`${dayLabel(c.key)}：${c.logs} 則紀錄${c.other ? `、${c.other} 個其他操作` : ''}`}
              className={`grid h-8 w-8 place-items-center rounded-md text-[11px] tabular-nums ${cellCls(c)} ${c.key === dayKey(created) ? 'ring-2 ring-accent ring-offset-1' : ''}`}
            >
              {Number(c.key.slice(8, 10))}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-subtle">格子上的數字是日期，滑鼠移上去看當天幾則；橘框是註冊那天。</p>
      </Section>

      <Section title="時間軸" subtitle={`共 ${fmt(items.length)} 筆，新的在上。不顯示錄音內容與孩子姓名`}>
        <div className="space-y-6">
          {[...byDay.entries()].map(([k, list]) => (
            <div key={k}>
              <div className="mb-2 flex flex-wrap items-baseline gap-x-2">
                <h3 className="text-sm font-semibold">{dayLabel(k)}</h3>
                <span className="text-xs text-subtle">
                  {k.slice(0, 4)}・註冊後第 {Math.round((dayStart(k) - dayStart(dayKey(created))) / DAY) + 1} 天
                </span>
              </div>
              <ul className="ml-3 space-y-2 border-l border-line pl-5">
                {list.map((it, i) => {
                  const S = KIND_STYLE[it.kind];
                  const Icon = S.icon;
                  return (
                    <li key={`${it.at}-${i}`} className="relative flex items-start gap-3">
                      <span className={`absolute -left-[33px] top-0 grid h-6 w-6 place-items-center rounded-full ring-4 ring-surface ${S.cls}`}>
                        <Icon size={13} />
                      </span>
                      <span className="w-10 shrink-0 pt-0.5 text-xs tabular-nums text-subtle">{hm(it.at)}</span>
                      <div className="min-w-0 pt-0.5 text-sm">
                        <span>{it.title}</span>
                        {it.count ? <span className="ml-1.5 rounded-full bg-bg px-1.5 py-px text-[11px] font-medium tabular-nums text-muted">×{it.count}</span> : null}
                        {it.detail ? (
                          it.kind === 'feedback' ? (
                            <p className="mt-1 whitespace-pre-wrap rounded-xl bg-bg px-3 py-2 text-xs text-muted">{it.detail}</p>
                          ) : (
                            <span className="ml-2 text-xs text-muted">{it.detail}</span>
                          )
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
