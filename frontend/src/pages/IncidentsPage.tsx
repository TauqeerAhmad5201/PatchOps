import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, Skeleton, EmptyState, Badge, Modal, Btn } from '@/components/ui';
import { reportApi } from '@/lib/api';
import { fmtDate, fmtRelative } from '@/lib/utils';
import type { Incident } from '@/types';
import {
  AlertTriangle, Server, FileText, Brain, CheckCircle2,
  Clock, ExternalLink, ChevronRight, Loader2
} from 'lucide-react';

export function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Incident | null>(null);

  useEffect(() => {
    reportApi.incidents()
      .then((r) => setIncidents(r.data))
      .finally(() => setLoading(false));
  }, []);

  const openCount = incidents.filter((i) => i.status === 'open').length;
  const rcaDoneCount = incidents.filter((i) => i.rca_completed_at).length;

  return (
    <Layout breadcrumbs={['PatchOps', 'Incidents & RCA']}>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-red-400" />
            <span className="text-xs text-[#454C75]">Open Incidents</span>
          </div>
          <div className="text-2xl font-black text-red-400" style={{ fontFamily: 'var(--font-display)' }}>
            {loading ? '...' : openCount}
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Brain size={14} className="text-purple-400" />
            <span className="text-xs text-[#454C75]">RCA Completed</span>
          </div>
          <div className="text-2xl font-black text-purple-400" style={{ fontFamily: 'var(--font-display)' }}>
            {loading ? '...' : rcaDoneCount}
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={14} className="text-[#8B91BE]" />
            <span className="text-xs text-[#454C75]">Total Incidents</span>
          </div>
          <div className="text-2xl font-black text-[#E8EAF6]" style={{ fontFamily: 'var(--font-display)' }}>
            {loading ? '...' : incidents.length}
          </div>
        </Card>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-48 mb-2" />
              <Skeleton className="h-3 w-full" />
            </Card>
          ))}
        </div>
      ) : incidents.length === 0 ? (
        <EmptyState icon={<AlertTriangle size={24} />} title="No incidents" description="Server failures will create incidents here automatically" />
      ) : (
        <div className="flex flex-col gap-3">
          {incidents.map((inc) => (
            <Card
              key={inc.id}
              className="p-4 cursor-pointer group"
              glow
              onClick={() => setSelected(inc)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    {inc.sn_incident_number && (
                      <span className="font-mono text-xs text-purple-400 font-medium">{inc.sn_incident_number}</span>
                    )}
                    <Badge variant={inc.status === 'open' ? 'error' : 'success'}>
                      {inc.status}
                    </Badge>
                    {inc.rca_completed_at ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        <Brain size={9} />
                        RCA Complete
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Loader2 size={9} className="animate-spin" />
                        RCA Pending
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-[#C4C8E8] truncate">{inc.title ?? 'Server Failure Incident'}</h3>
                  {inc.server_hostname && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Server size={11} className="text-[#454C75]" />
                      <span className="font-mono text-xs text-[#454C75]">{inc.server_hostname}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[#454C75] group-hover:text-indigo-400 transition-colors flex-shrink-0">
                  <span className="text-xs">View RCA</span>
                  <ChevronRight size={14} />
                </div>
              </div>

              {inc.rca_root_cause && (
                <div className="mt-3 pt-3 border-t border-[#1C2038]">
                  <div className="text-[10px] font-bold text-[#454C75] uppercase tracking-wider mb-1">Root Cause</div>
                  <p className="text-xs text-[#8B91BE] line-clamp-2">{inc.rca_root_cause}</p>
                </div>
              )}

              <div className="flex items-center justify-between mt-3 text-[10px] text-[#454C75]">
                <span>Created {fmtRelative(inc.created_at)}</span>
                {inc.email_sent && <span className="text-emerald-500">✓ Email sent</span>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* RCA detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.sn_incident_number ?? 'Incident Detail'}
        size="lg"
      >
        {selected && (
          <div className="flex flex-col gap-4">
            {/* Status row */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={selected.status === 'open' ? 'error' : 'success'}>{selected.status}</Badge>
              {selected.server_hostname && (
                <div className="flex items-center gap-1 font-mono text-xs text-[#8B91BE]">
                  <Server size={11} />
                  {selected.server_hostname}
                </div>
              )}
              {selected.email_sent && (
                <span className="text-xs text-emerald-400">✓ Notification sent</span>
              )}
            </div>

            {selected.description && (
              <div>
                <div className="text-xs font-bold text-[#8B91BE] uppercase tracking-wider mb-1.5">Description</div>
                <p className="text-sm text-[#C4C8E8] leading-relaxed">{selected.description}</p>
              </div>
            )}

            {selected.rca_root_cause && (
              <div
                className="p-4 rounded-[10px]"
                style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Brain size={14} className="text-purple-400" />
                  <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Root Cause</span>
                </div>
                <p className="text-sm text-[#C4C8E8] leading-relaxed">{selected.rca_root_cause}</p>
              </div>
            )}

            {selected.rca_analysis && (
              <div>
                <div className="text-xs font-bold text-[#8B91BE] uppercase tracking-wider mb-1.5">Full RCA Analysis</div>
                <div
                  className="p-3 rounded-[8px] overflow-y-auto max-h-64 font-mono text-xs text-[#8B91BE] leading-relaxed whitespace-pre-wrap"
                  style={{ background: '#06080F', border: '1px solid #1C2038' }}
                >
                  {selected.rca_analysis}
                </div>
              </div>
            )}

            {selected.rca_steps && (
              <div>
                <div className="text-xs font-bold text-[#8B91BE] uppercase tracking-wider mb-1.5">Remediation Steps</div>
                <div
                  className="p-3 rounded-[8px] text-xs text-[#C4C8E8] leading-relaxed whitespace-pre-wrap"
                  style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}
                >
                  {selected.rca_steps}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[#1C2038]">
              <span className="text-xs text-[#454C75]">
                {selected.rca_completed_at ? `RCA completed ${fmtDate(selected.rca_completed_at)}` : 'RCA in progress...'}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
