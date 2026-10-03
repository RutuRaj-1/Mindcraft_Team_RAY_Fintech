/**
 * FinFlow AI — Central Typed HTTP Client Layer
 *
 * Capabilities:
 * - Environment-configured API base URL (`VITE_API_BASE_URL` fallback to `/api/v1`)
 * - Attaches Firebase ID token (or demo role token) via `Authorization: Bearer <token>`
 * - Standardized `ApiError` hierarchy handling 401, 403, 404, 409, 422, 500, and timeouts
 * - Request cancellation & timeout via `AbortController` (default 15s)
 * - Safe JSON parsing with fallback to text error messages
 */

import { UserRole } from '../types';

// ── Environment Configuration ────────────────────────────────────────────────
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || '/api/v1'
).replace(/\/+$/, '');

// ── Standardized API Error ────────────────────────────────────────────────────
export class ApiError extends Error {
  public statusCode: number;
  public endpoint: string;
  public details?: any;
  public isTimeout: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    endpoint: string = '',
    details?: any,
    isTimeout: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.endpoint = endpoint;
    this.details = details;
    this.isTimeout = isTimeout;

    // Restore prototype chain for instanceof checks
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  get isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  get isForbidden(): boolean {
    return this.statusCode === 403;
  }

  get isNotFound(): boolean {
    return this.statusCode === 404;
  }

  get isConflict(): boolean {
    return this.statusCode === 409;
  }

  get isUnprocessable(): boolean {
    return this.statusCode === 422;
  }

  get isServerError(): boolean {
    return this.statusCode >= 500;
  }

  /**
   * Sanitized, user-friendly error message compliant with Part 40:
   * Never exposes raw Python/FastAPI tracebacks or internal exceptions to normal users.
   */
  get userMessage(): string {
    if (this.isTimeout) {
      return "The request timed out while waiting for the server to respond. Please try again.";
    }
    if (this.statusCode === 0) {
      return "Unable to reach the server. Please check your internet connection and try again.";
    }
    switch (this.statusCode) {
      case 401:
        return "Your session has expired. Please sign in again.";
      case 403:
        return "You do not have permission to access this case.";
      case 404:
        return "The requested case or resource could not be found.";
      case 409:
        return "This action cannot be performed because the application is in a different journey state.";
      case 422:
        return "The submitted information could not be processed. Please check the required fields.";
      case 429:
        return "Too many requests. Please wait a moment before trying again.";
      case 500:
        return "Something went wrong while processing the request.";
      case 502:
        return "The underwriting gateway is temporarily unavailable. Please try again shortly.";
      case 503:
        return "Service is temporarily unavailable due to scheduled maintenance. Please retry in a few moments.";
      default:
        if (this.statusCode >= 500) {
          return "Something went wrong while processing the request.";
        }
        if (this.message && !this.message.includes('Traceback') && !this.message.includes('{"detail"') && this.message.length < 120) {
          return this.message;
        }
        return "An error occurred while processing your request. Please try again.";
    }
  }
}

/**
 * Universal error formatter for components, preventing any raw stack traces or internal backend errors from reaching users.
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.userMessage;
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (error.name === 'AbortError' || msg.includes('timeout')) {
      return "The request timed out while waiting for the server to respond. Please try again.";
    }
    if (msg.includes('network') || msg.includes('failed to fetch')) {
      return "Unable to reach the server. Please check your internet connection and try again.";
    }
    if (!error.message.includes('Traceback') && error.message.length < 120) {
      return error.message;
    }
  }
  return "Something went wrong while processing the request.";
}

// ── Demo-mode Token & Role Helpers ───────────────────────────────────────────
export const ROLE_DEMO_TOKEN: Record<UserRole, string> = {
  CUSTOMER:         'demo-customer',
  RM:               'demo-rm',
  RM_SUPERVISOR:    'demo-rm-supervisor',
  RISK_OFFICER:     'demo-risk-officer',
  RISK_MANAGER:     'demo-risk-manager',
  CREDIT_APPROVER:  'demo-credit-approver',
  AUDIT_OFFICER:    'demo-audit-officer',
  SYS_ADMIN:        'demo-admin',
  ADMIN:            'demo-admin',
};

export const getStoredToken = (): string =>
  localStorage.getItem('finflow_token') || ROLE_DEMO_TOKEN.CUSTOMER;

export const setStoredToken = (token: string): void => {
  localStorage.setItem('finflow_token', token);
};

export const getActiveRole = (): UserRole =>
  (localStorage.getItem('finflow_role') as UserRole) || 'CUSTOMER';

export const setActiveRole = (role: UserRole): void => {
  localStorage.setItem('finflow_role', role);
  setStoredToken(ROLE_DEMO_TOKEN[role]);
};

// ── Token Provider (Injected by AuthContext at runtime) ───────────────────────
let _tokenProvider: (() => Promise<string>) | null = null;

export const setTokenProvider = (fn: () => Promise<string>): void => {
  _tokenProvider = fn;
};

export const clearTokenProvider = (): void => {
  _tokenProvider = null;
};

export async function resolveAuthToken(): Promise<string> {
  if (_tokenProvider) {
    try {
      const token = await _tokenProvider();
      if (token) return token;
    } catch (_) {
      // Fall through to stored token
    }
  }
  return getStoredToken();
}

// ── Central Request Dispatcher ───────────────────────────────────────────────
export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

export async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { timeoutMs = 15000, ...fetchOptions } = options;
  const token = await resolveAuthToken();
  const headers = new Headers(fetchOptions.headers || {});

  if (!headers.has('Authorization') && token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Setup timeout via AbortController
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: fetchOptions.signal || controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      let errMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errDetails: any = null;

      try {
        const body = await response.json();
        if (body.detail) {
          errMessage = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
        } else if (body.message) {
          errMessage = body.message;
        }
        errDetails = body;
      } catch (_) {
        try {
          const text = await response.text();
          if (text) errMessage = text;
        } catch (_) {}
      }

      throw new ApiError(errMessage, response.status, cleanEndpoint, errDetails);
    }

    // 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(timer);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error.name === 'AbortError') {
      throw new ApiError(
        `Request to ${cleanEndpoint} timed out after ${timeoutMs}ms`,
        408,
        cleanEndpoint,
        null,
        true
      );
    }

    throw new ApiError(
      error.message || `Network error during request to ${cleanEndpoint}`,
      0,
      cleanEndpoint,
      error
    );
  }
}

// ── HTTP Verb Helpers ────────────────────────────────────────────────────────
export const http = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  put: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  patch: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};

// Backward compatibility alias
export const getAuthToken = getStoredToken;
export const setAuthToken = setStoredToken;

// Re-export api from index
export { api } from './index';
