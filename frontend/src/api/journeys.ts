import { http } from './client';
import { JourneyRecord, JourneyStage, JourneyFrictionMetrics } from '../types';

export const journeysApi = {
  createJourney: (applicationId: string, initialStage?: JourneyStage | string) =>
    http.post<JourneyRecord>('/journeys', {
      application_id: applicationId,
      initial_stage: initialStage || 'INTENT',
    }),

  getJourney: (journeyId: string) =>
    http.get<JourneyRecord>(`/journeys/${journeyId}`),

  advanceStage: (journeyId: string, targetStage: JourneyStage | string, reason?: string) =>
    http.post<JourneyRecord>(`/journeys/${journeyId}/advance`, {
      stage: targetStage,
      reason,
    }),

  advanceJourney: (journeyId: string, targetStage: JourneyStage | string, context: Record<string, any> = {}) =>
    http.post<JourneyRecord>(`/journeys/${journeyId}/advance`, {
      stage: targetStage,
      context,
    }),

  listJourneys: () =>
    http.get<JourneyRecord[]>('/journeys'),

  getFriction: (journeyId: string) =>
    http.get<JourneyFrictionMetrics>(`/journeys/${journeyId}/friction`),

  getFrictionMetrics: (journeyId: string) =>
    http.get<JourneyFrictionMetrics>(`/journeys/${journeyId}/friction`),

  getTimeline: (journeyId: string) =>
    http.get<any>(`/journeys/${journeyId}/timeline`),

  getReplay: (journeyId: string) =>
    http.get<any>(`/journeys/${journeyId}/replay`),
};
