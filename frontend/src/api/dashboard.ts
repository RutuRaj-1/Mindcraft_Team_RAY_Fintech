import { http } from './client';
import { QueueItem, CashFlowMetrics } from '../types';

export const dashboardApi = {
  getOfficerQueue: (statusFilter?: string) =>
    http.get<QueueItem[]>(
      statusFilter ? `/dashboard/queue?status_filter=${encodeURIComponent(statusFilter)}` : '/dashboard/queue'
    ),

  getPortfolioMetrics: () =>
    http.get<Record<string, unknown>>('/dashboard/metrics'),

  getCashFlowMetrics: (journeyId: string) =>
    http.get<CashFlowMetrics>(`/journeys/${journeyId}/cashflow`),
};
