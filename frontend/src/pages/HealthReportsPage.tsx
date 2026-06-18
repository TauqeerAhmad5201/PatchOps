import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, Skeleton, EmptyState, Badge, ProgressBar } from '@/components/ui';
import { crApi } from '@/lib/api';
import { fmtDate, fmtChangeWindow } from '@/lib/utils';
import type { ChangeRequest, ServerTask } from '@/types';
import { Activity, CheckCircle2, XCircle, AlertTriangle, Server, ArrowRight } from 'lucide-react';

export function HealthReportsPage() {
  const navigate = useNavigate();
  const [crs, setCrs] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'completed' | 'failed' | ''>('');

  useEffect(() => {
    const status = filterStatus || undefined;
    Promise.all([
      crApi.list({ status: status ?? ['completed', 'failed'].join(','), page_size: 50 }),
    ]).then(([r]) => setCrs(r.data.items.filter((c: ChangeRequest) => ['completed', 'failed'].includes(c.status))))
      .finally(() => setLoading(false));
  }, [filterStatus]);

  const successCount = crs.filter((c) => c.status === 'completed').length;
  const failedCount = crs.filter((c) => c.status === 'failed').length;
  const totalServers = crs.reduce((acc, c) => acc + c.total_servers, 0);
  const failedServers = crs.reduce((acc, c) => acc + c.failed_servers, 0);

  return (
    <Layout breadcrumbs={['PatchOps', 'Health Reports']}>
      {/* Header stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={14} className="text-indigo-400" />
            <span className="text-xs text-[#454C75] font-medium">Total Executed</span>
          </div>
          <div className="text-2xl font-black text-[#E8EAF6]" style={{ fontFamily: 'var(--font-display)' }}>
            {loading ? '...' : crs.length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span className="text-xs text-[#454C75] font-medium">Completed</span>
          </div>
          <div className="text-2xl font-black text-emerald-400" style={{ fontFamily: 'var(--font-display)' }}>
            {loading ? '...' : successCount}
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle size={14} className="text-red-400" />
            <span className="text-xs text-[#454C75] font-medium">Failed</span>
          </div>
          <div className="text-2xl font-black text-red-400" style={{ fontFamily: 'var(--font-display)' }}>
            {loading ? '...' : failedCount}
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Server size={14} className="text-[#8B91BE]" />
            <span className="text-xs text-[#454C75] font-medium">Server Success Rate</span>
          </div>
          <div className="text-2xl font-black text-[#E8EAF6]" style={{ fontFamily: 'var(--font-display)' }}>
            {loading || totalServers === 0 ? '—' : `${Math.round((totalServers - failedServers) / totalServers * 100)}%`}
          </div>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-4">
        {(['', 'completed', 'failed'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-[7px] transition-all ${filterStatus === s ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25' : 'bg-[#0F1225] text-[#8B91BE] border border-[#1C2038] hover:bg-[#141828]'}`}
          >
            {s === '' ? 'All' : s === 'completed' ? 'Completed' : 'Failed'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-48 mb-3" />
              <Skeleton className="h-3 w-full" />
            </Card>
          ))}
        </div>
      ) : crs.length === 0 ? (
        <EmptyState icon={<Activity size={24} />} title="No completed runs yet" />
      ) : (
        <div className="flex flex-col gap-3">
          {crs.map((cr) => (
            <Card
              key={cr.id}
              className="p-4 cursor-pointer group"
              glow
              onClick={() => navigate(`/cr/${cr.cr_number}`)}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-indigo-400">{cr.cr_number}</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cr.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                      {cr.status === 'completed' ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
                      {cr.status === 'completed' ? 'Completed' : 'Failed'}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-[#C4C8E8]">{cr.title}</div>
                </div>
                <ArrowRight size={14} className="text-[#454C75] group-hover:text-indigo-400 transition-colors flex-shrink-0 mt-1" />
              </div>

              {/* Server health grid */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <div className="text-[10px] text-[#454C75] mb-1">Servers</div>
                  <ProgressBar
                    value={cr.total_servers > 0 ? ((cr.completed_servers) / cr.total_servers) * 100 : 0}
                    color={cr.failed_servers > 0 ? '#EF4444' : '#10B981'}
                    height={4}
                  />
                  <div className="text-[10px] font-mono text-[#8B91BE] mt-0.5">
                    {cr.completed_servers}/{cr.total_servers}
                    {cr.failed_servers > 0 && <span className="text-red-400"> · {cr.failed_servers} failed</span>}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#454C75] mb-1">Change Window</div>
                  <div className="text-xs text-[#8B91BE] font-mono">
                    {fmtChangeWindow(cr.change_window_start, cr.change_window_end, cr.change_window_timezone)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#454C75] mb-1">Completed</div>
                  <div className="text-xs text-[#8B91BE]">{fmtDate(cr.completed_at)}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
}
