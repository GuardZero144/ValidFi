'use client';

import { useState, useCallback, useRef } from 'react';
import { Shield, FileText, Calendar, Clock, CheckCircle, Copy, Download, Share2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SuccessCheckmark } from './animations/success-checkmark';
import { LoadingSpinner } from './loading/loading-spinner';
import { useAccessibility } from '@/contexts/AccessibilityContext';

interface Credential {
  id: string;
  vaccineType: string;
  verificationStatus: boolean;
  vaccinationDate: string;
}

interface GeneratedProof {
  id: string;
  credentialId: string;
  vaccineType: string;
  parameters: ProofParameters;
  status: 'generating' | 'valid' | 'expired';
  createdAt: string;
  expiresAt: string;
  verificationHash: string;
}

interface ProofParameters {
  duration: number;
  includeIssuer: boolean;
  includeDate: boolean;
  verificationLevel: 'basic' | 'advanced' | 'full';
}

const DURATION_OPTIONS = [
  { value: 3600, label: '1 hour' },
  { value: 86400, label: '1 day' },
  { value: 604800, label: '1 week' },
  { value: 2592000, label: '1 month' },
  { value: 31536000, label: '1 year' },
];

const VERIFICATION_LEVELS = [
  { value: 'basic' as const, label: 'Basic', description: 'Status only' },
  { value: 'advanced' as const, label: 'Advanced', description: 'Status + issuer' },
  { value: 'full' as const, label: 'Full', description: 'All credential data' },
];

interface VaccinationProofGeneratorProps {
  walletAddress: string;
  credentials?: Credential[];
}

