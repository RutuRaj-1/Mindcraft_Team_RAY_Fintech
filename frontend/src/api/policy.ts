import { http } from './client';

export const policyApi = {
  searchPolicies: (query: string, category?: string, limit: number = 4) =>
    http.get<any[]>(
      `/policies/search?q=${encodeURIComponent(query)}${category ? `&category=${encodeURIComponent(category)}` : ''}&limit=${limit}`
    ),

  ingestPolicy: (payload: any) =>
    http.post<any>('/admin/policies/ingest', payload),

  getRAGExplanation: (journeyId: string) =>
    http.post<any>(`/journeys/${journeyId}/rag/explain`),
};
