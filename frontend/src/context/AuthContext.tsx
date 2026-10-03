/**
 * AuthContext — FinFlow AI
 *
 * Two authentication modes co-exist:
 *
 * 1. FIREBASE MODE  — When VITE_FIREBASE_API_KEY is a real key.
 *    - Uses Firebase email/password sign-in.
 *    - Reads the `role` custom claim from the decoded ID token.
 *    - Attaches the live Firebase ID token to every API request.
 *
 * 2. DEMO MODE — When no real Firebase credentials are present OR when the
 *    user explicitly chooses a demo persona at the login screen.
 *    - Bypasses Firebase entirely.
 *    - Injects a predictable demo token (e.g. "demo-rm") into API requests
 *      which the backend maps to a mock user profile.
 *
 * The UI is identical in both modes; only the token source changes.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { UserRole, AuthenticatedUser } from '../types';
import {
  setActiveRole,
  getActiveRole,
  setStoredToken,
  setTokenProvider,
  clearTokenProvider,
  ROLE_DEMO_TOKEN,
} from '../api/client';
import {
  firebaseAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from '../api/firebase';

// ── Persona catalogue ─────────────────────────────────────────────────────────
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

// Detect whether real Firebase credentials are configured
const FIREBASE_ENABLED: boolean =
  Boolean(import.meta.env.VITE_FIREBASE_API_KEY) &&
  import.meta.env.VITE_FIREBASE_API_KEY !== 'demo-api-key';

// ── Context types ─────────────────────────────────────────────────────────────
export interface AuthContextType {
  /** Current user role */
  role: UserRole;
  /** Synthetic user profile (derived from Firebase claims or demo persona) */
  user: AuthenticatedUser;
  /** Rich persona metadata for UI */
  persona: PersonaProfile;
  /** True while the auth state is being resolved on first load */
  loading: boolean;
  /** True once the user is authenticated (Firebase or demo mode) */
  isAuthenticated: boolean;
  /** Raw Firebase user object — null in demo mode */
  firebaseUser: FirebaseUser | null;

  /** Switch persona (demo mode) or N/A in Firebase mode */
  switchRole: (newRole: UserRole) => void;
  /** Active journey tracked in context for deep-linking */
  activeJourneyId: string;
  setActiveJourneyId: (id: string) => void;

  /** Sign in with email/password (Firebase mode) */
  signInWithEmail: (email: string, password: string) => Promise<void>;
  /** Sign out (clears Firebase session or resets demo) */
  logout: () => Promise<void>;
}

// ── Context & Provider ────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [role, setRoleState] = useState<UserRole>(() => getActiveRole());
  const [loading, setLoading] = useState<boolean>(FIREBASE_ENABLED);
  const [activeJourneyId, setActiveJourneyId] = useState<string>('jrn_priya_001');
  // Track whether the user is authenticated in demo mode
  const [demoAuthenticated, setDemoAuthenticated] = useState<boolean>(
    !FIREBASE_ENABLED  // In demo mode, start as authenticated
  );

  const tokenRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Firebase Auth listener ─────────────────────────────────────────────────
  useEffect(() => {
    if (!FIREBASE_ENABLED) return;

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);

        // Extract role from custom claims
        const idTokenResult = await fbUser.getIdTokenResult(true);
        const claimedRole = (idTokenResult.claims['role'] as string | undefined)?.toUpperCase();
        const resolvedRole: UserRole =
          claimedRole && ['CUSTOMER', 'RM', 'RISK_OFFICER', 'ADMIN'].includes(claimedRole)
            ? (claimedRole as UserRole)
            : 'CUSTOMER';

        setRoleState(resolvedRole);
        setActiveRole(resolvedRole);

        // Register async token provider
        setTokenProvider(async () => {
          return fbUser.getIdToken(false); // refresh only when stale
        });
      } else {
        setFirebaseUser(null);
        clearTokenProvider();
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (tokenRefreshTimerRef.current) clearTimeout(tokenRefreshTimerRef.current);
    };
  }, []);

  // ── Derived values ─────────────────────────────────────────────────────────
  const persona = PERSONAS[role];
  const isAuthenticated = FIREBASE_ENABLED ? Boolean(firebaseUser) : demoAuthenticated;

  const user: AuthenticatedUser = {
    uid: firebaseUser?.uid ?? `usr_demo_${role.toLowerCase()}`,
    email: firebaseUser?.email ?? persona.email,
    name: firebaseUser?.displayName ?? persona.name,
    role,
    business_id: role === 'CUSTOMER' ? 'app_priya_001' : undefined,
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!FIREBASE_ENABLED) {
      throw new Error('Firebase is not configured. Use demo persona login instead.');
    }
    await signInWithEmailAndPassword(firebaseAuth, email, password);
    // onAuthStateChanged handles the rest
  }, []);

  const switchRole = useCallback((newRole: UserRole) => {
    if (FIREBASE_ENABLED) return; // role is determined by Firebase claims
    setRoleState(newRole);
    setActiveRole(newRole);
    setStoredToken(ROLE_DEMO_TOKEN[newRole]);
    setDemoAuthenticated(true);
    const newPersona = PERSONAS[newRole];
    setActiveJourneyId(newPersona.defaultJourneyId);
  }, []);

  const logout = useCallback(async () => {
    if (FIREBASE_ENABLED && firebaseUser) {
      await signOut(firebaseAuth);
      clearTokenProvider();
      setFirebaseUser(null);
    }
    // Reset to demo customer
    switchRole('CUSTOMER');
    setDemoAuthenticated(false);
  }, [firebaseUser, switchRole]);

  return (
    <AuthContext.Provider
      value={{
        role,
        user,
        persona,
        loading,
        isAuthenticated,
        firebaseUser,
        switchRole,
        activeJourneyId,
        setActiveJourneyId,
        signInWithEmail,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
