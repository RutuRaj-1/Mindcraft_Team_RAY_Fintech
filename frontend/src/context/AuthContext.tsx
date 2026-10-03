import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, AuthenticatedUser } from '../types';
import { getActiveRole, setActiveRole as persistActiveRole, setAuthToken } from '../api/client';

export interface PersonaProfile {
  role: UserRole;
  name: string;
  title: string;
  email: string;
  organization: string;
  avatarInitials: string;
  badgeColor: string;
  defaultRoute: string;
  defaultJourneyId: string;
}

export const PERSONAS: Record<UserRole, PersonaProfile> = {
  CUSTOMER: {
    role: 'CUSTOMER',
    name: 'Priya Sharma',
    title: 'Managing Director & Founder',
    email: 'priya@sharmatextiles.in',
    organization: 'Sharma Textiles Pvt. Ltd.',
    avatarInitials: 'PS',
    badgeColor: 'var(--fin-green)',
    defaultRoute: '/customer',
    defaultJourneyId: 'jrn_priya_001',
  },
  RM: {
    role: 'RM',
    name: 'Rohan Mehta',
    title: 'Senior Relationship Manager',
    email: 'rohan.mehta@finflowbank.com',
    organization: 'Commercial SME Lending Unit',
    avatarInitials: 'RM',
    badgeColor: 'var(--fin-blue)',
    defaultRoute: '/rm',
    defaultJourneyId: 'jrn_kavita_002',
  },
  RISK_OFFICER: {
    role: 'RISK_OFFICER',
    name: 'Ananya Iyer',
    title: 'Chief Credit Risk & Fraud Officer',
    email: 'ananya.iyer@finflowbank.com',
    organization: 'Risk & Institutional Compliance',
    avatarInitials: 'AI',
    badgeColor: 'var(--fin-amber)',
    defaultRoute: '/risk',
    defaultJourneyId: 'jrn_apex_003',
  },
  ADMIN: {
    role: 'ADMIN',
    name: 'System Administrator',
    title: 'Platform Infrastructure Lead',
    email: 'admin@finflow.ai',
    organization: 'FinFlow AI Core Engine',
    avatarInitials: 'SA',
    badgeColor: 'var(--fin-violet)',
    defaultRoute: '/admin',
    defaultJourneyId: 'jrn_priya_001',
  },
};

interface AuthContextType {
  role: UserRole;
  user: AuthenticatedUser;
  persona: PersonaProfile;
  switchRole: (newRole: UserRole) => void;
  activeJourneyId: string;
  setActiveJourneyId: (id: string) => void;
  isAuthenticated: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>(() => getActiveRole() || 'CUSTOMER');
  const [activeJourneyId, setActiveJourneyId] = useState<string>('jrn_priya_001');

  const persona = PERSONAS[role];

  const user: AuthenticatedUser = {
    uid: `usr_${role.toLowerCase()}`,
    email: persona.email,
    name: persona.name,
    role: role,
    business_id: role === 'CUSTOMER' ? 'app_priya_001' : undefined,
  };

  const switchRole = (newRole: UserRole) => {
    persistActiveRole(newRole);
    setRoleState(newRole);
    const newPersona = PERSONAS[newRole];
    if (newPersona.defaultJourneyId) {
      setActiveJourneyId(newPersona.defaultJourneyId);
    }
  };

  const logout = () => {
    // In mock demo, reset to customer
    switchRole('CUSTOMER');
  };

  return (
    <AuthContext.Provider
      value={{
        role,
        user,
        persona,
        switchRole,
        activeJourneyId,
        setActiveJourneyId,
        isAuthenticated: true,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
