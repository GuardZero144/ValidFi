'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface AnimatedIconProps {
  icon: LucideIcon;
  size?: number;
  color?: string;
  className?: string;
  animate?: boolean;
}

export function AnimatedIcon({
  icon: Icon,
  size = 24,
  color = 'currentColor',
  className = '',
  animate = true,
}: AnimatedIconProps) {
  return (
    <motion.div
      className={className}
      initial={animate ? { scale: 0, rotate: -180 } : false}
      animate={animate ? { scale: 1, rotate: 0 } : false}
      transition={
        animate
          ? { type: 'spring', stiffness: 260, damping: 20 }
          : undefined
      }
    >
      <Icon size={size} color={color} />
    </motion.div>
  );
}

interface SuccessPulseProps {
  className?: string;
  children: React.ReactNode;
}

export function SuccessPulse({ className = '', children }: SuccessPulseProps) {
  return (
    <div className={`relative inline-flex ${className}`}>
      {children}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-green-400"
        initial={{ scale: 1, opacity: 0.6 }}
        animate={{ scale: 2.5, opacity: 0 }}
        transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
      />
    </div>
  );
}
