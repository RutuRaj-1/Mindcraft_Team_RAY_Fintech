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

// Authenticated Application Pages
import { CustomerDashboardPage } from './pages/customer/CustomerDashboardPage';
import { ApplyLoanPage } from './pages/customer/ApplyLoanPage';
import { CustomerJourneyPage } from './pages/customer/CustomerJourneyPage';
import { CustomerDocumentsPage } from './pages/customer/CustomerDocumentsPage';
import { CustomerDecisionPage } from './pages/customer/CustomerDecisionPage';
import { CashFlowIntelligencePage } from './pages/customer/CashFlowIntelligencePage';
import { RMQueuePage } from './pages/rm/RMQueuePage';
import { RMCaseDetailPage } from './pages/rm/RMCaseDetailPage';
import { RiskConsolePage } from './pages/risk/RiskConsolePage';
import { RiskCaseDetailPage } from './pages/risk/RiskCaseDetailPage';
import { DecisionReplayPage } from './pages/risk/DecisionReplayPage';
import { AdminPage } from './pages/admin/AdminPage';

import { DemoHubPage } from './pages/demo/DemoHubPage';
import { NotFoundPage } from './pages/NotFoundPage';

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
    case 'RM':
    case 'RM_SUPERVISOR':
      return <Navigate to="/rm" replace />;
    case 'RISK_OFFICER':
    case 'RISK_MANAGER':
    case 'CREDIT_APPROVER':
      return <Navigate to="/risk" replace />;
    case 'AUDIT_OFFICER':
      return <Navigate to="/risk/replay" replace />;
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
                      <ProtectedRoute allowedRoles={['RM', 'RM_SUPERVISOR', 'AUDIT_OFFICER']}>
                        <RMQueuePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/app/rm" element={<Navigate to="/rm" replace />} />

                  <Route
                    path="/rm/cases/:id"
                    element={
                      <ProtectedRoute allowedRoles={['RM', 'RM_SUPERVISOR', 'AUDIT_OFFICER']}>
                        <RMCaseDetailPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/app/rm/cases/:id"
                    element={
                      <ProtectedRoute allowedRoles={['RM', 'RM_SUPERVISOR', 'AUDIT_OFFICER']}>
                        <RMCaseDetailPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Risk Officer, Risk Manager & Credit Approver Routes */}
                  <Route
                    path="/risk"
                    element={
                      <ProtectedRoute allowedRoles={['RISK_OFFICER', 'RISK_MANAGER', 'CREDIT_APPROVER', 'AUDIT_OFFICER']}>
                        <RiskConsolePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/app/risk" element={<Navigate to="/risk" replace />} />

                  <Route
                    path="/risk/cases/:id"
                    element={
                      <ProtectedRoute allowedRoles={['RISK_OFFICER', 'RISK_MANAGER', 'CREDIT_APPROVER', 'AUDIT_OFFICER']}>
                        <RiskCaseDetailPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/app/risk/cases/:id"
                    element={
                      <ProtectedRoute allowedRoles={['RISK_OFFICER', 'RISK_MANAGER', 'CREDIT_APPROVER', 'AUDIT_OFFICER']}>
                        <RiskCaseDetailPage />
                      </ProtectedRoute>
                    }
                  />

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
            </BrowserRouter>
          </NotificationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
