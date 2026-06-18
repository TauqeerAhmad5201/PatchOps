import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CheckCircle, Zap, Activity, AlertTriangle,
  BookOpen, Users, LogOut, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Avatar } from '@/components/ui';
import { cn } from '@/lib/utils';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  badgeColor?: 'amber' | 'indigo' | 'red';
  adminOnly?: boolean;
}

function NavItem({ to, icon, label, badge, badgeColor = 'indigo', adminOnly }: NavItemProps) {
  const { isAdmin } = useAuth();
  if (adminOnly && !isAdmin) return null;

  const badgeClasses = {
    amber: 'bg-amber-500/20 text-amber-400',
    indigo: 'bg-indigo-500/20 text-indigo-400',
    red: 'bg-red-500/20 text-red-400',
  };

  return (
    <NavLink
      to={to}
      className={({ isActive }) => cn(
        'flex items-center gap-2.5 px-3 py-2 mx-2 rounded-[8px] text-sm font-medium transition-all duration-150 group relative',
        isActive
          ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shadow-[0_0_12px_rgba(99,102,241,0.08)]'
          : 'text-[#8B91BE] hover:text-[#C4C8E8] hover:bg-[#141828]'
      )}
    >
      {({ isActive }) => (
        <>
          <span className={cn('flex-shrink-0', isActive ? 'text-indigo-400' : 'text-[#454C75] group-hover:text-[#8B91BE]')}>
            {icon}
          </span>
          <span className="flex-1 truncate">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-auto', badgeClasses[badgeColor])}>
              {badge}
            </span>
          )}
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-indigo-500 rounded-full" />
          )}
        </>
      )}
    </NavLink>
  );
}

interface SidebarProps {
  stats?: {
    awaiting_approval?: number;
    in_progress?: number;
  };
}

export function Sidebar({ stats }: SidebarProps) {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  return (
    <aside
      className="w-[220px] min-w-[220px] flex flex-col h-screen overflow-hidden relative"
      style={{
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Subtle gradient orb */}
      <div
        className="absolute top-0 left-0 w-full h-48 pointer-events-none opacity-30"
        style={{
          background: 'radial-gradient(ellipse at 30% 0%, rgba(99,102,241,0.15) 0%, transparent 70%)',
        }}
      />

      {/* Logo */}
      <div className="px-4 py-5 flex items-center gap-3 relative">
        <div
          className="w-8 h-8 rounded-[9px] flex items-center justify-center text-white font-black text-xs flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)',
            boxShadow: '0 0 20px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
            fontFamily: 'var(--font-display)',
          }}
        >
          PO
        </div>
        <div>
          <div className="text-[15px] font-bold text-[#E8EAF6] leading-none mb-0.5" style={{ fontFamily: 'var(--font-display)' }}>
            PatchOps
          </div>
          <div className="text-[10px] text-[#454C75] tracking-wide">CR Management</div>
        </div>
      </div>

      <div className="h-px bg-[#1C2038] mx-4" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 flex flex-col gap-0.5 scroll-area">
        <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#454C75]">
          Operations
        </div>

        <NavItem
          to="/dashboard"
          icon={<LayoutDashboard size={15} />}
          label="Dashboard"
        />
        <NavItem
          to="/approvals"
          icon={<CheckCircle size={15} />}
          label="Approvals"
          badge={stats?.awaiting_approval}
          badgeColor="amber"
        />
        <NavItem
          to="/active-runs"
          icon={<Zap size={15} />}
          label="Active Runs"
          badge={stats?.in_progress}
          badgeColor="indigo"
        />
        <NavItem
          to="/health"
          icon={<Activity size={15} />}
          label="Health Reports"
        />
        <NavItem
          to="/incidents"
          icon={<AlertTriangle size={15} />}
          label="Incidents & RCA"
        />

        {isAdmin && (
          <>
            <div className="px-4 py-1.5 mt-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#454C75]">
              Administration
            </div>
            <NavItem
              to="/knowledge"
              icon={<BookOpen size={15} />}
              label="Knowledge Base"
              adminOnly
            />
            <NavItem
              to="/team"
              icon={<Users size={15} />}
              label="Team"
              adminOnly
            />
          </>
        )}
      </nav>

      <div className="h-px bg-[#1C2038] mx-4" />

      {/* User */}
      <div className="p-3 flex items-center gap-2.5">
        <Avatar name={user?.full_name} size={32} />
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold text-[#C4C8E8] truncate">{user?.full_name}</div>
          <div className="text-[10px] text-[#454C75]">
            {user?.role === 'admin' ? '✦ Admin' : 'User'} · {user?.team ?? '—'}
          </div>
        </div>
        <button
          onClick={logout}
          className="w-7 h-7 rounded-lg bg-[#141828] hover:bg-red-500/10 flex items-center justify-center text-[#454C75] hover:text-red-400 transition-all flex-shrink-0"
          title="Sign out"
        >
          <LogOut size={13} />
        </button>
      </div>
    </aside>
  );
}
