import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import { MSMEProfile, VaultDocument } from '../../types';
import { Button } from '../../components/ui/Button';
import {
  Building2,
  FolderArchive,
  Upload,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
  ExternalLink,
  Plus,
  Copy,
  Check,
  HelpCircle,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  Landmark,
  BadgePercent,
  FileCheck2,
} from 'lucide-react';

const DOCUMENT_TYPE_OPTIONS = [
  { value: 'BANK_STATEMENT', label: 'Bank Statements (12 Months, Consolidated)' },
  { value: 'GST_RETURN', label: 'GST Returns (GSTR-3B / GSTR-1, Past 12M)' },
  { value: 'PAN_CARD', label: 'Business / Proprietor PAN Card' },
  { value: 'UDHYAM_CERTIFICATE', label: 'Udhyam / MSME Registration Certificate' },
  { value: 'FINANCIAL_STATEMENT', label: 'Audited Financial Statements & Balance Sheet' },
  { value: 'ITR_ACKNOWLEDGMENT', label: 'Income Tax Returns (ITR-V, Past 2 Years)' },
  { value: 'BOARD_RESOLUTION', label: 'Board Resolution / Partnership Deed / MoA' },
  { value: 'ADDRESS_PROOF', label: 'Proof of Business Address (Utility Bill/Lease)' },
];

const SECTORS = [
  'Textiles & Apparel',
  'Automotive & Engineering',
  'Chemicals & Pharmaceuticals',
  'Food Processing & FMCG',
  'Information Technology & Software',
  'Retail & Wholesale Trade',
  'Logistics & Warehousing',
  'Construction & Real Estate',
  'Healthcare & Life Sciences',
  'Hospitality & Tourism',
  'Renewable Energy & Utilities',
  'Professional & Financial Services',
  'Other Manufacturing',
  'Other Services',
];

const ENTITY_TYPES = [
  'Private Limited Company (Pvt. Ltd.)',
  'Public Limited Company (Ltd.)',
  'Limited Liability Partnership (LLP)',
  'Partnership Firm',
  'Sole Proprietorship',
  'One Person Company (OPC)',
  'Trust / Society',
];

