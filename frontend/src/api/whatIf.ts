import { http } from './client';
import { WhatIfRequest, WhatIfResponse, WhatIfHistoryResponse } from '../types';

export const whatIfApi = {
  simulateWhatIf: (journeyId: string, req: WhatIfRequest) =>
    http.post<WhatIfResponse>(`/journeys/${journeyId}/what-if`, req),

  getWhatIfHistory: (journeyId: string) =>
    http.get<WhatIfHistoryResponse>(`/journeys/${journeyId}/what-if/history`),
};
