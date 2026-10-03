import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './router/ProtectedRoute';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { CustomerDashboardPage } from './pages/customer/CustomerDashboardPage';
import { ApplyLoanPage } from './pages/customer/ApplyLoanPage';
import { CustomerJourneyPage } from './pages/customer/CustomerJourneyPage';
import { CustomerDocumentsPage } from './pages/customer/CustomerDocumentsPage';
import { CustomerDecisionPage } from './pages/customer/CustomerDecisionPage';
import { RMQueuePage } from './pages/rm/RMQueuePage';
import { RMCaseDetailPage } from './pages/rm/RMCaseDetailPage';
import { RiskConsolePage } from './pages/risk/RiskConsolePage';
import { RiskCaseDetailPage } from './pages/risk/RiskCaseDetailPage';
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

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NotificationProvider>
            <BrowserRouter>
              <Routes>
                {/* Public standalone login route */}
                <Route path="/login" element={<LoginPage />} />

                {/* Main Application Shell layout with nested routes */}
                <Route element={<AppShell />}>
                  {/* Home & Landing */}
                  <Route path="/" element={<LandingPage />} />

                  {/* Customer SME Routes */}
                  <Route
                    path="/customer"
                    element={
                      <ProtectedRoute allowedRoles={['CUSTOMER', 'RM', 'RISK_OFFICER', 'ADMIN']}>
                        <CustomerDashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/customer/apply"
                    element={
                      <ProtectedRoute allowedRoles={['CUSTOMER', 'RM', 'RISK_OFFICER', 'ADMIN']}>
                        <ApplyLoanPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/customer/journey/:id"
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
                    path="/customer/decision/:id"
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
                      <ProtectedRoute allowedRoles={['RM', 'ADMIN', 'RISK_OFFICER']}>
                        <RMQueuePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/rm/cases/:id"
                    element={
                      <ProtectedRoute allowedRoles={['RM', 'ADMIN', 'RISK_OFFICER']}>
                        <RMCaseDetailPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Risk Officer Routes */}
                  <Route
                    path="/risk"
                    element={
                      <ProtectedRoute allowedRoles={['RISK_OFFICER', 'ADMIN', 'RM']}>
                        <RiskConsolePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/risk/cases/:id"
                    element={
                      <ProtectedRoute allowedRoles={['RISK_OFFICER', 'ADMIN', 'RM']}>
                        <RiskCaseDetailPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* System Administrator Route */}
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN', 'RISK_OFFICER']}>
                        <AdminPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Demo Hub */}
                  <Route path="/demo" element={<DemoHubPage />} />

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
