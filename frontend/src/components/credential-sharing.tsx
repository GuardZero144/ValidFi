'use client';

import { useState, useCallback, useRef } from 'react';
import { Share2, Lock, Clock, X, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedProgress, SuccessOverlay, SuccessToast } from './animations';
import { useAccessibility } from '@/contexts/AccessibilityContext';

interface CredentialSharingProps {
  walletAddress: string;
}

interface SharedCredential {
  id: string;
  vaccineType: string;
  recipient: string;
  expiresAt: string;
}

export function CredentialSharing({ walletAddress }: CredentialSharingProps) {
  const [sharedCredentials, setSharedCredentials] = useState<SharedCredential[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [shareProgress, setShareProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; title: string; description?: string }>({
    show: false,
    title: '',
  });
  const { announceToScreenReader } = useAccessibility();
  const shareButtonRef = useRef<HTMLButtonElement>(null);

  const handleShare = useCallback(() => {
    if (isSharing) return;
    setIsSharing(true);
    setShareProgress(0);
    announceToScreenReader('Generating zero-knowledge proof...');

    const stages = [
      { progress: 15, delay: 400 },
      { progress: 35, delay: 800 },
      { progress: 60, delay: 1200 },
      { progress: 85, delay: 1600 },
      { progress: 100, delay: 2000 },
    ];

    stages.forEach(({ progress, delay }) => {
      setTimeout(() => setShareProgress(progress), delay);
    });

    setTimeout(() => {
      setIsSharing(false);
      setShowSuccess(true);
      announceToScreenReader('Proof generated successfully');

      const newShare: SharedCredential = {
        id: crypto.randomUUID(),
        vaccineType: 'COVID-19 Vaccination',
        recipient: 'GABCDEF123456...',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };
      setSharedCredentials((prev) => [...prev, newShare]);
    }, 2400);
  }, [isSharing, announceToScreenReader]);

  const handleRevoke = useCallback(
    (id: string, vaccineType: string) => {
      setSharedCredentials((prev) => prev.filter((c) => c.id !== id));
      setToast({
        show: true,
        title: 'Access Revoked',
        description: 'The shared proof has been invalidated',
      });
      announceToScreenReader(`Revoked access for ${vaccineType}`);
      setTimeout(() => setToast((t) => ({ ...t, show: false })), 3000);
    },
    [announceToScreenReader]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, action: () => void) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        action();
      }
    },
    []
  );

  return (
    <div role="region" aria-labelledby="sharing-heading">
      <h2 id="sharing-heading" className="text-2xl font-bold text-white mb-6">
        Credential Sharing
      </h2>

      {/* Share form */}
      <div className="bg-white/10 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Share Vaccination Proof</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleShare();
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="recipient-address" className="block text-green-200 text-sm mb-2">
              Recipient Wallet Address
            </label>
            <input
              id="recipient-address"
              type="text"
              placeholder="G..."
              disabled={isSharing}
              aria-required="true"
              aria-describedby="recipient-help"
              className="w-full bg-white/10 border border-green-400 rounded-lg px-4 py-2 text-white placeholder-green-300 focus:outline-none focus:border-green-300 disabled:opacity-50"
            />
            <p id="recipient-help" className="text-xs text-green-300 mt-1">
              Enter the Stellar wallet address of the recipient
            </p>
          </div>
          <div>
            <label htmlFor="credential-select" className="block text-green-200 text-sm mb-2">
              Select Vaccination Credential
            </label>
            <select
              id="credential-select"
              disabled={isSharing}
              aria-required="true"
              className="w-full bg-white/10 border border-green-400 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-300 disabled:opacity-50"
            >
              <option value="">Choose a credential...</option>
            </select>
          </div>
          <div>
            <label htmlFor="duration-select" className="block text-green-200 text-sm mb-2">
              Proof Duration
            </label>
            <select
              id="duration-select"
              disabled={isSharing}
              className="w-full bg-white/10 border border-green-400 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-300 disabled:opacity-50"
            >
              <option value="3600">1 hour</option>
              <option value="86400">1 day</option>
              <option value="604800">1 week</option>
              <option value="2592000">1 month</option>
            </select>
          </div>

          {/* Progress indicator during sharing */}
          <AnimatePresence>
            {isSharing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                role="progressbar"
                aria-valuenow={shareProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Proof generation progress: ${shareProgress}%`}
              >
                <AnimatedProgress progress={shareProgress} label="Generating zero-knowledge proof" />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            ref={shareButtonRef}
            type="submit"
            className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              isSharing
                ? 'bg-green-600/50 cursor-not-allowed text-white/70'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
            disabled={isSharing}
            aria-busy={isSharing}
            aria-label={isSharing ? 'Generating zero-knowledge proof' : 'Share vaccination proof'}
            whileHover={isSharing ? {} : { scale: 1.01 }}
            whileTap={isSharing ? {} : { scale: 0.99 }}
          >
            <Share2 className="w-5 h-5" aria-hidden="true" />
            {isSharing ? 'Generating Proof...' : 'Share Vaccination Proof'}
          </motion.button>
        </form>
      </div>

      {/* Shared credentials list */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white mb-4">Shared Credentials</h3>
        <div role="list" aria-label="Shared credentials">
          <AnimatePresence mode="popLayout">
            {sharedCredentials.length === 0 ? (
              <motion.div
                key="empty"
                className="text-center py-8 text-green-200"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                role="status"
              >
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
                <p>No credentials shared yet</p>
              </motion.div>
            ) : (
              sharedCredentials.map((share, index) => (
                <motion.div
                  key={share.id}
                  className="bg-white/10 rounded-lg p-4 flex items-center justify-between"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -30, scale: 0.95 }}
                  transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
                  layout
                  role="listitem"
                  aria-label={`${share.vaccineType} shared with ${share.recipient}, expires ${new Date(share.expiresAt).toLocaleString()}`}
                >
                  <div className="flex items-center gap-4">
                    <Lock className="w-8 h-8 text-green-400" aria-hidden="true" />
                    <div>
                      <p className="text-white font-medium">{share.vaccineType}</p>
                      <p className="text-green-200 text-sm">Shared with: {share.recipient}</p>
                      <p className="text-green-200 text-sm flex items-center gap-1">
                        <Clock className="w-4 h-4" aria-hidden="true" />
                        Expires: {new Date(share.expiresAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    className="text-red-400 hover:text-red-300 transition-colors"
                    onClick={() => handleRevoke(share.id, share.vaccineType)}
                    onKeyDown={(e) =>
                      handleKeyDown(e, () => handleRevoke(share.id, share.vaccineType))
                    }
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    aria-label={`Revoke access for ${share.vaccineType}`}
                  >
                    <X className="w-5 h-5" aria-hidden="true" />
                  </motion.button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Success overlay */}
      <SuccessOverlay show={showSuccess} variant="share" onDismiss={() => setShowSuccess(false)} />

      {/* Toast notification */}
      <SuccessToast
        show={toast.show}
        title={toast.title}
        description={toast.description}
        onDismiss={() => setToast((t) => ({ ...t, show: false }))}
      />
    </div>
  );
}
