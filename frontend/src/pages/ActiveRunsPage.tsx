import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, ProgressBar, Skeleton, EmptyState, Badge } from '@/components/ui';
import { crApi } from '@/lib/api';
import { fmtDate, fmtRelative } from '@/lib/utils';
import type { ChangeRequest } from '@/types';
import { Zap, Server, ArrowRight, CheckCircle2, XCircle, Clock } from 'lucide-react';

export function ActiveRunsPage() {
  const navigate = useNavigate();
  const [crs, setCrs] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    crApi.list({ status: 'in_progress', page_size: 20 })
      .then((r) => setCrs(r.data.items))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, []);

  return (
    <Layout breadcrumbs={['PatchOps', 'Active Runs']}>
      <div className="w-full">
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-[10px] flex items-center justify-center"
            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}
          >
            <Zap size={18} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#E8EAF6]" style={{ fontFamily: 'var(--font-display)' }}>
              Active Runs
            </h1>
            <p className="text-sm text-[#454C75]">Live execution status for in-progress change requests</p>
          </div>
          {!loading && (
            <div className="ml-auto flex items-center gap-1.5 text-xs text-[#454C75]">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse-dot" />
              Auto-refreshing every 10s
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="p-5">
                <Skeleton className="h-5 w-48 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-6 w-full" />
              </Card>
            ))}
          </div>
        ) : crs.length === 0 ? (
          <EmptyState
            icon={<Zap size={24} />}
            title="No active runs"
            description="Change requests will appear here when execution begins"
          />
        ) : (
          <div className="flex flex-col gap-4">
            {crs.map((cr) => (
              <Card
                key={cr.id}
                glow
                className="p-5 cursor-pointer group w-full"
                onClick={() => navigate(`/cr/${cr.cr_number}`)}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono text-xs text-indigo-400 font-medium">{cr.cr_number}</span>
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse-dot" />
                        Live
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-[#C4C8E8]">{cr.title}</h3>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#454C75] group-hover:text-indigo-400 transition-colors">
                    <span className="text-xs">View Details</span>
                    <ArrowRight size={14} />
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[#8B91BE]">Overall Progress</span>
                    <span className="text-xs font-mono text-indigo-400 font-medium">{cr.progress_percent}%</span>
                  </div>
                  <ProgressBar value={cr.progress_percent} color="#6366F1" height={6} animated />
                </div>

                {/* Server stats */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="flex items-center gap-2">
                    <Server size={13} className="text-[#454C75]" />
                    <div>
                      <div className="text-xs font-bold text-[#C4C8E8]">{cr.total_servers}</div>
                      <div className="text-[10px] text-[#454C75]">Total</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-emerald-400" />
                    <div>
                      <div className="text-xs font-bold text-emerald-400">{cr.completed_servers}</div>
                      <div className="text-[10px] text-[#454C75]">Done</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={13} className="text-indigo-400" />
                    <div>
                      <div className="text-xs font-bold text-indigo-400">
                        {cr.total_servers - cr.completed_servers - cr.failed_servers}
                      </div>
                      <div className="text-[10px] text-[#454C75]">Running</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle size={13} className={cr.failed_servers > 0 ? 'text-red-400' : 'text-[#454C75]'} />
                    <div>
                      <div className={`text-xs font-bold ${cr.failed_servers > 0 ? 'text-red-400' : 'text-[#454C75]'}`}>
                        {cr.failed_servers}
                      </div>
                      <div className="text-[10px] text-[#454C75]">Failed</div>
                    </div>
                  </div>
                </div>

                {/* Time */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1C2038]">
                  <span className="text-xs text-[#454C75]">Started {fmtRelative(cr.started_at)}</span>
                  {cr.approved_by && (
                    <span className="text-xs text-[#454C75]">Approved by {cr.approved_by}</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
