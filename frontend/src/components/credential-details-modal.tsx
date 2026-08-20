'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Calendar } from 'lucide-react';

interface Credential {
  id: string;
  vaccineType: string;
  verificationStatus: boolean;
  vaccinationDate: string;
}

interface CredentialDetailsModalProps {
  isOpen: boolean;
  credential: Credential | null;
  onClose: () => void;
}

export function CredentialDetailsModal({
  isOpen,
  credential,
  onClose,
}: CredentialDetailsModalProps) {
  if (!credential) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="relative bg-gradient-to-br from-gray-900 to-gray-800 border border-green-500/30 rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 max-w-md w-full mx-0 sm:mx-4 shadow-2xl max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: -10, opacity: 0 }}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-white transition-colors p-2 -m-2 touch-manipulation"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
              <h3 className="text-lg sm:text-xl font-bold text-white">Credential Details</h3>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="text-xs sm:text-sm text-gray-400">Vaccine Type</label>
                <div className="text-white font-medium text-base sm:text-lg">{credential.vaccineType}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs sm:text-sm text-gray-400">Status</label>
                  <div className={`font-medium ${credential.verificationStatus ? 'text-green-400' : 'text-yellow-400'}`}>
                    {credential.verificationStatus ? 'Verified' : 'Pending'}
                  </div>
                </div>
                <div>
                  <label className="text-xs sm:text-sm text-gray-400">Date</label>
                  <div className="text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {credential.vaccinationDate}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs sm:text-sm text-gray-400">Credential ID</label>
                <div className="text-gray-300 font-mono text-xs sm:text-sm break-all bg-white/5 p-2 rounded">
                  {credential.id}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
