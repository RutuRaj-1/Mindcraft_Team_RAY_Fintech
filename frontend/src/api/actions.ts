import { http } from './client';
import {
  NextBestActionsResponse, SafeActionExecutionRequest, SafeActionExecutionResult
} from '../types';

export const actionsApi = {
  getNextBestActions: (journeyId: string, role?: string) =>
    http.get<NextBestActionsResponse>(
      `/journeys/${journeyId}/actions${role ? `?role=${encodeURIComponent(role)}` : ''}`
    ),

  executeSafeAction: (journeyId: string, req: SafeActionExecutionRequest) =>
    http.post<SafeActionExecutionResult>(`/journeys/${journeyId}/actions/execute`, req),
};
