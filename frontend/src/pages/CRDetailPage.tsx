import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import {
  Card, StatusBadge, PriorityBadge, ProgressBar, Spinner, Btn,
  Badge, Divider, Tag, TabBar, Modal
} from '@/components/ui';
import { crApi } from '@/lib/api';
import { useLogStream } from '@/hooks/useLogStream';
import { fmtDate, fmtDateFull, fmtChangeWindow, fmtRelative, LOG_LEVEL_COLORS, AGENT_LABELS } from '@/lib/utils';
import type { ChangeRequest, ServerTask } from '@/types';
import {
  ArrowLeft, Server, CheckCircle2, XCircle, Clock,
  Terminal, ChevronRight, AlertTriangle, Info, Globe,
  Wifi, WifiOff, Loader2, Check, X, Layers, Activity
} from 'lucide-react';

// ── Dependency Graph SVG ──────────────────────────────────────────────────────
interface GraphProps {
  buckets: string[][];
  pauseServers?: string[];
  completedServers?: string[];
  activeServers?: string[];
}

function DependencyGraph({ buckets, pauseServers = [], completedServers = [], activeServers = [] }: GraphProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const pauseSet = new Set(pauseServers);
  const doneSet = new Set(completedServers);
  const activeSet = new Set(activeServers);

  const W = 640, H = 260, padX = 32, padY = 28, nW = 110, nH = 36;
  const numLevels = buckets.length;
  const xStep = numLevels > 1 ? (W - 2 * padX - nW) / (numLevels - 1) : 0;

  const pos: Record<string, { x: number; y: number; bucket: number }> = {};
  buckets.forEach((servers, bi) => {
    const x = padX + bi * xStep;
    servers.forEach((srv, si) => {
      const yStep = (H - 2 * padY) / Math.max(servers.length, 1);
      pos[srv] = { x: x + nW / 2, y: padY + si * yStep + yStep / 2, bucket: bi };
    });
  });

  // Draw edges between consecutive buckets (all-to-all between bucket N and N+1)
  const edges: { from: string; to: string }[] = [];
  buckets.forEach((servers, bi) => {
    if (bi === 0) return;
    buckets[bi - 1].forEach(from => {
      servers.forEach(to => edges.push({ from, to }));
    });
  });

  const getNodeStyle = (srv: string) => {
    if (doneSet.has(srv)) return { bg: '#0D2A1A', border: '#166534', text: '#4ADE80', dot: '#22C55E', glow: false };
    if (activeSet.has(srv)) return { bg: '#1A1505', border: '#92400E', text: '#FCD34D', dot: '#F59E0B', glow: true };
    return { bg: '#0E1225', border: '#1C2038', text: '#8B91BE', dot: '#454C75', glow: false };
  };

  return (
    <div style={{ background: '#06080F', borderRadius: 10, border: '1px solid #1C2038', overflow: 'hidden' }}>
      {/* Bucket labels */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1C2038' }}>
        {buckets.map((servers, bi) => (
          <div key={bi} style={{
            flex: 1, padding: '6px 8px', textAlign: 'center',
            fontSize: 10, fontWeight: 700, color: '#454C75',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            borderRight: bi < buckets.length - 1 ? '1px solid #1C2038' : 'none',
            background: activeServers.some(s => buckets[bi].includes(s)) ? 'rgba(99,102,241,0.06)' :
                        completedServers.some(s => buckets[bi].includes(s)) ? 'rgba(16,185,129,0.04)' : 'transparent',
          }}>
            Bucket {bi + 1}
            <span style={{ color: '#2A3055', marginLeft: 4 }}>({servers.length})</span>
          </div>
        ))}
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        <defs>
          <marker id="dep-arr" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
            <polygon points="0 0, 6 2, 0 4" fill="#1C2038" />
          </marker>
          <marker id="dep-arr-done" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
            <polygon points="0 0, 6 2, 0 4" fill="#166534" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((e, i) => {
          const fp = pos[e.from], tp = pos[e.to];
          if (!fp || !tp) return null;
          const sx = fp.x + nW / 2, ex = tp.x - nW / 2;
          const isDone = doneSet.has(e.from) && doneSet.has(e.to);
          return (
            <line key={i} x1={sx} y1={fp.y} x2={ex} y2={tp.y}
              stroke={isDone ? '#166534' : '#1C2038'} strokeWidth={isDone ? 1.5 : 1}
              markerEnd={`url(#dep-arr${isDone ? '-done' : ''})`} opacity={0.7} />
          );
        })}

        {/* Nodes */}
        {Object.entries(pos).map(([srv, p]) => {
          const s = getNodeStyle(srv);
          const isHov = hovered === srv;
          const hasPause = pauseSet.has(srv);
          const isActive = activeSet.has(srv);
          return (
            <g key={srv} transform={`translate(${p.x - nW / 2},${p.y - nH / 2})`}
              onMouseEnter={() => setHovered(srv)} onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'default' }}>
              {isActive && (
                <rect x={-2} y={-2} width={nW + 4} height={nH + 4} rx={9} fill="none"
                  stroke="#F59E0B" strokeWidth="1" opacity="0.5"
                  style={{ animation: 'pulse 1.8s ease-in-out infinite' }} />
              )}
              <rect width={nW} height={nH} rx={7}
                fill={s.bg} stroke={isHov ? '#6366F1' : s.border}
                strokeWidth={isHov ? 1.5 : 1} />
              <circle cx={nW - 10} cy={nH / 2} r={4} fill={s.dot} opacity={0.9} />
              {hasPause && (
                <text x={10} y={13} fontSize="8" fill="#A855F7" fontFamily="monospace" opacity="0.8">pause</text>
              )}
              <text x={10} y={hasPause ? 27 : 22} fontSize="10.5" fill={s.text}
                fontWeight="700" fontFamily="'DM Mono', monospace">
                {srv.length > 12 ? srv.slice(0, 12) + '…' : srv}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, padding: '6px 12px', borderTop: '1px solid #1C2038', fontSize: 10, color: '#454C75' }}>
        {[['#22C55E', 'Completed'], ['#F59E0B', 'Active'], ['#8B91BE', 'Pending'], ['#A855F7', 'Service pause']].map(([c, l]) => (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: c, display: 'inline-block' }} />{l}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Bucket progress grid ───────────────────────────────────────────────────────
function BucketGrid({ buckets, pauseServers = [], tasks }: {
  buckets: string[][];
  pauseServers?: string[];
  tasks: import('@/types').ServerTask[];
}) {
  const taskMap: Record<string, import('@/types').ServerTask> = {};
  tasks.forEach(t => { taskMap[t.server_hostname] = t; });
  const pauseSet = new Set(pauseServers);

  const getBucketStatus = (servers: string[]) => {
    const statuses = servers.map(s => taskMap[s]?.status ?? 'queued');
    if (statuses.every(s => s === 'completed')) return 'completed';
    if (statuses.some(s => s === 'running' || s === 'rebooting')) return 'in_progress';
    if (statuses.some(s => s === 'failed')) return 'failed';
    return 'pending';
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${buckets.length}, 1fr)`, gap: 8 }}>
      {buckets.map((servers, bi) => {
        const bStatus = getBucketStatus(servers);
        const isDone = bStatus === 'completed';
        const isRunning = bStatus === 'in_progress';
        const isFailed = bStatus === 'failed';
        const completedCount = servers.filter(s => taskMap[s]?.status === 'completed').length;
        const pct = tasks.length > 0 ? Math.round((completedCount / servers.length) * 100) : (isDone ? 100 : 0);

        return (
          <div key={bi} style={{
            background: isDone ? 'rgba(16,185,129,0.06)' : isRunning ? 'rgba(99,102,241,0.08)' : '#0E1225',
            border: `1px solid ${isDone ? '#166534' : isRunning ? 'rgba(99,102,241,0.3)' : '#1C2038'}`,
            borderRadius: 10, padding: 12, transition: 'all 0.3s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: isDone ? '#4ADE80' : isRunning ? '#818CF8' : '#454C75', fontFamily: 'Outfit, sans-serif' }}>
                Bucket {bi + 1}
              </span>
              {isDone && <CheckCircle2 size={13} color="#22C55E" />}
              {isRunning && <Loader2 size={13} color="#6366F1" className="animate-spin" />}
              {isFailed && <XCircle size={13} color="#EF4444" />}
            </div>
            <div style={{ height: 4, background: '#141828', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ height: '100%', width: `${pct}%`, background: isDone ? '#10B981' : isRunning ? '#6366F1' : '#1C2038', borderRadius: 2, transition: 'width 0.6s ease' }} />
            </div>
            <div style={{ fontSize: 10, color: '#454C75', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
              <span>{isDone ? `✓ done` : isRunning ? `${pct}%` : 'waiting'}</span>
              <span>{servers.length} servers</span>
            </div>
            {servers.map(srv => {
              const t = taskMap[srv];
              const hasPause = pauseSet.has(srv);
              return (
                <div key={srv} style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                  <span style={{ fontSize: 9, color: t?.status === 'completed' ? '#22C55E' : t?.status === 'failed' ? '#EF4444' : t?.status === 'running' ? '#818CF8' : '#2A3055' }}>▸</span>
                  <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: t?.status === 'completed' ? '#22C55E' : t?.status === 'failed' ? '#EF4444' : '#454C75' }}>
                    {srv.length > 14 ? srv.slice(0, 14) + '…' : srv}
                  </span>
                  {hasPause && <span style={{ fontSize: 8, color: '#A855F7' }}>⏸</span>}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Agent Pipeline strip ───────────────────────────────────────────────────────
const AGENT_STEPS = [
  { key: 'baseline', label: 'Baseline', desc: 'Dependency analysis & ordering' },
  { key: 'execution', label: 'Execution', desc: 'Parallel server reboots' },
  { key: 'validation', label: 'Validation', desc: 'Health check & comparison' },
  { key: 'rca', label: 'RCA', desc: 'Root cause analysis' },
];

function AgentPipeline({ cr }: { cr: ChangeRequest }) {
  const getStep = () => {
    if (cr.status === 'awaiting_approval' || cr.status === 'pending') return -1;
    if (!cr.agent1_accepted) return 0;
    if (!cr.execution_accepted) return 1;
    if (cr.status === 'in_progress') return 2;
    if (cr.status === 'completed' || cr.status === 'failed') return 3;
    return 0;
  };

  const activeStep = getStep();

  return (
    <Card className="p-4 mb-4">
      <div className="text-xs font-bold text-[#8B91BE] uppercase tracking-wider mb-3">Agent Pipeline</div>
      <div className="flex items-center gap-0">
        {AGENT_STEPS.map((step, i) => {
          const isActive = i === activeStep;
          const isDone = i < activeStep || cr.status === 'completed';
          const isFailed = cr.status === 'failed' && i === activeStep;

          return (
            <div key={step.key} className="flex items-center flex-1 min-w-0">
              <div className={`flex items-center gap-2 flex-1 p-2.5 rounded-[8px] min-w-0 ${isActive ? 'bg-indigo-500/10 border border-indigo-500/25' : isDone ? 'bg-emerald-500/8' : 'bg-[#090B18]'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold
                  ${isFailed ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : isDone ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : isActive ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                    : 'bg-[#141828] text-[#454C75] border border-[#1C2038]'}`}>
                  {isFailed ? <X size={10} /> : isDone ? <Check size={10} /> : isActive ? <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse-dot" /> : i + 1}
                </div>
                <div className="min-w-0">
                  <div className={`text-xs font-semibold truncate ${isActive ? 'text-indigo-300' : isDone ? 'text-emerald-400' : 'text-[#454C75]'}`}>
                    {step.label}
                  </div>
                  <div className="text-[10px] text-[#454C75] truncate">{step.desc}</div>
                </div>
              </div>
              {i < AGENT_STEPS.length - 1 && (
                <div className={`h-px flex-shrink-0 w-4 ${i < activeStep ? 'bg-emerald-500/30' : 'bg-[#1C2038]'}`} />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Accept/Reject panel ────────────────────────────────────────────────────────
function AcceptPlanPanel({ cr, onAccepted }: { cr: ChangeRequest; onAccepted: () => void }) {
  const [loading, setLoading] = useState(false);
  const [showFull, setShowFull] = useState(false);

  const handle = async (accepted: boolean) => {
    setLoading(true);
    try {
      await crApi.acceptPlan(cr.cr_number, accepted);
      onAccepted();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-5 mb-4" style={{ border: '1px solid rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.04)' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={12} className="text-amber-400" />
        </div>
        <h3 className="text-sm font-bold text-amber-300" style={{ fontFamily: 'var(--font-display)' }}>
          Agent 1 Complete — Review Execution Plan
        </h3>
      </div>

      {cr.agent1_summary && (
        <div className="mb-4">
          <p className="text-sm text-[#C4C8E8] leading-relaxed">
            {showFull ? cr.agent1_summary : cr.agent1_summary.slice(0, 400) + (cr.agent1_summary.length > 400 ? '...' : '')}
          </p>
          {cr.agent1_summary.length > 400 && (
            <button onClick={() => setShowFull(!showFull)} className="text-xs text-indigo-400 hover:text-indigo-300 mt-1">
              {showFull ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

{cr.ordered_server_list && cr.ordered_server_list.servers.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-bold text-[#8B91BE] uppercase tracking-wider mb-2">Ordered Execution List</div>
          <div className="flex flex-wrap gap-1.5">
            {cr.ordered_server_list.servers.map((s: string, i: number) => (
              <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-[6px] bg-[#090B18] border border-[#1C2038]">
                <span className="text-[10px] font-bold text-[#454C75] w-4">{i + 1}</span>
                <span className="font-mono text-xs text-[#C4C8E8]">{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Btn
          variant="success"
          onClick={() => handle(true)}
          loading={loading}
          icon={<Check size={13} />}
        >
          Accept Plan — Start Execution
        </Btn>
        <Btn
          variant="danger"
          onClick={() => handle(false)}
          loading={loading}
          icon={<X size={13} />}
        >
          Reject Plan
        </Btn>
      </div>
    </Card>
  );
}

// ── Execution summary / Go ahead ──────────────────────────────────────────────
function ExecutionSummaryPanel({ cr, onAccepted }: { cr: ChangeRequest; onAccepted: () => void }) {
  const [loading, setLoading] = useState(false);

  const handle = async (accepted: boolean) => {
    setLoading(true);
    try {
      await crApi.acceptExecution(cr.cr_number, accepted);
      onAccepted();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-5 mb-4" style={{ border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.05)' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 size={12} className="text-indigo-400" />
        </div>
        <h3 className="text-sm font-bold text-indigo-300" style={{ fontFamily: 'var(--font-display)' }}>
          Execution Complete — Proceed to Validation?
        </h3>
      </div>

      {cr.execution_summary && (
        <p className="text-sm text-[#C4C8E8] leading-relaxed mb-4">{cr.execution_summary}</p>
      )}

      <div className="flex items-center gap-2">
        <Btn
          variant="primary"
          onClick={() => handle(true)}
          loading={loading}
          icon={<ChevronRight size={13} />}
        >
          Go Ahead — Run Validation
        </Btn>
      </div>
    </Card>
  );
}

// ── Log stream panel ──────────────────────────────────────────────────────────
function LogPanel({ crNumber, isActive }: { crNumber: string; isActive: boolean }) {
  const { logs, status } = useLogStream(crNumber, true);
  const [filter, setFilter] = useState<string>('');
  const [agentFilter, setAgentFilter] = useState<string>('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, autoScroll]);

  const filtered = logs.filter((l) => {
    if (agentFilter && l.agent !== agentFilter) return false;
    if (filter && !l.message.toLowerCase().includes(filter.toLowerCase()) && !(l.server ?? '').toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  const agents = [...new Set(logs.map((l) => l.agent).filter(Boolean))];

  const levelColor: Record<string, string> = {
    INFO: '#8B91BE',
    SUCCESS: '#10B981',
    WARNING: '#F59E0B',
    ERROR: '#EF4444',
    DEBUG: '#6366F1',
  };

  return (
    <Card className="overflow-hidden">
      {/* Log toolbar */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 border-b border-[#1C2038]"
        style={{ background: '#080A18' }}
      >
        <Terminal size={13} className="text-[#454C75] flex-shrink-0" />
        <span className="text-xs font-bold text-[#8B91BE] uppercase tracking-wider">Live Logs</span>

        {/* Status indicator */}
        <div className="flex items-center gap-1.5 ml-1">
          {status === 'live' && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
              <span className="text-[10px] text-emerald-400">Streaming</span>
            </>
          )}
          {status === 'connecting' && (
            <>
              <Loader2 size={10} className="text-amber-400 animate-spin" />
              <span className="text-[10px] text-amber-400">Connecting</span>
            </>
          )}
          {status === 'closed' && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[#454C75]" />
              <span className="text-[10px] text-[#454C75]">Closed</span>
            </>
          )}
          {status === 'error' && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span className="text-[10px] text-red-400">Error</span>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Agent filter */}
          {agents.length > 1 && (
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="text-xs bg-[#0F1225] border border-[#1C2038] text-[#8B91BE] rounded-[6px] px-2 py-1 outline-none"
            >
              <option value="">All agents</option>
              {agents.map((a) => <option key={a} value={a}>{AGENT_LABELS[a] ?? a}</option>)}
            </select>
          )}
          {/* Text filter */}
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter logs..."
            className="text-xs bg-[#0F1225] border border-[#1C2038] text-[#C4C8E8] placeholder:text-[#454C75] rounded-[6px] px-2 py-1 outline-none w-36"
          />
          <span className="text-[10px] text-[#454C75] font-mono">{filtered.length} lines</span>
        </div>
      </div>

      {/* Log body */}
      <div
        className="overflow-y-auto font-mono text-[11px] leading-5 scroll-area"
        style={{ height: 380, background: '#06080F' }}
        onScroll={(e) => {
          const el = e.currentTarget;
          const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
          setAutoScroll(atBottom);
        }}
      >
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#454C75] text-xs">
            {status === 'connecting' ? 'Connecting to log stream...' : 'No log entries yet'}
          </div>
        ) : (
          <table className="w-full border-collapse">
            <tbody>
              {filtered.map((log) => (
                <tr
                  key={log.id}
                  className="group hover:bg-[#0D1022] transition-colors"
                >
                  <td className="pl-3 pr-2 py-0.5 text-[#2A3055] whitespace-nowrap align-top w-[130px]">
                    {log.ts ? new Date(log.ts).toLocaleTimeString('en-US', { hour12: false }) : ''}
                  </td>
                  <td className="px-2 py-0.5 whitespace-nowrap align-top w-[90px]">
                    <span
                      className="text-[10px] font-bold px-1.5 py-px rounded"
                      style={{
                        color: levelColor[log.level] ?? '#8B91BE',
                        background: `${levelColor[log.level] ?? '#8B91BE'}15`,
                      }}
                    >
                      {log.level}
                    </span>
                  </td>
                  <td className="px-2 py-0.5 whitespace-nowrap align-top w-[120px] text-indigo-400/70">
                    {AGENT_LABELS[log.agent]?.split(' ')[0] ?? log.agent}
                  </td>
                  {log.server && (
                    <td className="px-2 py-0.5 whitespace-nowrap align-top w-[140px] text-[#454C75]">
                      {log.server}
                    </td>
                  )}
                  <td className="px-2 pr-3 py-0.5 align-top" style={{ color: levelColor[log.level] ?? '#8B91BE' }}>
                    {log.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div ref={bottomRef} />
      </div>
    </Card>
  );
}

// ── Server tasks table ────────────────────────────────────────────────────────
function ServerTasksTable({ tasks }: { tasks: ServerTask[] }) {
  const statusIcon: Record<string, JSX.Element> = {
    completed: <CheckCircle2 size={13} className="text-emerald-400" />,
    failed: <XCircle size={13} className="text-red-400" />,
    running: <Loader2 size={13} className="text-indigo-400 animate-spin" />,
    rebooting: <Loader2 size={13} className="text-amber-400 animate-spin" />,
    queued: <Clock size={13} className="text-[#454C75]" />,
  };

  const buckets = [...new Set(tasks.map((t) => t.bucket_number ?? 0))].sort((a, b) => a - b);

  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1C2038] flex items-center gap-2">
        <Layers size={14} className="text-[#454C75]" />
        <span className="text-xs font-bold text-[#8B91BE] uppercase tracking-wider">Server Execution Plan</span>
        <span className="ml-auto text-xs text-[#454C75]">{tasks.length} servers across {buckets.length} buckets</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1C2038]">
              {['Bucket', 'Server', 'IP', 'Service', 'Status', 'Health', 'Deviation', 'Duration'].map((h) => (
                <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[#454C75] whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => {
              const duration = t.started_at && t.completed_at
                ? Math.round((new Date(t.completed_at).getTime() - new Date(t.started_at).getTime()) / 1000)
                : null;
              return (
                <tr key={t.id} className="border-b border-[#1C2038]/50 hover:bg-[#141828]/50">
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#141828] border border-[#1C2038] text-[#8B91BE]">
                      B{t.bucket_number ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs text-[#C4C8E8]">{t.server_hostname}</span>
                    {t.requires_service_pause && (
                      <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        service-pause
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[#454C75]">{t.server_ip ?? '—'}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[#8B91BE]">{t.service_name ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {statusIcon[t.status] ?? <Clock size={13} className="text-[#454C75]" />}
                      <span className="text-xs text-[#8B91BE] capitalize">{t.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    {t.health_ok === true && <CheckCircle2 size={13} className="text-emerald-400" />}
                    {t.health_ok === false && <XCircle size={13} className="text-red-400" />}
                    {t.health_ok === null && <span className="text-xs text-[#454C75]">—</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    {t.deviation_percent !== null && t.deviation_percent !== undefined ? (
                      <span className={`font-mono text-xs ${(t.deviation_percent ?? 0) > 15 ? 'text-red-400' : 'text-[#8B91BE]'}`}>
                        {t.deviation_percent?.toFixed(1)}%
                      </span>
                    ) : <span className="text-xs text-[#454C75]">—</span>}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[#454C75]">
                    {duration !== null ? `${duration}s` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Inline log stream (no card wrapper, used inside pipeline tab) ─────────────
function InlineLogStream({ crNumber, isActive }: { crNumber: string; isActive: boolean }) {
  const { logs, status } = useLogStream(crNumber, true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, autoScroll]);

  const filtered = filter
    ? logs.filter(l => l.message.toLowerCase().includes(filter.toLowerCase()) || (l.server ?? '').toLowerCase().includes(filter.toLowerCase()))
    : logs;

  const levelColor: Record<string, string> = {
    INFO: '#8B91BE', SUCCESS: '#10B981', WARNING: '#F59E0B', ERROR: '#EF4444', DEBUG: '#6366F1',
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-3 py-1.5 flex items-center gap-2 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter..."
          className="text-xs rounded-[5px] px-2 py-1 outline-none flex-1"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
        <span className="text-[10px] font-mono flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{filtered.length} lines</span>
      </div>
      <div
        className="flex-1 overflow-y-auto font-mono text-[10.5px] leading-5"
        style={{ background: '#06080F', minHeight: 0, maxHeight: 380 }}
        onScroll={e => {
          const el = e.currentTarget;
          setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
        }}
      >
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {status === 'connecting' ? 'Connecting...' : 'No logs yet'}
          </div>
        ) : filtered.map(log => (
          <div key={log.id} className="flex gap-2 px-3 py-0.5 hover:bg-white/5">
            <span className="flex-shrink-0 w-16 text-[#2A3055]">
              {log.ts ? new Date(log.ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
            </span>
            <span className="flex-shrink-0 w-16 text-[10px] font-bold" style={{ color: levelColor[log.level] ?? '#8B91BE' }}>
              [{log.level}]
            </span>
            {log.server && <span className="flex-shrink-0 w-24 text-indigo-400/60 truncate">{log.server}</span>}
            <span style={{ color: levelColor[log.level] ?? '#8B91BE' }}>{log.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function LiveLogStatus({ crNumber }: { crNumber: string }) {
  const { logs, status } = useLogStream(crNumber, true);
  return (
    <div className="ml-auto flex items-center gap-2">
      {status === 'live' && <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" /><span className="text-[10px] text-emerald-400">Live</span></>}
      {status === 'connecting' && <><Loader2 size={10} className="text-amber-400 animate-spin" /><span className="text-[10px] text-amber-400">Connecting</span></>}
      {status === 'closed' && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Closed</span>}
      {status === 'error' && <span className="text-[10px] text-red-400">Error</span>}
      <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{logs.length} lines</span>
    </div>
  );
}

// ── Main CR Detail Page ───────────────────────────────────────────────────────
export function CRDetailPage() {
  const { crNumber } = useParams<{ crNumber: string }>();
  const navigate = useNavigate();
  const [cr, setCr] = useState<ChangeRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pipeline' | 'health' | 'servers'>('pipeline');

  const load = (quiet = false) => {
    if (!crNumber) return;
    if (!quiet) setLoading(true);
    crApi.get(crNumber)
      .then((r) => setCr(r.data))
      .finally(() => { if (!quiet) setLoading(false); });
  };

  useEffect(() => { load(); }, [crNumber]);

  // Poll when active
  useEffect(() => {
    if (!cr) return;
    if (cr.status !== 'in_progress') return;
    const t = setInterval(() => load(true), 8_000);
    return () => clearInterval(t);
  }, [cr?.status]);

  if (loading) return (
    <Layout breadcrumbs={['Dashboard', 'Loading...']}>
      <div className="flex items-center justify-center h-64">
        <Spinner size={28} />
      </div>
    </Layout>
  );

  if (!cr) return (
    <Layout breadcrumbs={['Dashboard', 'Not Found']}>
      <div className="flex items-center justify-center h-64 text-[#454C75]">CR not found</div>
    </Layout>
  );

  const needsPlanAccept = cr.agent1_summary && cr.agent1_accepted === null;
  const needsExecutionAccept = cr.execution_summary && cr.execution_accepted === null;
  const isActive = cr.status === 'in_progress';
  const completedServers = cr.status === 'completed'
    ? (cr.ordered_server_list?.servers ?? [])
    : (cr.server_tasks ?? []).filter(t => t.status === 'completed').map(t => t.server_hostname);
  const activeServers = (cr.server_tasks ?? []).filter(t => t.status === 'running' || t.status === 'rebooting').map(t => t.server_hostname);

  return (
    <Layout breadcrumbs={['Dashboard', cr.cr_number]}>
      {/* ── CR Header card ── */}
      <Card className="p-5 mb-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate(-1)}
            className="mt-0.5 w-7 h-7 rounded-[7px] flex items-center justify-center text-[#8B91BE] hover:text-[#C4C8E8] transition-all flex-shrink-0"
            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}
          >
            <ArrowLeft size={14} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-mono text-sm text-indigo-400 font-bold">{cr.cr_number}</span>
              <PriorityBadge priority={cr.priority} />
              <StatusBadge status={cr.status} />
              {cr.sn_url && (
                <a href={cr.sn_url} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] font-medium px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-all">
                  ServiceNow ↗
                </a>
              )}
            </div>
            <h1 className="text-lg font-bold leading-tight mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              {cr.title}
            </h1>
            {cr.description && (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{cr.description}</p>
            )}
          </div>
          {/* Metadata panel */}
          <div className="flex-shrink-0 min-w-[200px] flex flex-col gap-2 border-l pl-4" style={{ borderColor: 'var(--border)' }}>
            {[
              { label: 'Submitted by', value: cr.requested_by },
              { label: 'Approver', value: cr.approver_name && (
                <span className="flex items-center gap-1">{cr.approver_name} {cr.approved_by && <Check size={10} className="text-emerald-400" />}</span>
              )},
              { label: 'Change Window', value: <span className="font-mono text-[10px]">{fmtChangeWindow(cr.change_window_start, cr.change_window_end, cr.change_window_timezone)}</span> },
              { label: 'Servers', value: `${cr.total_servers} servers` },
            ].map(({ label, value }) => value && (
              <div key={label} className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>{label}</span>
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{cr.completed_servers}/{cr.total_servers} servers</span>
            <span className="text-sm font-bold font-mono" style={{ color: isActive ? '#6366F1' : cr.status === 'completed' ? '#10B981' : 'var(--text-muted)' }}>
              {cr.progress_percent}%
            </span>
          </div>
          <ProgressBar
            value={cr.progress_percent}
            color={cr.status === 'failed' ? '#EF4444' : cr.status === 'completed' ? '#10B981' : '#6366F1'}
            height={5}
          />
          {cr.failed_servers > 0 && <span className="text-xs text-red-400 mt-1 inline-block">{cr.failed_servers} failed</span>}
        </div>
      </Card>

      {/* ── Agent pipeline ── */}
      <AgentPipeline cr={cr} />

      {/* ── Action panels ── */}
      {needsPlanAccept && <AcceptPlanPanel cr={cr} onAccepted={() => load()} />}
      {!needsPlanAccept && needsExecutionAccept && <ExecutionSummaryPanel cr={cr} onAccepted={() => load()} />}

      {/* ── Tabs ── */}
      <TabBar
        tabs={[
          { id: 'pipeline', label: 'Execution Pipeline' },
          { id: 'health', label: 'Health Report' },
          { id: 'servers', label: 'Servers', count: cr.server_tasks?.length },
        ]}
        active={tab}
        onChange={(t) => setTab(t as 'pipeline' | 'health' | 'servers')}
      />

      {/* ── Execution Pipeline tab: graph + logs side by side, buckets below ── */}
      {tab === 'pipeline' && (
        <div className="flex flex-col gap-4">
          {cr.ordered_server_list ? (
            <>
              {/* Top row: graph left, live logs right */}
              <div className="grid gap-4" style={{ gridTemplateColumns: '58% 1fr' }}>
                {/* Dependency graph */}
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                      <Layers size={13} />
                      Server Dependency Graph
                    </div>
                    <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {[['#22C55E', 'Done'], ['#F59E0B', 'Running'], ['#8B91BE', 'Pending']].map(([c, l]) => (
                        <span key={l} className="flex items-center gap-1">
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, display: 'inline-block' }} />{l}
                        </span>
                      ))}
                    </div>
                  </div>
                  <DependencyGraph
                    buckets={cr.ordered_server_list.buckets}
                    pauseServers={cr.ordered_server_list.pause_servers}
                    completedServers={completedServers}
                    activeServers={activeServers}
                  />
                  {cr.ordered_server_list.reasoning?.length > 0 && (
                    <div className="mt-3 flex flex-col gap-1">
                      {cr.ordered_server_list.reasoning.map((r, i) => (
                        <div key={i} className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                          <span className="text-indigo-500">›</span>{r}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Live log panel — always visible on pipeline tab */}
                <Card className="overflow-hidden flex flex-col">
                  <div className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
                    <Terminal size={13} style={{ color: 'var(--text-muted)' }} className="flex-shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Live Execution Log</span>
                    <LiveLogStatus crNumber={cr.cr_number} />
                  </div>
                  <InlineLogStream crNumber={cr.cr_number} isActive={isActive} />
                </Card>
              </div>

              {/* Bottom row: bucket grid full width */}
              <Card className="p-4">
                <div className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <Activity size={13} />
                  Bucket Execution Status
                </div>
                <BucketGrid
                  buckets={cr.ordered_server_list.buckets}
                  pauseServers={cr.ordered_server_list.pause_servers}
                  tasks={cr.server_tasks ?? []}
                />
              </Card>
            </>
          ) : (
            /* No plan yet — just show the log */
            <LogPanel crNumber={cr.cr_number} isActive={isActive} />
          )}
        </div>
      )}

      {/* ── Health Report tab ── */}
      {tab === 'health' && (
        <div className="flex flex-col gap-4">
          {cr.validation_report ? (
            <Card className="p-5">
              <div className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={13} className="text-emerald-400" />
                Post-Execution Validation Report
              </div>
              {(() => {
                const report = cr.validation_report as { total?: number; healthy?: number; unhealthy?: number; results?: { hostname: string; health_ok: boolean; deviation_percent: number }[] };
                const allHealthy = (report.unhealthy ?? 0) === 0;
                return (
                  <>
                    <div className="grid grid-cols-3 gap-4 mb-5">
                      {[
                        { label: 'Total Servers', value: report.total ?? cr.total_servers, color: 'var(--text-primary)' },
                        { label: 'Healthy', value: report.healthy ?? 0, color: '#10B981' },
                        { label: 'Issues', value: report.unhealthy ?? 0, color: report.unhealthy ? '#EF4444' : 'var(--text-muted)' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="p-3 rounded-[10px] text-center" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
                          <div className="text-2xl font-black" style={{ fontFamily: 'var(--font-display)', color }}>{value}</div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
                        </div>
                      ))}
                    </div>
                    {report.results && report.results.length > 0 && (
                      <table className="w-full">
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            {['Server', 'Health', 'Deviation'].map(h => (
                              <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {report.results.map((r) => (
                            <tr key={r.hostname} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                              <td className="px-3 py-2.5 font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{r.hostname}</td>
                              <td className="px-3 py-2.5">
                                {r.health_ok
                                  ? <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12} /> Healthy</span>
                                  : <span className="text-xs text-red-400 flex items-center gap-1"><XCircle size={12} /> Failed</span>}
                              </td>
                              <td className="px-3 py-2.5 font-mono text-xs" style={{ color: r.deviation_percent > 15 ? '#EF4444' : 'var(--text-secondary)' }}>
                                {r.deviation_percent?.toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </>
                );
              })()}
            </Card>
          ) : (
            <Card className="p-12 text-center">
              <CheckCircle2 size={32} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--text-muted)' }} />
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Health report available after validation completes</div>
            </Card>
          )}
        </div>
      )}

      {/* ── Servers tab ── */}
      {tab === 'servers' && cr.server_tasks && cr.server_tasks.length > 0 && (
        <ServerTasksTable tasks={cr.server_tasks} />
      )}
      {tab === 'servers' && (!cr.server_tasks || cr.server_tasks.length === 0) && (
        <Card className="p-12 text-center">
          <Server size={28} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--text-muted)' }} />
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Server task data available after execution starts</div>
        </Card>
      )}
    </Layout>
  );
}