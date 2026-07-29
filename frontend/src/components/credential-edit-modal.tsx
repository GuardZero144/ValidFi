'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit2, CheckCircle } from 'lucide-react';

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

  useEffect(() => {
    if (credential && isOpen) {
      setVaccineType(credential.vaccineType);
      setVaccinationDate(credential.vaccinationDate);
    }
  }, [credential, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (credential) {
      onSave({
        ...credential,
        vaccineType,
        vaccinationDate,
      });
      onClose();
    }
  };

  if (!credential) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
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
            className="relative bg-gradient-to-br from-gray-900 to-gray-800 border border-green-500/30 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: -10, opacity: 0 }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <Edit2 className="w-6 h-6 text-green-400" />
              <h3 className="text-xl font-bold text-white">Edit Metadata</h3>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Vaccine Type</label>
                <input
                  type="text"
                  value={vaccineType}
                  onChange={(e) => setVaccineType(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded p-2 text-white outline-none focus:border-green-400"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Date</label>
                <input
                  type="text"
                  value={vaccinationDate}
                  onChange={(e) => setVaccinationDate(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded p-2 text-white outline-none focus:border-green-400"
                  required
                />
              </div>
              
              <div className="flex justify-end pt-4 gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-white/10 text-white rounded hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
