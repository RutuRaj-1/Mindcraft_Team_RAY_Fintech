import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FinFlowLogo } from '../ui/FinFlowLogo';
import { useAuth } from '../../context/AuthContext';
import {
  Menu, X, ArrowRight, ShieldCheck, Cpu, Layers,
  Compass, ChevronRight, LogOut, LayoutDashboard
} from 'lucide-react';

export const LandingNavbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, role, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Product', href: '#solution' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Intelligence', href: '#intelligence' },
    { label: 'Explainability', href: '#explainability' },
    { label: 'For Institutions', href: '#roles' },
    { label: 'Security', href: '#security' },
  ];

  const getDashboardRoute = () => {
    switch (role) {
      case 'RM': return '/rm';
      case 'RISK_OFFICER': return '/risk';
      case 'ADMIN': return '/admin';
      default: return '/customer';
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] shadow-sm py-2'
          : 'bg-white/80 backdrop-blur-xs border-b border-[#E2E8F0]/60 py-3.5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          {/* Brand Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 group transition-opacity hover:opacity-90"
            aria-label="FinFlow AI Home"
          >
            <FinFlowLogo size="md" className="h-10 sm:h-12" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-[#475569]">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="hover:text-[#0F4C81] transition-colors relative py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-[#1687F7] hover:after:w-full after:transition-all"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link
                  to={getDashboardRoute()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-[#0F4C81] text-white hover:bg-[#0B1F3A] transition-all shadow-xs"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-[#12B8C8]" />
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => logout()}
                  title="Sign Out"
                  className="p-2 rounded-xl text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC] border border-[#E2E8F0] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/signin"
                  className="px-4 py-2 text-xs font-bold text-[#0F172A] hover:text-[#0F4C81] transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-[#0B1F3A] hover:bg-[#0F4C81] text-white shadow-xs hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#22C98A]" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-[#E2E8F0] px-4 pt-3 pb-6 space-y-4 shadow-lg animate-in slide-in-from-top duration-200">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-semibold text-[#475569] hover:text-[#0F4C81] hover:bg-[#F8FAFC] rounded-lg transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="pt-3 border-t border-[#E2E8F0] flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <Link
                  to={getDashboardRoute()}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl bg-[#0F4C81] text-white"
                >
                  <LayoutDashboard className="w-4 h-4 text-[#12B8C8]" />
                  <span>Go to Dashboard</span>
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 text-xs font-bold text-[#475569] text-center"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/signin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 text-xs font-bold text-center text-[#0F172A] border border-[#E2E8F0] rounded-xl hover:bg-[#F8FAFC]"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl bg-[#0B1F3A] text-white"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#22C98A]" />
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
