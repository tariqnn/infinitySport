import { AdminSidebar } from '../_components/AdminSidebar';
import { AdminTopbar } from '../_components/AdminTopbar';
import { PageTransition } from '../_components/PageTransition';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-[var(--bg-shell)]">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar />
        <main className="flex-1 px-4 py-6 sm:px-6">
          <PageTransition>
            <div className="mx-auto max-w-[1300px]">{children}</div>
          </PageTransition>
        </main>
        <footer className="border-t border-[var(--border-muted)] bg-white px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-[1300px] items-center justify-between text-xs text-[var(--text-muted)]">
            <p>(c) {new Date().getFullYear()} Infinity Sport Admin</p>
            <p>{process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev'}</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
