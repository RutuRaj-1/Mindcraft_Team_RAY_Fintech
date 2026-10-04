import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FinFlowLogo } from '../components/ui/FinFlowLogo';
import {
  User, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2,
  ShieldCheck, AlertCircle, CheckCircle2, Building, Info
} from 'lucide-react';

export const SignUpPage: React.FC = () => {
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Password rules validation
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  // Strength score (0 to 5)
  const strengthScore = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!isPasswordValid) {
      setErrorMsg('Please satisfy all password complexity criteria.');
      return;
    }
    if (!passwordsMatch) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (!agreedToTerms) {
      setErrorMsg('You must agree to the Terms and Privacy Policy to proceed.');
      return;
    }

    setIsLoading(true);
    try {
      await signUpWithEmail(email.trim(), password, fullName.trim(), 'CUSTOMER');
      // On success, redirect to applicant onboarding
      navigate('/customer', { replace: true });
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      if (raw.includes('auth/email-already-in-use')) {
        setErrorMsg('An account with this email address already exists. Please sign in instead.');
      } else if (raw.includes('auth/invalid-email')) {
        setErrorMsg('Invalid email format. Please provide a valid email.');
      } else if (raw.includes('auth/weak-password')) {
        setErrorMsg('Password does not satisfy the security requirements.');
      } else {
        setErrorMsg('Unable to create account. Please try again or use the demo sign-in.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setErrorMsg(null);
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      navigate('/customer', { replace: true });
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      if (raw.includes('auth/popup-closed-by-user') || raw.includes('auth/cancelled-popup-request')) {
        return;
      }
      setErrorMsg('Google sign-up could not be completed. Please try again or use the email form.');
    } finally {
      setIsGoogleLoading(false);
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
          
          {/* ── LEFT COLUMN: Value Proposition ── */}
          <div className="hidden md:flex md:col-span-5 bg-[#0B1F3A] text-white p-8 flex-col justify-between relative overflow-hidden">
            {/* Ambient glows */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#12B8C8]/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#1687F7]/15 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#22C98A] text-xs font-bold border border-white/10">
                <ShieldCheck className="w-3.5 h-3.5 text-[#22C98A]" />
                <span>Zero Paperwork Onboarding</span>
              </div>

              <div>
                <h2
                  className="text-2xl font-black text-white leading-tight"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  Start your intelligent financial journey.
                </h2>
                <p className="text-xs text-[#CBD5E1] mt-2 leading-relaxed">
                  Join thousands of MSMEs orchestrating credit decisions with complete evidence traceability and zero ambiguity.
                </p>
              </div>

              {/* Checklist */}
              <div className="space-y-3 pt-2 text-xs text-[#E2E8F0]">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#22C98A] shrink-0" />
                  <span>Instant OCR parsing for GST & ITR-V</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#1687F7] shrink-0" />
                  <span>Transparent explainability waterfalls</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#12B8C8] shrink-0" />
                  <span>Live Next Best Action guidance</span>
                </div>
              </div>
            </div>

            {/* Institutional Security Notice */}
            <div className="relative z-10 p-3.5 rounded-2xl bg-white/5 border border-white/10 mt-8 text-[11px] text-[#94A3B8] flex items-start gap-2">
              <Info className="w-4 h-4 text-[#12B8C8] shrink-0 mt-0.5" />
              <span>
                Public registrations are created with <strong>MSME Customer</strong> privileges. Institutional Loan Officer & Risk Committee roles require authorized admin provisioning.
              </span>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Registration Form ── */}
          <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
            <div className="space-y-4">
              <div>
                <h1
                  className="text-2xl font-black text-[#0B1F3A] tracking-tight"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  Create your FinFlow account
                </h1>
                <p className="text-xs text-[#64748B] mt-1">
                  Start your intelligent financial journey today.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Google Sign Up Button */}
              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={isGoogleLoading || isLoading}
                className="w-full py-2.5 px-4 rounded-xl border-2 border-[#CBD5E1] hover:border-[#0B1F3A] hover:bg-slate-50 transition-all font-bold text-xs text-[#0B1F3A] flex items-center justify-center gap-3 shadow-2xs active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#1687F7]" />
                    <span>Connecting to Google…</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Sign up with Google</span>
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-[#E2E8F0] w-full" />
                <span className="bg-white px-3 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider shrink-0">
                  or register with email
                </span>
                <div className="border-t border-[#E2E8F0] w-full" />
              </div>

              <form onSubmit={handleSignUp} className="space-y-3.5" noValidate>
                {/* Full Name */}
                <div>
                  <label
                    htmlFor="signup-name"
                    className="block text-xs font-bold text-[#0B1F3A] uppercase tracking-wider mb-1"
                  >
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                    <input
                      id="signup-name"
                      type="text"
                      required
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border-2 border-[#E2E8F0] rounded-xl focus:border-[#0F4C81] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label
                    htmlFor="signup-email"
                    className="block text-xs font-bold text-[#0B1F3A] uppercase tracking-wider mb-1"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                    <input
                      id="signup-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="priya@textiles.in"
                      className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border-2 border-[#E2E8F0] rounded-xl focus:border-[#0F4C81] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Enterprise Name (Optional) */}
                <div>
                  <label
                    htmlFor="signup-business"
                    className="block text-xs font-bold text-[#0B1F3A] uppercase tracking-wider mb-1"
                  >
                    Business / Enterprise Name
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                    <input
                      id="signup-business"
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Sharma Textiles Pvt. Ltd."
                      className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border-2 border-[#E2E8F0] rounded-xl focus:border-[#0F4C81] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="signup-password"
                    className="block text-xs font-bold text-[#0B1F3A] uppercase tracking-wider mb-1"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create secure password"
                      className="w-full pl-9 pr-10 py-2 text-xs sm:text-sm border-2 border-[#E2E8F0] rounded-xl focus:border-[#0F4C81] focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0B1F3A]"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  {password.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center gap-1 h-1.5">
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <div
                            key={lvl}
                            className={`flex-1 h-full rounded-full transition-colors ${
                              strengthScore >= lvl
                                ? strengthScore >= 4
                                  ? 'bg-[#22C98A]'
                                  : strengthScore >= 3
                                  ? 'bg-[#1687F7]'
                                  : 'bg-[#C98A10]'
                                : 'bg-[#E2E8F0]'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[10px] text-[#64748B]">
                        <span className={hasMinLength ? 'text-[#22C98A] font-semibold' : ''}>
                          {hasMinLength ? '✓' : '○'} 8+ characters
                        </span>
                        <span className={hasUppercase ? 'text-[#22C98A] font-semibold' : ''}>
                          {hasUppercase ? '✓' : '○'} Uppercase letter
                        </span>
                        <span className={hasLowercase ? 'text-[#22C98A] font-semibold' : ''}>
                          {hasLowercase ? '✓' : '○'} Lowercase letter
                        </span>
                        <span className={hasNumber && hasSpecial ? 'text-[#22C98A] font-semibold' : ''}>
                          {hasNumber && hasSpecial ? '✓' : '○'} Number & symbol
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="signup-confirm-password"
                    className="block text-xs font-bold text-[#0B1F3A] uppercase tracking-wider mb-1"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                    <input
                      id="signup-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border-2 border-[#E2E8F0] rounded-xl focus:border-[#0F4C81] focus:outline-none transition-colors"
                    />
                  </div>
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="text-[10px] text-red-600 mt-1">Passwords do not match.</p>
                  )}
                </div>

                {/* Terms Agreement */}
                <div className="pt-1">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="w-4 h-4 rounded text-[#0F4C81] border-[#CBD5E1] focus:ring-[#0F4C81] mt-0.5"
                    />
                    <span className="text-[11px] text-[#475569] leading-tight">
                      I agree to the{' '}
                      <a href="#security" className="text-[#0F4C81] font-semibold hover:underline">
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a href="#security" className="text-[#0F4C81] font-semibold hover:underline">
                        Privacy Policy
                      </a>
                      .
                    </span>
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
                      <span>Creating Account…</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="w-4 h-4 text-[#22C98A]" />
                    </>
                  )}
                </button>
              </form>

              {/* Switch to SignIn */}
              <div className="pt-2 text-center text-xs text-[#64748B]">
                Already have an account?{' '}
                <Link to="/signin" className="font-bold text-[#0F4C81] hover:underline">
                  Sign In
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Back to Home Link */}
      <div className="mt-6 text-center text-xs text-[#64748B]">
        <Link to="/" className="hover:text-[#0F4C81] transition-colors inline-flex items-center gap-1 font-semibold">
          <span>← Back to FinFlow AI Home</span>
        </Link>
      </div>

    </div>
  );
};
