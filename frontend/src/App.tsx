import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './router/ProtectedRoute';

// Public Pages
import { LandingPage } from './pages/LandingPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';

// Core Customer and Officer Pages
import { CustomerDashboardPage } from './pages/customer/CustomerDashboardPage';
import { ApplyLoanPage } from './pages/customer/ApplyLoanPage';
import { CustomerJourneyPage } from './pages/customer/CustomerJourneyPage';
import { CustomerDocumentsPage } from './pages/customer/CustomerDocumentsPage';
import { CustomerDecisionPage } from './pages/customer/CustomerDecisionPage';
import { RMQueuePage } from './pages/rm/RMQueuePage';
import { RMCaseDetailPage } from './pages/rm/RMCaseDetailPage';
import { RiskConsolePage } from './pages/risk/RiskConsolePage';
import { RiskCaseDetailPage } from './pages/risk/RiskCaseDetailPage';
import { CustomerProfileVaultPage } from './pages/customer/CustomerProfileVaultPage';

// Part 51 Performance: Lazy-loaded Heavy Pages
const CustomerWhatIfPage = React.lazy(() =>
  import('./pages/customer/CustomerWhatIfPage').then((m) => ({ default: m.CustomerWhatIfPage }))
);
const CashFlowIntelligencePage = React.lazy(() =>
  import('./pages/customer/CashFlowIntelligencePage').then((m) => ({ default: m.CashFlowIntelligencePage }))
);
const RMSupervisorDashboardPage = React.lazy(() =>
  import('./pages/rm/RMSupervisorDashboardPage').then((m) => ({ default: m.RMSupervisorDashboardPage }))
);
const RiskManagerDeskPage = React.lazy(() =>
  import('./pages/risk/RiskManagerDeskPage').then((m) => ({ default: m.RiskManagerDeskPage }))
);
const CreditSanctionChamberPage = React.lazy(() =>
  import('./pages/risk/CreditSanctionChamberPage').then((m) => ({ default: m.CreditSanctionChamberPage }))
);
const AuditGovernanceConsolePage = React.lazy(() =>
  import('./pages/audit/AuditGovernanceConsolePage').then((m) => ({ default: m.AuditGovernanceConsolePage }))
);
const DecisionReplayPage = React.lazy(() =>
  import('./pages/risk/DecisionReplayPage').then((m) => ({ default: m.DecisionReplayPage }))
);
const AdminPage = React.lazy(() =>
  import('./pages/admin/AdminPage').then((m) => ({ default: m.AdminPage }))
);

import { DemoHubPage } from './pages/demo/DemoHubPage';
import { NotFoundPage } from './pages/NotFoundPage';

const PageFallback: React.FC = () => (
  <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
    <div className="w-8 h-8 rounded-full border-2 border-[var(--border)] border-t-[var(--brand-700)] animate-spin" />
    <span className="text-xs font-semibold text-[var(--text-muted)] tracking-wide">Loading module...</span>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5000,
    },
  },
});

/**
 * AppRedirect resolves the `/app` and `/app/dashboard` entry points
 * to the appropriate role-specific dashboard or redirects unauthenticated visitors to sign in.
 */
const AppRedirect: React.FC = () => {
  const { role, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#0F4C81] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  switch (role) {
    case 'CUSTOMER':
      return <Navigate to="/customer" replace />;
    case 'RM':
      return <Navigate to="/rm" replace />;
    case 'RM_SUPERVISOR':
      return <Navigate to="/rm-supervisor" replace />;
    case 'RISK_OFFICER':
      return <Navigate to="/risk" replace />;
    case 'RISK_MANAGER':
      return <Navigate to="/risk-manager" replace />;
    case 'CREDIT_APPROVER':
      return <Navigate to="/credit-approval" replace />;
    case 'AUDIT_OFFICER':
      return <Navigate to="/audit" replace />;
    case 'SYS_ADMIN':
    case 'ADMIN':
      return <Navigate to="/admin" replace />;
    default:
      return <Navigate to="/customer" replace />;
  }
};


