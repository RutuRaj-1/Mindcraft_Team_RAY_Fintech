import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Sparkles, RefreshCw, ArrowRight, ShieldCheck, AlertTriangle, Building2, CheckCircle2 } from 'lucide-react';

export const DemoHubPage: React.FC = () => {
  const navigate = useNavigate();
  const { switchRole, setActiveJourneyId } = useAuth();
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState<string | null>(null);

  const handleResetSeed = async () => {
    setIsSeeding(true);
    setSeedStatus(null);
    try {
      const res = await api.seedDemo();
      setSeedStatus('Database successfully re-seeded with 3 benchmark scenarios!');
    } catch (err: any) {
      setSeedStatus(`Seed failed: ${err.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleLaunchCase = (role: 'CUSTOMER' | 'RM' | 'RISK_OFFICER', id: string, route: string) => {
    switchRole(role);
    setActiveJourneyId(id);
    navigate(route);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-8 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[var(--brand-50)] text-[var(--brand-800)] border border-[var(--brand-200)] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[var(--brand-600)]" /> MindCraft Hackathon Hub
            </span>
            <span className="text-xs text-[var(--text-muted)]">Zero-Config Demo Suite</span>
          </div>
          <h1 className="text-3xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            FinFlow AI Benchmark Evaluation Sandbox
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-2xl leading-relaxed">
            Test pre-seeded scenarios illustrating straightforward high-confidence SME approval, tight margin conditional sanction, and adverse circular fund routing fraud detection.
          </p>
        </div>

        <Button
          variant="brutal"
          size="sm"
          onClick={handleResetSeed}
          isLoading={isSeeding}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Reset & Seed Demo DB
        </Button>
      </div>

      {seedStatus && (
        <div className="p-4 rounded-xl bg-[var(--fin-green-bg)] border border-[var(--fin-green)]/30 text-xs font-bold text-[var(--fin-green)] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{seedStatus}</span>
        </div>
      )}

      {/* 3 Benchmark Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Case 1 */}
        <div className="p-6 rounded-2xl bg-white border-2 border-[var(--fin-green)] shadow-[4px_4px_0px_#0E9B6D] flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--fin-green-bg)] text-[var(--fin-green)] border border-[var(--fin-green)]/30">
                BENCHMARK CASE 1
              </span>
              <span className="text-[10px] font-black text-[var(--fin-green)]">APPROVED</span>
            </div>

            <div>
              <h3 className="text-base font-black text-[var(--brand-950)]">
                Sharma Textiles Pvt. Ltd.
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Prime SME Tier · Zero Default History
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-subtle)] text-xs space-y-1.5 font-medium">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Facility:</span>
                <span className="font-bold">₹15,00,000 (12M)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Turnover:</span>
                <span className="font-bold">₹1.45 Cr / year</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Vintage:</span>
                <span className="font-bold">48 Months</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">DSCR:</span>
                <span className="font-bold text-[var(--fin-green)]">1.85x (Optimal)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Cheque Bounces:</span>
                <span className="font-bold text-[var(--fin-green)]">0 in last 6M</span>
              </div>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Demonstrates straight-through AI processing, verified GSTR-3B filings, high SHAP feature confidence, and instantaneous sanction letter.
            </p>
          </div>

          <div className="pt-6">
            <Button
              variant="brutal"
              size="xs"
              className="w-full"
              onClick={() => handleLaunchCase('CUSTOMER', 'jrn_priya_001', '/customer/journey/jrn_priya_001')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Launch Priya's Journey
            </Button>
          </div>
        </div>

        {/* Case 2 */}
        <div className="p-6 rounded-2xl bg-white border-2 border-[var(--fin-amber)] shadow-[4px_4px_0px_#C98A10] flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--fin-amber-bg)] text-[var(--fin-amber)] border border-[var(--fin-amber)]/30">
                BENCHMARK CASE 2
              </span>
              <span className="text-[10px] font-black text-[var(--fin-amber)]">CONDITIONAL</span>
            </div>

            <div>
              <h3 className="text-base font-black text-[var(--brand-950)]">
                Kavita Electronics
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Borderline Solvency · Working Capital Gap
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-subtle)] text-xs space-y-1.5 font-medium">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Facility:</span>
                <span className="font-bold">₹25,00,000 (12M)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Turnover:</span>
                <span className="font-bold">₹2.10 Cr / year</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Vintage:</span>
                <span className="font-bold">30 Months</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">DSCR:</span>
                <span className="font-bold text-[var(--fin-amber)]">1.30x (Tight Buffer)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">GST Filing:</span>
                <span className="font-bold text-[var(--fin-amber)]">1 Minor 3-day delay</span>
              </div>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Demonstrates conditional approval at ₹21.25L with promoter co-obligation covenant and underwriter guidance.
            </p>
          </div>

          <div className="pt-6">
            <Button
              variant="brutal"
              size="xs"
              className="w-full"
              onClick={() => handleLaunchCase('RM', 'jrn_kavita_002', '/rm/cases/jrn_kavita_002')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Launch Rohan's Triage
            </Button>
          </div>
        </div>

        {/* Case 3 */}
        <div className="p-6 rounded-2xl bg-white border-2 border-[var(--fin-coral)] shadow-[4px_4px_0px_#CC4B3E] flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--fin-coral-bg)] text-[var(--fin-coral)] border border-[var(--fin-coral)]/30">
                BENCHMARK CASE 3
              </span>
              <span className="text-[10px] font-black text-[var(--fin-coral)]">FRAUD FLAGGED</span>
            </div>

            <div>
              <h3 className="text-base font-black text-[var(--brand-950)]">
                Apex Logistics & Freight
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Adverse Network · Circular Fund Routing
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-subtle)] text-xs space-y-1.5 font-medium">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Facility:</span>
                <span className="font-bold">₹35,00,000 (18M)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Discrepancy:</span>
                <span className="font-bold text-[var(--fin-coral)]">GSTR vs Bank mismatch</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Network Risk:</span>
                <span className="font-bold text-[var(--fin-coral)]">0.68 / 1.0 (Critical)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Shell Entity:</span>
                <span className="font-bold text-[var(--fin-coral)]">Apex Intermediaries</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Graph Signal:</span>
                <span className="font-bold text-[var(--fin-coral)]">Rapid Round-Tripping</span>
              </div>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Demonstrates Module 7 Financial Trust Graph identifying circular trading loops and routing case to Human Risk Officer Review.
            </p>
          </div>

          <div className="pt-6">
            <Button
              variant="brutal"
              size="xs"
              className="w-full"
              onClick={() => handleLaunchCase('RISK_OFFICER', 'jrn_apex_003', '/risk/cases/jrn_apex_003')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Launch Ananya's Fraud Audit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
