import { http } from './client';
import { DecisionRecord } from '../types';

export const decisionsApi = {
  generateDecision: (journeyId: string) =>
    http.post<DecisionRecord>(`/journeys/${journeyId}/decision/generate`),

  getDecision: (journeyId: string) =>
    http.get<DecisionRecord>(`/journeys/${journeyId}/decision`),

  acceptDecision: (journeyId: string) =>
    http.post<{ status: string; journey_id: string }>(`/journeys/${journeyId}/decision/accept`),

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
    http.post<DecisionRecord>(`/journeys/${journeyId}/override`, overrideData),
};
