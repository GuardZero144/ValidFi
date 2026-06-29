'use client';

import { useState } from 'react';
import { WalletConnect } from '@/components/wallet-connect';
import { HealthCredentialVault } from '@/components/health-credential-vault';
import { VaccinationVerificationCenter } from '@/components/vaccination-verification-center';
import { CredentialSharing } from '@/components/credential-sharing';
import { NotificationBell } from '@/components/NotificationBell';
import { NotificationPreferences } from '@/components/NotificationPreferences';

export default function Home() {
  const [activeTab, setActiveTab] = useState('vault');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-900 via-teal-900 to-blue-900">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">ValidFi</h1>
              <p className="text-green-200">Tamper-Proof Health Credentials on Stellar Soroban</p>
              <p className="text-green-300 text-sm mt-1">Prove vaccination status with zero-knowledge proofs — no names, no birthdates, no medical history exposed</p>
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
              <nav className="flex space-x-1">
                {[
                  { id: 'vault', label: 'Health Credential Vault' },
                  { id: 'verification', label: 'Vaccination Verification' },
                  { id: 'sharing', label: 'Credential Sharing' },
                  { id: 'notifications', label: 'Notification Settings' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
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

            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
              {activeTab === 'vault' && <HealthCredentialVault walletAddress={walletAddress} />}
              {activeTab === 'verification' && <VaccinationVerificationCenter walletAddress={walletAddress} />}
              {activeTab === 'sharing' && <CredentialSharing walletAddress={walletAddress} />}
              {activeTab === 'notifications' && <NotificationPreferences />}
            </div>
          </>
        ) : (
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-12 text-center">
            <h2 className="text-2xl font-semibold text-white mb-4">Connect Your Wallet</h2>
            <p className="text-green-200 mb-6">
              Connect your Stellar wallet to start managing your health credentials securely
            </p>
            <div className="flex justify-center gap-4">
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-3xl mb-2">🔐</div>
                <div className="text-white text-sm">Freighter</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-3xl mb-2">🌐</div>
                <div className="text-white text-sm">Albedo</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-3xl mb-2">🦞</div>
                <div className="text-white text-sm">LOBSTR</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
