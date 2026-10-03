import { http } from './client';
import {
  AuditCase, AuditFinding, CreateFindingRequest,
  OverrideAnalytics, DecisionReplayResponse
} from '../types';

export const auditApi = {
  getAuditTrail: (journeyId: string) =>
    http.get<unknown[]>(`/journeys/${journeyId}/audit`),

  getDecisionReplay: (journeyId: string) =>
    http.get<DecisionReplayResponse>(`/journeys/${journeyId}/replay`),

  replayDecision: (journeyId: string) =>
    http.get<DecisionReplayResponse>(`/journeys/${journeyId}/replay`),

  getAuditCases: (limit: number = 50) =>
    http.get<AuditCase[]>(`/audit/cases?limit=${limit}`),

  getAuditFindings: (status?: string, severity?: string) =>
    http.get<AuditFinding[]>(
      `/audit/findings${status ? `?status=${encodeURIComponent(status)}` : ''}${severity ? `${status ? '&' : '?'}severity=${encodeURIComponent(severity)}` : ''}`
    ),

  createAuditFinding: (req: CreateFindingRequest) =>
    http.post<AuditFinding>('/audit/findings', req),

  getOverrideAnalytics: () =>
    http.get<OverrideAnalytics>('/audit/override-analytics'),
};
