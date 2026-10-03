import { http } from './client';
import {
  RiskAssessment, SHAPAttribution, JourneyFraudSignalsResponse,
  FraudNetworkResponse, FraudSignal, TrustGraph, DecisionRecord
} from '../types';

export const riskApi = {
  assessRisk: (journeyId: string) =>
    http.post<RiskAssessment>(`/journeys/${journeyId}/risk/assess`),

  evaluateRisk: (journeyId: string) =>
    http.post<DecisionRecord>(`/journeys/${journeyId}/evaluate-risk`),

  getRiskAssessment: (journeyId: string) =>
    http.get<RiskAssessment>(`/journeys/${journeyId}/risk`),

  getSHAP: (journeyId: string) =>
    http.get<SHAPAttribution>(`/journeys/${journeyId}/risk/shap`),

  getTrustGraph: (journeyId: string) =>
    http.get<TrustGraph>(`/journeys/${journeyId}/trust-graph`),

  getFraudSignals: (journeyId: string) =>
    http.get<JourneyFraudSignalsResponse>(`/journeys/${journeyId}/fraud-signals`),

  getFraudNetwork: (focusId?: string) =>
    http.get<FraudNetworkResponse>(
      focusId ? `/fraud/network?focus_id=${encodeURIComponent(focusId)}` : '/fraud/network'
    ),

  resolveFraudSignal: (signalId: string, status: string, notes: string, officerName?: string) =>
    http.post<FraudSignal>(`/fraud/signals/${signalId}/status`, {
      status,
      notes,
      officerName,
    }),
};
