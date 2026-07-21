'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SuccessCheckmark } from './success-checkmark';
import { ConfettiBurst } from './confetti-burst';
import { AnimatedProgress } from './animated-progress';

export type SuccessVariant = 'upload' | 'share' | 'verify' | 'connect' | 'default';

interface SuccessOverlayProps {
  show: boolean;
  title?: string;
  message?: string;
  variant?: SuccessVariant;
  progress?: number;
  showConfetti?: boolean;
  autoDismiss?: number;
  onDismiss?: () => void;
  onComplete?: () => void;
}

const variantConfig: Record<
  SuccessVariant,
  { color: string; bg: string; defaultTitle: string; defaultMessage: string }
> = {
  upload: {
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    defaultTitle: 'Upload Successful',
    defaultMessage: 'Your credential has been encrypted and stored on IPFS',
  },
  share: {
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    defaultTitle: 'Proof Shared',
    defaultMessage: 'Vaccination proof has been shared securely',
  },
  verify: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    defaultTitle: 'Verification Complete',
    defaultMessage: 'Your vaccination status has been verified on-chain',
  },
  connect: {
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    defaultTitle: 'Wallet Connected',
    defaultMessage: 'Your Stellar wallet is now connected',
  },
  default: {
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    defaultTitle: 'Success',
    defaultMessage: 'Operation completed successfully',
  },
};

export function SuccessOverlay({
  show,
  title,
  message,
  variant = 'default',
  progress,
  showConfetti = true,
  autoDismiss = 4000,
  onDismiss,
  onComplete,
}: SuccessOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);
  const config = variantConfig[variant];

  useEffect(() => {
    if (show) {
      setIsVisible(true);

      if (autoDismiss > 0) {
        const timer = setTimeout(() => {
          setIsVisible(false);
          onDismiss?.();
        }, autoDismiss);
        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [show, autoDismiss, onDismiss]);

  useEffect(() => {
    if (progress !== undefined && progress >= 100) {
      const timer = setTimeout(() => onComplete?.(), 600);
      return () => clearTimeout(timer);
    }
  }, [progress, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Content card */}
          <motion.div
            className={`relative ${config.bg} border border-white/10 rounded-2xl p-8 max-w-sm w-full mx-4 text-center`}
            initial={{ scale: 0.8, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: -10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className="flex justify-center mb-4">
              <SuccessCheckmark size={80} className={config.color} />
            </div>

            <h3 className={`text-xl font-bold ${config.color} mb-2`}>
              {title || config.defaultTitle}
            </h3>

            <p className="text-green-200 text-sm mb-4">
              {message || config.defaultMessage}
            </p>

            {progress !== undefined && (
              <div className="mb-4">
                <AnimatedProgress progress={progress} label="Progress" />
              </div>
            )}

            <button
              onClick={() => {
                setIsVisible(false);
                onDismiss?.();
              }}
              className="mt-2 px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-green-200 text-sm transition-colors"
            >
              Dismiss
            </button>
          </motion.div>

          {/* Confetti */}
          {showConfetti && progress === undefined && <ConfettiBurst trigger={true} />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* Inline success toast — lighter weight, for in-component use */

interface SuccessToastProps {
  show: boolean;
  title: string;
  description?: string;
  variant?: 'success' | 'info';
  onDismiss?: () => void;
}

export function SuccessToast({
  show,
  title,
  description,
  variant = 'success',
  onDismiss,
}: SuccessToastProps) {
  const colors =
    variant === 'success'
      ? 'border-green-500/40 bg-green-500/10'
      : 'border-cyan-500/40 bg-cyan-500/10';
  const iconColor = variant === 'success' ? 'text-green-400' : 'text-cyan-400';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={`fixed bottom-6 right-6 z-50 ${colors} border rounded-xl p-4 shadow-xl backdrop-blur-md max-w-xs`}
          initial={{ y: 40, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          <div className="flex items-start gap-3">
            <SuccessCheckmark size={32} className={iconColor} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${iconColor}`}>{title}</p>
              {description && (
                <p className="text-xs text-green-200/80 mt-0.5">{description}</p>
              )}
            </div>
            <button
              onClick={onDismiss}
              className="text-green-200/60 hover:text-green-200 transition-colors shrink-0"
            >
              ×
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
