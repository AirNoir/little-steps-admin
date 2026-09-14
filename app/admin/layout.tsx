import Link from 'next/link';
import { requireAdmin } from '@/lib/requireAdmin';

const NAV = [
  { href: '/admin', label: '概況' },
  { href: '/admin/retention', label: '留存' },
  { href: '/admin/cost', label: '成本' },
  { href: '/admin/events', label: '事件' },
];

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  const user = await requireAdmin();
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-line bg-white md:flex md:w-56 md:flex-col md:border-b-0 md:border-r">
        <div className="flex items-center gap-3 px-5 py-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white">步</span>
          <div className="leading-tight">
            <p className="font-semibold">小步腳印</p>
            <p className="text-xs text-muted">營運後台</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="whitespace-nowrap rounded-lg px-3 py-2 text-sm hover:bg-bg">
              {item.label}
            </Link>
          ))}
        </nav>
        <form action="/auth/signout" method="post" className="px-5 py-4 md:mt-auto">
          <p className="truncate text-xs text-muted" title={user.email ?? ''}>{user.email}</p>
          <button type="submit" className="mt-1 text-xs text-primary hover:underline">登出</button>
        </form>
      </aside>
      <main className="flex-1 space-y-6 p-5 md:p-8">{children}</main>
    </div>
  );
}
