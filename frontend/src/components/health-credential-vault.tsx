'use client';

import { useState, useCallback } from 'react';
import { Upload, Shield, FileText, Trash2, Syringe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedProgress, SuccessOverlay, SuccessToast } from './animations';

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

  const simulateUpload = useCallback((fileName: string) => {
    setUploadProgress(0);

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

      const newCredential: Credential = {
        id: crypto.randomUUID(),
        vaccineType: fileName.replace(/\.[^/.]+$/, ''),
        verificationStatus: false,
        vaccinationDate: new Date().toLocaleDateString(),
      };
      setCredentials((prev) => [...prev, newCredential]);
    }, 2000);
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    simulateUpload(file.name);
  };

  const handleDelete = useCallback(
    (id: string) => {
      setCredentials((prev) => prev.filter((c) => c.id !== id));
      setToast({ show: true, title: 'Credential Removed', description: 'The credential has been deleted from your vault' });
      setTimeout(() => setToast((t) => ({ ...t, show: false })), 3000);
    },
    [],
  );

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Health Credential Vault</h2>

      {/* Upload zone */}
      <motion.div
        className="border-2 border-dashed border-green-400 rounded-lg p-8 mb-6 text-center hover:border-green-300 transition-colors relative overflow-hidden"
        whileHover={{ scale: 1.005 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <Upload className="w-12 h-12 text-green-400 mx-auto mb-4" />
        <p className="text-white mb-4">Upload your vaccination records</p>
        <input
          type="file"
          onChange={handleUpload}
          className="hidden"
          id="file-upload"
          accept="image/*,.pdf"
          disabled={uploadProgress !== null}
        />
        <label
          htmlFor="file-upload"
          className={`inline-block px-6 py-2 rounded-lg cursor-pointer transition-colors ${
            uploadProgress !== null
              ? 'bg-green-600/50 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {uploadProgress !== null ? 'Uploading...' : 'Select File'}
        </label>

        {/* Progress bar overlay */}
        <AnimatePresence>
          {uploadProgress !== null && (
            <motion.div
              className="mt-6"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <AnimatedProgress progress={uploadProgress} label="Encrypting & uploading to IPFS" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Credentials list */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {credentials.length === 0 ? (
            <motion.div
              key="empty"
              className="text-center py-8 text-green-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Syringe className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No health credentials uploaded yet</p>
            </motion.div>
          ) : (
            credentials.map((credential, index) => (
              <motion.div
                key={credential.id}
                className="bg-white/10 rounded-lg p-4 flex items-center justify-between"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
                layout
              >
                <div className="flex items-center gap-4">
                  <Shield className="w-8 h-8 text-green-400" />
                  <div>
                    <p className="text-white font-medium">{credential.vaccineType}</p>
                    <p className="text-green-200 text-sm">
                      Status: {credential.verificationStatus ? 'Verified' : 'Pending'}
                    </p>
                    <p className="text-green-200 text-sm">
                      Date: {credential.vaccinationDate}
                    </p>
                  </div>
                </div>
                <motion.button
                  className="text-red-400 hover:text-red-300 transition-colors"
                  onClick={() => handleDelete(credential.id)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Trash2 className="w-5 h-5" />
                </motion.button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Success overlay */}
      <SuccessOverlay
        show={showSuccess}
        variant="upload"
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
