import { ReactNode, useEffect, useState } from 'react';
import { Bell, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';


interface HeaderProps {
  breadcrumbs: string[];
  actions?: ReactNode;
  className?: string;
}

export function Header({ breadcrumbs, actions, className }: HeaderProps) {
  const [light, setLight] = useState(() => document.documentElement.classList.contains('light'));

  const toggleTheme = () => {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle('light', next);
  };

  return (
    <header
      className={cn(
        'flex items-center px-5 h-[52px] min-h-[52px] gap-3',
        className
      )}
      style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
        {breadcrumbs.map((b, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[#2A3055]">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
            <span className={i === breadcrumbs.length - 1 ? 'text-[#C4C8E8] font-medium truncate' : 'text-[#454C75]'}>
              {b}
            </span>
          </span>
        ))}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {actions}
        <div className="h-5 w-px bg-[#1C2038]" />
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg bg-[#141828] hover:bg-[#1C2038] flex items-center justify-center text-[#8B91BE] hover:text-[#C4C8E8] transition-all"
          title={light ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {light ? <Moon size={14} /> : <Sun size={14} />}
        </button>
        <div className="h-5 w-px bg-[#1C2038]" />
        <div className="relative">
          <button className="w-8 h-8 rounded-lg bg-[#141828] hover:bg-[#1C2038] flex items-center justify-center text-[#8B91BE] hover:text-[#C4C8E8] transition-all">
            <Bell size={15} />
          </button>
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500 border border-[var(--bg-surface)]" />
        </div>
      </div>
    </header>
  );
}
