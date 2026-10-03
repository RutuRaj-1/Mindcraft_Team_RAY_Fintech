import { http } from './client';

export const analyticsApi = {
  getLearningStats: () =>
    http.get<Record<string, unknown>>('/feedback/learning-stats'),

  seedDemo: () =>
    http.post<{ status: string; message: string; cases: unknown[] }>('/demo/seed'),

  resetDemo: () =>
    http.post<{ status: string; message: string; cases?: unknown[] }>('/demo/reset'),

  getDemoCases: () =>
    http.get<any[]>('/demo/cases'),
};
