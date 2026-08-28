'use client';

import { useState, useCallback } from 'react';
import { Wallet, Check, LogOut, ChevronDown, Copy, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SuccessToast } from './animations';
import { useAccessibility } from '@/contexts/AccessibilityContext';

type WalletProvider = 'freighter' | 'albedo' | 'lobstr';

interface WalletInfo {
  provider: WalletProvider;
  address: string;
}

interface WalletConnectProps {
  onConnect: (address: string) => void;
  onDisconnect?: () => void;
}

const WALLET_NAMES: Record<WalletProvider, string> = {
  freighter: 'Freighter',
  albedo: 'Albedo',
  lobstr: 'LOBSTR',
};

const WALLET_ICONS: Record<WalletProvider, string> = {
  freighter: '🔐',
  albedo: '🌐',
  lobstr: '🦞',
};

/**
 * Truncate a Stellar public key for display.
 * e.g. "GABCDEF1234567890XYZ" → "GABCD...7890XYZ"
 */
function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 5)}...${address.slice(-7)}`;
}

/**
 * Detect available wallet providers in the browser.
 */
function detectAvailableWallets(): WalletProvider[] {
  if (typeof window === 'undefined') return [];
  const available: WalletProvider[] = [];
  if ((window as any).freighter?.getPublicKey) available.push('freighter');
  if ((window as any).albedo) available.push('albedo');
  if ((window as any).lobstr) available.push('lobstr');
  return available;
}

/**
 * Connect to a wallet and return the public key.
 */
async function connectWalletProvider(
  provider: WalletProvider,
): Promise<string> {
  switch (provider) {
    case 'freighter': {
      // Use @stellar/freighter-api if available, otherwise fallback to window.freighter
      try {
        const { default: freighter } = await import('@stellar/freighter-api');
        const isConnected = await freighter.isConnected();
        if (!isConnected) {
          throw new Error('Freighter is not connected. Please open Freighter and unlock your wallet.');
        }
        const publicKey = await freighter.getPublicKey();
        return publicKey;
      } catch {
        // Fallback to window.freighter for older versions
        if ((window as any).freighter?.getPublicKey) {
          return (window as any).freighter.getPublicKey();
        }
        throw new Error('Freighter is not available. Please install the Freighter browser extension.');
      }
    }
    case 'albedo': {
      if (!(window as any).albedo) {
        throw new Error('Albedo is not available. Please install the Albedo wallet extension.');
      }
      const result = await (window as any).albedo.publicKey();
      return result.publicKey;
    }
    case 'lobstr': {
      if (!(window as any).lobstr) {
        throw new Error('LOBSTR is not available. Please install the LOBSTR wallet extension.');
      }
      const publicKey = await (window as any).lobstr.getPublicKey();
      return publicKey;
    }
    default:
      throw new Error('Unsupported wallet provider');
  }
}

export function WalletConnect({ onConnect, onDisconnect }: WalletConnectProps) {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { announceToScreenReader } = useAccessibility();

  const availableWallets = detectAvailableWallets();

  const handleConnect = useCallback(
    async (provider: WalletProvider) => {
      if (wallet) return;
      setIsConnecting(true);
      setErrorMessage(null);
      announceToScreenReader(`Connecting to ${WALLET_NAMES[provider]}...`);
      setShowWalletMenu(false);

      try {
        const address = await connectWalletProvider(provider);
        const newWallet: WalletInfo = { provider, address };
        setWallet(newWallet);
        onConnect(address);
        setShowToast(true);
        announceToScreenReader(`${WALLET_NAMES[provider]} wallet connected successfully`);
        setTimeout(() => setShowToast(false), 3000);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to connect wallet';
        setErrorMessage(message);
        announceToScreenReader(message, 'assertive');
        console.error('Failed to connect wallet:', error);
      } finally {
        setIsConnecting(false);
      }
    },
    [wallet, onConnect, announceToScreenReader],
  );

  const handleDisconnect = useCallback(() => {
    if (!wallet) return;
    const providerName = WALLET_NAMES[wallet.provider];
    setWallet(null);
    setErrorMessage(null);
    setCopied(false);
    onDisconnect?.();
    announceToScreenReader(`${providerName} wallet disconnected`);
  }, [wallet, onDisconnect, announceToScreenReader]);

  const handleCopyAddress = useCallback(async () => {
    if (!wallet) return;
    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      announceToScreenReader('Wallet address copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      announceToScreenReader('Failed to copy address', 'assertive');
    }
  }, [wallet, announceToScreenReader]);

  // Connected state: show wallet info
  if (wallet) {
    return (
      <>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10">
            <span aria-hidden="true">{WALLET_ICONS[wallet.provider]}</span>
            <span className="text-white text-sm font-mono">
              {truncateAddress(wallet.address)}
            </span>
            <button
              onClick={handleCopyAddress}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              aria-label={copied ? 'Address copied' : 'Copy wallet address'}
              title="Copy address"
            >
              <Copy className="w-3.5 h-3.5 text-green-300" aria-hidden="true" />
            </button>
            <a
              href={`https://stellar.expert/explorer/public/account/${wallet.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded hover:bg-white/10 transition-colors"
              aria-label="View on Stellar Expert"
              title="View on Stellar Expert"
            >
              <ExternalLink className="w-3.5 h-3.5 text-green-300" aria-hidden="true" />
            </a>
          </div>
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-sm font-medium transition-colors"
            aria-label="Disconnect wallet"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            Disconnect
          </button>
        </div>

        <SuccessToast
          show={showToast}
          title="Wallet Connected"
          description={`Your ${WALLET_NAMES[wallet.provider]} wallet is ready`}
        />
      </>
    );
  }

  // Disconnected state: show connect button or wallet selector
  return (
    <>
      <div className="relative">
        <motion.button
          onClick={() => {
            if (availableWallets.length > 1) {
              setShowWalletMenu(!showWalletMenu);
            } else if (availableWallets.length === 1) {
              handleConnect(availableWallets[0]);
            } else {
              setErrorMessage('No wallet extensions detected. Please install Freighter, Albedo, or LOBSTR.');
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (availableWallets.length > 1) {
                setShowWalletMenu(!showWalletMenu);
              } else if (availableWallets.length === 1) {
                handleConnect(availableWallets[0]);
              }
            }
          }}
          disabled={isConnecting}
          aria-label={
            isConnecting
              ? 'Connecting wallet'
              : availableWallets.length > 1
                ? 'Select wallet to connect'
                : 'Connect wallet'
          }
          aria-expanded={showWalletMenu ? true : undefined}
          aria-haspopup={availableWallets.length > 1 ? 'listbox' : undefined}
          aria-busy={isConnecting}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 ${
            isConnecting
              ? 'bg-blue-600 text-white cursor-wait'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
          whileHover={isConnecting ? {} : { scale: 1.03 }}
          whileTap={isConnecting ? {} : { scale: 0.97 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key="connect"
              className="flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Wallet className="w-5 h-5" aria-hidden="true" />
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              {availableWallets.length > 1 && (
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.button>

        {/* Wallet selector dropdown */}
        <AnimatePresence>
          {showWalletMenu && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-56 rounded-lg bg-white shadow-xl border border-slate-200 overflow-hidden z-50"
              role="listbox"
              aria-label="Select a wallet"
            >
              {availableWallets.map((provider) => (
                <button
                  key={provider}
                  onClick={() => handleConnect(provider)}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left text-slate-800 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                  role="option"
                  aria-selected={false}
                >
                  <span className="text-xl" aria-hidden="true">
                    {WALLET_ICONS[provider]}
                  </span>
                  <div>
                    <div className="font-medium text-sm">{WALLET_NAMES[provider]}</div>
                    <div className="text-xs text-slate-500">
                      {provider === 'freighter'
                        ? 'Stellar wallet extension'
                        : provider === 'albedo'
                          ? 'Web-based Stellar wallet'
                          : 'Mobile-friendly Stellar wallet'}
                    </div>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute right-0 mt-16 w-72 px-4 py-3 rounded-lg bg-red-600/90 text-white text-sm shadow-lg"
            role="alert"
          >
            <div className="flex items-start gap-2">
              <span className="font-medium">Error:</span>
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="absolute top-1 right-1 p-1 text-white/70 hover:text-white"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}