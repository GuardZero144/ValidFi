'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit2, CheckCircle } from 'lucide-react';
import { LoadingButton } from './animations';
import { useCredentialOperation } from '@/hooks/useCredentialOperation';

interface Credential {
  id: string;
  vaccineType: string;
  verificationStatus: boolean;
  vaccinationDate: string;
}

interface CredentialEditModalProps {
  isOpen: boolean;
  credential: Credential | null;
  onSave: (updatedCredential: Credential) => void;
  onClose: () => void;
}

export function CredentialEditModal({
  isOpen,
  credential,
  onSave,
  onClose,
}: CredentialEditModalProps) {
  const [vaccineType, setVaccineType] = useState('');
  const [vaccinationDate, setVaccinationDate] = useState('');
  const { execute, isPending, error, clearError } = useCredentialOperation();

  useEffect(() => {
    if (credential && isOpen) {
      setVaccineType(credential.vaccineType);
      setVaccinationDate(credential.vaccinationDate);
      clearError();
    }
  }, [credential, isOpen, clearError]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credential) return;

    await execute(async () => {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onSave({
        ...credential,
        vaccineType,
        vaccinationDate,
      });
      onClose();
    }, {
      context: 'CredentialEdit',
    });
  }, [credential, vaccineType, vaccinationDate, execute, onSave, onClose]);

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
              <Edit2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
              <h3 className="text-lg sm:text-xl font-bold text-white">Edit Metadata</h3>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm text-gray-400 mb-1">Vaccine Type</label>
                <input
                  type="text"
                  value={vaccineType}
                  onChange={(e) => setVaccineType(e.target.value)}
                  disabled={isPending}
                  className="w-full bg-white/10 border border-white/20 rounded p-3 sm:p-2 text-white outline-none focus:border-green-400 disabled:opacity-50 text-base sm:text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-gray-400 mb-1">Date</label>
                <input
                  type="text"
                  value={vaccinationDate}
                  onChange={(e) => setVaccinationDate(e.target.value)}
                  disabled={isPending}
                  className="w-full bg-white/10 border border-white/20 rounded p-3 sm:p-2 text-white outline-none focus:border-green-400 disabled:opacity-50 text-base sm:text-sm"
                  required
                />
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
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col sm:flex-row justify-end pt-3 sm:pt-4 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isPending}
                  className="px-4 py-3 sm:py-2 bg-white/10 text-white rounded hover:bg-white/20 transition-colors disabled:opacity-50 touch-manipulation order-2 sm:order-1"
                >
                  Cancel
                </button>
                <LoadingButton
                  type="submit"
                  isLoading={isPending}
                  loadingText="Saving..."
                  variant="primary"
                  className="order-1 sm:order-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Save Changes
                </LoadingButton>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
