import { http } from './client';
import { DocumentRecord, DigiLockerCredential } from '../types';

export const documentsApi = {
  uploadDocument: (
    journeyId: string,
    arg2: string | File,
    arg3?: File | string,
    fileName?: string
  ) => {
    let docType = 'BANK_STATEMENT';
    let file: File | string | null = null;

    if (typeof arg2 === 'string' && arg3 instanceof File) {
      docType = arg2;
      file = arg3;
    } else if (arg2 instanceof File) {
      file = arg2;
      if (typeof arg3 === 'string') docType = arg3;
    } else if (typeof arg2 === 'string') {
      docType = arg2;
      file = typeof arg3 === 'string' ? arg3 : 'mock_document.pdf';
    }

    if (typeof file === 'string' || !file) {
      return http.post<DocumentRecord>(`/journeys/${journeyId}/documents`, {
        file_path: file || 'document.pdf',
        doc_type: docType,
        file_name: fileName || file || 'document.pdf',
      });
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docType);
    if (fileName) formData.append('file_name', fileName);
    return http.post<DocumentRecord>(`/journeys/${journeyId}/documents`, formData);
  },

  listDocuments: (journeyId: string) =>
    http.get<DocumentRecord[]>(`/journeys/${journeyId}/documents`),

  getDocument: (documentId: string) =>
    http.get<DocumentRecord>(`/documents/${documentId}`),

  verifyDocument: (journeyId: string, documentId: string) =>
    http.post<{ status: string; verification_status: string }>(
      `/journeys/${journeyId}/documents/${documentId}/verify`
    ),

  listDigiLockerAvailable: (journeyId: string) =>
    http.get<DigiLockerCredential[]>(`/journeys/${journeyId}/digilocker/available`),

  importDigiLockerCredential: (journeyId: string, credentialType: string) =>
    http.post<DocumentRecord>(`/journeys/${journeyId}/digilocker/import`, {
      credential_type: credentialType,
    }),

  fetchDigiLockerDocument: (journeyId: string, docType: string) =>
    http.post<{ status: string; document: DocumentRecord; credential: DigiLockerCredential }>(
      `/journeys/${journeyId}/digilocker/fetch`,
      { doc_type: docType }
    ),
};
