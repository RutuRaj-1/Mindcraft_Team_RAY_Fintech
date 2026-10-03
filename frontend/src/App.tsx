import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserRole } from './types';
import { getActiveRole, setActiveRole, api } from './api/client';
import { Navbar } from './components/layout/Navbar';
import { CustomerJourneyView } from './components/customer/CustomerJourneyView';
import { RMQueueView } from './components/rm/RMQueueView';
import { RiskOfficerConsole } from './components/risk/RiskOfficerConsole';
import { AdminConsole } from './components/admin/AdminConsole';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5000,
    }
  }
});

export const AppContent: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<UserRole>(getActiveRole());
  const [activeJourneyId, setActiveJourneyId] = useState<string>('jrn_priya_001');
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const handleRoleChange = (role: UserRole) => {
    setActiveRole(role);
    setCurrentRole(role);
  };

  const handleSelectCase = (journeyId: string) => {
    setActiveJourneyId(journeyId);
    // If selecting Case 3 (Apex - fraud flag), auto switch to Risk Officer for demo impact
    if (journeyId === 'jrn_apex_003' && currentRole === 'CUSTOMER') {
      handleRoleChange('RISK_OFFICER');
    }
  };

  const handleResetSeed = async () => {
    setIsSeeding(true);
    try {
      await api.seedDemo();
      setRefreshTrigger(prev => prev + 1);
      alert('Demo benchmark cases re-seeded with fresh synthetic evidence.');
    } catch (e: any) {
      alert(`Seed failed: ${e.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7FAF9] text-[#172825] flex flex-col font-sans">
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

      <footer className="border-t border-[#E3ECE9] bg-white py-4 px-6 text-center text-xs text-[#687A75]">
        FinFlow AI — Intelligent & Explainable Financial Journey Orchestration • MindCraft Fintech MVP
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
