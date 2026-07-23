'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { WalletConnect } from '@/components/wallet-connect';
import { HealthCredentialVault } from '@/components/health-credential-vault';
import { VaccinationVerificationCenter } from '@/components/vaccination-verification-center';
import { CredentialSharing } from '@/components/credential-sharing';
import { NotificationBell } from '@/components/NotificationBell';
import { NotificationPreferences } from '@/components/NotificationPreferences';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { CredentialAnalyticsDashboard } from '@/components/credential-analytics-dashboard';

const TABS = [
  { id: 'vault', label: 'Health Credential Vault' },
  { id: 'verification', label: 'Vaccination Verification' },
  { id: 'sharing', label: 'Credential Sharing' },
  { id: 'notifications', label: 'Notification Settings' },
  { id: 'analytics', label: 'Analytics Dashboard' },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('vault');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const { announceToScreenReader } = useAccessibility();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      const tab = TABS.find((t) => t.id === tabId);
      if (tab) {
        announceToScreenReader(`Switched to ${tab.label} tab`);
      }
    },
    [announceToScreenReader]
  );

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      let newIndex = index;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          newIndex = (index + 1) % TABS.length;
          break;
        case 'ArrowLeft':
          e.preventDefault();
          newIndex = (index - 1 + TABS.length) % TABS.length;
          break;
        case 'Home':
          e.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          newIndex = TABS.length - 1;
          break;
        default:
          return;
      }

      const newTab = TABS[newIndex];
      setActiveTab(newTab.id);
      tabRefs.current[newIndex]?.focus();
      announceToScreenReader(`Switched to ${newTab.label} tab`);
    },
    [announceToScreenReader]
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-900 via-teal-900 to-blue-900">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8" role="banner">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">ValidFi</h1>
              <p className="text-green-200">Tamper-Proof Health Credentials on Stellar Soroban</p>
              <p className="text-green-300 text-sm mt-1">
                Prove vaccination status with zero-knowledge proofs — no names, no birthdates, no medical
                history exposed
              </p>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <WalletConnect onConnect={setWalletAddress} />
            </div>
          </div>
        </header>

        {walletAddress ? (
          <>
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-1 mb-6">
              <nav role="tablist" aria-label="Main navigation" className="flex space-x-1">
                {TABS.map((tab, index) => (
                  <button
                    key={tab.id}
                    ref={(el) => { tabRefs.current[index] = el; }}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    aria-controls={`panel-${tab.id}`}
                    id={`tab-${tab.id}`}
                    tabIndex={activeTab === tab.id ? 0 : -1}
                    onClick={() => handleTabChange(tab.id)}
                    onKeyDown={(e) => handleTabKeyDown(e, index)}
                    className={`flex-1 px-4 py-3 rounded-md font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-green-600 text-white'
                        : 'text-green-200 hover:bg-white/5'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div
              role="tabpanel"
              id={`panel-${activeTab}`}
              aria-labelledby={`tab-${activeTab}`}
              className="bg-white/10 backdrop-blur-lg rounded-lg p-6"
            >
              {activeTab === 'vault' && <HealthCredentialVault walletAddress={walletAddress} />}
              {activeTab === 'verification' && (
                <VaccinationVerificationCenter walletAddress={walletAddress} />
              )}
              {activeTab === 'sharing' && <CredentialSharing walletAddress={walletAddress} />}
              {activeTab === 'notifications' && <NotificationPreferences />}
              {activeTab === 'analytics' && <CredentialAnalyticsDashboard />}
            </div>
          </>
        ) : (
          <div
            className="bg-white/10 backdrop-blur-lg rounded-lg p-12 text-center"
            role="region"
            aria-labelledby="connect-wallet-heading"
          >
            <h2 id="connect-wallet-heading" className="text-2xl font-semibold text-white mb-4">
              Connect Your Wallet
            </h2>
            <p className="text-green-200 mb-6">
              Connect your Stellar wallet to start managing your health credentials securely
            </p>
            <div className="flex justify-center gap-4" role="list" aria-label="Supported wallets">
              <div className="bg-white/10 rounded-lg p-4" role="listitem">
                <div className="text-3xl mb-2" aria-hidden="true">
                  🔐
                </div>
                <div className="text-white text-sm">Freighter</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4" role="listitem">
                <div className="text-3xl mb-2" aria-hidden="true">
                  🌐
                </div>
                <div className="text-white text-sm">Albedo</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4" role="listitem">
                <div className="text-3xl mb-2" aria-hidden="true">
                  🦞
                </div>
                <div className="text-white text-sm">LOBSTR</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
