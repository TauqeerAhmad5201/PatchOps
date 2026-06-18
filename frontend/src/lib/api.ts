import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('patchops_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('patchops_token');
      localStorage.removeItem('patchops_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Change Requests ───────────────────────────────────────────────────────────
export const crApi = {
  list: (params?: Record<string, unknown>) => api.get('/crs', { params }),
  stats: () => api.get('/crs/stats'),
  get: (crNumber: string) => api.get(`/crs/${crNumber}`),
  tasks: (crNumber: string) => api.get(`/crs/${crNumber}/tasks`),
  logs: (crNumber: string, limit = 500) =>
    api.get(`/crs/${crNumber}/logs`, { params: { limit } }),
  acceptPlan: (crNumber: string, accepted: boolean) =>
    api.post(`/crs/${crNumber}/accept-plan`, { accepted }),
  acceptExecution: (crNumber: string, accepted: boolean) =>
    api.post(`/crs/${crNumber}/accept-execution`, { accepted }),
};

// ── Knowledge Base ────────────────────────────────────────────────────────────
export const knowledgeApi = {
  listDeps: () => api.get('/knowledge/dependencies'),
  createDep: (body: { dependent_server: string; dependency_server: string; reason?: string }) =>
    api.post('/knowledge/dependencies', body),
  deleteDep: (id: number) => api.delete(`/knowledge/dependencies/${id}`),
  verifyGraph: (edges: { dependent_server: string; dependency_server: string }[]) =>
    api.post('/knowledge/dependencies/verify', { edges }),

  listRebootWindows: () => api.get('/knowledge/reboot-windows'),
  createRebootWindow: (body: Record<string, unknown>) =>
    api.post('/knowledge/reboot-windows', body),
  updateRebootWindow: (id: number, body: Record<string, unknown>) =>
    api.put(`/knowledge/reboot-windows/${id}`, body),
  deleteRebootWindow: (id: number) => api.delete(`/knowledge/reboot-windows/${id}`),

  listServicePauses: () => api.get('/knowledge/service-pauses'),
  createServicePause: (body: Record<string, unknown>) =>
    api.post('/knowledge/service-pauses', body),
  updateServicePause: (id: number, body: Record<string, unknown>) =>
    api.put(`/knowledge/service-pauses/${id}`, body),
  deleteServicePause: (id: number) => api.delete(`/knowledge/service-pauses/${id}`),
};

// ── Reports / Incidents ───────────────────────────────────────────────────────
export const reportApi = {
  incidents: (params?: Record<string, unknown>) => api.get('/reports/incidents', { params }),
  summary: () => api.get('/reports/summary'),
};

// ── Auth / Users ──────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
};

export const usersApi = {
  list: () => api.get('/users'),
  create: (body: Record<string, unknown>) => api.post('/users', body),
  delete: (id: number) => api.delete(`/users/${id}`),
  updateRole: (id: number, role: string) => api.put(`/users/${id}/role`, { role }),
  invite: (body: { email: string; role: string; team?: string }) => api.post('/auth/invite', body),
  acceptInvite: (body: { token: string; full_name: string; password: string }) => api.post('/auth/accept-invite', body),
};