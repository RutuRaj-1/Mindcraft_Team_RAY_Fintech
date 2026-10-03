import React, { useState } from 'react';
import { api } from '../../api/client';
import { DocumentRecord, EvidenceItem } from '../../types';
import { UploadCloud, FileText, CheckCircle2, ShieldCheck, Hash, Eye, AlertCircle } from 'lucide-react';

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
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);

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
      <div className="bg-white rounded-2xl p-6 border border-[#E3ECE9] shadow-xs">
        <h3 className="text-base font-bold text-[#123E40] mb-1">
          Document Intelligence & Evidence Provenance
        </h3>
        <p className="text-xs text-[#687A75] mb-4">
          Upload PDF or image statements. FinFlow extracts structured fields, computes SHA-256 immutability hashes, and anchors provenance.
        </p>

        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-[#40524E] mb-1">
              Document Category
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full text-xs rounded-xl border border-[#CBD9D5] p-2.5 bg-white text-[#172825] focus:outline-none focus:border-[#237277]"
            >
              <option value="BANK_STATEMENT">Bank Statement (Last 6 Months)</option>
              <option value="GST_RETURN">GSTR-3B / GSTR-1 Monthly Return</option>
              <option value="ITR">Income Tax Return (ITR-V)</option>
              <option value="PAN">PAN / Business Registration</option>
            </select>
          </div>

          <div className="md:col-span-5">
            <label className="block text-xs font-semibold text-[#40524E] mb-1">
              Select Statement File (PDF / Images)
            </label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
              className="w-full text-xs text-[#687A75] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#EEF8F7] file:text-[#237277] hover:file:bg-[#D9F0EE] cursor-pointer"
            />
          </div>

          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={!file || isUploading}
              className="w-full py-2.5 px-4 bg-[#237277] hover:bg-[#18575A] text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isUploading ? 'Extracting via OCR...' : 'Upload & Extract'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Uploaded Documents List */}
      <div className="bg-white rounded-2xl p-6 border border-[#E3ECE9] shadow-xs">
        <h4 className="text-sm font-bold text-[#123E40] mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#237277]" /> Verified Ingestion Records ({documents.length})
        </h4>

        {documents.length === 0 ? (
          <p className="text-xs text-[#687A75]">No documents uploaded yet for this application.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7FAF9] text-[#687A75] border-b border-[#E3ECE9]">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Document Name</th>
                  <th className="py-2.5 px-3 font-semibold">Type</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold">SHA-256 Provenance Fingerprint</th>
                  <th className="py-2.5 px-3 font-semibold">Fields Extracted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3ECE9]">
                {documents.map((d) => (
                  <tr key={d.document_id} className="hover:bg-[#F7FAF9]/60">
                    <td className="py-2.5 px-3 font-medium text-[#172825]">{d.file_name}</td>
                    <td className="py-2.5 px-3 text-[#40524E]">{d.doc_type}</td>
                    <td className="py-2.5 px-3">
                      <span className="bg-[#E8F7F1] text-[#169C73] text-[11px] font-semibold px-2 py-0.5 rounded-full border border-[#169C73]/20 flex items-center gap-1 w-max">
                        <CheckCircle2 className="w-3 h-3" /> {d.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#687A75] font-mono text-[10px]">
                      <span className="bg-[#EFF5F3] px-1.5 py-0.5 rounded border border-[#CBD9D5]" title={d.sha256_hash}>
                        {d.sha256_hash.substring(0, 16)}...
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#237277] font-semibold">{d.extracted_fields_count} fields</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Structured Evidence Ledger */}
      <div className="bg-white rounded-2xl p-6 border border-[#E3ECE9] shadow-xs">
        <h4 className="text-sm font-bold text-[#123E40] mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#169C73]" /> Cryptographic Evidence Ledger ({evidence.length} Fields)
        </h4>

        {evidence.length === 0 ? (
          <p className="text-xs text-[#687A75]">No evidence items generated yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7FAF9] text-[#687A75] border-b border-[#E3ECE9]">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Evidence Field</th>
                  <th className="py-2.5 px-3 font-semibold">Extracted Value</th>
                  <th className="py-2.5 px-3 font-semibold">Confidence</th>
                  <th className="py-2.5 px-3 font-semibold">Page & Bounding Box</th>
                  <th className="py-2.5 px-3 font-semibold">Source Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3ECE9]">
                {evidence.map((item) => (
                  <tr key={item.evidence_id} className="hover:bg-[#F7FAF9]/60">
                    <td className="py-2.5 px-3 font-medium text-[#123E40]">{item.field_name}</td>
                    <td className="py-2.5 px-3 font-semibold text-[#172825]">
                      {typeof item.field_value === 'number' && item.field_value > 1000
                        ? `₹${item.field_value.toLocaleString('en-IN')}`
                        : String(item.field_value)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        item.confidence >= 0.95 ? 'bg-[#E8F7F1] text-[#169C73]' : 'bg-[#FFF6DF] text-[#D89B22]'
                      }`}>
                        {(item.confidence * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#687A75] text-[11px]">
                      P.{item.page_number} (x:{item.bounding_box?.x}, y:{item.bounding_box?.y})
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-[#687A75]">
                      {item.sha256_source_hash.substring(0, 12)}...
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
