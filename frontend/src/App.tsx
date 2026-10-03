import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserRole } from './types';
import { getActiveRole, setActiveRole, api } from './api/client';
import { Navbar } from './components/layout/Navbar';
import { CustomerJourneyView } from './components/customer/CustomerJourneyView';
import { RMQueueView } from './components/rm/RMQueueView';
import { RiskOfficerConsole } from './components/risk/RiskOfficerConsole';
import { AdminConsole } from './components/admin/AdminConsole';
import { Zap } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5000,
    }
  }
});

export const AppContent: React.FC = () => {
  const [currentRole,    setCurrentRole]    = useState<UserRole>(getActiveRole());
  const [activeJourneyId,setActiveJourneyId]= useState<string>('jrn_priya_001');
  const [isSeeding,      setIsSeeding]      = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const handleRoleChange = (role: UserRole) => {
    setActiveRole(role);
    setCurrentRole(role);
  };

  const handleSelectCase = (journeyId: string) => {
    setActiveJourneyId(journeyId);
    if (journeyId === 'jrn_apex_003' && currentRole === 'CUSTOMER') {
      handleRoleChange('RISK_OFFICER');
    }
  };

  const handleResetSeed = async () => {
    setIsSeeding(true);
    try {
      await api.seedDemo();
      setRefreshTrigger(prev => prev + 1);
    } catch (e: any) {
      alert(`Seed failed: ${e.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <Navbar
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        activeJourneyId={activeJourneyId}
        onSelectCase={handleSelectCase}
        onResetSeed={handleResetSeed}
        isSeeding={isSeeding}
      />

      <main className="flex-1 pb-16">
        {currentRole === 'CUSTOMER' && (
          <CustomerJourneyView
            key={`${activeJourneyId}-${refreshTrigger}`}
            journeyId={activeJourneyId}
          />
        )}

        {currentRole === 'RM' && (
          <RMQueueView
            key={`rm-${refreshTrigger}`}
            onSelectJourney={(id) => {
              setActiveJourneyId(id);
              handleRoleChange('CUSTOMER');
            }}
          />
        )}

        {currentRole === 'RISK_OFFICER' && (
          <RiskOfficerConsole
            key={`risk-${activeJourneyId}-${refreshTrigger}`}
            journeyId={activeJourneyId}
            onRefreshJourney={() => setRefreshTrigger(prev => prev + 1)}
          />
        )}

        {currentRole === 'ADMIN' && (
          <AdminConsole
            key={`admin-${activeJourneyId}-${refreshTrigger}`}
            journeyId={activeJourneyId}
          />
        )}
      </main>

      {/* Premium Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        background: 'var(--surface)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '20px', height: '20px', borderRadius: '6px',
            background: 'linear-gradient(135deg, #123E40, #3DA5A6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Zap size={10} color="white" />
          </div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-900)', fontFamily: 'Outfit, sans-serif' }}>
            FinFlow AI
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            Intelligent & Explainable Financial Journey Orchestration
          </span>
        </div>
        <div style={{ display: 'flex', items: 'center', gap: '16px', fontSize: '10px', color: 'var(--text-muted)' }}>
          <span>MindCraft Fintech Hackathon MVP v2.1</span>
          <span style={{ color: 'var(--border-strong)' }}>•</span>
          <span>7 Modules · 3 Personas · SHAP + RAG + ML</span>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
