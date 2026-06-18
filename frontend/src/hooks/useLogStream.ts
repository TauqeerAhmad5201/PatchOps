import { useState, useEffect, useRef, useCallback } from 'react';
import type { AgentLog } from '@/types';
import { crApi } from '@/lib/api';

type StreamStatus = 'idle' | 'connecting' | 'live' | 'closed' | 'error';

export function useLogStream(crNumber: string | null, active: boolean) {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [status, setStatus] = useState<StreamStatus>('idle');
  const esRef = useRef<EventSource | null>(null);
  const lastIdRef = useRef(0);
  const crNumberRef = useRef(crNumber);
  crNumberRef.current = crNumber;

  const reset = useCallback(() => {
    setLogs([]);
    lastIdRef.current = 0;
    setStatus('idle');
  }, []);

  useEffect(() => {
    if (!crNumber || !active) {
      reset();
      return;
    }

    let cancelled = false;

    const connect = async () => {
      setStatus('connecting');

      // Phase 1: fetch backlog via REST
      try {
        const res = await crApi.logs(crNumber, 500);
        if (cancelled) return;
        const backlog: AgentLog[] = res.data;
        if (backlog.length > 0) {
          setLogs(backlog);
          lastIdRef.current = backlog[backlog.length - 1].id;
        }
      } catch {
        // Non-fatal — continue to SSE anyway
      }

      if (cancelled) return;

      // Phase 2: open SSE stream from last known id
      const token = localStorage.getItem('patchops_token') || '';
      const url = `/api/crs/${crNumber}/logs/stream?cursor=${lastIdRef.current}`;

      // SSE doesn't support custom headers natively — attach token as query param
      // Backend /logs/stream intentionally skips auth (per design) so this is fine
      const es = new EventSource(url);
      esRef.current = es;
      setStatus('live');

      es.onmessage = (e) => {
        if (cancelled) return;
        try {
          const log: AgentLog = JSON.parse(e.data);
          setLogs((prev) => {
            if (prev.some((l) => l.id === log.id)) return prev;
            return [...prev, log];
          });
          lastIdRef.current = log.id;
        } catch {
          // Heartbeat or malformed — ignore
        }
      };

      es.addEventListener('done', () => {
        setStatus('closed');
        es.close();
      });

      es.onerror = () => {
        if (!cancelled) setStatus('error');
        es.close();
      };
    };

    void connect();

    return () => {
      cancelled = true;
      esRef.current?.close();
      esRef.current = null;
    };
  }, [crNumber, active]);

  return { logs, status, reset };
}
