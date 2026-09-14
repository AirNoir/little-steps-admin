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
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-lg text-white">步</span>
          <div>
            <h1 className="text-lg font-semibold">小步腳印 後台</h1>
            <p className="text-sm text-muted">僅限管理者</p>
          </div>
        </div>
        {sent ? (
          <p className="rounded-lg bg-primary/10 px-4 py-3 text-sm text-primary">
            登入連結已寄出，請到信箱點開（連結 1 小時內有效）。
          </p>
        ) : (
          <form action={sendMagicLink} className="space-y-3">
            <label className="block text-sm font-medium" htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="you@example.com"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
            >
              寄送登入連結
            </button>
            {error ? <p className="text-sm text-danger">{ERRORS[error] ?? error}</p> : null}
          </form>
        )}
      </div>
    </main>
  );
}
