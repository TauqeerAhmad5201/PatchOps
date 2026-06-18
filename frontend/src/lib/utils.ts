import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'MMM d, HH:mm');
  } catch {
    return '—';
  }
}

export function fmtDateFull(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'MMM d yyyy, HH:mm:ss');
  } catch {
    return '—';
  }
}

export function fmtRelative(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return '—';
  }
}

export function fmtChangeWindow(
  start?: string | null,
  end?: string | null,
  tz?: string | null
): string {
  if (!start || !end) return '—';
  try {
    const s = format(parseISO(start), 'MMM d, HH:mm');
    const e = format(parseISO(end), 'HH:mm');
    return `${s} – ${e}${tz ? ` ${tz}` : ''}`;
  } catch {
    return '—';
  }
}

export function getInitials(name?: string | null): string {
  if (!name) return '??';
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export const STATUS_LABELS: Record<string, string> = {
  awaiting_approval: 'Awaiting Approval',
  pending: 'Pending Window',
  in_progress: 'In Progress',
  completed: 'Completed',
  failed: 'Failed',
  ignored: 'Ignored',
};

export const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const AGENT_LABELS: Record<string, string> = {
  baseline: 'Baseline Agent',
  execution: 'Execution Agent',
  validation: 'Validation Agent',
  rca: 'RCA Agent',
};

export const LOG_LEVEL_COLORS: Record<string, string> = {
  INFO: 'text-slate-400',
  SUCCESS: 'text-emerald-400',
  WARNING: 'text-amber-400',
  ERROR: 'text-red-400',
  DEBUG: 'text-indigo-400',
};

export const DAYS_MAP: Record<string, string> = {
  '0': 'Mon',
  '1': 'Tue',
  '2': 'Wed',
  '3': 'Thu',
  '4': 'Fri',
  '5': 'Sat',
  '6': 'Sun',
};

export function parseDays(allowed: string): string {
  return allowed
    .split(',')
    .map((d) => DAYS_MAP[d.trim()] ?? d)
    .join(', ');
}
