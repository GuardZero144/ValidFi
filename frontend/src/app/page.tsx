'use client';

import { useState } from 'react';
import { WalletConnect } from '@/components/wallet-connect';
import { IdentityVault } from '@/components/identity-vault';
import { VerificationCenter } from '@/components/verification-center';
import { SecureSharing } from '@/components/secure-sharing';

export default function Home() {
  const [activeTab, setActiveTab] = useState('vault');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">SecureData</h1>
              <p className="text-blue-200">Decentralized Identity Verification on Stellar Soroban</p>
            </div>
            <WalletConnect onConnect={setWalletAddress} />
          </div>
        </header>

        {walletAddress ? (
          <>
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-1 mb-6">
              <nav className="flex space-x-1">
                {[
                  { id: 'vault', label: 'Identity Vault' },
                  { id: 'verification', label: 'Verification Center' },
                  { id: 'sharing', label: 'Secure Sharing' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 px-4 py-3 rounded-md font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'text-blue-200 hover:bg-white/5'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6">
              {activeTab === 'vault' && <IdentityVault walletAddress={walletAddress} />}
              {activeTab === 'verification' && <VerificationCenter walletAddress={walletAddress} />}
              {activeTab === 'sharing' && <SecureSharing walletAddress={walletAddress} />}
            </div>
          </>
        ) : (
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-12 text-center">
            <h2 className="text-2xl font-semibold text-white mb-4">Connect Your Wallet</h2>
            <p className="text-blue-200 mb-6">
              Connect your Stellar wallet to start managing your digital identities securely
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
