import { requireAdmin } from '@/lib/requireAdmin';
import { Sidebar } from '@/components/Sidebar';

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  const user = await requireAdmin();
  return (
    <div className="min-h-screen md:flex">
      <Sidebar email={user.email ?? ''} />
      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-[1280px] space-y-6 px-5 py-6 md:px-10 md:py-9">{children}</div>
      </main>
    </div>
  );
}
