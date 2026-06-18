// ── Change Requests ───────────────────────────────────────────────────────────
export type CRStatus =
  | 'awaiting_approval'
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'ignored';

export type Priority = 'critical' | 'high' | 'medium' | 'low';

export interface ChangeRequest {
  id: number;
  cr_number: string;
  title: string;
  description?: string;
  status: CRStatus;
  priority: Priority;
  requested_by?: string;
  approver_name?: string;
  approved_by?: string;
  approved_at?: string;
  change_window_start?: string;
  change_window_end?: string;
  change_window_timezone?: string;
  progress_percent: number;
  total_servers: number;
  completed_servers: number;
  failed_servers: number;
  received_at: string;
  started_at?: string;
  completed_at?: string;
  is_patching?: boolean;
  sn_url?: string;
  // Detail fields
  classification_confidence?: number;
  classification_reasoning?: string;
  ordered_server_list?: {
    buckets: string[][];
    servers: string[];
    reasoning: string[];
    pause_servers?: string[];
    dependency_notes?: string[];
  };
  agent1_summary?: string;
  agent1_accepted?: boolean;
  agent1_accepted_at?: string;
  execution_summary?: string;
  execution_accepted?: boolean;
  validation_report?: Record<string, unknown>;
  server_tasks?: ServerTask[];
}

export interface ServerTask {
  id: number;
  server_hostname: string;
  server_ip?: string;
  bucket_number?: number;
  execution_order?: number;
  status: string;
  health_ok?: boolean;
  deviation_percent?: number;
  error_message?: string;
  requires_service_pause?: boolean;
  service_name?: string;
  started_at?: string;
  completed_at?: string;
  reboot_scheduled_for?: string;
}

export interface CRStats {
  total: number;
  by_status: Record<string, number>;
  awaiting_approval: number;
  pending: number;
  in_progress: number;
  completed: number;
  failed: number;
}

// ── Agents / Logs ─────────────────────────────────────────────────────────────
export interface AgentLog {
  id: number;
  agent: string;
  level: string;
  message: string;
  server?: string;
  ts?: string;
  meta?: Record<string, unknown>;
}

// ── Knowledge Base ────────────────────────────────────────────────────────────
export interface DependencyEdge {
  id: number;
  dependent_server: string;
  dependency_server: string;
  reason?: string;
  is_active: boolean;
  created_at: string;
}

export interface RebootWindow {
  id: number;
  name: string;
  description?: string;
  timezone: string;
  preferred_start_time: string;
  preferred_end_time: string;
  allowed_days: string;
  reason?: string;
  is_active: boolean;
}

export interface ServicePauseConfig {
  id: number;
  server_hostname: string;
  service_name: string;
  pause_script: string;
  resume_script: string;
  reason?: string;
  pre_pause_wait_seconds: number;
  post_resume_wait_seconds: number;
  is_active: boolean;
}

// ── Incidents ─────────────────────────────────────────────────────────────────
export interface Incident {
  id: number;
  cr_id?: number;
  server_hostname?: string;
  sn_incident_number?: string;
  status: string;
  title?: string;
  description?: string;
  rca_analysis?: string;
  rca_root_cause?: string;
  rca_steps?: string;
  rca_completed_at?: string;
  email_sent?: boolean;
  created_at: string;
}

// ── Auth / Users ──────────────────────────────────────────────────────────────
export interface User {
  id: number;
  email: string;
  full_name?: string;
  role: 'user' | 'admin';
  team?: string;
  timezone?: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
}

// ── Summary ───────────────────────────────────────────────────────────────────
export interface DashboardSummary {
  total_crs: number;
  by_status: Record<string, number>;
  total_incidents: number;
  success_rate: number;
  awaiting_approval: number;
  in_progress: number;
  pending: number;
}
