import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { ShieldAlert, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { role, persona, loading, isAuthenticated, isMasterAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // ── Auth state not yet resolved (Firebase is initialising) ─────────────────
  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[var(--text-muted)]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-700)]" />
          <p className="text-xs font-medium">Verifying credentials…</p>
        </div>
      </div>
    );
  }

  // ── Not authenticated — redirect to sign in ────────────────────────────────
  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // ── No role restriction — allow through ────────────────────────────────────
  if (!allowedRoles || allowedRoles.length === 0) {
    return <>{children}</>;
  }

  const isAuthorized = allowedRoles.includes(role);

  // ── Role mismatch — show access denied panel ───────────────────────────────
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
            You are currently browsing as{' '}
            <strong className="text-[var(--brand-950)]">
              {persona.name} ({role})
            </strong>
            . This view is restricted to institutional {allowedRoles.join(' / ')} personas.
          </p>

          <div className="mt-6 flex flex-col gap-2">
            {isMasterAdmin ? (
              <Button
                variant="brutal"
                size="sm"
                onClick={() => navigate('/admin')}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Go to Admin Dashboard (Module Emulation Hub)
              </Button>
            ) : (
              <Button
                variant="brutal"
                size="sm"
                onClick={() => navigate(persona.defaultRoute)}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Return to My Dashboard ({role})
              </Button>
            )}

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
