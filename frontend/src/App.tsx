import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth-context';
import { LoginPage } from '@/pages/LoginPage';
import { AcceptInvitePage } from '@/pages/AcceptInvitePage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ApprovalsPage } from '@/pages/ApprovalsPage';
import { ActiveRunsPage } from '@/pages/ActiveRunsPage';
import { CRDetailPage } from '@/pages/CRDetailPage';
import { HealthReportsPage } from '@/pages/HealthReportsPage';
import { IncidentsPage } from '@/pages/IncidentsPage';
import { KnowledgeBasePage } from '@/pages/KnowledgeBasePage';
import { TeamPage } from '@/pages/TeamPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/approvals" element={<ApprovalsPage />} />
          <Route path="/active-runs" element={<ActiveRunsPage />} />
          <Route path="/cr/:crNumber" element={<CRDetailPage />} />
          <Route path="/health" element={<HealthReportsPage />} />
          <Route path="/incidents" element={<IncidentsPage />} />
          <Route path="/knowledge" element={<KnowledgeBasePage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
