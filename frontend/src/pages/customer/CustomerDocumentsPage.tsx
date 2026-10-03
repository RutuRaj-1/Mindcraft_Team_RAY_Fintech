import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { DocumentRecord, EvidenceItem, ConsistencyReport } from '../../types';
import { DocumentStatus } from '../../components/fintech/DocumentStatus';
import { EvidenceCard } from '../../components/fintech/EvidenceCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { UploadCloud, FileText, ShieldCheck, Layers, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const CustomerDocumentsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const journeyId = id || 'jrn_priya_001';

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [consistency, setConsistency] = useState<ConsistencyReport | null>(null);
  const [docType, setDocType] = useState('BANK_STATEMENT');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [docs, evi, rep] = await Promise.all([
        api.listDocuments(journeyId).catch(() => []),
        api.getEvidenceLedger(journeyId).catch(() => []),
        api.getConsistencyReport(journeyId).catch(() => null),
      ]);
      setDocuments(docs);
      setEvidence(evi);
      setConsistency(rep);
    } catch (err: any) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [journeyId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setIsUploading(true);
    try {
      await api.uploadDocument(journeyId, docType, file);
      setFile(null);
      await loadData();
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton variant="rect" height={120} />
        <Skeleton variant="rect" height={200} />
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Error Loading Documents" message={error} onRetry={loadData} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[var(--fin-blue-bg)] text-[var(--fin-blue)] border border-[var(--fin-blue)]/30">
            Module 3: Document Intelligence
          </span>
          <span className="text-xs text-[var(--text-muted)]">SHA-256 Provenance & Zero-Tampering Guarantee</span>
        </div>
        <h1 className="text-2xl font-black text-[var(--brand-950)] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Evidence Ingestion & Cryptographic Ledger
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Upload PDF/image statements. FinFlow extracts structured fields, computes SHA-256 hashes, and cross-reconciles records.
        </p>
      </div>

      {/* Upload Zone */}
      <Card variant="bordered" padding="md">
        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-4">
            <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">
              Document Category
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full text-xs font-semibold rounded-xl border border-[var(--border)] p-2.5 bg-white text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-700)] shadow-xs"
            >
              <option value="BANK_STATEMENT">Bank Statement (Last 6 Months)</option>
              <option value="GST_RETURN">GSTR-3B / GSTR-1 Monthly Return</option>
              <option value="ITR">Income Tax Return (ITR-V)</option>
              <option value="PAN">PAN / Business Registration</option>
            </select>
          </div>

          <div className="md:col-span-5">
            <label className="block text-xs font-bold text-[var(--brand-950)] mb-1">
              Select Statement File (PDF / Images)
            </label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
              className="w-full text-xs text-[var(--text-muted)] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[var(--brand-50)] file:text-[var(--brand-700)] cursor-pointer"
            />
          </div>

          <div className="md:col-span-3">
            <Button
              type="submit"
              variant="brutal"
              size="sm"
              disabled={!file}
              isLoading={isUploading}
              leftIcon={<UploadCloud className="w-4 h-4" />}
              className="w-full"
            >
              {isUploading ? 'Extracting via OCR...' : 'Upload & Hash'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Cross-Document Consistency Report */}
      {consistency && (
        <Card variant={consistency.is_consistent ? 'default' : 'brutal'} padding="md">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {consistency.is_consistent ? (
                <CheckCircle2 className="w-5 h-5 text-[var(--fin-green)]" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-[var(--fin-coral)]" />
              )}
              <h3 className="text-sm font-black text-[var(--brand-950)]">
                Cross-Document Reconciliation Consistency Report
              </h3>
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
              consistency.is_consistent
                ? 'bg-[var(--fin-green-bg)] text-[var(--fin-green)] border-[var(--fin-green)]/30'
                : 'bg-[var(--fin-coral-bg)] text-[var(--fin-coral)] border-[var(--fin-coral)]/30'
            }`}>
              {consistency.is_consistent ? '100% RECONCILED' : `${consistency.discrepancies.length} DISCREPANCIES`}
            </span>
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">
            {consistency.summary}
          </p>

          {consistency.discrepancies.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[var(--border)]">
              {consistency.discrepancies.map((d, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-[var(--fin-coral-bg)]/40 border border-[var(--fin-coral)]/30 text-xs">
                  <div className="flex justify-between font-bold text-[var(--fin-coral)] mb-1">
                    <span>Field: {d.field}</span>
                    <span>Variance: {d.variance_pct}%</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-primary)]">
                    {d.doc_a_name}: <strong>₹{Number(d.doc_a_value).toLocaleString('en-IN')}</strong> vs {d.doc_b_name}: <strong>₹{Number(d.doc_b_value).toLocaleString('en-IN')}</strong>
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] italic mt-1">{d.explanation}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Uploaded Documents List */}
      <div className="space-y-3">
        <h3 className="text-sm font-black text-[var(--brand-950)] flex items-center gap-2">
          <FileText className="w-4 h-4 text-[var(--brand-700)]" /> Uploaded Statement Files ({documents.length})
        </h3>
        <div className="space-y-2">
          {documents.map((doc) => (
            <DocumentStatus key={doc.document_id} document={doc} />
          ))}
        </div>
      </div>

      {/* Extracted Evidence Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-black text-[var(--brand-950)] flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[var(--fin-green)]" /> Cryptographic Evidence Ledger ({evidence.length} Verified Anchors)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {evidence.map((item) => (
            <EvidenceCard key={item.evidence_id} evidence={item} />
          ))}
        </div>
      </div>
    </div>
  );
};
