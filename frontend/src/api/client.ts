import {
  AuthenticatedUser, UserRole, JourneyRecord, IntentPayload,
  DocumentRecord, EvidenceItem, ConsistencyReport, CashFlowMetrics,
  RiskAssessment, SHAPAttribution, DecisionRecord, NextBestActionsResponse,
  TrustGraph, WhatIfRequest, WhatIfResponse, JourneyFrictionMetrics,
  QueueItem
} from '../types';

const API_BASE = '/api/v1';

export const getAuthToken = (): string => {
  return localStorage.getItem('finflow_token') || 'demo-customer';
};

export const setAuthToken = (token: string) => {
  localStorage.setItem('finflow_token', token);
};

export const getActiveRole = (): UserRole => {
  return (localStorage.getItem('finflow_role') as UserRole) || 'CUSTOMER';
};

export const setActiveRole = (role: UserRole) => {
  localStorage.setItem('finflow_role', role);
  const tokenMap: Record<UserRole, string> = {
    CUSTOMER: 'demo-customer',
    RM: 'demo-rm',
    RISK_OFFICER: 'demo-risk-officer',
    ADMIN: 'demo-admin'
  };
  setAuthToken(tokenMap[role]);
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

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

export const api = {
  // Auth
  getSession: (role?: UserRole) => request<{ token: string; user: AuthenticatedUser }>('/auth/session', {
    method: 'POST',
    body: JSON.stringify({ role })
  }),
  getProfile: () => request<AuthenticatedUser>('/auth/me'),

  // Journeys
  createJourney: (intent: IntentPayload) => request<JourneyRecord>('/journeys', {
    method: 'POST',
    body: JSON.stringify(intent)
  }),
  listJourneys: (stage?: string) => request<JourneyRecord[]>(stage ? `/journeys?stage=${stage}` : '/journeys'),
  getJourney: (id: string) => request<JourneyRecord>(`/journeys/${id}`),
  advanceStage: (id: string, target_stage: string, notes?: string) => request<JourneyRecord>(`/journeys/${id}/advance`, {
    method: 'POST',
    body: JSON.stringify({ target_stage, notes })
  }),
  getFriction: (id: string) => request<JourneyFrictionMetrics>(`/journeys/${id}/friction`),

  // Documents & Evidence
  uploadDocument: (journeyId: string, docType: string, file: File) => {
    const formData = new FormData();
    formData.append('doc_type', docType);
    formData.append('file', file);
    return request<DocumentRecord>(`/journeys/${journeyId}/documents/upload`, {
      method: 'POST',
      body: formData
    });
  },
  listDocuments: (journeyId: string) => request<DocumentRecord[]>(`/journeys/${journeyId}/documents`),
  getEvidenceLedger: (journeyId: string) => request<EvidenceItem[]>(`/journeys/${journeyId}/evidence`),
  getConsistencyReport: (journeyId: string) => request<ConsistencyReport>(`/journeys/${journeyId}/consistency`),

  // Financial Intelligence & Graph
  getCashFlowMetrics: (journeyId: string) => request<CashFlowMetrics>(`/journeys/${journeyId}/cashflow`),
  getTrustGraph: (journeyId: string) => request<TrustGraph>(`/journeys/${journeyId}/trust-graph`),

  // Risk & Explainability
  evaluateRisk: (journeyId: string) => request<DecisionRecord>(`/journeys/${journeyId}/evaluate-risk`, {
    method: 'POST'
  }),
  getRiskAssessment: (journeyId: string) => request<RiskAssessment>(`/journeys/${journeyId}/risk`),
  getSHAP: (journeyId: string) => request<SHAPAttribution>(`/journeys/${journeyId}/shap`),
  getDecision: (journeyId: string) => request<DecisionRecord>(`/journeys/${journeyId}/decision`),
  simulateWhatIf: (journeyId: string, req: WhatIfRequest) => request<WhatIfResponse>(`/journeys/${journeyId}/simulate`, {
    method: 'POST',
    body: JSON.stringify(req)
  }),
  replayDecision: (journeyId: string) => request<Record<string, any>>(`/journeys/${journeyId}/replay`),

  // Oversight & Actions
  getNextBestActions: (journeyId: string) => request<NextBestActionsResponse>(`/journeys/${journeyId}/actions`),
  submitOverride: (journeyId: string, overrideData: {
    new_outcome: string;
    new_approved_amount?: number;
    new_interest_rate?: number;
    reason_code: string;
    rationale_notes: string;
    co_signed_by?: string;
  }) => request<DecisionRecord>(`/journeys/${journeyId}/override`, {
    method: 'POST',
    body: JSON.stringify(overrideData)
  }),
  getAuditTrail: (journeyId: string) => request<any[]>(`/journeys/${journeyId}/audit`),
  getOfficerQueue: (statusFilter?: string) => request<QueueItem[]>(statusFilter ? `/dashboard/queue?status_filter=${statusFilter}` : '/dashboard/queue'),
  getPortfolioMetrics: () => request<Record<string, any>>('/dashboard/metrics'),
  getLearningStats: () => request<Record<string, any>>('/feedback/learning-stats'),

  // Demo
  seedDemo: () => request<{ status: string; message: string; cases: any[] }>('/demo/seed', { method: 'POST' }),
  getDemoCases: () => request<any[]>('/demo/cases')
};
