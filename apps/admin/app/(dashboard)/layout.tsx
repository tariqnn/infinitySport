import { AdminSidebar } from '../_components/AdminSidebar';
import { AdminTopbar } from '../_components/AdminTopbar';
import { PageTransition } from '../_components/PageTransition';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-[var(--bg-shell)]">
      <AdminSidebar />
      <div className="flex flex-1 flex-col">
        <AdminTopbar />
        <main className="flex-1 px-6 py-8">
          <PageTransition>
            <div className="mx-auto flex max-w-6xl flex-col gap-8">{children}</div>
          </PageTransition>
        </main>
        <footer className="border-t border-[rgba(15,23,42,0.08)] bg-white px-6 py-4 text-xs text-slate-500">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <p>© {new Date().getFullYear()} Infinity Sport. Crafted for admin.infinitysport.jo</p>
            <p>Build {process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev'}</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
