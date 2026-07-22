'use client';

import { useState, useCallback } from 'react';
import { Share2, Lock, Clock, X, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedProgress, SuccessOverlay, SuccessToast } from './animations';

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

  const handleShare = useCallback(() => {
    setIsSharing(true);
    setShareProgress(0);

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

      const newShare: SharedCredential = {
        id: crypto.randomUUID(),
        vaccineType: 'COVID-19 Vaccination',
        recipient: 'GABCDEF123456...',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };
      setSharedCredentials((prev) => [...prev, newShare]);
    }, 2400);
  }, []);

  const handleRevoke = useCallback(
    (id: string) => {
      setSharedCredentials((prev) => prev.filter((c) => c.id !== id));
      setToast({
        show: true,
        title: 'Access Revoked',
        description: 'The shared proof has been invalidated',
      });
      setTimeout(() => setToast((t) => ({ ...t, show: false })), 3000);
    },
    [],
  );

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Credential Sharing</h2>

      {/* Share form */}
      <div className="bg-white/10 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Share Vaccination Proof</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-green-200 text-sm mb-2">Recipient Wallet Address</label>
            <input
              type="text"
              placeholder="G..."
              disabled={isSharing}
              className="w-full bg-white/10 border border-green-400 rounded-lg px-4 py-2 text-white placeholder-green-300 focus:outline-none focus:border-green-300 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-green-200 text-sm mb-2">Select Vaccination Credential</label>
            <select
              disabled={isSharing}
              className="w-full bg-white/10 border border-green-400 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-300 disabled:opacity-50"
            >
              <option value="">Choose a credential...</option>
            </select>
          </div>
          <div>
            <label className="block text-green-200 text-sm mb-2">Proof Duration</label>
            <select
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
              >
                <AnimatedProgress progress={shareProgress} label="Generating zero-knowledge proof" />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              isSharing
                ? 'bg-green-600/50 cursor-not-allowed text-white/70'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
            onClick={handleShare}
            disabled={isSharing}
            whileHover={isSharing ? {} : { scale: 1.01 }}
            whileTap={isSharing ? {} : { scale: 0.99 }}
          >
            <Share2 className="w-5 h-5" />
            {isSharing ? 'Generating Proof...' : 'Share Vaccination Proof'}
          </motion.button>
        </div>
      </div>

      {/* Shared credentials list */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white mb-4">Shared Credentials</h3>
        <AnimatePresence mode="popLayout">
          {sharedCredentials.length === 0 ? (
            <motion.div
              key="empty"
              className="text-center py-8 text-green-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
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
              >
                <div className="flex items-center gap-4">
                  <Lock className="w-8 h-8 text-green-400" />
                  <div>
                    <p className="text-white font-medium">{share.vaccineType}</p>
                    <p className="text-green-200 text-sm">
                      Shared with: {share.recipient}
                    </p>
                    <p className="text-green-200 text-sm flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Expires: {new Date(share.expiresAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <motion.button
                  className="text-red-400 hover:text-red-300 transition-colors"
                  onClick={() => handleRevoke(share.id)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Success overlay */}
      <SuccessOverlay
        show={showSuccess}
        variant="share"
        onDismiss={() => setShowSuccess(false)}
      />

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
