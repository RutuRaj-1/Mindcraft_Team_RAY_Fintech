/**
 * FinFlow AI — Central Unified API Client Surface
 *
 * Combines all typed domain services into a single clean `api` export
 * while preserving direct domain imports (e.g. journeysApi, auditApi).
 */

import { authApi } from './auth';
import { journeysApi } from './journeys';
import { applicationsApi } from './applications';
import { documentsApi } from './documents';
import { evidenceApi } from './evidence';
import { riskApi } from './risk';
import { decisionsApi } from './decisions';
import { actionsApi } from './actions';
import { reviewApi } from './review';
import { auditApi } from './audit';
import { whatIfApi } from './whatIf';
import { dashboardApi } from './dashboard';
import { analyticsApi } from './analytics';
import { policyApi } from './policy';
import { systemApi } from './system';

export const api = {
  ...authApi,
  ...journeysApi,
  ...applicationsApi,
  ...documentsApi,
  ...evidenceApi,
  ...riskApi,
  ...decisionsApi,
  ...actionsApi,
  ...reviewApi,
  ...auditApi,
  ...whatIfApi,
  ...dashboardApi,
  ...analyticsApi,
  ...policyApi,
  ...systemApi,
};

// Re-export core client utilities & domain modules
export * from './client';
export * from './auth';
export * from './journeys';
export * from './applications';
export * from './documents';
export * from './evidence';
export * from './risk';
export * from './decisions';
export * from './actions';
export * from './review';
export * from './audit';
export * from './whatIf';
export * from './dashboard';
export * from './analytics';
export * from './policy';
export * from './system';

export default api;
