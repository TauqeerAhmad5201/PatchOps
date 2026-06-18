import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { useAuth } from '@/lib/auth-context';
import { reportApi } from '@/lib/api';
import type { DashboardSummary } from '@/types';

interface LayoutProps {
  children: ReactNode;
  breadcrumbs: string[];
  headerActions?: ReactNode;
}

export function Layout({ children, breadcrumbs, headerActions }: LayoutProps) {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState<Pick<DashboardSummary, 'awaiting_approval' | 'in_progress'>>();

  // Poll summary stats every 30s for sidebar badges
  useEffect(() => {
    if (!user) return;
    const load = () => {
      reportApi.summary()
        .then((r) => setStats({ awaiting_approval: r.data.awaiting_approval, in_progress: r.data.in_progress }))
        .catch(() => {});
    };
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', background: 'var(--bg-base)' }}>
      <Sidebar stats={stats} />
      <main style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden', width: '100%' }}>
        <Header breadcrumbs={breadcrumbs} actions={headerActions} />
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '20px', minHeight: 0, width: '100%' }}>
          <div style={{ width: '100%', minWidth: 0 }}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
