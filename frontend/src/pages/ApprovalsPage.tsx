import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, PriorityBadge, Skeleton, EmptyState, Badge } from '@/components/ui';
import { crApi } from '@/lib/api';
import { fmtDate, fmtChangeWindow, fmtRelative } from '@/lib/utils';
import type { ChangeRequest } from '@/types';
import { CheckCircle, Clock, ArrowRight, User, Calendar } from 'lucide-react';

export function ApprovalsPage() {
  const navigate = useNavigate();
  const [crs, setCrs] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    crApi.list({ status: 'awaiting_approval', page_size: 50 })
      .then((r) => setCrs(r.data.items))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout breadcrumbs={['PatchOps', 'Approvals']}>
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-[10px] flex items-center justify-center"
            style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}
          >
            <CheckCircle size={18} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#E8EAF6]" style={{ fontFamily: 'var(--font-display)' }}>
              Pending Approvals
            </h1>
            <p className="text-sm text-[#454C75]">Change requests awaiting sign-off before execution</p>
          </div>
          {!loading && (
            <Badge variant="warning" className="ml-auto">
              {crs.length} pending
            </Badge>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-5">
                <Skeleton className="h-5 w-48 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </Card>
            ))}
          </div>
        ) : crs.length === 0 ? (
          <EmptyState
            icon={<CheckCircle size={24} />}
            title="No pending approvals"
            description="All change requests have been processed"
          />
        ) : (
          <div className="flex flex-col gap-3">
            {crs.map((cr) => (
              <Card
                key={cr.id}
                className="p-5 cursor-pointer group"
                glow
                onClick={() => navigate(`/cr/${cr.cr_number}`)}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono text-xs text-indigo-400 font-medium">{cr.cr_number}</span>
                      <PriorityBadge priority={cr.priority} />
                    </div>
                    <h3 className="text-sm font-semibold text-[#C4C8E8] truncate">{cr.title}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-[#454C75] group-hover:text-indigo-400 transition-colors flex-shrink-0">
                    <span className="text-xs">Review</span>
                    <ArrowRight size={14} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-3 border-t border-[#1C2038]">
                  <div className="flex items-center gap-2">
                    <User size={13} className="text-[#454C75]" />
                    <div>
                      <div className="text-[10px] text-[#454C75] uppercase tracking-wider">Requested by</div>
                      <div className="text-xs text-[#8B91BE] font-medium mt-0.5">{cr.requested_by ?? '—'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User size={13} className="text-[#454C75]" />
                    <div>
                      <div className="text-[10px] text-[#454C75] uppercase tracking-wider">Approver</div>
                      <div className="text-xs text-[#8B91BE] font-medium mt-0.5">{cr.approver_name ?? '—'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={13} className="text-[#454C75]" />
                    <div>
                      <div className="text-[10px] text-[#454C75] uppercase tracking-wider">Change Window</div>
                      <div className="text-xs text-[#8B91BE] font-mono mt-0.5">
                        {fmtChangeWindow(cr.change_window_start, cr.change_window_end, cr.change_window_timezone)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1.5 text-[#454C75]">
                    <Clock size={12} />
                    <span className="text-xs">Received {fmtRelative(cr.received_at)}</span>
                  </div>
                  <div className="text-xs text-[#454C75]">
                    {cr.total_servers} server{cr.total_servers !== 1 ? 's' : ''} in scope
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
