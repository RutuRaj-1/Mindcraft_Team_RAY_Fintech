import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { role, persona, switchRole } = useAuth();
  const location = useLocation();

  if (!allowedRoles || allowedRoles.length === 0) {
    return <>{children}</>;
  }

  const isAuthorized = allowedRoles.includes(role);

  if (!isAuthorized) {
    const recommendedRole = allowedRoles[0];

    return (
      <div className="min-h-[500px] flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 text-center bg-white border-2 border-[var(--brand-950)] rounded-2xl shadow-[4px_4px_0px_#0A1F20]">
          <div className="w-12 h-12 rounded-xl bg-[var(--fin-amber-bg)] text-[var(--fin-amber)] flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>

          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--fin-amber-bg)] text-[var(--fin-amber)] border border-[var(--fin-amber)]/30">
            Role Restricted Route
          </span>

          <h2 className="text-lg font-black text-[var(--brand-950)] mt-2">
            Access Requires {allowedRoles.join(' or ')} Privileges
          </h2>

          <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
            You are currently browsing as <strong className="text-[var(--brand-950)]">{persona.name} ({role})</strong>.
            This view is restricted to institutional {allowedRoles.join(' / ')} personas.
          </p>

          <div className="mt-6 flex flex-col gap-2">
            <Button
              variant="brutal"
              size="sm"
              onClick={() => switchRole(recommendedRole)}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Switch to {recommendedRole} Persona
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
            >
              Return to Previous View
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
