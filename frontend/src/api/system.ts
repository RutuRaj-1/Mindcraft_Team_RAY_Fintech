import { http } from './client';

export interface SystemDiagnostics {
  fastapi: string;
  firebase_auth: string;
  firestore: string;
  firebase_storage: string;
  probe_latency_ms: number;
  timestamp: string;
  environment: string;
  demo_mode: boolean;
  firestore_mode: string;
  project_id: string;
  storage_bucket: string;
}

export interface StorageTestResult {
  status: string;
  storage_target?: string;
  bucket?: string;
  directory?: string;
  verified_path?: string;
  object_exists?: boolean;
  bytes_verified?: number;
  message?: string;
}

export const systemApi = {
  getDiagnostics: () => http.get<SystemDiagnostics>('/system/diagnostics'),
  testStorage: () => http.post<StorageTestResult>('/system/diagnostics/storage-test', {}),
};
