import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, PERSONAS } from '../context/AuthContext';
import { UserRole } from '../types';
import { Zap, ShieldCheck, UserCheck, AlertTriangle, Settings, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const LoginPage: React.FC = () => {
  const { switchRole, setActiveJourneyId } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<UserRole>('CUSTOMER');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    switchRole(selectedRole);
    const p = PERSONAS[selectedRole];
    setActiveJourneyId(p.defaultJourneyId);
    navigate(p.defaultRoute);
  };

  const personaList = Object.entries(PERSONAS) as [UserRole, typeof PERSONAS[UserRole]][];

  return (
    <div className="min-h-[600px] flex items-center justify-center py-10">
      <div className="w-full max-w-md p-8 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[6px_6px_0px_#0A1F20]">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[var(--brand-950)] text-white flex items-center justify-center mx-auto mb-3 shadow-[2px_2px_0px_#0A1F20]">
            <Zap className="w-6 h-6 text-[var(--brand-300)]" fill="currentColor" />
          </div>
          <h1 className="text-2xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            FinFlow AI Authentication
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Institutional Single-Sign-On & Role-Based Access Control
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--brand-950)] uppercase tracking-wider mb-2">
              Select Persona Role
            </label>
            <div className="space-y-2">
              {personaList.map(([r, p]) => (
                <label
                  key={r}
                  onClick={() => setSelectedRole(r)}
                  className={`flex items-center justify-between p-3 rounded-xl border-1.5 cursor-pointer transition-all ${
                    selectedRole === r
                      ? 'border-[var(--brand-950)] bg-[var(--brand-50)] shadow-[2px_2px_0px_#0A1F20]'
                      : 'border-[var(--border)] hover:bg-[var(--surface-subtle)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white"
                      style={{ backgroundColor: p.badgeColor }}
                    >
                      {p.avatarInitials}
                    </div>
                    <div>
                      <p className="text-xs font-black text-[var(--brand-950)]">{p.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{p.title}</p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="role"
                    checked={selectedRole === r}
                    onChange={() => setSelectedRole(r)}
                    className="accent-[var(--brand-700)]"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="brutal"
              size="md"
              className="w-full"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In as {PERSONAS[selectedRole].name}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
