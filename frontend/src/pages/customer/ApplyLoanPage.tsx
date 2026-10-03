import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { IntentPayload } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { FilePlus, ArrowRight, ShieldCheck, DollarSign, Calendar, Building, Sparkles } from 'lucide-react';

export const ApplyLoanPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<IntentPayload>({
    product_type: 'SME_WORKING_CAPITAL',
    requested_amount: 1500000,
    tenor_months: 12,
    purpose: 'Raw material procurement & weaving capacity expansion for festive season',
    business_name: 'Sharma Textiles Pvt. Ltd.',
    annual_turnover: 14500000,
    vintage_months: 48,
    pan: 'AAACS1234F',
    gstin: '27AAACS1234F1Z5',
    industry_sector: 'Textile & Apparel Manufacturing',
  });

  const estimatedEMI = Math.round(
    (formData.requested_amount * (1 + 0.115 * (formData.tenor_months / 12))) / formData.tenor_months
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const created = await api.createJourney(formData);
      navigate(`/customer/journey/${created.journey_id}`);
    } catch (err: any) {
      alert(`Journey initialization failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--brand-50)] text-[var(--brand-800)] border border-[var(--brand-200)]">
            Module 1: Intent Capture
          </span>
          <span className="text-xs text-[var(--text-muted)]">Sub-2-Minute Digital Origination</span>
        </div>
        <h1 className="text-2xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Apply for SME Working Capital Facility
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Enter business credentials and requested facility parameters. FinFlow orchestrates automated underwriting immediately.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Column */}
        <form onSubmit={handleSubmit} className="lg:col-span-8 space-y-5">
          <Card variant="bordered" padding="md">
            <h3 className="text-sm font-black text-[var(--brand-950)] mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[var(--brand-700)]" /> Facility Requirements
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">
                  Requested Credit Facility (INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-[var(--text-muted)]">₹</span>
                  <input
                    type="number"
                    step="50000"
                    value={formData.requested_amount}
                    onChange={(e) => setFormData({ ...formData, requested_amount: Number(e.target.value) })}
                    className="w-full pl-7 pr-3 py-2 text-xs font-bold rounded-xl border border-[var(--border)] focus:outline-none focus:border-[var(--brand-700)] shadow-xs"
                    required
                  />
                </div>
                <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                  ₹{(formData.requested_amount / 100000).toFixed(2)} Lakhs
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">
                  Tenor (Months)
                </label>
                <select
                  value={formData.tenor_months}
                  onChange={(e) => setFormData({ ...formData, tenor_months: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-[var(--border)] focus:outline-none focus:border-[var(--brand-700)] bg-white shadow-xs"
                >
                  <option value={6}>6 Months (Seasonal Working Capital)</option>
                  <option value={12}>12 Months (Annual Revolving Line)</option>
                  <option value={18}>18 Months</option>
                  <option value={24}>24 Months (Capex / Term Loan)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">
                  Financing Purpose
                </label>
                <input
                  type="text"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] focus:outline-none focus:border-[var(--brand-700)] shadow-xs"
                  required
                />
              </div>
            </div>
          </Card>

          <Card variant="bordered" padding="md">
            <h3 className="text-sm font-black text-[var(--brand-950)] mb-4 flex items-center gap-2">
              <Building className="w-4 h-4 text-[var(--brand-700)]" /> Business Profile
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">
                  Registered Business Name
                </label>
                <input
                  type="text"
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-[var(--border)] focus:outline-none focus:border-[var(--brand-700)] shadow-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">
                  Annual Turnover (INR)
                </label>
                <input
                  type="number"
                  value={formData.annual_turnover}
                  onChange={(e) => setFormData({ ...formData, annual_turnover: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-[var(--border)] focus:outline-none focus:border-[var(--brand-700)] shadow-xs"
                  required
                />
                <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                  ₹{(formData.annual_turnover / 10000000).toFixed(2)} Crores
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">
                  Operating Vintage (Months)
                </label>
                <input
                  type="number"
                  value={formData.vintage_months}
                  onChange={(e) => setFormData({ ...formData, vintage_months: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-[var(--border)] focus:outline-none focus:border-[var(--brand-700)] shadow-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">
                  Entity PAN
                </label>
                <input
                  type="text"
                  value={formData.pan}
                  onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-[var(--border)] uppercase focus:outline-none focus:border-[var(--brand-700)] shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">
                  GSTIN
                </label>
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-[var(--border)] uppercase focus:outline-none focus:border-[var(--brand-700)] shadow-xs"
                />
              </div>
            </div>
          </Card>

          <Button
            type="submit"
            variant="brutal"
            size="md"
            isLoading={isSubmitting}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="w-full"
          >
            Submit & Launch Automated Underwriting
          </Button>
        </form>

        {/* Live Terms Preview Column */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-white border-2 border-[var(--brand-950)] shadow-[3px_3px_0px_#0A1F20] space-y-4">
            <h4 className="text-xs font-black text-[var(--brand-950)] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--brand-600)]" /> Indicative Term Sheet
            </h4>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[var(--border)]">
                <span className="text-[var(--text-muted)]">Requested Principal:</span>
                <span className="font-extrabold text-[var(--brand-950)]">
                  ₹{(formData.requested_amount / 100000).toFixed(2)} Lakhs
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-[var(--border)]">
                <span className="text-[var(--text-muted)]">Benchmark APR:</span>
                <span className="font-extrabold text-[var(--brand-700)]">
                  11.5% - 13.0% p.a.
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-[var(--border)]">
                <span className="text-[var(--text-muted)]">Indicative Monthly EMI:</span>
                <span className="font-extrabold text-[var(--fin-green)] text-sm">
                  ₹{estimatedEMI.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-[var(--border)]">
                <span className="text-[var(--text-muted)]">Required Minimum DSCR:</span>
                <span className="font-bold text-[var(--brand-950)]">≥ 1.25x</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-subtle)] text-[11px] text-[var(--text-muted)] space-y-1">
              <p className="font-bold text-[var(--brand-950)] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--fin-green)]" /> Deterministic Eligibility Gates:
              </p>
              <p>• Operational vintage ≥ 24 months</p>
              <p>• Zero cheque bounces in last 6 months</p>
              <p>• Active GSTIN verification</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
