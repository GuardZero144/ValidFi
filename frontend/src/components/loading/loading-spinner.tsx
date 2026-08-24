'use client';

import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-[3px]',
  lg: 'w-12 h-12 border-4',
} as const;

export function LoadingSpinner({ size = 'md', label, className = '' }: LoadingSpinnerProps) {
  const spinner = (
    <motion.div
      className={`${SIZE_CLASSES[size]} rounded-full border-green-500/20 border-t-green-400 border-r-green-400 inline-block ${className}`}
      aria-label={label || 'Loading'}
      aria-live="polite"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
    >
      <span className="sr-only">{label || 'Loading...'}</span>
    </motion.div>
  );

  if (!label) return (
    <div role="status" aria-label="Loading" aria-live="polite">
      {spinner}
    </div>
  );

  return (
    <div className="flex items-center gap-3" role="status" aria-live="polite">
      {spinner}
      <span className="text-sm text-green-200">{label}</span>
    </div>
  );
}

export { LoadingSpinner as default };