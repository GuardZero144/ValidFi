'use client';

import { useState, useCallback, useRef } from 'react';
import {
  Share2,
  Lock,
  Clock,
  X,
  Shield,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatedProgress, SuccessOverlay, SuccessToast } from './animations';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useCredentialOperation } from '@/hooks/useCredentialOperation';
import {
  credentialSharingSchema,
  CREDENTIAL_OPTIONS,
  DURATION_OPTIONS,
  type CredentialSharingFormValues,
} from '@/utils/credential-validation';

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
  const [shareProgress, setShareProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; title: string; description?: string }>({
    show: false,
    title: '',
  });
  const { announceToScreenReader } = useAccessibility();
  const shareButtonRef = useRef<HTMLButtonElement>(null);

  const { execute, error: operationError, clearError, isPending: isSharing } = useCredentialOperation();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitted, touchedFields, dirtyFields },
  } = useForm<CredentialSharingFormValues>({
    resolver: zodResolver(credentialSharingSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      recipientAddress: '',
      credentialId: '',
      duration: '',
    },
  });

  const recipientAddress = watch('recipientAddress');
  const credentialId = watch('credentialId');
  const duration = watch('duration');

  // Show a field's error only once the user has interacted with it (typed,
  // blurred, or attempted submit) so untouched forms stay quiet, while still
  // validating on every keystroke for real-time feedback.
  const isErrorVisible = useCallback(
    (field: keyof CredentialSharingFormValues) =>
      Boolean(errors[field]) && (isSubmitted || dirtyFields[field] || touchedFields[field]),
    [errors, isSubmitted, dirtyFields, touchedFields]
  );

  const recipientErrorVisible = isErrorVisible('recipientAddress');
  const credentialErrorVisible = isErrorVisible('credentialId');
  const durationErrorVisible = isErrorVisible('duration');

  const handleShare = useCallback(
    async (values: CredentialSharingFormValues) => {
      if (isSharing) return;
      clearError();
      announceToScreenReader('Generating zero-knowledge proof...');
      setShareProgress(0);

      await execute(async () => {
        return new Promise<void>((resolve, reject) => {
          // Simulate network failure randomly (e.g. 10% chance) for demonstration
          if (Math.random() < 0.1) {
            setTimeout(() => reject(new Error('network error')), 1000);
            return;
          }

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
            setShowSuccess(true);
            announceToScreenReader('Proof generated successfully');

            const selectedCredential = CREDENTIAL_OPTIONS.find(
              (option) => option.value === values.credentialId
            );

            const newShare: SharedCredential = {
              id: crypto.randomUUID(),
              vaccineType: selectedCredential?.label ?? values.credentialId,
              recipient: values.recipientAddress,
              expiresAt: new Date(Date.now() + Number(values.duration) * 1000).toISOString(),
            };
            setSharedCredentials((prev) => [...prev, newShare]);
            resolve();
          }, 2400);
        });
      }, {
        context: 'ShareCredential',
      });
    },
    [isSharing, clearError, execute, announceToScreenReader]
  );

  const handleInvalidSubmit = useCallback(
    (validationErrors: FieldErrors<CredentialSharingFormValues>) => {
      clearError();
      const fieldLabels: Record<keyof CredentialSharingFormValues, string> = {
        recipientAddress: 'a valid recipient wallet address',
        credentialId: 'a vaccination credential',
        duration: 'a proof duration',
      };
      const missingLabels = (Object.keys(validationErrors) as (keyof CredentialSharingFormValues)[])
        .map((key) => fieldLabels[key])
        .join(', ');
      announceToScreenReader(`Please provide ${missingLabels} to share your credential`);
    },
    [clearError, announceToScreenReader]
  );

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
      <h2 id="sharing-heading" className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">
        Credential Sharing
      </h2>

      {/* Share form */}
      <div className="bg-white/10 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Share Vaccination Proof</h3>
        <form
          onSubmit={handleSubmit(handleShare, handleInvalidSubmit)}
          className="space-y-3 sm:space-y-4"
          noValidate
        >
          <div>
            <label htmlFor="recipient-address" className="block text-green-200 text-xs sm:text-sm mb-1 sm:mb-2">
              Recipient Wallet Address
            </label>
            <div className="relative">
              <input
                id="recipient-address"
                type="text"
                placeholder="G..."
                disabled={isSharing}
                aria-required="true"
                aria-invalid={Boolean(errors.recipientAddress) || undefined}
                aria-describedby={recipientErrorVisible ? 'recipient-address-error' : 'recipient-help'}
                className={`w-full bg-white/10 border rounded-lg px-3 sm:px-4 py-3 sm:py-2 text-white placeholder-green-300 focus:outline-none disabled:opacity-50 text-base sm:text-sm pr-10 ${
                  recipientErrorVisible
                    ? 'border-red-400 focus:border-red-300'
                    : 'border-green-400 focus:border-green-300'
                }`}
                {...register('recipientAddress')}
              />
              {recipientErrorVisible ? (
                <AlertCircle
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-red-400"
                  aria-hidden="true"
                />
              ) : recipientAddress ? (
                <CheckCircle2
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-green-400"
                  aria-label="Recipient wallet address is valid"
                />
              ) : null}
            </div>
            {recipientErrorVisible ? (
              <motion.p
                id="recipient-address-error"
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-300 text-xs mt-1 flex items-center gap-1"
              >
                <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
                {errors.recipientAddress?.message}
              </motion.p>
            ) : (
              <p id="recipient-help" className="text-green-300 text-xs mt-1 flex items-center gap-1">
                <HelpCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
                Stellar wallet addresses start with G and are 56 characters long
              </p>
            )}
          </div>
          <div>
            <label htmlFor="credential-select" className="block text-green-200 text-xs sm:text-sm mb-1 sm:mb-2">
              Select Vaccination Credential
            </label>
            <div className="relative">
              <select
                id="credential-select"
                disabled={isSharing}
                aria-required="true"
                aria-invalid={Boolean(errors.credentialId) || undefined}
                aria-describedby={
                  credentialErrorVisible ? 'credential-select-error' : 'credential-select-help'
                }
                className={`w-full bg-white/10 border rounded-lg px-3 sm:px-4 py-3 sm:py-2 text-white focus:outline-none focus:border-green-300 disabled:opacity-50 text-base sm:text-sm pr-10 ${
                  credentialErrorVisible
                    ? 'border-red-400 focus:border-red-300'
                    : 'border-green-400 focus:border-green-300'
                }`}
                {...register('credentialId')}
              >
                <option value="">Choose a credential...</option>
                {CREDENTIAL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {credentialErrorVisible ? (
                <AlertCircle
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-red-400 pointer-events-none"
                  aria-hidden="true"
                />
              ) : credentialId ? (
                <CheckCircle2
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-green-400 pointer-events-none"
                  aria-label="Vaccination credential is valid"
                />
              ) : null}
            </div>
            {credentialErrorVisible ? (
              <motion.p
                id="credential-select-error"
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-300 text-xs mt-1 flex items-center gap-1"
              >
                <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
                {errors.credentialId?.message}
              </motion.p>
            ) : (
              <p id="credential-select-help" className="text-green-300 text-xs mt-1">
                Choose which vaccination proof you want to share
              </p>
            )}
          </div>
          <div>
            <label htmlFor="duration-select" className="block text-green-200 text-xs sm:text-sm mb-1 sm:mb-2">
              Proof Duration
            </label>
            <div className="relative">
              <select
                id="duration-select"
                disabled={isSharing}
                aria-required="true"
                aria-invalid={Boolean(errors.duration) || undefined}
                aria-describedby={durationErrorVisible ? 'duration-select-error' : 'duration-select-help'}
                className={`w-full bg-white/10 border rounded-lg px-3 sm:px-4 py-3 sm:py-2 text-white focus:outline-none focus:border-green-300 disabled:opacity-50 text-base sm:text-sm pr-10 ${
                  durationErrorVisible
                    ? 'border-red-400 focus:border-red-300'
                    : 'border-green-400 focus:border-green-300'
                }`}
                {...register('duration')}
              >
                <option value="">Choose a duration...</option>
                {DURATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {durationErrorVisible ? (
                <AlertCircle
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-red-400 pointer-events-none"
                  aria-hidden="true"
                />
              ) : duration ? (
                <CheckCircle2
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-green-400 pointer-events-none"
                  aria-label="Proof duration is valid"
                />
              ) : null}
            </div>
            {durationErrorVisible ? (
              <motion.p
                id="duration-select-error"
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-300 text-xs mt-1 flex items-center gap-1"
              >
                <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
                {errors.duration?.message}
              </motion.p>
            ) : (
              <p id="duration-select-help" className="text-green-300 text-xs mt-1">
                Choose how long the recipient can access your proof
              </p>
            )}
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

          {/* Operation error message */}
          <AnimatePresence>
            {operationError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-200 text-sm flex items-start gap-2"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                <p>{operationError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            ref={shareButtonRef}
            type="submit"
            className={`w-full py-3 sm:py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 touch-manipulation ${
              isSharing
                ? 'bg-green-600/50 cursor-not-allowed text-white/70'
                : 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white'
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
      <div className="space-y-3 sm:space-y-4">
        <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Shared Credentials</h3>
        <div role="list" aria-label="Shared credentials">
          <AnimatePresence mode="popLayout">
            {sharedCredentials.length === 0 ? (
              <motion.div
                key="empty"
                className="text-center py-6 sm:py-8 text-green-200"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                role="status"
              >
                <Shield className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" aria-hidden="true" />
                <p className="text-sm sm:text-base">No credentials shared yet</p>
              </motion.div>
            ) : (
              sharedCredentials.map((share, index) => (
                <motion.div
                  key={share.id}
                  className="bg-white/10 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -30, scale: 0.95 }}
                  transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
                  layout
                  role="listitem"
                  aria-label={`${share.vaccineType} shared with ${share.recipient}, expires ${new Date(share.expiresAt).toLocaleString()}`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-green-400 flex-shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-white font-medium text-sm sm:text-base">{share.vaccineType}</p>
                      <p className="text-green-200 text-xs sm:text-sm truncate">Shared with: {share.recipient}</p>
                      <p className="text-green-200 text-xs sm:text-sm flex items-center gap-1">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4" aria-hidden="true" />
                        Expires: {new Date(share.expiresAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    className="text-red-400 hover:text-red-300 transition-colors self-end sm:self-auto p-2 -m-2 touch-manipulation"
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