import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, PERSONAS } from '../context/AuthContext';
import { UserRole } from '../types';
import { FinFlowLogo } from '../components/ui/FinFlowLogo';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, Loader2,
  ShieldCheck, AlertCircle, Sparkles, Building2,
  CheckCircle2, KeyRound, HelpCircle
} from 'lucide-react';

export const SignInPage: React.FC = () => {
  const { signInWithEmail, resetPassword, switchRole, setActiveJourneyId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Demo persona tab for hackathon judges
  const [activeTab, setActiveTab] = useState<'signin' | 'demo'>('signin');
  const [demoLoading, setDemoLoading] = useState(false);

  const from = (location.state as any)?.from?.pathname;

  const getRoleDestination = (role: UserRole) => {
    switch (role) {
      case 'RM': return '/rm';
      case 'RISK_OFFICER': return '/risk';
      case 'ADMIN': return '/admin';
      default: return '/customer';
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmail(email.trim(), password);

      // Save preference if remember me
      if (rememberMe) {
        localStorage.setItem('finflow_remember_email', email.trim());
      } else {
        localStorage.removeItem('finflow_remember_email');
      }

      // Determine role from email if demo mode, or route to target
      let targetRole: UserRole = 'CUSTOMER';
      const norm = email.toLowerCase();
      if (norm.includes('rm') || norm.includes('officer')) targetRole = 'RM';
      else if (norm.includes('risk') || norm.includes('compliance')) targetRole = 'RISK_OFFICER';
      else if (norm.includes('admin')) targetRole = 'ADMIN';

      const destination = from || getRoleDestination(targetRole);
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      if (raw.includes('auth/invalid-credential') || raw.includes('auth/wrong-password') || raw.includes('auth/user-not-found')) {
        setErrorMsg('Your email or password is incorrect. Please try again.');
      } else if (raw.includes('auth/too-many-requests')) {
        setErrorMsg('Too many unsuccessful attempts. Please wait a moment before trying again.');
      } else if (raw.includes('auth/network-request-failed')) {
        setErrorMsg('Network error. Please check your internet connection.');
      } else {
        setErrorMsg('Unable to sign in. Please verify your credentials or use the Demo Access tab.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (role: UserRole) => {
    setDemoLoading(true);
    await new Promise((r) => setTimeout(r, 350));
    switchRole(role);
    setActiveJourneyId(PERSONAS[role].defaultJourneyId);
    navigate(PERSONAS[role].defaultRoute, { replace: true });
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetLoading(true);
    try {
      await resetPassword(resetEmail.trim());
      setResetSent(true);
    } catch {
      setResetSent(true); // Always display confirmation for security
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link to="/" className="inline-block hover:opacity-95 transition-opacity">
          <FinFlowLogo size="lg" className="h-12 sm:h-14 mx-auto" />
        </Link>
      </div>

      {/* Main Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-4xl bg-white border-2 border-[#0B1F3A] rounded-3xl shadow-[8px_8px_0px_#0B1F3A] overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-12">
          
          {/* ── LEFT COLUMN: Brand & Product Visual ── */}
          <div className="hidden md:flex md:col-span-5 bg-[#0B1F3A] text-white p-8 flex-col justify-between relative overflow-hidden">
            {/* Ambient glows */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#1687F7]/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#12B8C8]/15 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#12B8C8] text-xs font-bold border border-white/10">
                <ShieldCheck className="w-3.5 h-3.5 text-[#22C98A]" />
                <span>Enterprise Portal</span>
              </div>

              <div>
                <h2
                  className="text-2xl font-black text-white leading-tight"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  Intelligent MSME Financial Journeys
                </h2>
                <p className="text-xs text-[#CBD5E1] mt-2 leading-relaxed">
                  Sign in to access your guided credit orchestration, live document verification, and explainable decision records.
                </p>
              </div>

              {/* Trust Points */}
              <div className="space-y-3 pt-2 text-xs text-[#E2E8F0]">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#22C98A] shrink-0" />
                  <span>Deterministic Underwriting Rules</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#1687F7] shrink-0" />
                  <span>SHAP Zero-Hallucination Explanations</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#12B8C8] shrink-0" />
                  <span>End-to-End Evidence Provenance</span>
                </div>
              </div>
            </div>

            {/* Bottom Demo Card Preview */}
            <div className="relative z-10 p-3.5 rounded-2xl bg-white/5 border border-white/10 mt-8">
              <div className="flex items-center justify-between text-[11px] text-[#94A3B8] pb-1.5 border-b border-white/10">
                <span>Active Journey</span>
                <span className="text-[#22C98A] font-bold">Sharma Textiles</span>
              </div>
              <p className="text-[11px] text-white font-medium mt-1.5">
                "Sanction Ready · DSCR 1.68x · 8/10 Evidence Verified"
              </p>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Sign In Form & Tabs ── */}
          <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
            
            {/* Mode Switcher Tabs */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('signin')}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'signin'
                      ? 'bg-[#0B1F3A] text-white shadow-2xs'
                      : 'text-[#64748B] hover:text-[#0B1F3A]'
                  }`}
                >
                  Standard Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('demo')}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'demo'
                      ? 'bg-[#1687F7] text-white shadow-2xs'
                      : 'text-[#1687F7] bg-[#1687F7]/10 hover:bg-[#1687F7]/20'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Instant Demo Personas</span>
                </button>
              </div>
            </div>

            {/* TAB 1: Standard Sign In Form */}
            {activeTab === 'signin' && (
              <div className="space-y-5">
                <div>
                  <h1
                    className="text-2xl font-black text-[#0B1F3A] tracking-tight"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  >
                    Welcome back
                  </h1>
                  <p className="text-xs text-[#64748B] mt-1">
                    Continue your financial journey with FinFlow AI.
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSignIn} className="space-y-4" noValidate>
                  {/* Email */}
                  <div>
                    <label
                      htmlFor="signin-email"
                      className="block text-xs font-bold text-[#0B1F3A] uppercase tracking-wider mb-1.5"
                    >
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                      <input
                        id="signin-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@business.com or officer@bank.com"
                        className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm border-2 border-[#E2E8F0] rounded-xl focus:border-[#0F4C81] focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="signin-password"
                        className="block text-xs font-bold text-[#0B1F3A] uppercase tracking-wider"
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowForgotModal(true)}
                        className="text-xs font-semibold text-[#1687F7] hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                      <input
                        id="signin-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm border-2 border-[#E2E8F0] rounded-xl focus:border-[#0F4C81] focus:outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0B1F3A]"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded text-[#0F4C81] border-[#CBD5E1] focus:ring-[#0F4C81]"
                      />
                      <span className="text-xs text-[#475569]">Remember me for 30 days</span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl bg-[#0B1F3A] hover:bg-[#0F4C81] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#12B8C8]" />
                        <span>Verifying Credentials…</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight className="w-4 h-4 text-[#22C98A]" />
                      </>
                    )}
                  </button>
                </form>

                {/* Switch to SignUp */}
                <div className="pt-4 text-center text-xs text-[#64748B]">
                  Don't have an account?{' '}
                  <Link to="/signup" className="font-bold text-[#0F4C81] hover:underline">
                    Create an account
                  </Link>
                </div>
              </div>
            )}

            {/* TAB 2: Instant Demo Personas for Hackathon Reviewers */}
            {activeTab === 'demo' && (
              <div className="space-y-4">
                <div>
                  <h2
                    className="text-xl font-black text-[#0B1F3A]"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  >
                    Instant Hackathon Personas
                  </h2>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Click any pre-configured role to immediately test live journeys without manual credentials.
                  </p>
                </div>

                <div className="space-y-2">
                  {Object.entries(PERSONAS).map(([roleKey, p]) => (
                    <button
                      key={roleKey}
                      type="button"
                      disabled={demoLoading}
                      onClick={() => handleDemoLogin(roleKey as UserRole)}
                      className="w-full p-3 rounded-2xl border-2 border-[#E2E8F0] hover:border-[#0F4C81] hover:bg-[#F8FAFC] transition-all text-left flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0 shadow-2xs"
                          style={{
                            backgroundColor:
                              roleKey === 'CUSTOMER' ? '#0E9B6D' :
                              roleKey === 'RM' ? '#2460DC' :
                              roleKey === 'RISK_OFFICER' ? '#C98A10' : '#6A49C6',
                          }}
                        >
                          {p.avatarInitials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-[#0B1F3A]">{p.name}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#EEF8F7] text-[#0F4C81] border border-[#12B8C8]/30">
                              {roleKey}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#64748B]">{p.title} · {p.organization}</p>
                        </div>
                      </div>

                      <ArrowRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#0F4C81] group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>

                <div className="text-[11px] text-[#64748B] text-center pt-2">
                  * Live demo tokens are validated against FastAPI mock profiles.
                </div>
              </div>
            )}

          </div>

        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-[#0B1F3A] p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <h3 className="text-lg font-black text-[#0B1F3A]">Password Reset</h3>
              <button
                onClick={() => {
                  setShowForgotModal(false);
                  setResetSent(false);
                }}
                className="text-[#64748B] hover:text-[#0B1F3A] font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {resetSent ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-2">
                <p className="font-bold">Password reset email dispatched.</p>
                <p>If an account exists for {resetEmail}, instructions have been sent.</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setResetSent(false);
                  }}
                  className="mt-2 w-full py-2 bg-[#0B1F3A] text-white rounded-xl font-bold text-xs"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-3">
                <p className="text-xs text-[#64748B]">
                  Enter the email associated with your institutional or customer profile:
                </p>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-3.5 py-2.5 text-xs border border-[#CBD5E1] rounded-xl focus:border-[#0F4C81] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-2.5 rounded-xl bg-[#0B1F3A] hover:bg-[#0F4C81] text-white font-bold text-xs uppercase"
                >
                  {resetLoading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Back to Home Link */}
      <div className="mt-6 text-center text-xs text-[#64748B]">
        <Link to="/" className="hover:text-[#0F4C81] transition-colors inline-flex items-center gap-1 font-semibold">
          <span>← Back to FinFlow AI Home</span>
        </Link>
      </div>

    </div>
  );
};
