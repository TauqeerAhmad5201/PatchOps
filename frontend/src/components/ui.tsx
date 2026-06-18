import { ReactNode, ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

// ── Badge ─────────────────────────────────────────────────────────────────────
type BadgeVariant = 'awaiting_approval' | 'pending' | 'in_progress' | 'completed' | 'failed' | 'ignored'
  | 'critical' | 'high' | 'medium' | 'low'
  | 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple';

const BADGE_STYLES: Record<string, string> = {
  awaiting_approval: 'bg-amber-500/10 text-amber-400 border border-amber-500/25',
  pending:           'bg-blue-500/10 text-blue-400 border border-blue-500/25',
  in_progress:       'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30',
  completed:         'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25',
  failed:            'bg-red-500/10 text-red-400 border border-red-500/25',
  ignored:           'bg-slate-500/10 text-slate-500 border border-slate-500/20',
  critical:          'bg-red-500/10 text-red-400 border border-red-500/25',
  high:              'bg-amber-500/10 text-amber-400 border border-amber-500/25',
  medium:            'bg-blue-500/10 text-blue-400 border border-blue-500/25',
  low:               'bg-slate-500/10 text-slate-400 border border-slate-500/20',
  default:           'bg-[#141828] text-[#8B91BE] border border-[#1C2038]',
  success:           'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25',
  warning:           'bg-amber-500/10 text-amber-400 border border-amber-500/25',
  error:             'bg-red-500/10 text-red-400 border border-red-500/25',
  info:              'bg-blue-500/10 text-blue-400 border border-blue-500/25',
  purple:            'bg-purple-500/10 text-purple-400 border border-purple-500/25',
};

const STATUS_LABELS: Record<string, string> = {
  awaiting_approval: 'Awaiting Approval',
  pending: 'Pending Window',
  in_progress: 'In Progress',
  completed: 'Completed',
  failed: 'Failed',
  ignored: 'Ignored',
};

const DOT_COLORS: Record<string, string> = {
  awaiting_approval: 'bg-amber-400',
  pending: 'bg-blue-400',
  in_progress: 'bg-indigo-400 animate-pulse-dot',
  completed: 'bg-emerald-400',
  failed: 'bg-red-400',
  ignored: 'bg-slate-600',
};

interface BadgeProps {
  variant: BadgeVariant;
  children?: ReactNode;
  showDot?: boolean;
  className?: string;
}

export function Badge({ variant, children, showDot = false, className }: BadgeProps) {
  const dotClass = DOT_COLORS[variant];
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide whitespace-nowrap',
      BADGE_STYLES[variant] ?? BADGE_STYLES.default,
      className
    )}>
      {showDot && (
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotClass || 'bg-slate-400')} />
      )}
      {children ?? STATUS_LABELS[variant] ?? variant}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={status as BadgeVariant} showDot>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge variant={priority as BadgeVariant}>
      {priority?.charAt(0).toUpperCase() + priority?.slice(1)}
    </Badge>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning';
type BtnSize = 'xs' | 'sm' | 'md' | 'lg';

const BTN_VARIANTS: Record<BtnVariant, string> = {
  primary:   'bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_0_0_0_rgba(99,102,241,0)] hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]',
  secondary: 'bg-[#0F1225] text-[#8B91BE] border border-[#1C2038] hover:bg-[#141828] hover:text-[#C4C8E8] hover:border-[#252C4A]',
  ghost:     'bg-transparent text-[#8B91BE] hover:bg-[#141828] hover:text-[#C4C8E8]',
  danger:    'bg-red-500/10 text-red-400 border border-red-500/25 hover:bg-red-500/20',
  success:   'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20',
  warning:   'bg-amber-500/10 text-amber-400 border border-amber-500/25 hover:bg-amber-500/20',
};

const BTN_SIZES: Record<BtnSize, string> = {
  xs: 'px-2.5 py-1 text-[11px] gap-1',
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-sm gap-2',
};

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

export const Btn = forwardRef<HTMLButtonElement, BtnProps>(
  ({ variant = 'secondary', size = 'md', loading, icon, iconRight, children, className, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold rounded-[8px] transition-all duration-150 select-none whitespace-nowrap',
        BTN_VARIANTS[variant],
        BTN_SIZES[size],
        (disabled || loading) && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      )}
      {...props}
    >
      {loading ? <Spinner size={12} /> : icon}
      {children}
      {iconRight}
    </button>
  )
);
Btn.displayName = 'Btn';

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={cn('animate-spin', className)}
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
interface CardProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  glow?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, style, glow, onClick }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[14px] transition-all duration-200',
        glow && 'hover:border-indigo-500/30 hover:shadow-[0_0_24px_rgba(99,102,241,0.08)]',
        onClick && 'cursor-pointer',
        className
      )}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', ...style }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'from-indigo-600 to-violet-600',
  'from-emerald-600 to-teal-600',
  'from-amber-600 to-orange-600',
  'from-rose-600 to-pink-600',
  'from-cyan-600 to-blue-600',
];

