'use client';

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export function LoadingSpinner({ size = 'md', label, className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`} role="status" aria-label={label || 'Loading'}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <Loader2 className={`${sizeMap[size]} text-green-400`} />
      </motion.div>
      {label && (
        <span className="text-sm text-green-200">{label}</span>
      )}
    </div>
  );
}
