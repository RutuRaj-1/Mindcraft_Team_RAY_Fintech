import { http } from './client';
import { IntentPayload, IntentSubmitResponse, NormalizedIntent } from '../types';

export const applicationsApi = {
  submitIntent: (intentData: any) =>
    http.post<IntentSubmitResponse>('/intent/submit', intentData),

  parseIntent: (payload: { natural_text?: string; answers?: Record<string, any> }) =>
    http.post<NormalizedIntent>('/intent/parse', payload),

  updateFinancialIntent: (journeyId: string, updates: Partial<IntentPayload>) =>
    http.post<{ status: string; journey_id: string }>(`/journeys/${journeyId}/intent/update`, updates),

  listApplications: () =>
    http.get<any[]>('/applications'),
};
