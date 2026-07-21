'use client';

import { motion } from 'framer-motion';

interface SuccessCheckmarkProps {
  size?: number;
  className?: string;
}

export function SuccessCheckmark({ size = 80, className = '' }: SuccessCheckmarkProps) {
  const strokeWidth = Math.max(2, size / 30);
  const circleRadius = (size - strokeWidth * 2) / 2;
  const center = size / 2;
  const checkLength = circleRadius * 1.2;

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
    >
      {/* Background circle */}
      <motion.circle
        cx={center}
        cy={center}
        r={circleRadius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
      />

      {/* Fill circle */}
      <motion.circle
        cx={center}
        cy={center}
        r={circleRadius}
        fill="currentColor"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.6 }}
        style={{ transformOrigin: `${center}px ${center}px` }}
      />

      {/* Checkmark path */}
      <motion.path
        d={`M ${center - checkLength * 0.35} ${center} L ${center - checkLength * 0.05} ${center + checkLength * 0.3} L ${center + checkLength * 0.4} ${center - checkLength * 0.25}`}
        fill="none"
        stroke="white"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: 0.8, ease: 'easeOut' }}
      />
    </motion.svg>
  );
}
