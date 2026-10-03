/**
 * FinFlow AI — Unified API Client
 *
 * - Attaches a Firebase ID token (or demo token) to every request via
 *   Authorization: Bearer <token>.
 * - In DEMO_MODE (no Firebase credentials) the token is a predictable
 *   string such as "demo-customer" that the backend maps to a mock user.
 * - The `getIdToken()` function is injected at runtime by AuthContext to
 *   avoid a circular dependency.
 */

import {
  AuthenticatedUser, UserRole, JourneyRecord, IntentPayload,
  DocumentRecord, EvidenceItem, ConsistencyReport, CashFlowMetrics,
  RiskAssessment, SHAPAttribution, DecisionRecord, NextBestActionsResponse,
  TrustGraph, WhatIfRequest, WhatIfResponse, JourneyFrictionMetrics,
  QueueItem, NormalizedIntent, IntentSubmitResponse
} from '../types';

const API_BASE = '/api/v1';

// ── Demo-mode token helpers ───────────────────────────────────────────────────
export const ROLE_DEMO_TOKEN: Record<UserRole, string> = {
  CUSTOMER:     'demo-customer',
  RM:           'demo-rm',
  RISK_OFFICER: 'demo-risk-officer',
  ADMIN:        'demo-admin',
};

// Synchronous fallback stored in localStorage (demo mode)
export const getStoredToken = (): string =>
  localStorage.getItem('finflow_token') || ROLE_DEMO_TOKEN.CUSTOMER;

export const setStoredToken = (token: string): void => {
  localStorage.setItem('finflow_token', token);
};

export const getActiveRole = (): UserRole =>
  (localStorage.getItem('finflow_role') as UserRole) || 'CUSTOMER';

export const setActiveRole = (role: UserRole): void => {
  localStorage.setItem('finflow_role', role);
  setStoredToken(ROLE_DEMO_TOKEN[role]);
};

// ── Async token provider (injected by AuthContext) ────────────────────────────
// AuthContext calls `setTokenProvider` once the Firebase user is known.
let _tokenProvider: (() => Promise<string>) | null = null;

export const setTokenProvider = (fn: () => Promise<string>): void => {
  _tokenProvider = fn;
};

export const clearTokenProvider = (): void => {
  _tokenProvider = null;
};

/** Returns the best available auth token (Firebase ID token or demo token). */
async function resolveToken(): Promise<string> {
  if (_tokenProvider) {
    try {
      return await _tokenProvider();
    } catch {
      // Fall through to stored token
    }
  }
  return getStoredToken();
}

// ── Core request helper ───────────────────────────────────────────────────────
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await resolveToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    let errMessage = `API request failed: ${response.statusText}`;
    try {
      const errData = await response.json();
      errMessage = errData.detail || errMessage;
    } catch (_) {}
    throw new Error(errMessage);
  }

  return response.json();
}

// ── API surface ───────────────────────────────────────────────────────────────
export const api = {
  // Auth
  getSession: (role?: UserRole) =>
    request<{ token: string; user: AuthenticatedUser }>('/auth/session', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),
  getProfile: () => request<AuthenticatedUser>('/auth/me'),

  // Intent & Conversational Origination (Module 1)
  parseIntent: (payload: { natural_text?: string; answers?: Record<string, any> }) =>
    request<NormalizedIntent>('/intent/parse', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  submitIntent: (payload: {
    natural_text?: string;
    answers?: Record<string, any>;
    normalized_intent?: Partial<NormalizedIntent>;
    business_name?: string;
  }) =>
    request<IntentSubmitResponse>('/intent/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Journeys
  createJourney: (intent: IntentPayload) =>
    request<JourneyRecord>('/journeys', { method: 'POST', body: JSON.stringify(intent) }),
  listJourneys: (stage?: string) =>
    request<JourneyRecord[]>(stage ? `/journeys?stage=${stage}` : '/journeys'),
  getJourney: (id: string) => request<JourneyRecord>(`/journeys/${id}`),
  advanceStage: (id: string, target_stage: string, notes?: string) =>
    request<JourneyRecord>(`/journeys/${id}/advance`, {
      method: 'POST',
      body: JSON.stringify({ target_stage, notes }),
    }),
  getFriction: (id: string) => request<JourneyFrictionMetrics>(`/journeys/${id}/friction`),

  // Documents & Evidence
  uploadDocument: (journeyId: string, docType: string, file: File) => {
    const formData = new FormData();
    formData.append('doc_type', docType);
    formData.append('file', file);
    return request<DocumentRecord>(`/journeys/${journeyId}/documents/upload`, {
      method: 'POST',
      body: formData,
    });
  },
  listDocuments:        (journeyId: string) => request<DocumentRecord[]>(`/journeys/${journeyId}/documents`),
  getEvidenceLedger:    (journeyId: string) => request<EvidenceItem[]>(`/journeys/${journeyId}/evidence`),
  getConsistencyReport: (journeyId: string) => request<ConsistencyReport>(`/journeys/${journeyId}/consistency`),

  // Financial Intelligence & Graph
  getCashFlowMetrics: (journeyId: string) => request<CashFlowMetrics>(`/journeys/${journeyId}/cashflow`),
  getTrustGraph:      (journeyId: string) => request<TrustGraph>(`/journeys/${journeyId}/trust-graph`),

  // Risk & Explainability
  evaluateRisk:   (journeyId: string) =>
    request<DecisionRecord>(`/journeys/${journeyId}/evaluate-risk`, { method: 'POST' }),
  getRiskAssessment: (journeyId: string) => request<RiskAssessment>(`/journeys/${journeyId}/risk`),
  getSHAP:           (journeyId: string) => request<SHAPAttribution>(`/journeys/${journeyId}/shap`),
  getDecision:       (journeyId: string) => request<DecisionRecord>(`/journeys/${journeyId}/decision`),
  simulateWhatIf:    (journeyId: string, req: WhatIfRequest) =>
    request<WhatIfResponse>(`/journeys/${journeyId}/simulate`, {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  replayDecision: (journeyId: string) =>
    request<Record<string, unknown>>(`/journeys/${journeyId}/replay`),

  // Oversight & Actions
  getNextBestActions: (journeyId: string) =>
    request<NextBestActionsResponse>(`/journeys/${journeyId}/actions`),
  submitOverride: (
    journeyId: string,
    overrideData: {
      new_outcome: string;
      new_approved_amount?: number;
      new_interest_rate?: number;
      reason_code: string;
      rationale_notes: string;
      co_signed_by?: string;
    }
  ) =>
    request<DecisionRecord>(`/journeys/${journeyId}/override`, {
      method: 'POST',
      body: JSON.stringify(overrideData),
    }),
  getAuditTrail:       (journeyId: string) => request<unknown[]>(`/journeys/${journeyId}/audit`),
  getOfficerQueue:     (statusFilter?: string) =>
    request<QueueItem[]>(
      statusFilter ? `/dashboard/queue?status_filter=${statusFilter}` : '/dashboard/queue'
    ),
  getPortfolioMetrics: () => request<Record<string, unknown>>('/dashboard/metrics'),
  getLearningStats:    () => request<Record<string, unknown>>('/feedback/learning-stats'),

  // Demo
  seedDemo:    () => request<{ status: string; message: string; cases: unknown[] }>('/demo/seed', { method: 'POST' }),
  getDemoCases: () => request<unknown[]>('/demo/cases'),
};

// ── Legacy alias for backward compat ─────────────────────────────────────────
export const getAuthToken  = getStoredToken;
export const setAuthToken  = setStoredToken;
