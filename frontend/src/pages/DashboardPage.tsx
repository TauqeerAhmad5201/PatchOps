import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, StatusBadge, PriorityBadge, ProgressBar, Skeleton, Badge } from '@/components/ui';
import { crApi, reportApi } from '@/lib/api';
import { fmtDate, fmtRelative, fmtChangeWindow } from '@/lib/utils';
import type { ChangeRequest, DashboardSummary } from '@/types';
import {
  Server, CheckCircle2, Clock, AlertTriangle, Zap, TrendingUp,
  ArrowRight, RefreshCw, Search, SlidersHorizontal
} from 'lucide-react';

const STAT_CONFIG = [
  { key: 'in_progress', label: 'Active Runs', color: '#6366F1', icon: Zap, glow: 'rgba(99,102,241,0.2)' },
  { key: 'awaiting_approval', label: 'Awaiting Approval', color: '#F59E0B', icon: Clock, glow: 'rgba(245,158,11,0.15)' },
  { key: 'pending', label: 'Pending Window', color: '#60A5FA', icon: Server, glow: 'rgba(96,165,250,0.15)' },
  { key: 'completed', label: 'Completed', color: '#10B981', icon: CheckCircle2, glow: 'rgba(16,185,129,0.15)' },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [crs, setCrs] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const [sumRes, crRes] = await Promise.all([
        reportApi.summary(),
        crApi.list({ page_size: 50, status: statusFilter || undefined }),
      ]);
      setSummary(sumRes.data);
      setCrs(crRes.data.items);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  // Auto-refresh every 15s when there are active runs
  useEffect(() => {
    const hasActive = crs.some((c) => c.status === 'in_progress');
    if (!hasActive) return;
    const t = setInterval(() => load(true), 15_000);
    return () => clearInterval(t);
  }, [crs]);

  const filtered = crs.filter((c) =>
    !filter ||
    c.cr_number.toLowerCase().includes(filter.toLowerCase()) ||
    c.title.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <Layout breadcrumbs={['PatchOps', 'Dashboard']}>
      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {STAT_CONFIG.map(({ key, label, color, icon: Icon, glow }) => (
          <Card
            key={key}
            className="p-4 relative overflow-hidden cursor-pointer group"
            onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
            glow
          >
            <div
              className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none transition-opacity duration-200 group-hover:opacity-100 opacity-60"
              style={{ background: `radial-gradient(circle at 100% 0%, ${glow} 0%, transparent 70%)`, transform: 'translate(30%, -30%)' }}
            />
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}20`, border: `1px solid ${color}30` }}
              >
                <Icon size={15} style={{ color }} />
              </div>
              {statusFilter === key && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}20`, color }}>
                  Active filter
                </span>
              )}
            </div>
            {loading ? (
              <Skeleton className="h-8 w-12 mb-1" />
            ) : (
              <div
                className="text-3xl font-black leading-none mb-1"
                style={{ fontFamily: 'var(--font-display)', color }}
              >
                {summary?.by_status?.[key] ?? 0}
              </div>
            )}
            <div className="text-xs text-[#8B91BE] font-medium">{label}</div>
          </Card>
        ))}
      </div>

      {/* Success rate + recent activity strip */}
      {summary && (
        <div className="flex gap-4 mb-5">
          <Card className="flex-1 p-4 flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              <TrendingUp size={18} className="text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-[#8B91BE] mb-1">Overall Success Rate</div>
              <ProgressBar value={summary.success_rate} color="#10B981" height={6} />
            </div>
            <div
              className="text-2xl font-black text-emerald-400"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {summary.success_rate}%
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="text-center">
              <div className="text-2xl font-black text-[#E8EAF6]" style={{ fontFamily: 'var(--font-display)' }}>
                {summary.total_crs}
              </div>
              <div className="text-xs text-[#8B91BE]">Total CRs</div>
            </div>
            <div className="w-px h-8 bg-[#1C2038]" />
            <div className="text-center">
              <div className="text-2xl font-black text-red-400" style={{ fontFamily: 'var(--font-display)' }}>
                {summary.total_incidents}
              </div>
              <div className="text-xs text-[#8B91BE]">Incidents</div>
            </div>
          </Card>
        </div>
      )}

      {/* CR List */}
      <Card className="overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-3 p-4 border-b border-[#1C2038]">
          <h3 className="font-bold text-sm text-[#C4C8E8]" style={{ fontFamily: 'var(--font-display)' }}>
            Change Requests
          </h3>
          {statusFilter && (
            <Badge variant={statusFilter as 'in_progress'} className="cursor-pointer" >
              {statusFilter.replace('_', ' ')} ×
            </Badge>
          )}
          <div className="ml-auto flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#454C75]" />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search CRs..."
                className="pl-8 pr-3 py-1.5 rounded-[7px] bg-[#090B18] border border-[#1C2038] text-sm text-[#C4C8E8] placeholder:text-[#454C75] outline-none focus:border-indigo-500/40 w-48 transition-all"
              />
            </div>
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="w-7 h-7 rounded-[7px] bg-[#141828] border border-[#1C2038] flex items-center justify-center text-[#8B91BE] hover:text-[#C4C8E8] hover:bg-[#1C2038] transition-all"
            >
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1C2038]">
                {['CR Number', 'Title', 'Status', 'Priority', 'Servers', 'Progress', 'Change Window', 'Received'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[#454C75] whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#1C2038]/50">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-[#454C75]">
                    No change requests found
                  </td>
                </tr>
              ) : (
                filtered.map((cr) => (
                  <tr
                    key={cr.id}
                    className="border-b border-[#1C2038]/50 hover:bg-[#141828]/50 cursor-pointer transition-colors group"
                    onClick={() => navigate(`/cr/${cr.cr_number}`)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-xs text-indigo-400 font-medium">{cr.cr_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-[#C4C8E8] font-medium truncate max-w-[260px]">{cr.title}</div>
                      {cr.requested_by && (
                        <div className="text-xs text-[#454C75] truncate">{cr.requested_by}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={cr.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <PriorityBadge priority={cr.priority} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-[#C4C8E8] font-medium">{cr.total_servers}</span>
                        {cr.failed_servers > 0 && (
                          <span className="text-xs text-red-400">({cr.failed_servers} failed)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-28">
                        <ProgressBar
                          value={cr.progress_percent}
                          color={cr.status === 'failed' ? '#EF4444' : cr.status === 'completed' ? '#10B981' : '#6366F1'}
                          height={4}
                        />
                        <div className="text-[10px] text-[#454C75] mt-0.5 font-mono">{cr.progress_percent}%</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs text-[#8B91BE] font-mono">
                        {fmtChangeWindow(cr.change_window_start, cr.change_window_end, cr.change_window_timezone)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs text-[#454C75]">{fmtRelative(cr.received_at)}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </Layout>
  );
}
