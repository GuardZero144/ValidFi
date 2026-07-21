'use client';

import { useState, useCallback, useMemo } from 'react';
import { Info, Calendar, Clock, Building2, Tag, ChevronDown, ChevronUp, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccessibility } from '@/contexts/AccessibilityContext';

interface CredentialMetadata {
  id: string;
  name: string;
  type: string;
  issuer: string;
  issuerName: string;
  issuedAt: string;
  updatedAt: string;
  expiresAt?: string;
  status: 'active' | 'expired' | 'revoked';
  description?: string;
}

interface CredentialMetadataDisplayProps {
  credentials: CredentialMetadata[];
}

export function CredentialMetadataDisplay({ credentials }: CredentialMetadataDisplayProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'revoked'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { announceToScreenReader } = useAccessibility();

  const filteredCredentials = useMemo(() => {
    return credentials.filter((credential) => {
      const matchesSearch =
        credential.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        credential.issuerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        credential.type.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || credential.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [credentials, searchQuery, statusFilter]);

  const handleToggleExpand = useCallback(
    (id: string) => {
      const newExpandedId = expandedId === id ? null : id;
      setExpandedId(newExpandedId);
      announceToScreenReader(
        newExpandedId ? 'Expanded credential details' : 'Collapsed credential details'
      );
    },
    [expandedId, announceToScreenReader]
  );

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredCredentials.length) {
      setSelectedIds(new Set());
      announceToScreenReader('Deselected all credentials');
    } else {
      setSelectedIds(new Set(filteredCredentials.map((c) => c.id)));
      announceToScreenReader(`Selected ${filteredCredentials.length} credentials`);
    }
  }, [filteredCredentials, selectedIds.size, announceToScreenReader]);

  const handleSelectCredential = useCallback(
    (id: string) => {
      const newSelected = new Set(selectedIds);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      setSelectedIds(newSelected);
    },
    [selectedIds]
  );

  const handleBulkExport = useCallback(() => {
    const selectedCredentials = filteredCredentials.filter((c) => selectedIds.has(c.id));
    const exportData = JSON.stringify(selectedCredentials, null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credentials-metadata-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    announceToScreenReader(`Exported ${selectedIds.size} credentials`);
  }, [filteredCredentials, selectedIds, announceToScreenReader]);

  const activeCount = credentials.filter((c) => c.status === 'active').length;
  const expiredCount = credentials.filter((c) => c.status === 'expired').length;
  const revokedCount = credentials.filter((c) => c.status === 'revoked').length;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'expired':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'revoked':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div role="region" aria-labelledby="metadata-heading">
      <h2 id="metadata-heading" className="text-2xl font-bold text-white mb-6">
        Credential Metadata
      </h2>

      {/* Summary Section */}
      {credentials.length > 0 && (
        <div className="bg-white/5 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-200">Total:</span>
              <span className="text-white font-medium">{credentials.length}</span>
            </div>
            {activeCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="text-green-200">{activeCount} Active</span>
              </div>
            )}
            {expiredCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                <span className="text-green-200">{expiredCount} Expired</span>
              </div>
            )}
            {revokedCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span className="text-green-200">{revokedCount} Revoked</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search and Filter */}
      {credentials.length > 0 && (
        <div className="bg-white/5 rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-400" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search credentials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 border border-green-400/30 rounded-lg pl-10 pr-4 py-2 text-white placeholder-green-300 focus:outline-none focus:border-green-400"
                aria-label="Search credentials"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-green-400" aria-hidden="true" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'expired' | 'revoked')}
                className="bg-white/10 border border-green-400/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-400"
                aria-label="Filter by status"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="revoked">Revoked</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {filteredCredentials.length > 0 && (
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.size === filteredCredentials.length && filteredCredentials.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded border-green-400 text-green-600 focus:ring-green-500 bg-white/10"
                aria-label="Select all credentials"
              />
              <span className="text-green-200 text-sm">
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
              </span>
            </label>
          </div>
          {selectedIds.size > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
              onClick={handleBulkExport}
              aria-label={`Export ${selectedIds.size} selected credentials`}
            >
              <Info className="w-4 h-4" aria-hidden="true" />
              Export Selected
            </motion.button>
          )}
        </div>
      )}

      <div className="space-y-4" role="list" aria-label="Credential metadata list">
        <AnimatePresence mode="popLayout">
          {filteredCredentials.length === 0 ? (
            <motion.div
              key="empty"
              className="text-center py-8 text-green-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              role="status"
            >
              <Info className="w-12 h-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
              <p>No credentials to display</p>
            </motion.div>
          ) : (
            filteredCredentials.map((credential, index) => (
              <motion.div
                key={credential.id}
                className="bg-white/10 rounded-lg overflow-hidden"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
                layout
                role="listitem"
                aria-label={`${credential.name} credential from ${credential.issuerName}`}
              >
                {/* Header */}
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => handleToggleExpand(credential.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleToggleExpand(credential.id);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-expanded={expandedId === credential.id}
                  aria-controls={`metadata-details-${credential.id}`}
                >
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(credential.id)}
                      onChange={() => handleSelectCredential(credential.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded border-green-400 text-green-600 focus:ring-green-500 bg-white/10"
                      aria-label={`Select ${credential.name}`}
                    />
                    <Info className="w-6 h-6 text-green-400" aria-hidden="true" />
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="text-white font-medium">{credential.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded border ${getStatusColor(credential.status)}`}>
                          {credential.status.charAt(0).toUpperCase() + credential.status.slice(1)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-green-200">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" aria-hidden="true" />
                          {credential.type}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" aria-hidden="true" />
                          {credential.issuerName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" aria-hidden="true" />
                          {getRelativeTime(credential.issuedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {expandedId === credential.id ? (
                    <ChevronUp className="w-5 h-5 text-green-400" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-green-400" aria-hidden="true" />
                  )}
                </div>

                {/* Details */}
                <AnimatePresence>
                  {expandedId === credential.id && (
                    <motion.div
                      id={`metadata-details-${credential.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-green-400/20"
                    >
                      <div className="p-4 space-y-3">
                        {/* Issuer Info */}
                        <div className="flex items-start gap-3">
                          <Building2 className="w-5 h-5 text-green-400 mt-0.5" aria-hidden="true" />
                          <div>
                            <p className="text-green-200 text-sm">Issuer</p>
                            <p className="text-white">{credential.issuerName}</p>
                            <p className="text-green-300 text-xs font-mono mt-1 break-all">
                              {credential.issuer}
                            </p>
                          </div>
                        </div>

                        {/* Credential Type */}
                        <div className="flex items-start gap-3">
                          <Tag className="w-5 h-5 text-green-400 mt-0.5" aria-hidden="true" />
                          <div>
                            <p className="text-green-200 text-sm">Type</p>
                            <p className="text-white">{credential.type}</p>
                          </div>
                        </div>

                        {/* Dates */}
                        <div className="flex items-start gap-3">
                          <Calendar className="w-5 h-5 text-green-400 mt-0.5" aria-hidden="true" />
                          <div>
                            <p className="text-green-200 text-sm">Issued Date</p>
                            <p className="text-white">{formatDate(credential.issuedAt)}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Clock className="w-5 h-5 text-green-400 mt-0.5" aria-hidden="true" />
                          <div>
                            <p className="text-green-200 text-sm">Last Updated</p>
                            <p className="text-white">{formatDateTime(credential.updatedAt)}</p>
                          </div>
                        </div>

                        {/* Expiry if present */}
                        {credential.expiresAt && (
                          <div className="flex items-start gap-3">
                            <Calendar className="w-5 h-5 text-yellow-400 mt-0.5" aria-hidden="true" />
                            <div>
                              <p className="text-green-200 text-sm">Expires</p>
                              <p className="text-white">{formatDate(credential.expiresAt)}</p>
                            </div>
                          </div>
                        )}

                        {/* Description if present */}
                        {credential.description && (
                          <div className="mt-3 pt-3 border-t border-green-400/20">
                            <p className="text-green-200 text-sm mb-1">Description</p>
                            <p className="text-green-100 text-sm">{credential.description}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