export function Avatar({
  name,
  size = 32,
  className,
}: {
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const initials = name
    ? name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
    : '??';
  const colorIdx = name ? name.charCodeAt(0) % AVATAR_COLORS.length : 0;

  return (
    <div
      className={cn(
        `bg-gradient-to-br ${AVATAR_COLORS[colorIdx]} flex items-center justify-center flex-shrink-0 font-bold text-white`,
        className
      )}
      style={{
        width: size,
        height: size,
        borderRadius: Math.floor(size * 0.28),
        fontSize: size * 0.36,
        fontFamily: 'var(--font-display)',
      }}
    >
      {initials}
    </div>
  );
}

// ── ProgressBar ───────────────────────────────────────────────────────────────
interface ProgressBarProps {
  value: number;
  color?: string;
  height?: number;
  animated?: boolean;
  showLabel?: boolean;
}

export function ProgressBar({
  value,
  color = '#6366F1',
  height = 5,
  animated = false,
  showLabel = false,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value || 0));
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height, background: 'var(--bg-active)' }}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-700 ease-out')}
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      {showLabel && (
        <span className="text-[11px] font-mono text-[#8B91BE] w-8 text-right">{pct}%</span>
      )}
    </div>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px', className)} style={{ background: 'var(--border)' }} />;
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
          {icon}
        </div>
      )}
      <div className="font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{title}</div>
      {description && <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{description}</div>}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded', className)} />;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const MODAL_WIDTHS = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className={cn(
          'rounded-[16px] w-full max-h-[85vh] overflow-y-auto animate-fade-up shadow-[0_24px_80px_rgba(0,0,0,0.8)]',
          MODAL_WIDTHS[size]
        )}
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
              style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
            >
              ×
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
// ── Input / Textarea ──────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{label}</label>}
      <input
        className={cn(
          'w-full px-3 py-2.5 rounded-[8px] border outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all',
          error ? 'border-red-500/50' : 'focus:border-indigo-500/50',
          className
        )}
        style={{ background: 'var(--bg-surface)', borderColor: error ? undefined : 'var(--border)', color: 'var(--text-primary)' }}
        {...props}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
      {hint && !error && <span className="text-xs text-[#454C75]">{hint}</span>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{label}</label>}
      <textarea
        className={cn(
          'w-full px-3 py-2.5 rounded-[8px] border outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all resize-none',
          error ? 'border-red-500/50' : 'focus:border-indigo-500/50',
          className
        )}
        style={{ background: 'var(--bg-surface)', borderColor: error ? undefined : 'var(--border)', color: 'var(--text-primary)' }}
        {...props}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  error?: string;
}

export function Select({ label, options, error, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{label}</label>}
      <select
        className={cn(
          'w-full px-3 py-2.5 rounded-[8px] border outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all',
          error ? 'border-red-500/50' : 'focus:border-indigo-500/50',
          className
        )}
        style={{ background: 'var(--bg-surface)', borderColor: error ? undefined : 'var(--border)', color: 'var(--text-primary)' }}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: 'var(--bg-surface)' }}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
export function Tooltip({ children, content }: { children: ReactNode; content: string }) {
  return (
    <div className="relative group">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-[#1C2038] border border-[#252C4A] rounded-md text-[11px] text-[#C4C8E8] whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
        {content}
      </div>
    </div>
  );
}

// ── Tag chip ──────────────────────────────────────────────────────────────────
export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center px-2 py-0.5 rounded-[5px] text-[11px] font-medium', className)}
      style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
    >
      {children}
    </span>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
export function SectionHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-4', className)}>
      <div>
        <h2 className="font-display text-base font-bold text-[#E8EAF6] tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-[#8B91BE] mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────
export function TabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-0.5 mb-4" style={{ borderBottom: '1px solid var(--border)' }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-all duration-150 flex items-center gap-2',
            active === t.id
              ? 'text-indigo-400 border-indigo-500'
              : 'border-transparent hover:border-[#252C4A]'
          )}
          style={{ color: active === t.id ? undefined : 'var(--text-secondary)' }}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={cn(
              'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
              active === t.id ? 'bg-indigo-500/20 text-indigo-400' : 'bg-[#141828] text-[#454C75]'
            )}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
