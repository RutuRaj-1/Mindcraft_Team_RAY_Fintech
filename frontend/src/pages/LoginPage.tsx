/**
 * LoginPage — FinFlow AI
 *
 * Renders two login modes side-by-side (or stacked on mobile):
 *
 *  LEFT  — Email / Password form  (Firebase mode)
 *  RIGHT — Instant demo persona cards  (always available for hackathon demo)
 *
 * In pure demo mode (no Firebase credentials configured) the email/password
 * panel is hidden and only the persona switcher is shown.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, PERSONAS } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  Zap, ArrowRight, Mail, Lock, AlertTriangle,
  ShieldCheck, Users, BarChart3, Settings2, Eye, EyeOff, Loader2,
} from 'lucide-react';
import { Button } from '../components/ui/Button';

// ── Static data ───────────────────────────────────────────────────────────────
const FIREBASE_ENABLED: boolean =
  Boolean(import.meta.env.VITE_FIREBASE_API_KEY) &&
  import.meta.env.VITE_FIREBASE_API_KEY !== 'demo-api-key';

const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  CUSTOMER:     <ShieldCheck className="w-4 h-4" />,
  RM:           <Users className="w-4 h-4" />,
  RISK_OFFICER: <BarChart3 className="w-4 h-4" />,
  ADMIN:        <Settings2 className="w-4 h-4" />,
};

const DEMO_CREDENTIALS: Record<UserRole, string> = {
  CUSTOMER:     'customer@finflow.demo',
  RM:           'rm@finflow.demo',
  RISK_OFFICER: 'risk@finflow.demo',
  ADMIN:        'admin@finflow.demo',
};

// ── Component ─────────────────────────────────────────────────────────────────
export const LoginPage: React.FC = () => {
  const { switchRole, signInWithEmail, setActiveJourneyId } = useAuth();
  const navigate = useNavigate();

  // Demo panel state
  const [selectedRole, setSelectedRole] = useState<UserRole>('CUSTOMER');
  const [demoLoading, setDemoLoading] = useState(false);

  // Firebase email/password state
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fbLoading, setFbLoading]     = useState(false);
  const [fbError, setFbError]         = useState<string | null>(null);

  const personaList = Object.entries(PERSONAS) as [UserRole, (typeof PERSONAS)[UserRole]][];

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleDemoLogin = async (role: UserRole) => {
    setDemoLoading(true);
    setSelectedRole(role);
    await new Promise((r) => setTimeout(r, 400)); // brief UX transition
    switchRole(role);
    setActiveJourneyId(PERSONAS[role].defaultJourneyId);
    navigate(PERSONAS[role].defaultRoute, { replace: true });
  };

  const handleFirebaseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFbError(null);
    setFbLoading(true);
    try {
      await signInWithEmail(email, password);
      // onAuthStateChanged in AuthContext will set the role; navigate to root
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setFbError(
        msg.includes('auth/user-not-found') || msg.includes('auth/wrong-password')
          ? 'Invalid email or password. Please try again.'
          : msg.includes('auth/too-many-requests')
          ? 'Too many attempts. Please wait a moment and try again.'
          : msg
      );
    } finally {
      setFbLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-subtle)] px-4 py-12">
      {/* Card wrapper */}
      <div
        className={`w-full ${
          FIREBASE_ENABLED ? 'max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-0' : 'max-w-md'
        } bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[8px_8px_0px_#0A1F20] overflow-hidden`}
      >
        {/* ── LEFT: Firebase email / password panel ── */}
        {FIREBASE_ENABLED && (
          <div className="p-8 border-r-2 border-[var(--brand-950)] flex flex-col justify-center">
            {/* Header */}
            <div className="mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[var(--brand-950)] text-white flex items-center justify-center mb-4 shadow-[2px_2px_0px_#0A1F20]">
                <Zap className="w-6 h-6 text-[var(--brand-300)]" fill="currentColor" />
              </div>
              <h1
                className="text-2xl font-black text-[var(--brand-950)] tracking-tight"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                FinFlow AI
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Institutional SSO — secure, role-based access
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleFirebaseLogin} className="space-y-4" noValidate>
              {/* Email */}
              <div>
                <label
                  htmlFor="ff-email"
                  className="block text-xs font-bold text-[var(--brand-950)] uppercase tracking-wider mb-1.5"
                >
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    id="ff-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@institution.com"
                    className="w-full pl-9 pr-4 py-2.5 text-sm border-2 border-[var(--border)] rounded-xl focus:border-[var(--brand-700)] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="ff-password"
                  className="block text-xs font-bold text-[var(--brand-950)] uppercase tracking-wider mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    id="ff-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 text-sm border-2 border-[var(--border)] rounded-xl focus:border-[var(--brand-700)] focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--brand-700)] transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {fbError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  {fbError}
                </div>
              )}

              <Button
                id="btn-firebase-signin"
                type="submit"
                variant="brutal"
                size="md"
                className="w-full"
                disabled={fbLoading || !email || !password}
                rightIcon={
                  fbLoading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <ArrowRight className="w-4 h-4" />
                }
              >
                {fbLoading ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>

            <p className="text-[10px] text-[var(--text-muted)] text-center mt-5">
              Access is governed by role-based custom claims issued by your administrator.
            </p>
          </div>
        )}

        {/* ── RIGHT: Demo persona switcher ── */}
        <div className={`p-8 ${!FIREBASE_ENABLED ? '' : 'bg-[var(--surface-subtle)]'} flex flex-col`}>
          {/* Header (only shown when this is the only panel) */}
          {!FIREBASE_ENABLED && (
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[var(--brand-950)] text-white flex items-center justify-center mx-auto mb-3 shadow-[2px_2px_0px_#0A1F20]">
                <Zap className="w-6 h-6 text-[var(--brand-300)]" fill="currentColor" />
              </div>
              <h1
                className="text-2xl font-black text-[var(--brand-950)] tracking-tight"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                FinFlow AI
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Select a persona to begin the demo journey
              </p>
            </div>
          )}

          {FIREBASE_ENABLED && (
            <div className="mb-5">
              <p className="text-xs font-bold text-[var(--brand-950)] uppercase tracking-wider">
                Instant Demo Access
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                Bypass auth — for hackathon evaluation only
              </p>
            </div>
          )}

          {/* Persona cards */}
          <div className="space-y-2.5 flex-1">
            {personaList.map(([r, p]) => {
              const isSelected = selectedRole === r;
              const isLoading  = demoLoading && isSelected;
              return (
                <button
                  id={`persona-btn-${r.toLowerCase()}`}
                  key={r}
                  type="button"
                  onClick={() => handleDemoLogin(r)}
                  disabled={demoLoading}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all text-left disabled:opacity-60 ${
                    isSelected && demoLoading
                      ? 'border-[var(--brand-950)] bg-[var(--brand-50)] shadow-[2px_2px_0px_#0A1F20]'
                      : 'border-[var(--border)] bg-white hover:border-[var(--brand-700)] hover:bg-[var(--brand-50)] hover:shadow-[2px_2px_0px_#0A1F20]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm"
                      style={{ backgroundColor: p.badgeColor }}
                    >
                      {p.avatarInitials}
                    </div>
                    <div>
                      <p className="text-xs font-black text-[var(--brand-950)]">{p.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{p.title}</p>
                      {FIREBASE_ENABLED && (
                        <p className="text-[10px] text-[var(--brand-600)] font-mono mt-0.5">
                          {DEMO_CREDENTIALS[r]}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-[var(--text-muted)]">
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-medium">
                        {ROLE_ICONS[r]}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-[10px] text-[var(--text-muted)] text-center mt-5 pt-4 border-t border-[var(--border)]">
            Demo personas load pre-seeded data — no persistence between sessions.
          </p>
        </div>
      </div>
    </div>
  );
};
