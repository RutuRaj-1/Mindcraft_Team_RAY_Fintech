import React, { useState } from 'react';
import { api } from '../../api/client';
import { DocumentRecord, EvidenceItem } from '../../types';
import { UploadCloud, FileText, CheckCircle2, ShieldCheck, Hash, Eye, AlertCircle, FileCheck, Layers } from 'lucide-react';

interface DocUploadProps {
  journeyId: string;
  documents: DocumentRecord[];
  evidence: EvidenceItem[];
  onRefresh: () => void;
}

export const DocumentUploadLedger: React.FC<DocUploadProps> = ({
  journeyId,
  documents,
  evidence,
  onRefresh
}) => {
  const [docType, setDocType] = useState<string>('BANK_STATEMENT');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    try {
      await api.uploadDocument(journeyId, docType, file);
      setFile(null);
      onRefresh();
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-50)] flex items-center justify-center text-[var(--brand-700)]">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--neutral-900)] tracking-tight">
              Evidence Ingestion & Document Provenance
            </h3>
            <p className="text-xs text-[var(--neutral-500)]">
              Upload bank statements, GST returns, or ITR. FinFlow computes SHA-256 hashes and extracts verifiable fields.
            </p>
          </div>
        </div>

        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end mt-4">
          <div className="md:col-span-4">
            <label className="fin-label">
              Document Category
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="fin-input text-xs"
            >
              <option value="BANK_STATEMENT">Bank Statement (Last 6 Months)</option>
              <option value="GST_RETURN">GSTR-3B / GSTR-1 Monthly Return</option>
              <option value="ITR">Income Tax Return (ITR-V)</option>
              <option value="PAN">PAN / Business Registration</option>
            </select>
          </div>

          <div className="md:col-span-5">
            <label className="fin-label">
              Select Statement File (PDF / Images)
            </label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
              className="fin-input text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[var(--brand-50)] file:text-[var(--brand-700)] hover:file:bg-[var(--brand-100)] cursor-pointer"
            />
          </div>

          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={!file || isUploading}
              className="btn-primary w-full py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isUploading ? 'Extracting via OCR...' : 'Upload & Extract'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Uploaded Documents List */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-[var(--neutral-900)] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[var(--brand-700)]" /> Verified Ingestion Records ({documents.length})
          </h4>
          <span className="badge badge-primary text-[10px]">Tamper-Proof Ledger</span>
        </div>

        {documents.length === 0 ? (
          <div className="p-8 text-center text-[var(--neutral-500)] bg-[var(--neutral-50)] rounded-xl border border-dashed border-[var(--border-subtle)]">
            <FileText className="w-8 h-8 text-[var(--neutral-400)] mx-auto mb-2 opacity-50" />
            <p className="text-xs">No documents uploaded yet for this application.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--neutral-50)] text-[var(--neutral-500)] border-b border-[var(--border-subtle)]">
                <tr>
                  <th className="py-3 px-3.5 font-semibold">Document Name</th>
                  <th className="py-3 px-3.5 font-semibold">Type</th>
                  <th className="py-3 px-3.5 font-semibold">Status</th>
                  <th className="py-3 px-3.5 font-semibold">SHA-256 Provenance Fingerprint</th>
                  <th className="py-3 px-3.5 font-semibold">Extracted Fields</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {documents.map((d) => (
                  <tr key={d.document_id} className="hover:bg-[var(--neutral-50)] transition-colors">
                    <td className="py-3 px-3.5 font-semibold text-[var(--neutral-900)] flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-[var(--brand-600)] shrink-0" />
                      {d.file_name}
                    </td>
                    <td className="py-3 px-3.5 text-[var(--neutral-600)] font-medium">{d.doc_type}</td>
                    <td className="py-3 px-3.5">
                      <span className="badge badge-success text-[11px] flex items-center gap-1 w-max">
                        <CheckCircle2 className="w-3 h-3" /> {d.status}
                      </span>
                    </td>
                    <td className="py-3 px-3.5">
                      <code className="text-[10px] font-mono bg-[var(--neutral-100)] text-[var(--neutral-700)] px-2 py-0.5 rounded border border-[var(--border-subtle)]" title={d.sha256_hash}>
                        {d.sha256_hash.substring(0, 16)}...
                      </code>
                    </td>
                    <td className="py-3 px-3.5 text-[var(--brand-700)] font-bold">
                      {d.extracted_fields_count} verified fields
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Structured Evidence Ledger */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-[var(--neutral-900)] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--fin-green)]" /> Cryptographic Evidence Ledger ({evidence.length} Fields)
          </h4>
          <span className="badge badge-success text-[10px]">Zero Hallucination Anchors</span>
        </div>

        {evidence.length === 0 ? (
          <div className="p-8 text-center text-[var(--neutral-500)] bg-[var(--neutral-50)] rounded-xl border border-dashed border-[var(--border-subtle)]">
            <Layers className="w-8 h-8 text-[var(--neutral-400)] mx-auto mb-2 opacity-50" />
            <p className="text-xs">No evidence items generated yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--neutral-50)] text-[var(--neutral-500)] border-b border-[var(--border-subtle)]">
                <tr>
                  <th className="py-3 px-3.5 font-semibold">Evidence Field</th>
                  <th className="py-3 px-3.5 font-semibold">Extracted Value</th>
                  <th className="py-3 px-3.5 font-semibold">Confidence</th>
                  <th className="py-3 px-3.5 font-semibold">Page & Coordinate Box</th>
                  <th className="py-3 px-3.5 font-semibold">Source Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {evidence.map((item) => (
                  <tr key={item.evidence_id} className="hover:bg-[var(--neutral-50)] transition-colors">
                    <td className="py-3 px-3.5 font-semibold text-[var(--neutral-900)]">{item.field_name}</td>
                    <td className="py-3 px-3.5 font-bold text-[var(--brand-800)]">
                      {typeof item.field_value === 'number' && item.field_value > 1000
                        ? `₹${item.field_value.toLocaleString('en-IN')}`
                        : String(item.field_value)}
                    </td>
                    <td className="py-3 px-3.5">
                      <span className={`badge ${
                        item.confidence >= 0.95 ? 'badge-success' : 'badge-warning'
                      } text-[10px]`}>
                        {(item.confidence * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-[var(--neutral-500)] text-[11px]">
                      Page {item.page_number} (x:{item.bounding_box?.x}, y:{item.bounding_box?.y})
                    </td>
                    <td className="py-3 px-3.5">
                      <code className="text-[10px] font-mono text-[var(--neutral-500)]">
                        {item.sha256_source_hash.substring(0, 12)}...
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
