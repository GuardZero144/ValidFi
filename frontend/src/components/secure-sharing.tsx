'use client';

import { useState } from 'react';
import { Share2, Lock, Clock, X } from 'lucide-react';

interface SecureSharingProps {
  walletAddress: string;
}

export function SecureSharing({ walletAddress }: SecureSharingProps) {
  const [sharedDocuments] = useState<any[]>([]);

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Secure Sharing</h2>
      
      <div className="bg-white/10 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Share a Document</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-blue-200 text-sm mb-2">Recipient Wallet Address</label>
            <input
              type="text"
              placeholder="G..."
              className="w-full bg-white/10 border border-blue-400 rounded-lg px-4 py-2 text-white placeholder-blue-300 focus:outline-none focus:border-blue-300"
            />
          </div>
          <div>
            <label className="block text-blue-200 text-sm mb-2">Select Document</label>
            <select className="w-full bg-white/10 border border-blue-400 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-300">
              <option value="">Choose a document...</option>
            </select>
          </div>
          <div>
            <label className="block text-blue-200 text-sm mb-2">Access Duration</label>
            <select className="w-full bg-white/10 border border-blue-400 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-300">
              <option value="3600">1 hour</option>
              <option value="86400">1 day</option>
              <option value="604800">1 week</option>
              <option value="2592000">1 month</option>
            </select>
          </div>
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors">
            <Share2 className="w-5 h-5 inline mr-2" />
            Share Document
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white mb-4">Shared Documents</h3>
        {sharedDocuments.length === 0 ? (
          <div className="text-center py-8 text-blue-200">
            <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No documents shared yet</p>
          </div>
        ) : (
          sharedDocuments.map((share) => (
            <div
              key={share.id}
              className="bg-white/10 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <Lock className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-white font-medium">{share.documentName}</p>
                  <p className="text-blue-200 text-sm">
                    Shared with: {share.recipient}
                  </p>
                  <p className="text-blue-200 text-sm flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Expires: {new Date(share.expiresAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <button className="text-red-400 hover:text-red-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