export const CustomerProfileVaultPage: React.FC = () => {
  const { user, firebaseUser, msmeProfile, updateMsmeProfileState, loadMsmeProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'vault' ? 'vault' : 'profile';

  // Profile Form State
  const [profileForm, setProfileForm] = useState<Partial<MSMEProfile>>({
    business_name: '',
    entity_type: 'Private Limited Company (Pvt. Ltd.)',
    promoter_name: '',
    phone: '',
    email: '',
    pan: '',
    gstin: '',
    industry_sector: 'Textiles & Apparel',
    annual_turnover: 0,
    vintage_months: 36,
    registered_address: '',
    bank_account_no: '',
    ifsc_code: '',
  });

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Vault State
  const [vaultDocs, setVaultDocs] = useState<VaultDocument[]>([]);
  const [isLoadingVault, setIsLoadingVault] = useState(true);
  const [vaultError, setVaultError] = useState<string | null>(null);

  // Upload / Replace Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadDocType, setUploadDocType] = useState('BANK_STATEMENT');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Updating / Replacing specific document
  const [replacingDocId, setReplacingDocId] = useState<string | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  // Hash copy state
  const [copiedHashId, setCopiedHashId] = useState<string | null>(null);

  // Sync profileForm from msmeProfile or defaults
  useEffect(() => {
    if (msmeProfile) {
      setProfileForm({
        business_name: msmeProfile.business_name || '',
        entity_type: msmeProfile.entity_type || 'Private Limited Company (Pvt. Ltd.)',
        promoter_name: msmeProfile.promoter_name || user.name || '',
        phone: msmeProfile.phone || '',
        email: msmeProfile.email || firebaseUser?.email || user.email || '',
        pan: msmeProfile.pan || '',
        gstin: msmeProfile.gstin || '',
        industry_sector: msmeProfile.industry_sector || 'Textiles & Apparel',
        annual_turnover: msmeProfile.annual_turnover || 0,
        vintage_months: msmeProfile.vintage_months || 36,
        registered_address: msmeProfile.registered_address || '',
        bank_account_no: msmeProfile.bank_account_no || '',
        ifsc_code: msmeProfile.ifsc_code || '',
      });
    } else if (firebaseUser || user) {
      setProfileForm((prev) => ({
        ...prev,
        email: firebaseUser?.email || user.email || prev.email,
        promoter_name: user.name || firebaseUser?.displayName || prev.promoter_name,
      }));
    }
  }, [msmeProfile, firebaseUser, user]);

  // Load vault documents
  const loadVault = async () => {
    setIsLoadingVault(true);
    setVaultError(null);
    try {
      const docs = await api.listVaultDocuments();
      setVaultDocs(docs || []);
    } catch (err: any) {
      console.warn('Failed to load vault documents:', err);
      setVaultError(err?.message || 'Could not load stored documents from vault.');
    } finally {
      setIsLoadingVault(false);
    }
  };

  useEffect(() => {
    loadVault();
    loadMsmeProfile();
  }, []);

  const handleTabChange = (tab: 'profile' | 'vault') => {
    setSearchParams({ tab });
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSaveSuccess(false);
    setProfileError(null);
    try {
      await updateMsmeProfileState(profileForm);
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 4000);
    } catch (err: any) {
      setProfileError(err?.message || 'Failed to update business profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUploadVaultDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setVaultError(null);
    try {
      await api.uploadVaultDocument(selectedFile, uploadDocType);
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      await loadVault();
    } catch (err: any) {
      setVaultError(err?.message || 'Failed to upload document to vault.');
    } finally {
      setIsUploading(false);
    }
  };

  const triggerReplaceDoc = (docId: string) => {
    setReplacingDocId(docId);
    if (replaceFileInputRef.current) {
      replaceFileInputRef.current.value = '';
      replaceFileInputRef.current.click();
    }
  };

  const handleReplaceFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingDocId) return;

    setIsLoadingVault(true);
    try {
      await api.updateVaultDocument(replacingDocId, file);
      await loadVault();
    } catch (err: any) {
      setVaultError(err?.message || 'Failed to update document with new version.');
    } finally {
      setReplacingDocId(null);
      setIsLoadingVault(false);
    }
  };

  const handleDeleteVaultDoc = async (docId: string, fileName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${fileName}" from your Reusable Vault?`)) {
      return;
    }
    setIsLoadingVault(true);
    try {
      await api.deleteVaultDocument(docId);
      await loadVault();
    } catch (err: any) {
      setVaultError(err?.message || 'Failed to delete vault document.');
    } finally {
      setIsLoadingVault(false);
    }
  };

  const copyHash = (hash: string, id: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHashId(id);
    setTimeout(() => setCopiedHashId(null), 2500);
  };

  // Calculate profile completeness
  const requiredFields = [
    profileForm.business_name,
    profileForm.promoter_name,
    profileForm.phone,
    profileForm.email,
    profileForm.pan,
    profileForm.gstin,
    profileForm.industry_sector,
    profileForm.annual_turnover,
    profileForm.registered_address,
  ];
  const completedFields = requiredFields.filter((f) => Boolean(f)).length;
  const profilePercentage = Math.round((completedFields / requiredFields.length) * 100);

  return (
    <div className="space-y-6">
      {/* Hidden file input for Replace action */}
      <input
        type="file"
        ref={replaceFileInputRef}
        onChange={handleReplaceFileSelected}
        style={{ display: 'none' }}
        accept=".pdf,.png,.jpg,.jpeg"
      />

      {/* Hero Header */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded bg-[var(--fin-green-bg)] text-[var(--fin-green)] border border-[var(--fin-green)]/30">
              Enterprise MSME Workspace
            </span>
            <span className="text-xs text-[var(--text-muted)] font-mono">
              Account: {firebaseUser?.email || user.email}
            </span>
          </div>
          <h1 className="text-2xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            MSME Business Profile & Document Vault
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Configure your authoritative enterprise profile once and manage reusable financial documents with SHA-256 cryptographic provenance.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-[var(--surface-subtle)] border-2 border-[var(--brand-950)] shrink-0">
          <button
            onClick={() => handleTabChange('profile')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-white text-[var(--brand-950)] shadow-xs border border-[var(--brand-950)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--brand-950)]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-[var(--brand-700)]" />
            <span>Business Profile</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--brand-50)] text-[var(--brand-900)] font-mono font-bold">
              {profilePercentage}%
            </span>
          </button>

          <button
            onClick={() => handleTabChange('vault')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'vault'
                ? 'bg-white text-[var(--brand-950)] shadow-xs border border-[var(--brand-950)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--brand-950)]'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5 text-[var(--fin-green)]" />
            <span>Document Vault</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--fin-green-bg)] text-[var(--fin-green)] font-mono font-bold">
              {vaultDocs.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: MSME BUSINESS PROFILE */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleProfileSubmit} className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-6">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                <div>
                  <h2 className="text-lg font-black text-[var(--brand-950)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    Authoritative Enterprise Profile
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    This information automatically populates all working capital applications and underwriting checks.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {profileSaveSuccess && (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--fin-green)] bg-[var(--fin-green-bg)] px-3 py-1.5 rounded-xl border border-[var(--fin-green)]/30 animate-fadeIn">
                      <CheckCircle2 className="w-4 h-4" /> Profile Saved Live
                    </span>
                  )}
                </div>
              </div>

              {profileError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              {/* Section 1: Entity & Basics */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--brand-700)] uppercase tracking-wider">
                  <Building2 className="w-4 h-4" /> 1. Legal Entity & Promoter Info
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">
                      Business / Legal Trade Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Global Solutions Pvt. Ltd."
                      value={profileForm.business_name || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, business_name: e.target.value })}
                      className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border-2 border-[var(--brand-950)] bg-[var(--surface-subtle)] focus:bg-white focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">
                      Legal Constitution / Entity Type *
                    </label>
                    <select
                      value={profileForm.entity_type || ENTITY_TYPES[0]}
                      onChange={(e) => setProfileForm({ ...profileForm, entity_type: e.target.value })}
                      className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border-2 border-[var(--brand-950)] bg-[var(--surface-subtle)] focus:bg-white focus:outline-none transition-all"
                    >
                      {ENTITY_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">
                      Primary Promoter / Authorized Signatory Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ruturaj Bhome"
                      value={profileForm.promoter_name || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, promoter_name: e.target.value })}
                      className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border-2 border-[var(--brand-950)] bg-[var(--surface-subtle)] focus:bg-white focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">
                      Registered Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      readOnly={Boolean(firebaseUser?.email)}
                      value={profileForm.email || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className={`w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border-2 border-[var(--brand-950)] ${
                        firebaseUser?.email ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-[var(--surface-subtle)]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">
                      Primary Phone / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={profileForm.phone || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border-2 border-[var(--brand-950)] bg-[var(--surface-subtle)] focus:bg-white focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">
                      Industry Sector *
                    </label>
                    <select
                      value={profileForm.industry_sector || SECTORS[0]}
                      onChange={(e) => setProfileForm({ ...profileForm, industry_sector: e.target.value })}
                      className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border-2 border-[var(--brand-950)] bg-[var(--surface-subtle)] focus:bg-white focus:outline-none transition-all"
                    >
                      {SECTORS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Statutory Tax IDs & Financials */}
              <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--brand-700)] uppercase tracking-wider">
                  <BadgePercent className="w-4 h-4" /> 2. Tax IDs & Financial Scale
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">
                      Company / Firm PAN *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ABCDE1234F"
                      maxLength={10}
                      value={profileForm.pan || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, pan: e.target.value.toUpperCase() })}
                      className="w-full text-xs font-mono font-bold uppercase px-3.5 py-2.5 rounded-xl border-2 border-[var(--brand-950)] bg-[var(--surface-subtle)] focus:bg-white focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">
                      GSTIN (Goods and Services Tax ID) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 27ABCDE1234F1Z5"
                      maxLength={15}
                      value={profileForm.gstin || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, gstin: e.target.value.toUpperCase() })}
                      className="w-full text-xs font-mono font-bold uppercase px-3.5 py-2.5 rounded-xl border-2 border-[var(--brand-950)] bg-[var(--surface-subtle)] focus:bg-white focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">
                      Annual Turnover (INR ₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      step={50000}
                      placeholder="e.g. 15000000"
                      value={profileForm.annual_turnover || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, annual_turnover: Number(e.target.value) })}
                      className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border-2 border-[var(--brand-950)] bg-[var(--surface-subtle)] focus:bg-white focus:outline-none transition-all"
                    />
                    <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                      {profileForm.annual_turnover
                        ? `≈ ₹${(profileForm.annual_turnover / 100000).toFixed(2)} Lakhs (₹${(profileForm.annual_turnover / 10000000).toFixed(2)} Cr)`
                        : 'Enter gross annual revenue'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">
                      Operational Vintage (Months) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="e.g. 36 (3 years)"
                      value={profileForm.vintage_months || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, vintage_months: Number(e.target.value) })}
                      className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border-2 border-[var(--brand-950)] bg-[var(--surface-subtle)] focus:bg-white focus:outline-none transition-all"
                    />
                    <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                      {profileForm.vintage_months ? `≈ ${(profileForm.vintage_months / 12).toFixed(1)} Years in Business` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 3: Registered Address & Banking */}
              <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--brand-700)] uppercase tracking-wider">
                  <Landmark className="w-4 h-4" /> 3. Registered Address & Banking
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">
                      Registered Principal Office Address *
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Full street address, industrial estate / building name, city, state, pincode"
                      value={profileForm.registered_address || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, registered_address: e.target.value })}
                      className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border-2 border-[var(--brand-950)] bg-[var(--surface-subtle)] focus:bg-white focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">
                      Primary Operating Bank Account Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 50200012345678"
                      value={profileForm.bank_account_no || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, bank_account_no: e.target.value })}
                      className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border-2 border-[var(--brand-950)] bg-[var(--surface-subtle)] focus:bg-white focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">
                      Bank IFSC Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC0001234"
                      maxLength={11}
                      value={profileForm.ifsc_code || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, ifsc_code: e.target.value.toUpperCase() })}
                      className="w-full text-xs font-mono uppercase px-3.5 py-2.5 rounded-xl border-2 border-[var(--brand-950)] bg-[var(--surface-subtle)] focus:bg-white focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <Button
                  type="submit"
                  variant="brutal"
                  size="md"
                  isLoading={isSavingProfile}
                  leftIcon={<Check className="w-4 h-4" />}
                >
                  Save Business Profile
                </Button>
              </div>
            </form>
          </div>

          {/* Sidebar Cards */}
          <div className="space-y-6">
            {/* Profile Completion Status */}
            <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-4">
              <h3 className="text-sm font-black text-[var(--brand-950)] uppercase tracking-wider">
                Profile Completeness
              </h3>
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="text-[var(--text-secondary)]">Baseline Readiness</span>
                  <span className="text-[var(--fin-green)] font-mono text-sm">{profilePercentage}%</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                  <div
                    className="h-full bg-[var(--fin-green)] transition-all duration-500 rounded-full"
                    style={{ width: `${profilePercentage}%` }}
                  />
                </div>
              </div>

              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                A 100% complete profile speeds up automated underwriter eligibility checks and eliminates manual KYC intake questions.
              </p>

              <div className="pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => handleTabChange('vault')}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--brand-50)] border border-[var(--border)] text-xs font-bold text-[var(--brand-950)] transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FolderArchive className="w-4 h-4 text-[var(--fin-green)]" />
                    <span>View Stored Documents ({vaultDocs.length})</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Apply Action */}
            <div className="p-6 rounded-3xl bg-[var(--brand-50)] border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-3">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-700)]">
                Ready for Financing?
              </span>
              <h3 className="text-base font-black text-[var(--brand-950)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Apply for Working Capital
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Your profile details will be pre-filled automatically into the loan application form.
              </p>
              <Link to="/customer/apply" className="block pt-2">
                <Button variant="brutal" size="sm" className="w-full" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Start Working Capital Application
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REUSABLE DOCUMENT VAULT */}
      {activeTab === 'vault' && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-[var(--brand-950)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Secure Enterprise Document Locker
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[var(--fin-green-bg)] text-[var(--fin-green)] border border-[var(--fin-green)]/30">
                  Store Once · Reuse Everywhere
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Store authoritative business files here. Every document is secured with an immutable SHA-256 fingerprint and can be updated anytime with the most recent working version.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={loadVault}
                isLoading={isLoadingVault}
                leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingVault ? 'animate-spin' : ''}`} />}
              >
                Refresh
              </Button>
              <Button
                variant="brutal"
                size="sm"
                onClick={() => setIsUploadModalOpen(true)}
                leftIcon={<Upload className="w-3.5 h-3.5" />}
              >
                Add Document to Vault
              </Button>
            </div>
          </div>

          {vaultError && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{vaultError}</span>
            </div>
          )}

          {/* Empty State */}
          {!isLoadingVault && vaultDocs.length === 0 && (
            <div className="p-12 rounded-3xl bg-white border-2 border-dashed border-[var(--brand-950)] flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[var(--surface-subtle)] border-2 border-[var(--brand-950)] flex items-center justify-center shadow-[3px_3px_0px_#0A1F20]">
                <FolderArchive className="w-8 h-8 text-[var(--brand-700)]" />
              </div>
              <div className="max-w-md">
                <h3 className="text-base font-black text-[var(--brand-950)]">
                  Your Document Vault is Empty
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Upload your Bank Statements, GST Certificates, PAN, or MSME Udhyam certificate. Once uploaded, you never have to re-upload them for new loans.
                </p>
              </div>
              <Button
                variant="brutal"
                size="md"
                onClick={() => setIsUploadModalOpen(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Upload First Working Document
              </Button>
            </div>
          )}

          {/* Document Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {vaultDocs.map((doc) => {
              const typeOption = DOCUMENT_TYPE_OPTIONS.find((opt) => opt.value === doc.doc_type);
              const typeLabel = typeOption?.label || doc.doc_type.replace(/_/g, ' ');
              const sizeInKb = (doc.file_size_bytes / 1024).toFixed(1);
              const hashShort = doc.sha256_hash ? `${doc.sha256_hash.slice(0, 8)}...${doc.sha256_hash.slice(-8)}` : '';

              return (
                <div
                  key={doc.doc_id}
                  className="p-5 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] flex flex-col justify-between space-y-4 hover:translate-y-[-2px] transition-transform"
                >
                  <div className="space-y-3">
                    {/* Header line with doc type & version */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--brand-50)] text-[var(--brand-900)] border border-[var(--brand-950)]/20 truncate">
                        {typeLabel.split('(')[0].trim()}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 shrink-0">
                        v{doc.version || 1} Working
                      </span>
                    </div>

                    {/* File name & size */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-[var(--brand-800)]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[var(--brand-950)] truncate" title={doc.file_name}>
                          {doc.file_name}
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {sizeInKb} KB · Updated {new Date(doc.updated_at || doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Cryptographic SHA-256 Provenance */}
                    <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border)] space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-[var(--text-secondary)]">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-[var(--fin-green)]" />
                          <span>SHA-256 Fingerprint</span>
                        </span>
                        <button
                          onClick={() => copyHash(doc.sha256_hash, doc.doc_id)}
                          className="text-[10px] text-[var(--brand-700)] hover:underline flex items-center gap-1 cursor-pointer"
                          title="Copy Full SHA-256 Hash"
                        >
                          {copiedHashId === doc.doc_id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-[10px] font-mono text-[var(--text-muted)] truncate select-all">
                        {hashShort || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Actions: Replace with Most Recent / Delete / View */}
                  <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
                    <button
                      onClick={() => triggerReplaceDoc(doc.doc_id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-[var(--brand-950)] bg-[var(--surface-subtle)] hover:bg-[var(--brand-50)] border border-[var(--brand-950)] transition-colors cursor-pointer"
                      title="Upload the latest working version of this document (replaces existing file, increments version and recalculates SHA-256)"
                    >
                      <RefreshCw className="w-3 h-3 text-[var(--brand-700)]" />
                      <span>Update / Replace</span>
                    </button>

                    <button
                      onClick={() => handleDeleteVaultDoc(doc.doc_id, doc.file_name)}
                      className="p-1.5 rounded-xl text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                      title="Delete from Vault"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {doc.file_url && (
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--brand-950)] hover:bg-[var(--surface-subtle)] border border-transparent hover:border-[var(--border)] transition-colors"
                        title="Open document file"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* UPLOAD NEW DOCUMENT MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-white rounded-3xl border-2 border-[var(--brand-950)] shadow-[6px_6px_0px_#0A1F20] p-6 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="text-base font-black text-[var(--brand-950)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Add Working Document to Vault
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Documents added here can be attached to any loan application in 1-click.
                </p>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-subtle)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadVaultDoc} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">
                  Document Type *
                </label>
                <select
                  value={uploadDocType}
                  onChange={(e) => setUploadDocType(e.target.value)}
                  className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border-2 border-[var(--brand-950)] bg-[var(--surface-subtle)] focus:bg-white focus:outline-none transition-all"
                >
                  {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">
                  Select Working File *
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs font-medium file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-2 file:border-[var(--brand-950)] file:text-xs file:font-bold file:bg-[var(--brand-50)] file:text-[var(--brand-950)] hover:file:bg-[var(--brand-100)] cursor-pointer"
                />
                <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                  Accepted formats: PDF, PNG, JPG (up to 25MB). FinFlow AI will calculate SHA-256 fingerprint on upload.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsUploadModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="brutal"
                  size="sm"
                  isLoading={isUploading}
                  disabled={!selectedFile}
                  leftIcon={<Upload className="w-3.5 h-3.5" />}
                >
                  Secure in Vault
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerProfileVaultPage;
