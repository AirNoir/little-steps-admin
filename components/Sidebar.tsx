'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Coins, CreditCard, LayoutDashboard, LogOut, Repeat, Users } from 'lucide-react';

const NAV = [
  { href: '/admin', label: '概況', icon: LayoutDashboard },
  { href: '/admin/users', label: '使用者', icon: Users },
  { href: '/admin/subscriptions', label: '訂閱', icon: CreditCard },
  { href: '/admin/retention', label: '留存', icon: Repeat },
  { href: '/admin/cost', label: '成本', icon: Coins },
  { href: '/admin/events', label: '事件', icon: Activity },
];

export function Sidebar({ email }: { email: string }) {
  const path = usePathname();
  const isActive = (href: string) => (href === '/admin' ? path === '/admin' : path.startsWith(href));
  return (
    <aside className="bg-primary-deep text-cream md:sticky md:top-0 md:flex md:h-screen md:w-60 md:flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <Image src="/logo.png" alt="小步腳印" width={40} height={40} className="rounded-xl ring-1 ring-white/15" />
        <div className="leading-tight">
          <p className="font-semibold tracking-wide">小步腳印</p>
          <p className="text-[11px] uppercase tracking-[0.18em] text-cream/55">Operations</p>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`group relative flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm transition-colors ${
                active ? 'bg-white/12 text-white' : 'text-cream/70 hover:bg-white/8 hover:text-white'
              }`}
            >
              {active ? <span className="absolute left-0 top-1/2 hidden h-5 w-1 -translate-y-1/2 rounded-r bg-accent md:block" /> : null}
              <Icon size={18} strokeWidth={1.9} className={active ? 'text-accent' : 'text-cream/60 group-hover:text-cream'} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="hidden px-4 pb-5 md:mt-auto md:block">
        <div className="rounded-2xl bg-white/6 p-3">
          <p className="label-caps !text-cream/45">Signed in</p>
          <p className="mt-1 truncate text-sm text-cream/90" title={email}>{email}</p>
          <form action="/auth/signout" method="post" className="mt-2">
            <button type="submit" className="flex items-center gap-1.5 text-xs text-cream/70 hover:text-white">
              <LogOut size={14} /> 登出
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
