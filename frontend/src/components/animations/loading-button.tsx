'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { forwardRef } from 'react';

interface LoadingButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  isLoading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
}

const variantClasses = {
  primary: 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white',
  secondary: 'bg-white/10 hover:bg-white/20 active:bg-white/30 text-white',
  danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg',
};

export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ isLoading = false, loadingText, variant = 'primary', size = 'md', disabled, children, className = '', ...props }, ref) => {
    const isDisabled = disabled || isLoading;

    return (
      <motion.button
        ref={ref}
        disabled={isDisabled}
        className={`
          rounded-lg font-medium transition-colors flex items-center justify-center gap-2
          touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
        whileHover={isDisabled ? {} : { scale: 1.02 }}
        whileTap={isDisabled ? {} : { scale: 0.98 }}
        aria-busy={isLoading}
        aria-disabled={isDisabled}
        {...props}
      >
        {isLoading && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="w-4 h-4" />
          </motion.div>
        )}
        {isLoading ? loadingText || children : children}
      </motion.button>
    );
  }
);

LoadingButton.displayName = 'LoadingButton';
