'use client';

import { useState, useCallback } from 'react';
import { Wallet, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SuccessToast } from './animations';
import { useAccessibility } from '@/contexts/AccessibilityContext';

interface WalletConnectProps {
  onConnect: (address: string) => void;
}

export function WalletConnect({ onConnect }: WalletConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const { announceToScreenReader } = useAccessibility();

  const connectWallet = useCallback(async () => {
    if (isConnected) return;
    setIsConnecting(true);
    announceToScreenReader('Connecting to wallet...');
    try {
      if (typeof window !== 'undefined' && (window as any).freighter) {
        const address = await (window as any).freighter.getPublicKey();
        onConnect(address);
        setIsConnected(true);
        setShowToast(true);
        announceToScreenReader('Wallet connected successfully');
        setTimeout(() => setShowToast(false), 3000);
      } else {
        announceToScreenReader('Please install Freighter wallet extension', 'assertive');
        alert('Please install Freighter wallet extension');
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      announceToScreenReader('Failed to connect wallet', 'assertive');
      alert('Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }, [isConnected, onConnect, announceToScreenReader]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        connectWallet();
      }
    },
    [connectWallet]
  );

  return (
    <>
      <motion.button
        onClick={connectWallet}
        onKeyDown={handleKeyDown}
        disabled={isConnecting}
        aria-label={isConnected ? 'Wallet connected' : isConnecting ? 'Connecting wallet' : 'Connect wallet'}
        aria-busy={isConnecting}
        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 ${
          isConnected
            ? 'bg-green-600 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
        whileHover={isConnected ? {} : { scale: 1.03 }}
        whileTap={isConnected ? {} : { scale: 0.97 }}
      >
        <AnimatePresence mode="wait">
          {isConnected ? (
            <motion.div
              key="check"
              className="flex items-center gap-2"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <Check className="w-5 h-5" aria-hidden="true" />
              Connected
            </motion.div>
          ) : (
            <motion.div
              key="wallet"
              className="flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Wallet className="w-5 h-5" aria-hidden="true" />
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <SuccessToast
        show={showToast}
        title="Wallet Connected"
        description="Your Stellar wallet is ready"
      />
    </>
  );
}
