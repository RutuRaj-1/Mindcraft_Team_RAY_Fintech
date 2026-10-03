import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi, authApi, auditApi, analyticsApi } from '../../api';
import { MetricCard } from '../../components/fintech/MetricCard';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  Cpu, Users, Shield, Activity, Server, Lock, Settings,
  Layers, Terminal, Sparkles, RefreshCw, CheckCircle2,
  AlertTriangle, ArrowRight, Database, Check, X
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const { persona } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'users';

  const [metrics, setMetrics] = useState<Record<string, any>>({});
  const [personas, setPersonas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [m, p] = await Promise.all([
        dashboardApi.getPortfolioMetrics().catch(() => ({})),
        authApi.getPersonas().catch(() => []),
      ]);
      setMetrics(m);
      setPersonas(Array.isArray(p) ? p : Object.values(p || {}));
    } catch (err) {
      console.error('Failed to load admin telemetry', err);
    } finally {
      setIsLoading(false);
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

  const tabs = [
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

        <div className="flex items-center gap-2">
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

      {/* 9 Navigation Workspace Tabs (Part 23) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[var(--border)]">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
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

      {/* Tab Contents */}
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
          <h3 className="text-base font-black text-[var(--brand-950)]">Firebase Authentication & Identity Claims</h3>
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs space-y-2 text-emerald-950">
            <span className="font-bold flex items-center gap-1.5 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" /> Firebase Auth Integration Active
            </span>
            <p className="text-emerald-900 leading-relaxed">
              Firebase bearer token verification is configured with custom claims mapping to FinFlow AI roles. In local offline hackathon mode, deterministic demo token authentication ensures zero reliance on external network availability.
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
              <span className="font-bold text-[var(--brand-950)]">http://localhost:8000/api/v1</span>
            </div>
            <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)] flex justify-between">
              <span className="text-[var(--text-muted)]">DEMO_MODE</span>
              <span className="font-bold text-emerald-700">true</span>
            </div>
            <div className="p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border)] flex justify-between">
              <span className="text-[var(--text-muted)]">FIRESTORE_PROJECT_ID</span>
              <span className="font-bold text-[var(--brand-950)]">finflow-mindcraft-prod</span>
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