export function VaccinationProofGenerator({ walletAddress, credentials = [] }: VaccinationProofGeneratorProps) {
  const [selectedCredentialId, setSelectedCredentialId] = useState('');
  const [parameters, setParameters] = useState<ProofParameters>({
    duration: 86400,
    includeIssuer: true,
    includeDate: true,
    verificationLevel: 'basic',
  });
  const [generatedProof, setGeneratedProof] = useState<GeneratedProof | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { announceToScreenReader } = useAccessibility();
  const proofRef = useRef<HTMLDivElement>(null);

  const selectedCredential = credentials.find((c) => c.id === selectedCredentialId);

  const handleGenerate = useCallback(async () => {
    if (!selectedCredentialId || isGenerating) return;
    setIsGenerating(true);
    setError(null);
    setGeneratedProof(null);
    announceToScreenReader('Generating vaccination proof...');

    try {
      // Simulate async proof generation
      await new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          // 5% chance of failure for demo
          if (Math.random() < 0.05) {
            reject(new Error('Proof generation failed. Please try again.'));
            return;
          }

          const now = Date.now();
          const proof: GeneratedProof = {
            id: crypto.randomUUID(),
            credentialId: selectedCredentialId,
            vaccineType: selectedCredential?.vaccineType || 'Unknown',
            parameters: { ...parameters },
            status: 'valid',
            createdAt: new Date(now).toISOString(),
            expiresAt: new Date(now + parameters.duration * 1000).toISOString(),
            verificationHash: Array.from({ length: 64 }, () =>
              Math.floor(Math.random() * 16).toString(16)
            ).join(''),
          };
          setGeneratedProof(proof);
          announceToScreenReader('Proof generated successfully');
          resolve();
        }, 1500);
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Proof generation failed';
      setError(message);
      announceToScreenReader(message);
    } finally {
      setIsGenerating(false);
    }
  }, [selectedCredentialId, selectedCredential, parameters, isGenerating, announceToScreenReader]);

  const handleCopyHash = useCallback(() => {
    if (generatedProof) {
      navigator.clipboard.writeText(generatedProof.verificationHash).then(() => {
        setCopied(true);
        announceToScreenReader('Verification hash copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }, [generatedProof, announceToScreenReader]);

  const handleDownload = useCallback(() => {
    if (!generatedProof) return;
    const proofData = JSON.stringify(generatedProof, null, 2);
    const blob = new Blob([proofData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vaccination-proof-${generatedProof.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    announceToScreenReader('Proof downloaded');
  }, [generatedProof, announceToScreenReader]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, action: () => void) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        action();
      }
    },
    []
  );

  const formatDate = (iso: string) => new Date(iso).toLocaleString();
  const getTimeRemaining = (expiresAt: string) => {
    const remaining = new Date(expiresAt).getTime() - Date.now();
    if (remaining <= 0) return 'Expired';
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    return `${hours}h ${minutes}m remaining`;
  };

  return (
    <div role="region" aria-labelledby="proof-heading">
      <h2 id="proof-heading" className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">
        Vaccination Proof Generator
      </h2>

      {/* Proof form */}
      <div className="bg-white/10 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Generate Proof</h3>

        <div className="space-y-3 sm:space-y-4">
          {/* Credential selection */}
          <div>
            <label htmlFor="proof-credential" className="block text-green-200 text-xs sm:text-sm mb-1 sm:mb-2">
              Select Vaccination Credential
            </label>
            <select
              id="proof-credential"
              value={selectedCredentialId}
              onChange={(e) => setSelectedCredentialId(e.target.value)}
              disabled={isGenerating}
              className="w-full bg-white/10 border border-green-400 rounded-lg px-3 sm:px-4 py-3 sm:py-2 text-white focus:outline-none focus:border-green-300 disabled:opacity-50 text-base sm:text-sm"
              aria-required="true"
            >
              <option value="">Choose a credential...</option>
              {credentials.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.vaccineType} — {c.verificationStatus ? 'Verified' : 'Pending'}
                </option>
              ))}
            </select>
            {credentials.length === 0 && (
              <p className="text-xs text-yellow-300 mt-1">
                No credentials available. Upload a vaccination record first.
              </p>
            )}
          </div>

          {/* Parameter configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label htmlFor="proof-duration" className="block text-green-200 text-xs sm:text-sm mb-1 sm:mb-2">
                Proof Duration
              </label>
              <select
                id="proof-duration"
                value={parameters.duration}
                onChange={(e) => setParameters({ ...parameters, duration: Number(e.target.value) })}
                disabled={isGenerating}
                className="w-full bg-white/10 border border-green-400 rounded-lg px-3 sm:px-4 py-3 sm:py-2 text-white focus:outline-none focus:border-green-300 disabled:opacity-50 text-base sm:text-sm"
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="proof-level" className="block text-green-200 text-xs sm:text-sm mb-1 sm:mb-2">
                Verification Level
              </label>
              <select
                id="proof-level"
                value={parameters.verificationLevel}
                onChange={(e) =>
                  setParameters({
                    ...parameters,
                    verificationLevel: e.target.value as ProofParameters['verificationLevel'],
                  })
                }
                disabled={isGenerating}
                className="w-full bg-white/10 border border-green-400 rounded-lg px-3 sm:px-4 py-3 sm:py-2 text-white focus:outline-none focus:border-green-300 disabled:opacity-50 text-base sm:text-sm"
              >
                {VERIFICATION_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label} — {level.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Toggle options */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-3 cursor-pointer touch-manipulation">
              <input
                type="checkbox"
                checked={parameters.includeIssuer}
                onChange={(e) => setParameters({ ...parameters, includeIssuer: e.target.checked })}
                disabled={isGenerating}
                className="w-4 h-4 rounded border-green-400 text-green-500 focus:ring-green-500 disabled:opacity-50"
              />
              <span className="text-green-200 text-sm">Include issuer information</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer touch-manipulation">
              <input
                type="checkbox"
                checked={parameters.includeDate}
                onChange={(e) => setParameters({ ...parameters, includeDate: e.target.checked })}
                disabled={isGenerating}
                className="w-4 h-4 rounded border-green-400 text-green-500 focus:ring-green-500 disabled:opacity-50"
              />
              <span className="text-green-200 text-sm">Include vaccination date</span>
            </label>
          </div>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-200 text-sm"
                role="alert"
              >
                <p>{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generate button */}
          <motion.button
            onClick={handleGenerate}
            disabled={!selectedCredentialId || isGenerating}
            className={`w-full py-3 sm:py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 touch-manipulation ${
              !selectedCredentialId || isGenerating
                ? 'bg-green-600/50 cursor-not-allowed text-white/70'
                : 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white'
            }`}
            aria-busy={isGenerating}
            aria-label={isGenerating ? 'Generating proof...' : 'Generate vaccination proof'}
            whileHover={!selectedCredentialId || isGenerating ? {} : { scale: 1.01 }}
            whileTap={!selectedCredentialId || isGenerating ? {} : { scale: 0.99 }}
          >
            {isGenerating ? (
              <LoadingSpinner size="sm" label="Generating Proof..." />
            ) : (
              <>
                <FileText className="w-5 h-5" />
                Generate Proof
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Generated proof display */}
      <AnimatePresence>
        {generatedProof && (
          <motion.div
            ref={proofRef}
            className="bg-white/10 rounded-lg p-4 sm:p-6 border border-green-500/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            role="region"
            aria-label="Generated proof"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                <SuccessCheckmark />
                <span>Proof Generated</span>
              </h3>
              <span className="text-xs text-green-300 bg-green-500/20 px-2 py-1 rounded-full">
                {generatedProof.status === 'valid' ? 'Valid' : 'Expired'}
              </span>
            </div>

            {/* Proof details */}
            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-lg p-3">
                  <label className="text-xs text-gray-400">Vaccine Type</label>
                  <p className="text-white font-medium text-sm">{generatedProof.vaccineType}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <label className="text-xs text-gray-400">Verification Level</label>
                  <p className="text-white font-medium text-sm capitalize">
                    {generatedProof.parameters.verificationLevel}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <label className="text-xs text-gray-400">Created</label>
                  <p className="text-white text-sm flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    {formatDate(generatedProof.createdAt)}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <label className="text-xs text-gray-400">Expires</label>
                  <p className="text-white text-sm flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    {formatDate(generatedProof.expiresAt)}
                  </p>
                </div>
              </div>

              {/* Verification hash */}
              <div className="bg-white/5 rounded-lg p-3">
                <label className="text-xs text-gray-400 mb-1 block">Verification Hash</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-green-300 font-mono break-all bg-black/20 rounded p-2">
                    {generatedProof.verificationHash}
                  </code>
                  <button
                    onClick={handleCopyHash}
                    onKeyDown={(e) => handleKeyDown(e, handleCopyHash)}
                    className="p-2 text-gray-400 hover:text-green-400 transition-colors touch-manipulation"
                    aria-label={copied ? 'Copied' : 'Copy verification hash'}
                  >
                    {copied ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Parameters config display */}
              <div className="bg-white/5 rounded-lg p-3">
                <label className="text-xs text-gray-400 mb-1 block">Proof Parameters</label>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
                    {generatedProof.parameters.includeIssuer ? 'Includes issuer' : 'No issuer'}
                  </span>
                  <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
                    {generatedProof.parameters.includeDate ? 'Includes date' : 'No date'}
                  </span>
                  <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
                    {getTimeRemaining(generatedProof.expiresAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-lg transition-colors touch-manipulation"
                aria-label="Download proof as JSON"
              >
                <Download className="w-4 h-4" />
                Download Proof
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-lg transition-colors border border-white/20 touch-manipulation"
                aria-label="Share proof"
              >
                <Share2 className="w-4 h-4" />
                Share Proof
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { VaccinationProofGenerator as default };