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
import { UserRole, AuthenticatedUser, JourneyRecord, ApplicationRecord, MSMEProfile } from '../types';
import {
  api,
  setActiveRole,
  getActiveRole,
  setStoredToken,
  setTokenProvider,
  clearTokenProvider,
  ROLE_DEMO_TOKEN,
} from '../api/client';

export function computeRolePermissions(role: UserRole): Record<string, boolean> {
  const isCust = role === 'CUSTOMER';
  const isRM = role === 'RM';
  const isRMSup = role === 'RM_SUPERVISOR';
  const isRiskOff = role === 'RISK_OFFICER';
  const isRiskMgr = role === 'RISK_MANAGER';
  const isApprover = role === 'CREDIT_APPROVER';
  const isAudit = role === 'AUDIT_OFFICER';
  const isAdmin = role === 'SYS_ADMIN' || role === 'ADMIN';

  return {
    canCreateApplication: isCust,
    canUploadDocuments: isCust || isRM,
    canViewEvidence: true,
    canTriggerVerification: isRM || isRiskOff || isRiskMgr,
    canModifyRiskScore: false,
    canApproveCredit: isApprover || isRiskMgr,
    canRejectCredit: isApprover || isRiskOff || isRiskMgr,
    canOverrideDecision: isRiskOff || isRiskMgr || isApprover,
    canRequestMoreInfo: isRM || isRiskOff || isRiskMgr,
    canEscalateCase: isRM || isRMSup || isRiskOff || isRiskMgr,
    canInspectDecisionReplay: true,
    canViewAuditFindings: isAudit || isRiskMgr || isApprover || isAdmin,
    canManageUsers: isAdmin,
    canViewOtherCustomers: !isCust,
    canViewInternalRiskNotes: !isCust,
  };
}
import {
  firebaseAuth,
  firestoreDb,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  doc,
  setDoc,
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
    name: 'MSME Customer',
    title: 'Authorized Signatory',
    email: 'customer@example.com',
    organization: 'My MSME Enterprise',
    avatarInitials: 'CU',
    badgeColor: 'var(--fin-green)',
    defaultRoute: '/customer',
    defaultJourneyId: '',
  },
  RM: {
    role: 'RM',
    name: 'Rohan Mehta',
    title: 'Senior Relationship Manager',
    email: 'rohan.mehta@finflowbank.com',
    organization: 'Commercial SME Lending Unit (First-Line Ops)',
    avatarInitials: 'RM',
    badgeColor: 'var(--fin-blue)',
    defaultRoute: '/rm',
    defaultJourneyId: 'jrn_kavita_002',
  },
  RM_SUPERVISOR: {
    role: 'RM_SUPERVISOR',
    name: 'Vikram Malhotra',
    title: 'Credit Operations Manager & RM Supervisor',
    email: 'vikram.malhotra@finflowbank.com',
    organization: 'First-Line Credit Operations',
    avatarInitials: 'VM',
    badgeColor: 'var(--brand-700)',
    defaultRoute: '/operations',
    defaultJourneyId: 'jrn_kavita_002',
  },
  RISK_OFFICER: {
    role: 'RISK_OFFICER',
    name: 'Ananya Iyer',
    title: 'Chief Credit Risk & Fraud Officer',
    email: 'ananya.iyer@finflowbank.com',
    organization: 'Risk & Institutional Compliance (Second-Line)',
    avatarInitials: 'AI',
    badgeColor: 'var(--fin-amber)',
    defaultRoute: '/risk',
    defaultJourneyId: 'jrn_apex_003',
  },
  RISK_MANAGER: {
    role: 'RISK_MANAGER',
    name: 'Meera Krishnan',
    title: 'Senior Credit Risk Officer',
    email: 'meera.krishnan@finflowbank.com',
    organization: 'Credit Risk Oversight & Challenge',
    avatarInitials: 'MK',
    badgeColor: 'var(--fin-coral)',
    defaultRoute: '/risk-manager',
    defaultJourneyId: 'jrn_apex_003',
  },
  CREDIT_APPROVER: {
    role: 'CREDIT_APPROVER',
    name: 'Rajesh Singhania',
    title: 'Chief Credit Officer / Committee Chair',
    email: 'rajesh.singhania@finflowbank.com',
    organization: 'Sanction Authority & Credit Committee',
    avatarInitials: 'RS',
    badgeColor: '#dc2626',
    defaultRoute: '/approvals',
    defaultJourneyId: 'jrn_apex_003',
  },
  AUDIT_OFFICER: {
    role: 'AUDIT_OFFICER',
    name: 'Sunita Rao',
    title: 'Director of Internal Audit & Algorithmic Governance',
    email: 'sunita.rao@finflowbank.com',
    organization: 'Independent Third-Line Assurance',
    avatarInitials: 'SR',
    badgeColor: 'var(--fin-violet)',
    defaultRoute: '/audit',
    defaultJourneyId: 'jrn_apex_003',
  },
  SYS_ADMIN: {
    role: 'SYS_ADMIN',
    name: 'Amit Verma',
    title: 'Platform Infrastructure Lead',
    email: 'admin@finflow.ai',
    organization: 'FinFlow AI Core Engine (Technical Custodian)',
    avatarInitials: 'AV',
    badgeColor: '#64748b',
    defaultRoute: '/admin',
    defaultJourneyId: 'jrn_priya_001',
  },
  ADMIN: {
    role: 'ADMIN',
    name: 'Amit Verma',
    title: 'Platform Infrastructure Lead',
    email: 'admin@finflow.ai',
    organization: 'FinFlow AI Core Engine (Technical Custodian)',
    avatarInitials: 'AV',
    badgeColor: '#64748b',
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
  /** MSME Business profile for the authenticated borrower */
  msmeProfile: MSMEProfile | null;
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

  // ── Part 43 Application-Level State ─────────────────────────────────────────
  selectedApplicationId: string;
  selectedApplication: ApplicationRecord | null;
  journey: JourneyRecord | null;
  permissions: Record<string, boolean>;
  setSelectedApplicationId: (id: string) => void;
  refreshAppState: () => Promise<void>;
  loadMsmeProfile: () => Promise<void>;
  updateMsmeProfileState: (data: Partial<MSMEProfile>) => Promise<MSMEProfile>;

  /** Sign in with email/password (Firebase mode or demo fallback) */
  signInWithEmail: (email: string, password: string) => Promise<void>;
  /** Register new account with email/password */
  signUpWithEmail: (email: string, password: string, name: string, role?: UserRole) => Promise<void>;
  /** Send password reset email */
  resetPassword: (email: string) => Promise<void>;
  /** Sign out (clears Firebase session or resets demo) */
  logout: () => Promise<void>;
}

