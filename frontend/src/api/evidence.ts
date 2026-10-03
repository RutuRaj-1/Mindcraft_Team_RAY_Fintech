import { http } from './client';
import { EvidenceItem, EvidenceProvenanceTrace, ConsistencyReport } from '../types';

export const evidenceApi = {
  getEvidenceLedger: (journeyId: string) =>
    http.get<EvidenceItem[]>(`/journeys/${journeyId}/evidence`),

  getEvidenceProvenance: (evidenceIdOrJourneyId: string, maybeEvidenceId?: string) => {
    const id = maybeEvidenceId || evidenceIdOrJourneyId;
    return http.get<EvidenceProvenanceTrace>(`/evidence/${id}/provenance`);
  },

  getConsistencyReport: (journeyId: string) =>
    http.get<ConsistencyReport>(`/journeys/${journeyId}/consistency`),
};