export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NotificationProvider>
            <BrowserRouter>
              <React.Suspense fallback={<PageFallback />}>
                <Routes>
                {/* ── Public standalone routes ── */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/signin" element={<SignInPage />} />
                <Route path="/signup" element={<SignUpPage />} />
                <Route path="/login" element={<Navigate to="/signin" replace />} />

                {/* ── Main Application Shell for authenticated & protected routes ── */}
                <Route element={<AppShell />}>
                  {/* General /app entry points */}
                  <Route path="/app" element={<AppRedirect />} />
                  <Route path="/app/dashboard" element={<AppRedirect />} />

                  {/* Customer SME Routes */}
                  <Route
                    path="/customer"
                    element={
                      <ProtectedRoute allowedRoles={['CUSTOMER', 'RM', 'RISK_OFFICER', 'ADMIN']}>
                        <CustomerDashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/app/customer" element={<Navigate to="/customer" replace />} />

                  <Route
                    path="/customer/profile"
                    element={
                      <ProtectedRoute allowedRoles={['CUSTOMER', 'RM', 'RISK_OFFICER', 'ADMIN', 'SYS_ADMIN']}>
                        <CustomerProfileVaultPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/app/customer/profile" element={<Navigate to="/customer/profile" replace />} />

                  <Route
                    path="/customer/apply"
                    element={
                      <ProtectedRoute allowedRoles={['CUSTOMER', 'RM', 'RISK_OFFICER', 'ADMIN']}>
                        <ApplyLoanPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/app/customer/apply" element={<Navigate to="/customer/apply" replace />} />

                  <Route
                    path="/customer/journey/:id"
                    element={
                      <ProtectedRoute allowedRoles={['CUSTOMER', 'RM', 'RISK_OFFICER', 'ADMIN']}>
                        <CustomerJourneyPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/app/journey/:id"
                    element={
                      <ProtectedRoute allowedRoles={['CUSTOMER', 'RM', 'RISK_OFFICER', 'ADMIN']}>
                        <CustomerJourneyPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/customer/documents/:id"
                    element={
                      <ProtectedRoute allowedRoles={['CUSTOMER', 'RM', 'RISK_OFFICER', 'ADMIN']}>
                        <CustomerDocumentsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/app/documents/:id"
                    element={
                      <ProtectedRoute allowedRoles={['CUSTOMER', 'RM', 'RISK_OFFICER', 'ADMIN']}>
                        <CustomerDocumentsPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/customer/decision/:id"
                    element={
                      <ProtectedRoute allowedRoles={['CUSTOMER', 'RM', 'RISK_OFFICER', 'ADMIN']}>
                        <CustomerDecisionPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/customer/cashflow/:id"
                    element={
                      <ProtectedRoute allowedRoles={['CUSTOMER', 'RM', 'RISK_OFFICER', 'ADMIN']}>
                        <CashFlowIntelligencePage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/customer/what-if/:id"
                    element={
                      <ProtectedRoute allowedRoles={['CUSTOMER', 'RM', 'RISK_OFFICER', 'ADMIN']}>
                        <CustomerWhatIfPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/app/what-if/:id" element={<Navigate to="/customer/what-if/:id" replace />} />
                  <Route
                    path="/app/decision/:id"
                    element={
                      <ProtectedRoute allowedRoles={['CUSTOMER', 'RM', 'RISK_OFFICER', 'ADMIN']}>
                        <CustomerDecisionPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* RM (Relationship Manager) Routes */}
                  <Route
                    path="/rm"
                    element={
                      <ProtectedRoute allowedRoles={['RM', 'RM_SUPERVISOR', 'ADMIN', 'SYS_ADMIN']}>
                        <RMQueuePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/app/rm" element={<Navigate to="/rm" replace />} />

                  <Route
                    path="/rm/cases/:id"
                    element={
                      <ProtectedRoute allowedRoles={['RM', 'RM_SUPERVISOR', 'ADMIN', 'SYS_ADMIN']}>
                        <RMCaseDetailPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/app/rm/cases/:id"
                    element={
                      <ProtectedRoute allowedRoles={['RM', 'RM_SUPERVISOR', 'ADMIN', 'SYS_ADMIN']}>
                        <RMCaseDetailPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Operations Manager (RM_SUPERVISOR) Dedicated Command Center */}
                  <Route
                    path="/rm-supervisor"
                    element={
                      <ProtectedRoute allowedRoles={['RM_SUPERVISOR', 'ADMIN', 'SYS_ADMIN']}>
                        <RMSupervisorDashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/operations" element={<Navigate to="/rm-supervisor" replace />} />
                  <Route path="/app/operations" element={<Navigate to="/rm-supervisor" replace />} />
                  <Route path="/app/rm-supervisor" element={<Navigate to="/rm-supervisor" replace />} />

                  {/* Second-Line Risk Officer Console */}
                  <Route
                    path="/risk"
                    element={
                      <ProtectedRoute allowedRoles={['RISK_OFFICER', 'RISK_MANAGER', 'CREDIT_APPROVER', 'AUDIT_OFFICER', 'ADMIN', 'SYS_ADMIN']}>
                        <RiskConsolePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/app/risk" element={<Navigate to="/risk" replace />} />

                  <Route
                    path="/risk/cases/:id"
                    element={
                      <ProtectedRoute allowedRoles={['RISK_OFFICER', 'RISK_MANAGER', 'CREDIT_APPROVER', 'AUDIT_OFFICER', 'ADMIN', 'SYS_ADMIN']}>
                        <RiskCaseDetailPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/app/risk/cases/:id"
                    element={
                      <ProtectedRoute allowedRoles={['RISK_OFFICER', 'RISK_MANAGER', 'CREDIT_APPROVER', 'AUDIT_OFFICER', 'ADMIN', 'SYS_ADMIN']}>
                        <RiskCaseDetailPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Senior Risk Manager (RISK_MANAGER) Supervisory Desk */}
                  <Route
                    path="/risk-manager"
                    element={
                      <ProtectedRoute allowedRoles={['RISK_MANAGER', 'CREDIT_APPROVER', 'ADMIN', 'SYS_ADMIN']}>
                        <RiskManagerDeskPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/app/risk-manager" element={<Navigate to="/risk-manager" replace />} />

                  {/* Credit Sanction Committee (CREDIT_APPROVER) Chamber */}
                  <Route
                    path="/credit-approval"
                    element={
                      <ProtectedRoute allowedRoles={['CREDIT_APPROVER', 'ADMIN', 'SYS_ADMIN']}>
                        <CreditSanctionChamberPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/approvals" element={<Navigate to="/credit-approval" replace />} />
                  <Route path="/app/approvals" element={<Navigate to="/credit-approval" replace />} />
                  <Route path="/app/credit-approval" element={<Navigate to="/credit-approval" replace />} />

                  {/* Independent Audit & Governance (AUDIT_OFFICER) Console */}
                  <Route
                    path="/audit"
                    element={
                      <ProtectedRoute allowedRoles={['AUDIT_OFFICER', 'ADMIN', 'SYS_ADMIN']}>
                        <AuditGovernanceConsolePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/app/audit" element={<Navigate to="/audit" replace />} />


                  {/* Decision Replay Routes — Institutional & Audit Assurance */}
                  <Route
                    path="/risk/replay/:id"
                    element={
                      <ProtectedRoute allowedRoles={['RISK_OFFICER', 'RISK_MANAGER', 'CREDIT_APPROVER', 'AUDIT_OFFICER', 'RM', 'RM_SUPERVISOR', 'CUSTOMER']}>
                        <DecisionReplayPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/risk/replay"
                    element={
                      <ProtectedRoute allowedRoles={['RISK_OFFICER', 'RISK_MANAGER', 'CREDIT_APPROVER', 'AUDIT_OFFICER', 'RM', 'RM_SUPERVISOR', 'CUSTOMER']}>
                        <DecisionReplayPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/replay/:id"
                    element={
                      <ProtectedRoute allowedRoles={['RISK_OFFICER', 'RISK_MANAGER', 'CREDIT_APPROVER', 'AUDIT_OFFICER', 'RM', 'RM_SUPERVISOR', 'CUSTOMER']}>
                        <DecisionReplayPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/replay"
                    element={
                      <ProtectedRoute allowedRoles={['RISK_OFFICER', 'RISK_MANAGER', 'CREDIT_APPROVER', 'AUDIT_OFFICER', 'RM', 'RM_SUPERVISOR', 'CUSTOMER']}>
                        <DecisionReplayPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/app/replay/:id" element={<Navigate to="/risk/replay/:id" replace />} />


                  {/* System Administrator Route (Technical Custodian Only) */}
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute allowedRoles={['SYS_ADMIN', 'ADMIN']}>
                        <AdminPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/app/admin" element={<Navigate to="/admin" replace />} />

                  {/* Demo Hub */}
                  <Route path="/demo" element={<DemoHubPage />} />
                  <Route path="/app/demo" element={<Navigate to="/demo" replace />} />

                  {/* Catch-all 404 Route */}
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </React.Suspense>
          </BrowserRouter>
          </NotificationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
