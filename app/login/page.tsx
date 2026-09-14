import Image from 'next/image';
import { Mail } from 'lucide-react';
import { sendMagicLink } from './actions';

const ERRORS: Record<string, string> = {
  missing: '請輸入 Email。',
  forbidden: '這個帳號不在管理者名單裡。',
  auth: '登入連結無效或已過期，請重新寄一次。',
};

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const sp = await searchParams;
  const sent = sp.sent === '1';
  const error = typeof sp.error === 'string' ? sp.error : undefined;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-primary-deep px-4">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-primary/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -right-32 h-[460px] w-[460px] rounded-full bg-accent/25 blur-3xl" />
      <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-surface p-8 shadow-pop">
        <div className="mb-7 flex items-center gap-3">
          <Image src="/logo.png" alt="小步腳印" width={52} height={52} className="rounded-2xl" priority />
          <div>
            <h1 className="text-lg font-semibold">小步腳印 後台</h1>
            <p className="text-sm text-muted">僅限管理者・以 Email 連結登入</p>
          </div>
        </div>
        {sent ? (
          <div className="rounded-2xl bg-primary-soft px-4 py-4 text-sm text-primary">
            <p className="font-medium">登入連結已寄出</p>
            <p className="mt-1 opacity-80">請到信箱點開（1 小時內有效、只能用一次）。找不到請看垃圾郵件。</p>
          </div>
        ) : (
          <form action={sendMagicLink} className="space-y-3">
            <label className="label-caps block" htmlFor="email">Email</label>
            <div className="relative">
              <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-xl border border-line bg-bg/60 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/15"
                placeholder="you@example.com"
              />
            </div>
            <button type="submit" className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-deep">
              寄送登入連結
            </button>
            {error ? <p className="text-sm text-danger">{ERRORS[error] ?? error}</p> : null}
          </form>
        )}
      </div>
    </main>
  );
}