// ── Context & Provider ────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [role, setRoleState] = useState<UserRole>(() => getActiveRole());
  const [loading, setLoading] = useState<boolean>(FIREBASE_ENABLED);
  const [msmeProfile, setMsmeProfile] = useState<MSMEProfile | null>(null);
  const [activeJourneyId, setActiveJourneyId] = useState<string>(() => {
    // If real Firebase enabled, wait for user's own journey list
    return FIREBASE_ENABLED ? '' : 'jrn_priya_001';
  });
  const [selectedApplicationId, setSelectedApplicationIdState] = useState<string>(() => {
    return FIREBASE_ENABLED ? '' : 'app_priya_001';
  });
  const [selectedApplication, setSelectedApplication] = useState<ApplicationRecord | null>(null);
  const [journey, setJourney] = useState<JourneyRecord | null>(null);

  const permissions = React.useMemo(() => computeRolePermissions(role), [role]);

  const refreshAppState = useCallback(async () => {
    if (!activeJourneyId) {
      setJourney(null);
      setSelectedApplication(null);
      return;
    }
    try {
      const [jrn, app] = await Promise.all([
        api.getJourney(activeJourneyId).catch(() => null),
        api.getApplication(selectedApplicationId || activeJourneyId).catch(() => null),
      ]);
      if (jrn) setJourney(jrn);
      if (app) setSelectedApplication(app);
    } catch (err) {
      console.warn('Could not refresh application state:', err);
    }
  }, [activeJourneyId, selectedApplicationId]);

  useEffect(() => {
    refreshAppState();
  }, [refreshAppState]);

  const setSelectedApplicationId = useCallback((id: string) => {
    setSelectedApplicationIdState(id);
  }, []);

  const [customDemoUser, setCustomDemoUser] = useState<{ name: string; email: string } | null>(() => {
    try {
      const stored = localStorage.getItem('finflow_demo_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Track whether the user is authenticated in demo mode
  const [demoAuthenticated, setDemoAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('finflow_auth_status') === 'authenticated';
  });

  const tokenRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMsmeProfile = useCallback(async () => {
    try {
      const profile = await api.getMSMEProfile();
      if (profile) {
        setMsmeProfile(profile);
      }
    } catch {
      // not yet created or non-customer
    }
  }, []);

  const updateMsmeProfileState = useCallback(async (data: Partial<MSMEProfile>) => {
    const updated = await api.updateMSMEProfile(data);
    setMsmeProfile(updated);
    return updated;
  }, []);

  // ── Firebase Auth listener ─────────────────────────────────────────────────
  useEffect(() => {
    if (!FIREBASE_ENABLED) return;

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);

        // Extract role from custom claims
        try {
          const idTokenResult = await fbUser.getIdTokenResult(true);
          const claimedRole = (idTokenResult.claims['role'] as string | undefined)?.toUpperCase();
          const resolvedRole: UserRole =
            claimedRole && ['CUSTOMER', 'RM', 'RISK_OFFICER', 'ADMIN'].includes(claimedRole)
              ? (claimedRole as UserRole)
              : 'CUSTOMER';

          setRoleState(resolvedRole);
          setActiveRole(resolvedRole);
        } catch {
          setRoleState('CUSTOMER');
          setActiveRole('CUSTOMER');
        }

        // Register async token provider
        setTokenProvider(async () => {
          return fbUser.getIdToken(false);
        });

        // Load the authenticated user's own profile and active journeys
        try {
          const [profileRes, journeysList] = await Promise.all([
            api.getMSMEProfile().catch(() => null),
            api.listJourneys().catch(() => []),
          ]);

          if (profileRes && (profileRes.business_name || profileRes.promoter_name)) {
            setMsmeProfile(profileRes);
          }

          if (journeysList && journeysList.length > 0) {
            const biz = (profileRes?.business_name || '').toLowerCase();
            const matchingJourney = biz
              ? journeysList.find((j: any) =>
                  (j.intent?.business_name || j.business_name || '').toLowerCase().includes(biz) ||
                  biz.includes((j.intent?.business_name || j.business_name || '').toLowerCase())
                )
              : null;
            const target = matchingJourney || journeysList[0];
            setActiveJourneyId(target.journey_id);
            setSelectedApplicationIdState(target.application_id || target.journey_id);
          } else {
            setActiveJourneyId('');
            setSelectedApplicationIdState('');
          }
        } catch (fetchErr) {
          console.warn('Error loading initial profile or journeys:', fetchErr);
        }
      } else {
        setFirebaseUser(null);
        setMsmeProfile(null);
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
  const defaultPersona = PERSONAS[role];
  const isAuthenticated = FIREBASE_ENABLED ? Boolean(firebaseUser) : demoAuthenticated;

  const persona: PersonaProfile = React.useMemo(() => {
    if (role === 'CUSTOMER' && (firebaseUser || customDemoUser || msmeProfile)) {
      const email =
        firebaseUser?.email ||
        (customDemoUser?.email && !customDemoUser.email.endsWith('@finflowbank.com') ? customDemoUser.email : '') ||
        (msmeProfile?.email && !msmeProfile.email.endsWith('@finflowbank.com') ? msmeProfile.email : '') ||
        defaultPersona.email;
      const emailPrefix = email ? email.split('@')[0].replace(/[._]/g, ' ') : '';
      const name =
        msmeProfile?.promoter_name ||
        firebaseUser?.displayName ||
        customDemoUser?.name ||
        (emailPrefix ? emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1) : defaultPersona.name);

      const organization =
        msmeProfile?.business_name ||
        (msmeProfile?.entity_type ? `${msmeProfile.entity_type} Enterprise` : 'SkillBridge Enterprises');

      const initials = name
        .split(' ')
        .filter(Boolean)
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'CU';

      return {
        role: 'CUSTOMER',
        name,
        title: msmeProfile?.entity_type ? `${msmeProfile.entity_type} Owner` : 'Authorized Signatory',
        email,
        organization,
        avatarInitials: initials,
        badgeColor: 'var(--fin-green)',
        defaultRoute: '/customer',
        defaultJourneyId: activeJourneyId || '',
      };
    }
    return defaultPersona;
  }, [role, firebaseUser, customDemoUser, msmeProfile, defaultPersona, activeJourneyId]);

  const user: AuthenticatedUser = React.useMemo(() => ({
    uid: firebaseUser?.uid ?? `usr_demo_${role.toLowerCase()}`,
    email: persona.email,
    name: persona.name,
    role,
    business_id: role === 'CUSTOMER' ? (msmeProfile?.user_id || undefined) : undefined,
  }), [firebaseUser, role, persona, msmeProfile]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (FIREBASE_ENABLED) {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      return;
    }

    // Demo Mode fallback authentication
    await new Promise((r) => setTimeout(r, 450));
    const normalized = email.toLowerCase();
    let detectedRole: UserRole = 'CUSTOMER';
    if (normalized.includes('rm') || normalized.includes('officer')) detectedRole = 'RM';
    else if (normalized.includes('risk') || normalized.includes('compliance')) detectedRole = 'RISK_OFFICER';
    else if (normalized.includes('admin')) detectedRole = 'ADMIN';

    setRoleState(detectedRole);
    setActiveRole(detectedRole);
    setStoredToken(ROLE_DEMO_TOKEN[detectedRole]);
    setCustomDemoUser({ name: email.split('@')[0].replace(/[._]/g, ' '), email });
    setDemoAuthenticated(true);
    localStorage.setItem('finflow_auth_status', 'authenticated');
    localStorage.setItem('finflow_demo_user', JSON.stringify({ name: email.split('@')[0], email }));
    setActiveJourneyId(PERSONAS[detectedRole].defaultJourneyId);
  }, []);

  const signUpWithEmail = useCallback(async (
    email: string,
    password: string,
    name: string,
    requestedRole: UserRole = 'CUSTOMER'
  ) => {
    const safeRole: UserRole = requestedRole === 'CUSTOMER' ? 'CUSTOMER' : 'CUSTOMER';

    if (FIREBASE_ENABLED) {
      const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      if (cred.user) {
        await updateProfile(cred.user, { displayName: name });
        try {
          await setDoc(doc(firestoreDb, 'users', cred.user.uid), {
            uid: cred.user.uid,
            email,
            displayName: name,
            role: safeRole,
            createdAt: new Date().toISOString(),
          });
        } catch {
          // Graceful if Firestore rules or offline
        }
      }
      return;
    }

    // Demo Mode registration
    await new Promise((r) => setTimeout(r, 450));
    setRoleState(safeRole);
    setActiveRole(safeRole);
    setStoredToken(ROLE_DEMO_TOKEN[safeRole]);
    setCustomDemoUser({ name, email });
    setDemoAuthenticated(true);
    localStorage.setItem('finflow_auth_status', 'authenticated');
    localStorage.setItem('finflow_demo_user', JSON.stringify({ name, email }));
    setActiveJourneyId(PERSONAS[safeRole].defaultJourneyId);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (FIREBASE_ENABLED) {
      await sendPasswordResetEmail(firebaseAuth, email);
    } else {
      await new Promise((r) => setTimeout(r, 300));
    }
  }, []);

  const switchRole = useCallback((newRole: UserRole) => {
    if (FIREBASE_ENABLED) return;
    setRoleState(newRole);
    setActiveRole(newRole);
    setStoredToken(ROLE_DEMO_TOKEN[newRole]);
    setDemoAuthenticated(true);
    localStorage.setItem('finflow_auth_status', 'authenticated');
    const newPersona = PERSONAS[newRole];
    setActiveJourneyId(newPersona.defaultJourneyId);
  }, []);

  const logout = useCallback(async () => {
    if (FIREBASE_ENABLED && firebaseUser) {
      await signOut(firebaseAuth);
      clearTokenProvider();
      setFirebaseUser(null);
    }
    localStorage.removeItem('finflow_auth_status');
    localStorage.removeItem('finflow_demo_user');
    setCustomDemoUser(null);
    setDemoAuthenticated(false);
    setMsmeProfile(null);
    setActiveJourneyId('');
    setSelectedApplicationIdState('');
    switchRole('CUSTOMER');
  }, [firebaseUser, switchRole]);

  return (
    <AuthContext.Provider
      value={{
        role,
        user,
        persona,
        msmeProfile,
        loading,
        isAuthenticated,
        firebaseUser,
        switchRole,
        activeJourneyId,
        setActiveJourneyId,
        selectedApplicationId,
        selectedApplication,
        journey,
        permissions,
        setSelectedApplicationId,
        refreshAppState,
        loadMsmeProfile,
        updateMsmeProfileState,
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
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

/**
 * Clean application-level state hook alias (Part 43)
 * Provides: authenticated user, role, selected application, journey, permissions, and refreshAppState
 */
export const useAppState = useAuth;

