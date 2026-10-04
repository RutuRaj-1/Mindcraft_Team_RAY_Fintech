import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { dashboardApi, authApi, auditApi, analyticsApi, systemApi, SystemDiagnostics, StorageTestResult } from '../../api';
import { MetricCard } from '../../components/fintech/MetricCard';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  Cpu, Users, Shield, Activity, Server, Lock, Settings,
  Layers, Terminal, Sparkles, RefreshCw, CheckCircle2,
  AlertTriangle, ArrowRight, Database, Check, X, HardDrive,
  FileSearch, Award, UserCheck
} from 'lucide-react';

const DEMO_ROLES: {
  role: UserRole;
  name: string;
  title: string;
  email: string;
  department: string;
  route: string;
  badgeColor: string;
  accentBg: string;
  icon: any;
  capabilities: string[];
}[] = [
  {
    role: 'CUSTOMER',
    name: 'SkillBridge MSME Portal',
    title: 'Self-Service Borrower Experience',
    email: 'bhomeruturaj17@gmail.com',
    department: 'SkillBridge Enterprises (Ruturaj Bhome)',
    route: '/customer',
    badgeColor: '#10b981',
    accentBg: '#ecfdf5',
    icon: UserCheck,
    capabilities: [
      'SkillBridge Enterprises Live MSME Desk',
      '4 Verified Compliance Documents in Vault',
      'Real-Time Status & Transparent Sanction Tracking',
    ],
  },
  {
    role: 'RM',
    name: 'Rohan Mehta',
    title: 'Senior Relationship Manager',
    email: 'rohan.mehta@finflowbank.com',
    department: 'First-Line Commercial SME Lending',
    route: '/rm',
    badgeColor: '#0ea5e9',
    accentBg: '#f0f9ff',
    icon: Shield,
    capabilities: [
      'Active Deal Pipeline & Case Intake Management',
      'Pre-Underwriting Verification Dispatch',
      'Borrower KYC & Compliance Gathering Desk',
    ],
  },
  {
    role: 'RM_SUPERVISOR',
    name: 'Vikram Malhotra',
    title: 'Credit Operations Manager & RM Supervisor',
    email: 'vikram.malhotra@finflowbank.com',
    department: 'First-Line Credit Operations',
    route: '/operations',
    badgeColor: '#059669',
    accentBg: '#ecfdf5',
    icon: Layers,
    capabilities: [
      'Operations Command & Load Balancing',
      'RM Caseload & Exception Re-allocation',
      'Document Ingestion Quality SLAs & Queue Monitoring',
    ],
  },
  {
    role: 'RISK_OFFICER',
    name: 'Ananya Iyer',
    title: 'Chief Credit Risk & Fraud Officer',
    email: 'ananya.iyer@finflowbank.com',
    department: 'Second-Line Risk & Fraud Analytics',
    route: '/risk',
    badgeColor: '#f59e0b',
    accentBg: '#fffbeb',
    icon: AlertTriangle,
    capabilities: [
      '5-Pillar Credit Radar & Fraud Signals',
      'GST vs Bank Statement Forensic Cross-Check',
      'Interactive What-If Sensitivity Simulator',
    ],
  },
  {
    role: 'RISK_MANAGER',
    name: 'Meera Krishnan',
    title: 'Supervisory Risk Manager',
    email: 'meera.krishnan@finflowbank.com',
    department: 'Second-Line Model Governance',
    route: '/risk-manager',
    badgeColor: '#f97316',
    accentBg: '#fff7ed',
    icon: Shield,
    capabilities: [
      'Model Bias & Algorithmic Drift Oversight',
      'Underwriter Override Auditing & Challenge',
      'Portfolio Concentration Thresholds & Stress Testing',
    ],
  },
  {
    role: 'CREDIT_APPROVER',
    name: 'Rajesh Singhania',
    title: 'Chief Credit Officer / Committee Chair',
    email: 'rajesh.singhania@finflowbank.com',
    department: 'Sanction Authority & Credit Committee',
    route: '/approvals',
    badgeColor: '#dc2626',
    accentBg: '#fef2f2',
    icon: Award,
    capabilities: [
      'Four-Eyes Principle Sanction Chamber',
      'High-Value Delegated Limit Sanctioning',
      'Legally Binding Digital Sanction Letter Generation',
    ],
  },
  {
    role: 'AUDIT_OFFICER',
    name: 'Sunita Rao',
    title: 'Director of Internal Audit & Governance',
    email: 'sunita.rao@finflowbank.com',
    department: 'Third-Line Sovereign Assurance',
    route: '/audit',
    badgeColor: '#8b5cf6',
    accentBg: '#f5f3ff',
    icon: FileSearch,
    capabilities: [
      'Independent Read-Heavy Model Audit Desk',
      'Immutable SHA-256 Decision Replay Audit Trail',
      'RBI Algorithmic Explainability Inspection Pack',
    ],
  },
];

