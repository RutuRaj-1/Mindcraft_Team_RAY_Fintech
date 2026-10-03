import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { AdminConsole } from '../../components/admin/AdminConsole';

export const AdminPage: React.FC = () => {
  const { activeJourneyId } = useAuth();

  return (
    <div className="space-y-6">
      <AdminConsole journeyId={activeJourneyId} />
    </div>
  );
};
