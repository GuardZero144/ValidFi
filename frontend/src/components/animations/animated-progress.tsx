'use client';

import { motion } from 'framer-motion';

interface AnimatedProgressProps {
  progress: number;
  label?: string;
  className?: string;
}

export function AnimatedProgress({ progress, label, className = '' }: AnimatedProgressProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-green-200">{label}</span>
          <motion.span
            className="text-sm font-medium text-green-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            key={clampedProgress}
          >
            {clampedProgress}%
          </motion.span>
        </div>
      )}
      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400"
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      {clampedProgress >= 100 && (
        <motion.div
          className="absolute inset-0 rounded-full bg-green-400/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.5, 0] }}
          transition={{ duration: 0.6 }}
        />
      )}
    </div>
  );
}