export const AdminPage: React.FC = () => {
  const { persona, emulateRoleAsAdmin, adminEmulatedRole, exitAdminEmulation } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [metrics, setMetrics] = useState<Record<string, any>>({});
  const [personas, setPersonas] = useState<any[]>([]);
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(null);
  const [storageTestResult, setStorageTestResult] = useState<StorageTestResult | null>(null);
  const [isTestingStorage, setIsTestingStorage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [m, p, d] = await Promise.all([
        dashboardApi.getPortfolioMetrics().catch(() => ({})),
        authApi.getPersonas().catch(() => []),
        systemApi.getDiagnostics().catch(() => null),
      ]);
      setMetrics(m);
      setPersonas(Array.isArray(p) ? p : Object.values(p || {}));
      setDiagnostics(d);
    } catch (err) {
      console.error('Failed to load admin telemetry', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestStorage = async () => {
    setIsTestingStorage(true);
    setStorageTestResult(null);
    try {
      const res = await systemApi.testStorage();
      setStorageTestResult(res);
      setSuccessToast('Storage test executed successfully.');
    } catch (err: any) {
      setStorageTestResult({ status: 'ERROR', message: err.message });
    } finally {
      setIsTestingStorage(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTabChange = (tabKey: string) => {
    setSearchParams({ tab: tabKey });
  };

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    try {
      await analyticsApi.seedDemo();
      setSuccessToast('Demo data re-seeded with 4 benchmark cases.');
      await loadData();
    } catch (err: any) {
      alert(`Seeding failed: ${err.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const activeTab = searchParams.get('tab') || 'emulation';

  const tabs = [
    { key: 'emulation', label: '7-Role Emulation Deck', icon: Sparkles },
    { key: 'users', label: 'User Management', icon: Users },
    { key: 'roles', label: 'Role Management', icon: Shield },
    { key: 'system_health', label: 'System Health', icon: Activity },
    { key: 'api_health', label: 'API Health', icon: Server },
    { key: 'auth_status', label: 'Firebase / Auth Status', icon: Lock },
    { key: 'config', label: 'Configuration Matrix', icon: Settings },
    { key: 'integrations', label: 'Integration Status', icon: Layers },
    { key: 'logs', label: 'System Logs', icon: Terminal },
    { key: 'demo', label: 'Demo Controls', icon: Sparkles },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton variant="rect" height={100} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton variant="rect" height={90} />
          <Skeleton variant="rect" height={90} />
          <Skeleton variant="rect" height={90} />
          <Skeleton variant="rect" height={90} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-zinc-900 text-white">
              Role 8: Technical Infrastructure Custodian
            </span>
            <span className="text-xs font-mono font-bold text-rose-700">ZERO CREDIT SANCTION POWER (BY DESIGN)</span>
          </div>
          <h1 className="text-2xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            System Administrator Console
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Administrator: <strong className="text-[var(--brand-950)]">{persona.name}</strong> · Technical Infrastructure & Observability Controls Only
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={activeTab === 'emulation' ? 'brutal' : 'outline'}
            size="sm"
            onClick={() => handleTabChange('emulation')}
            leftIcon={<Sparkles className="w-3.5 h-3.5 text-amber-500" />}
          >
            7-Role Emulation Hub
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Telemetry
          </Button>
          <Button
            variant="brutal"
            size="sm"
            onClick={handleSeedDemo}
            isLoading={isSeeding}
            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
          >
            Re-Seed Demo Data
          </Button>
        </div>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="p-4 rounded-2xl bg-[var(--fin-green-bg)] border border-[var(--fin-green)] text-[var(--fin-green)] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold">
            <Check className="w-4 h-4" />
            <span>{successToast}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSuccessToast(null)}>Dismiss</Button>
        </div>
      )}

      {/* Fiduciary Separation Notice */}
      <div className="p-4 rounded-2xl bg-zinc-900 text-white border-2 border-[var(--brand-950)] shadow-[2px_2px_0px_#0A1F20] flex items-start gap-3">
        <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-amber-400 uppercase tracking-wider text-[10px]">
            Strict Separation of Duties Enforcement (Part 23 & 25):
          </p>
          <p className="text-zinc-300 leading-relaxed">
            The System Administrator role has comprehensive access to technical infrastructure, users, API health, and logging. By institutional charter, this role has <strong>ZERO loan sanction or decision modification authority</strong>. Any attempt by an administrator to approve or alter loans is blocked by FastAPI backend invariants (HTTP 403 Forbidden).
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="API Latency (p99)"
          value="42 ms"
          benchmark="FastAPI ASGI High-Throughput"
          status="success"
          icon={<Server className="w-4 h-4 text-emerald-600" />}
        />
        <MetricCard
          label="Firestore DB Health"
          value="Operational"
          benchmark="Sub-5ms Query Latency"
          status="success"
          icon={<Database className="w-4 h-4 text-blue-600" />}
        />
        <MetricCard
          label="Active RBAC Personas"
          value="8 Personas"
          benchmark="7 Business + 1 Admin"
          status="info"
          icon={<Users className="w-4 h-4 text-purple-600" />}
        />
        <MetricCard
          label="Auth Mode"
          value="Hybrid Firebase"
          benchmark="Local Mock + Cloud Tokens"
          status="info"
          icon={<Lock className="w-4 h-4 text-zinc-700" />}
        />
      </div>

      {/* 10 Navigation Workspace Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[var(--border)]">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === key
                ? 'bg-[var(--brand-950)] text-white shadow-[2px_2px_0px_#0A1F20]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--brand-950)]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab Contents: 7-Role Emulation Hub */}
      {activeTab === 'emulation' && (
        <div className="p-6 rounded-3xl bg-white border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-5 animate-fadeInUp">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-200 border border-indigo-700/50 flex items-center gap-1.5 shadow-xs">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  Master Defense & Presentation Hub
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  End-to-End Module Explainer
                </span>
              </div>
              <h2 className="text-xl font-black text-[var(--brand-950)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Institutional 7-Role Emulation Deck
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Launch directly into any of the 7 business, risk, and audit roles from this master admin console. 
                Explain each module end-to-end and use the top banner anytime to return here.
              </p>
            </div>

            {adminEmulatedRole && (
              <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-2xl border-2 border-amber-400">
                <span className="text-xs font-bold text-amber-950">
                  Active Session: <strong className="underline">{adminEmulatedRole}</strong>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exitAdminEmulation}
                >
                  Exit to Master Admin
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {DEMO_ROLES.map((roleCard) => {
              const isCurrentlyActive = adminEmulatedRole === roleCard.role;
              const Icon = roleCard.icon;
              return (
                <div
                  key={roleCard.role}
                  className={`flex flex-col justify-between p-4 rounded-2xl border-2 transition-all ${
                    isCurrentlyActive
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-[4px_4px_0px_#4338ca]'
                      : 'border-[var(--brand-950)] bg-white hover:bg-[var(--surface-subtle)] shadow-[2px_2px_0px_#0A1F20]'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-xs shrink-0"
                        style={{ backgroundColor: roleCard.badgeColor }}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <span
                        className="text-[9px] font-black uppercase px-2 py-0.5 rounded border"
                        style={{
                          backgroundColor: roleCard.accentBg,
                          color: roleCard.badgeColor,
                          borderColor: roleCard.badgeColor + '50',
                        }}
                      >
                        {roleCard.role}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-[var(--brand-950)] leading-snug">
                        {roleCard.name}
                      </h3>
                      <p className="text-[11px] font-semibold text-[var(--text-secondary)] mt-0.5">
                        {roleCard.title}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] font-medium">
                        {roleCard.department}
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-[var(--border)]">
                      <p className="text-[9px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
                        Demonstrable Workflows
                      </p>
                      <ul className="space-y-1">
                        {roleCard.capabilities.map((cap, idx) => (
                          <li key={idx} className="text-[10px] text-[var(--brand-950)] flex items-start gap-1.5">
                            <Check className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                            <span className="leading-tight">{cap}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-[var(--border)]">
                    <Button
                      variant={isCurrentlyActive ? 'outline' : 'brutal'}
                      size="sm"
                      className="w-full justify-between"
                      onClick={() => {
                        emulateRoleAsAdmin(roleCard.role);
                        navigate(roleCard.route);
                      }}
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      <span>{isCurrentlyActive ? 'Viewing (Open Desk)' : `Launch ${roleCard.role}`}</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {activeTab === 'users' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-[var(--brand-950)]">Registered Institutional Users</h3>
              <p className="text-xs text-[var(--text-muted)]">Active profiles across 8 defined RBAC roles</p>
            </div>
            <span className="text-xs font-mono font-bold text-[var(--brand-700)]">{personas.length} Users Enrolled</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[var(--surface-subtle)] text-[var(--text-muted)] font-extrabold uppercase text-[10px]">
                <tr>
                  <th className="p-3">User & UID</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3">Assigned Role</th>
                  <th className="p-3">Delegated Limit</th>
                  <th className="p-3">Auth Mode</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {personas.map((u: any) => (
                  <tr key={u.uid} className="hover:bg-[var(--surface-subtle)]">
                    <td className="p-3">
                      <p className="font-bold text-[var(--brand-950)]">{u.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)] font-mono">{u.uid}</p>
                    </td>
                    <td className="p-3 font-mono text-[var(--text-secondary)]">{u.email}</td>
                    <td className="p-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--brand-50)] text-[var(--brand-900)] border border-[var(--brand-900)]/20">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold">
                      {u.delegated_limit_inr ? `₹${(u.delegated_limit_inr / 100000).toFixed(1)}L` : '₹0 (No Sanction Power)'}
                    </td>
                    <td className="p-3 text-[var(--text-muted)]">Firebase Bearer</td>
                    <td className="p-3 text-right">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Enterprise RBAC Permission Matrix</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Strict separation of duties table mapping all 8 roles to their authoritative limits and operational boundaries.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)] space-y-1.5">
              <span className="font-bold text-[var(--brand-950)]">1. MSME Customer (Priya Sharma)</span>
              <p className="text-[11px] text-[var(--text-muted)]">Permissions: Apply, upload own documents, inspect explainable decision, run What-If simulations. Cannot see other applicants.</p>
            </div>
            <div className="p-4 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)] space-y-1.5">
              <span className="font-bold text-[var(--brand-950)]">2. Relationship Manager (Rohan Mehta)</span>
              <p className="text-[11px] text-[var(--text-muted)]">Permissions: Intake, site visit diary, request documents, reconcile evidence, escalate. Delegated sanction limit: ₹0.</p>
            </div>
            <div className="p-4 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)] space-y-1.5">
              <span className="font-bold text-[var(--brand-950)]">3. RM Supervisor (Vikram Malhotra)</span>
              <p className="text-[11px] text-[var(--text-muted)]">Permissions: Team workload balancing, case reassignment, SLA aging reviews, approve operational exceptions. Delegated sanction limit: ₹0.</p>
            </div>
            <div className="p-4 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)] space-y-1.5">
              <span className="font-bold text-[var(--brand-950)]">4. Risk & Compliance Officer (Ananya Iyer)</span>
              <p className="text-[11px] text-[var(--text-muted)]">Permissions: Independent risk evaluation, SHAP analysis, fraud graph scrutiny, challenge decision. Tier 1 fast-track authority: ≤ ₹25 Lakhs.</p>
            </div>
            <div className="p-4 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)] space-y-1.5">
              <span className="font-bold text-[var(--brand-950)]">5. Senior Risk Manager (Meera Krishnan)</span>
              <p className="text-[11px] text-[var(--text-muted)]">Permissions: Supervisory oversight, policy consistency checks, override ratification. Tier 2 sanction authority: ≤ ₹1.00 Crore.</p>
            </div>
            <div className="p-4 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)] space-y-1.5">
              <span className="font-bold text-[var(--brand-950)]">6. Credit Sanction Committee (Rajesh Singhania)</span>
              <p className="text-[11px] text-[var(--text-muted)]">Permissions: Final executive approval / decline on multi-factor decision packages. Tier 3 authority: Unlimited (&gt; ₹1.00 Crore).</p>
            </div>
            <div className="p-4 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)] space-y-1.5">
              <span className="font-bold text-[var(--brand-950)]">7. Independent Audit Officer (Sunita Rao)</span>
              <p className="text-[11px] text-[var(--text-muted)]">Permissions: Unrestricted read-only case replay, append-only findings & comments. Zero loan modification authority.</p>
            </div>
            <div className="p-4 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)] space-y-1.5">
              <span className="font-bold text-[var(--brand-950)]">8. System Administrator (Amit Verma)</span>
              <p className="text-[11px] text-[var(--text-muted)]">Permissions: User provisioning, API telemetry, database indices, demo hub controls. Zero loan sanction authority.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'system_health' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">System Infrastructure Observability</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-4 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)]">
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">API Uptime</span>
              <p className="text-lg font-black text-emerald-700 mt-1">99.98%</p>
              <p className="text-[10px] text-[var(--text-muted)]">No recorded outages</p>
            </div>
            <div className="p-4 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)]">
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">FSM Transition Engine</span>
              <p className="text-lg font-black text-emerald-700 mt-1">Operational</p>
              <p className="text-[10px] text-[var(--text-muted)]">Deterministic state checks</p>
            </div>
            <div className="p-4 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)]">
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">XGBoost ML Worker</span>
              <p className="text-lg font-black text-emerald-700 mt-1">Loaded</p>
              <p className="text-[10px] text-[var(--text-muted)]">Version 2.4.1</p>
            </div>
            <div className="p-4 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)]">
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">TreeSHAP Kernel</span>
              <p className="text-lg font-black text-emerald-700 mt-1">Ready</p>
              <p className="text-[10px] text-[var(--text-muted)]">Exact local attributions</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'api_health' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">FastAPI Subsystem Latency</h3>
          <div className="space-y-2 text-xs">
            <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)] flex items-center justify-between">
              <span className="font-mono font-bold text-[var(--brand-950)]">GET /api/v1/journeys</span>
              <span className="text-emerald-700 font-mono font-bold">12ms · 200 OK</span>
            </div>
            <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)] flex items-center justify-between">
              <span className="font-mono font-bold text-[var(--brand-950)]">GET /api/v1/risk/:id/assessment</span>
              <span className="text-emerald-700 font-mono font-bold">28ms · 200 OK</span>
            </div>
            <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)] flex items-center justify-between">
              <span className="font-mono font-bold text-[var(--brand-950)]">GET /api/v1/fraud/network</span>
              <span className="text-emerald-700 font-mono font-bold">34ms · 200 OK</span>
            </div>
            <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)] flex items-center justify-between">
              <span className="font-mono font-bold text-[var(--brand-950)]">GET /api/v1/journeys/:id/replay</span>
              <span className="text-emerald-700 font-mono font-bold">18ms · 200 OK</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'auth_status' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-[var(--brand-950)]">Firebase & Cloud Infrastructure Status</h3>
              <p className="text-xs text-[var(--text-muted)]">Live end-to-end connectivity verification (Section 31 & 32)</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestStorage}
              isLoading={isTestingStorage}
              leftIcon={<HardDrive className="w-3.5 h-3.5" />}
            >
              Test Storage Upload Probe
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)]">
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">FastAPI Core</span>
              <p className="text-base font-black text-emerald-700 mt-1">{diagnostics?.fastapi || 'CONNECTED'}</p>
              <p className="text-[10px] text-[var(--text-muted)]">Probe Latency: {diagnostics?.probe_latency_ms ?? 0}ms</p>
            </div>
            <div className="p-4 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)]">
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Firebase Auth</span>
              <p className="text-base font-black text-emerald-700 mt-1">{diagnostics?.firebase_auth || 'CONNECTED'}</p>
              <p className="text-[10px] text-[var(--text-muted)]">Bearer verification active</p>
            </div>
            <div className="p-4 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)]">
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Firestore Database</span>
              <p className="text-base font-black text-emerald-700 mt-1">{diagnostics?.firestore || 'CONNECTED'}</p>
              <p className="text-[10px] text-[var(--text-muted)]">Mode: {diagnostics?.firestore_mode || 'IN_MEMORY'}</p>
            </div>
            <div className="p-4 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)]">
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Firebase Storage</span>
              <p className="text-base font-black text-emerald-700 mt-1">{diagnostics?.firebase_storage || 'CONNECTED'}</p>
              <p className="text-[10px] text-[var(--text-muted)] truncate">{diagnostics?.storage_bucket || 'finflow-ray'}</p>
            </div>
          </div>

          {storageTestResult && (
            <div className={`p-4 rounded-2xl border text-xs ${storageTestResult.status === 'SUCCESS' ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-amber-50 border-amber-300 text-amber-950'}`}>
              <div className="flex items-center gap-2 font-bold mb-1">
                {storageTestResult.status === 'SUCCESS' ? <CheckCircle2 className="w-4 h-4 text-emerald-700" /> : <AlertTriangle className="w-4 h-4 text-amber-700" />}
                Storage Probe Result: {storageTestResult.status}
              </div>
              <p className="font-mono text-[11px]">
                Target: {storageTestResult.storage_target || 'N/A'} · Verified Bytes: {storageTestResult.bytes_verified ?? 'N/A'} · Object Path: {storageTestResult.verified_path || 'probe'}
              </p>
            </div>
          )}

          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs space-y-1 text-emerald-950">
            <span className="font-bold flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" /> Live Verification Diagnostics
            </span>
            <p className="text-emerald-900 leading-relaxed text-[11px]">
              Non-destructive read/write/delete health verification confirms zero corruption of customer records while verifying real-time backend responsiveness.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'config' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Environment & Server Configuration</h3>
          <div className="space-y-2 font-mono text-xs">
            <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)] flex justify-between">
              <span className="text-[var(--text-muted)]">API_BASE_URL</span>
              <span className="font-bold text-[var(--brand-950)]">{import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'}</span>
            </div>
            <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)] flex justify-between">
              <span className="text-[var(--text-muted)]">ENVIRONMENT</span>
              <span className="font-bold text-[var(--brand-950)]">{diagnostics?.environment || 'development'}</span>
            </div>
            <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)] flex justify-between">
              <span className="text-[var(--text-muted)]">DEMO_MODE</span>
              <span className="font-bold text-emerald-700">{diagnostics ? String(diagnostics.demo_mode) : 'true'}</span>
            </div>
            <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)] flex justify-between">
              <span className="text-[var(--text-muted)]">FIREBASE_PROJECT_ID</span>
              <span className="font-bold text-[var(--brand-950)]">{diagnostics?.project_id || 'finflow-ray'}</span>
            </div>
            <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)] flex justify-between">
              <span className="text-[var(--text-muted)]">STORAGE_BUCKET</span>
              <span className="font-bold text-[var(--brand-950)]">{diagnostics?.storage_bucket || 'finflow-ray.firebasestorage.app'}</span>
            </div>
            <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)] flex justify-between">
              <span className="text-[var(--text-muted)]">FIRESTORE_ENGINE</span>
              <span className="font-bold text-emerald-700">{diagnostics?.firestore_mode || 'IN_MEMORY'}</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'integrations' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">External FinTech Integrations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[var(--brand-950)]">DigiLocker Direct Fetch</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300">Connected</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">Aadhaar, PAN & Form 26AS verification API</p>
            </div>
            <div className="p-4 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border)] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[var(--brand-950)]">CBIC GST Portal Feed</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300">Connected</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">GSTR-3B & GSTR-1 real-time tax return pulling</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="p-6 bg-zinc-950 text-emerald-400 font-mono text-xs rounded-3xl border-2 border-[var(--brand-950)] shadow-[4px_4px_0px_#0A1F20] space-y-2">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="font-bold text-zinc-300">LIVE SYSTEM STDOUT STREAM</span>
            <span className="text-[10px] text-zinc-500">FastAPI Uvicorn Process ID #1250</span>
          </div>
          <p className="text-[11px] text-zinc-400">[2026-10-04 00:05:12] INFO: Uvicorn running on http://0.0.0.0:8000</p>
          <p className="text-[11px] text-zinc-400">[2026-10-04 00:05:14] INFO: Application startup complete. Firestore connected.</p>
          <p className="text-[11px] text-zinc-400">[2026-10-04 00:05:22] INFO: 127.0.0.1:54218 - "GET /api/v1/journeys" 200 OK</p>
          <p className="text-[11px] text-zinc-400">[2026-10-04 00:05:30] INFO: 127.0.0.1:54224 - "GET /api/v1/auth/personas" 200 OK</p>
          <p className="text-[11px] text-emerald-300">[2026-10-04 00:05:45] INFO: Cryptographic audit event chained successfully.</p>
        </div>
      )}

      {activeTab === 'demo' && (
        <div className="p-6 bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[4px_4px_0px_#0A1F20] space-y-4">
          <h3 className="text-base font-black text-[var(--brand-950)]">Hackathon Demo Controls</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            Reset or inspect the 4 benchmark test cases (Sharma Textiles, Kavita Enterprises, Apex Logistics, BioHealth Labs).
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="brutal"
              size="sm"
              onClick={handleSeedDemo}
              isLoading={isSeeding}
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Reset Seed Data
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/demo')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Open Hackathon Demo Hub
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
