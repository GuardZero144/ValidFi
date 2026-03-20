'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Shield, Clock, CheckCircle, XCircle, Undo2 } from 'lucide-react';
import { useAccessibility } from '@/contexts/AccessibilityContext';

interface Credential {
  id: string;
  vaccineType: string;
  verificationStatus: boolean;
  vaccinationDate: string;
}

interface DeletionConfirmationModalProps {
  isOpen: boolean;
  credential: Credential | null;
  onConfirm: () => void;
  onCancel: () => void;
  onUndo?: () => void;
  deletionStatus: 'idle' | 'deleting' | 'deleted' | 'failed' | 'undoable';
}

export function DeletionConfirmationModal({
  isOpen,
  credential,
  onConfirm,
  onCancel,
  onUndo,
  deletionStatus,
}: DeletionConfirmationModalProps) {
  const [confirmationText, setConfirmationText] = useState('');
  const [undoCountdown, setUndoCountdown] = useState(10);
  const { announceToScreenReader } = useAccessibility();

  const isConfirmEnabled = confirmationText === 'DELETE';

  useEffect(() => {
    if (isOpen) {
      setConfirmationText('');
      setUndoCountdown(10);
      announceToScreenReader('Deletion confirmation dialog opened');
    }
  }, [isOpen, announceToScreenReader]);

  useEffect(() => {
    if (deletionStatus === 'undoable' && undoCountdown > 0) {
      const timer = setTimeout(() => {
        setUndoCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [deletionStatus, undoCountdown]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    },
    [onCancel]
  );

  if (!credential) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          aria-labelledby="deletion-modal-title"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
          />

          {/* Modal content */}
          <motion.div
            className="relative bg-gradient-to-br from-gray-900 to-gray-800 border border-red-500/30 rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 max-w-md w-full mx-0 sm:mx-4 shadow-2xl max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: -10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
              </div>
              <h3 id="deletion-modal-title" className="text-lg sm:text-xl font-bold text-white">
                Delete Credential
              </h3>
            </div>

            {/* Credential details */}
            <div className="bg-white/5 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
              <div className="flex items-center gap-3 mb-2 sm:mb-3">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                <span className="text-white font-medium text-sm sm:text-base">{credential.vaccineType}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                <div className="text-gray-400">Status:</div>
                <div className={credential.verificationStatus ? 'text-green-400' : 'text-yellow-400'}>
                  {credential.verificationStatus ? 'Verified' : 'Pending'}
                </div>
                <div className="text-gray-400">Date:</div>
                <div className="text-white">{credential.vaccinationDate}</div>
                <div className="text-gray-400">ID:</div>
                <div className="text-gray-300 font-mono text-xs">{credential.id.slice(0, 8)}...</div>
              </div>
            </div>

            {/* Consequences */}
            <div className="mb-3 sm:mb-4">
              <h4 className="text-xs sm:text-sm font-semibold text-red-400 mb-2">Warning: This action will:</h4>
              <ul className="text-xs sm:text-sm text-gray-300 space-y-1">
                <li className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  Remove the credential from your vault
                </li>
                <li className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  Invalidate any active verifications
                </li>
                <li className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  Delete the encrypted data from IPFS
                </li>
                <li className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  Record the deletion on the blockchain
                </li>
              </ul>
            </div>

            {/* Confirmation input */}
            {deletionStatus === 'idle' && (
              <div className="mb-3 sm:mb-4">
                <label htmlFor="confirm-delete" className="block text-xs sm:text-sm text-gray-400 mb-2">
                  Type <span className="font-mono text-red-400">DELETE</span> to confirm:
                </label>
                <input
                  id="confirm-delete"
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  className="w-full px-3 sm:px-4 py-3 sm:py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors text-base sm:text-sm"
                  placeholder="Type DELETE"
                  autoFocus
                  aria-describedby="confirm-delete-hint"
                />
                <p id="confirm-delete-hint" className="text-xs text-gray-500 mt-1">
                  This action cannot be undone after the undo period expires.
                </p>
              </div>
            )}

            {/* Deletion status */}
            {deletionStatus === 'deleting' && (
              <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 animate-spin" />
                  <div>
                    <p className="text-white font-medium text-sm sm:text-base">Deleting credential...</p>
                    <p className="text-xs sm:text-sm text-gray-400">Please wait while we process your request</p>
                  </div>
                </div>
              </div>
            )}

            {deletionStatus === 'deleted' && (
              <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                  <div>
                    <p className="text-white font-medium text-sm sm:text-base">Credential deleted</p>
                    <p className="text-xs sm:text-sm text-gray-400">The credential has been permanently removed</p>
                  </div>
                </div>
              </div>
            )}

            {deletionStatus === 'failed' && (
              <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
                  <div>
                    <p className="text-white font-medium text-sm sm:text-base">Deletion failed</p>
                    <p className="text-xs sm:text-sm text-gray-400">An error occurred while deleting the credential</p>
                  </div>
                </div>
              </div>
            )}

            {deletionStatus === 'undoable' && (
              <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Undo2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                  <div>
                    <p className="text-white font-medium text-sm sm:text-base">Credential deleted</p>
                    <p className="text-xs sm:text-sm text-gray-400">
                      You can undo this action within {undoCountdown} seconds
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-blue-500"
                      initial={{ width: '100%' }}
                      animate={{ width: '0%' }}
                      transition={{ duration: 10, ease: 'linear' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
              {deletionStatus === 'undoable' && undoCountdown > 0 ? (
                <>
                  <button
                    onClick={onUndo}
                    className="px-4 py-3 sm:py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg transition-colors flex items-center justify-center gap-2 touch-manipulation order-1 sm:order-none"
                  >
                    <Undo2 className="w-4 h-4" />
                    Undo Delete
                  </button>
                  <button
                    onClick={onCancel}
                    className="px-4 py-3 sm:py-2 bg-white/10 hover:bg-white/20 active:bg-white/30 text-gray-300 rounded-lg transition-colors touch-manipulation order-2 sm:order-none"
                  >
                    Close
                  </button>
                </>
              ) : deletionStatus === 'idle' ? (
                <>
                  <button
                    onClick={onCancel}
                    className="px-4 py-3 sm:py-2 bg-white/10 hover:bg-white/20 active:bg-white/30 text-gray-300 rounded-lg transition-colors touch-manipulation order-2 sm:order-none"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onConfirm}
                    disabled={!isConfirmEnabled}
                    className={`px-4 py-3 sm:py-2 rounded-lg transition-colors flex items-center justify-center gap-2 touch-manipulation order-1 sm:order-none ${
                      isConfirmEnabled
                        ? 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    Delete Permanently
                  </button>
                </>
              ) : (
                <button
                  onClick={onCancel}
                  className="px-4 py-3 sm:py-2 bg-white/10 hover:bg-white/20 active:bg-white/30 text-gray-300 rounded-lg transition-colors touch-manipulation"
                >
                  Close
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
