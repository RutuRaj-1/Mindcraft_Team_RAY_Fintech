import { http } from './client';
import { AuthenticatedUser, UserRole } from '../types';

export const authApi = {
  getSession: (role?: UserRole) =>
    http.post<{ token: string; user: AuthenticatedUser }>('/auth/session', { role }),

  getProfile: () =>
    http.get<AuthenticatedUser>('/auth/me'),

  getPersonas: () =>
    http.get<Record<string, unknown>>('/auth/personas'),

  setCustomClaims: (uid: string, claims: Record<string, any>) =>
    http.post<{ status: string; claims: Record<string, any> }>('/auth/claims', { uid, claims }),
};
