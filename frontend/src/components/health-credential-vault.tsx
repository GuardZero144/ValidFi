'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { Upload, Shield, Trash2, Syringe, Eye, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedProgress, SuccessOverlay, SuccessToast } from './animations';
import { DeletionConfirmationModal } from './deletion-confirmation-modal';
import { CredentialDetailsModal } from './credential-details-modal';
import { CredentialEditModal } from './credential-edit-modal';
import { useAccessibility } from '@/contexts/AccessibilityContext';

interface HealthCredentialVaultProps {
  walletAddress: string;
}

interface Credential {
  id: string;
  vaccineType: string;
  verificationStatus: boolean;
  vaccinationDate: string;
}

export function HealthCredentialVault({ walletAddress }: HealthCredentialVaultProps) {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; title: string; description?: string }>({
    show: false,
    title: '',
  });
  const [isDeletionModalOpen, setIsDeletionModalOpen] = useState(false);
  const [credentialToDelete, setCredentialToDelete] = useState<Credential | null>(null);
  
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);
  
  const [deletionStatus, setDeletionStatus] = useState<'idle' | 'deleting' | 'deleted' | 'failed' | 'undoable'>('idle');
  const { announceToScreenReader } = useAccessibility();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const simulateUpload = useCallback((fileName: string) => {
    setUploadProgress(0);
    announceToScreenReader('Uploading file...');

    const steps = [
      { progress: 20, delay: 300 },
      { progress: 45, delay: 600 },
      { progress: 70, delay: 900 },
      { progress: 90, delay: 1200 },
      { progress: 100, delay: 1500 },
    ];

    steps.forEach(({ progress, delay }) => {
      setTimeout(() => setUploadProgress(progress), delay);
    });

    setTimeout(() => {
      setUploadProgress(null);
      setShowSuccess(true);
      announceToScreenReader('File uploaded successfully');

      const newCredential: Credential = {
        id: crypto.randomUUID(),
        vaccineType: fileName.replace(/\.[^/.]+$/, ''),
        verificationStatus: false,
        vaccinationDate: new Date().toLocaleDateString(),
      };
      setCredentials((prev) => [...prev, newCredential]);
    }, 2000);
  }, [announceToScreenReader]);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      simulateUpload(file.name);
    },
    [simulateUpload]
  );

  const handleDelete = useCallback(
    (credential: Credential) => {
      setCredentialToDelete(credential);
      setIsDeletionModalOpen(true);
      setDeletionStatus('idle');
    },
    []
  );

  const handleConfirmDelete = useCallback(() => {
    if (!credentialToDelete) return;

    setDeletionStatus('deleting');
    announceToScreenReader('Deleting credential...');

    setTimeout(() => {
      setCredentials((prev) => prev.filter((c) => c.id !== credentialToDelete.id));
      setDeletionStatus('undoable');
      announceToScreenReader('Credential deleted. You have 10 seconds to undo.');
    }, 1500);
  }, [credentialToDelete, announceToScreenReader]);

  const handleUndoDelete = useCallback(() => {
    if (!credentialToDelete) return;

    setCredentials((prev) => [...prev, credentialToDelete]);
    setDeletionStatus('deleted');
    setToast({
      show: true,
      title: 'Deletion Undone',
      description: 'The credential has been restored to your vault',
    });
    announceToScreenReader('Credential restored');
    setTimeout(() => {
      setIsDeletionModalOpen(false);
      setDeletionStatus('idle');
      setToast((t) => ({ ...t, show: false }));
    }, 2000);
  }, [credentialToDelete, announceToScreenReader]);

  const handleCancelDelete = useCallback(() => {
    setIsDeletionModalOpen(false);
    setCredentialToDelete(null);
    setDeletionStatus('idle');
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, action: () => void) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        action();
      }
    },
    []
  );

  const credentialActions = useMemo(() => [
    { icon: Eye, label: 'View details', color: 'text-blue-400 hover:text-blue-300', handler: (credential: Credential) => () => {
      setSelectedCredential(credential);
      setIsDetailsModalOpen(true);
    }},
    { icon: Edit2, label: 'Edit', color: 'text-yellow-400 hover:text-yellow-300', handler: (credential: Credential) => () => {
      setSelectedCredential(credential);
      setIsEditModalOpen(true);
    }},
    { icon: Trash2, label: 'Delete', color: 'text-red-400 hover:text-red-300', handler: (credential: Credential) => () => handleDelete(credential)},
  ], [handleDelete]);

  return (
    <div role="region" aria-labelledby="vault-heading">
      <h2 id="vault-heading" className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">
        Health Credential Vault
      </h2>

      {/* Upload zone */}
      <motion.div
        className="border-2 border-dashed border-green-400 rounded-lg p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 text-center hover:border-green-300 transition-colors relative overflow-hidden"
        whileHover={{ scale: 1.005 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        role="region"
        aria-label="File upload area"
      >
        <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-green-400 mx-auto mb-3 sm:mb-4" aria-hidden="true" />
        <p className="text-white mb-3 sm:mb-4 text-sm sm:text-base">Upload your vaccination records</p>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleUpload}
          className="hidden"
          id="file-upload"
          accept="image/*,.pdf"
          disabled={uploadProgress !== null}
          aria-label="Upload vaccination record file"
        />
        <label
          htmlFor="file-upload"
          onKeyDown={(e) => handleKeyDown(e, () => fileInputRef.current?.click())}
          className={`inline-block px-4 sm:px-6 py-3 sm:py-2 rounded-lg cursor-pointer transition-colors touch-manipulation ${
            uploadProgress !== null
              ? 'bg-green-600/50 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white active:bg-green-800'
          }`}
          tabIndex={0}
          role="button"
        >
          {uploadProgress !== null ? 'Uploading...' : 'Select File'}
        </label>

        {/* Progress bar overlay */}
        <AnimatePresence>
          {uploadProgress !== null && (
            <motion.div
              className="mt-4 sm:mt-6"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              role="progressbar"
              aria-valuenow={uploadProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Upload progress: ${uploadProgress}%`}
            >
              <AnimatedProgress progress={uploadProgress} label="Encrypting & uploading to IPFS" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Credentials list */}
      <div className="space-y-3 sm:space-y-4" role="list" aria-label="Uploaded credentials">
        <AnimatePresence mode="popLayout">
          {credentials.length === 0 ? (
            <motion.div
              key="empty"
              className="text-center py-6 sm:py-8 text-green-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              role="status"
            >
              <Syringe className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" aria-hidden="true" />
              <p className="text-sm sm:text-base">No health credentials uploaded yet</p>
            </motion.div>
          ) : (
            credentials.map((credential, index) => (
              <motion.div
                key={credential.id}
                className="bg-white/10 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
                layout
                role="listitem"
                aria-label={`${credential.vaccineType} credential, status: ${credential.verificationStatus ? 'Verified' : 'Pending'}`}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-green-400 flex-shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-white font-medium text-sm sm:text-base truncate">{credential.vaccineType}</p>
                    <p className="text-green-200 text-xs sm:text-sm">
                      Status: {credential.verificationStatus ? 'Verified' : 'Pending'}
                    </p>
                    <p className="text-green-200 text-xs sm:text-sm">
                      Date: {credential.vaccinationDate}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto">
                  {credentialActions.map(({ icon: Icon, label, color, handler }) => (
                    <motion.button
                      key={label}
                      className={`${color} transition-colors p-2 -m-2 touch-manipulation`}
                      onClick={handler(credential)}
                      onKeyDown={(e) => handleKeyDown(e, handler(credential))}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      aria-label={`${label} ${credential.vaccineType} credential`}
                    >
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Success overlay */}
      <SuccessOverlay show={showSuccess} variant="upload" onDismiss={() => setShowSuccess(false)} />

      {/* Toast notification */}
      <SuccessToast
        show={toast.show}
        title={toast.title}
        description={toast.description}
        onDismiss={() => setToast((t) => ({ ...t, show: false }))}
      />

      {/* Deletion confirmation modal */}
      <DeletionConfirmationModal
        isOpen={isDeletionModalOpen}
        credential={credentialToDelete}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        onUndo={handleUndoDelete}
        deletionStatus={deletionStatus}
      />

      <CredentialDetailsModal
        isOpen={isDetailsModalOpen}
        credential={selectedCredential}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedCredential(null);
        }}
      />

      <CredentialEditModal
        isOpen={isEditModalOpen}
        credential={selectedCredential}
        onSave={(updatedCredential) => {
          setCredentials((prev) =>
            prev.map((c) => (c.id === updatedCredential.id ? updatedCredential : c))
          );
          setToast({
            show: true,
            title: 'Credential Updated',
            description: 'Metadata has been successfully saved',
          });
        }}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedCredential(null);
        }}
      />
    </div>
  );
}
