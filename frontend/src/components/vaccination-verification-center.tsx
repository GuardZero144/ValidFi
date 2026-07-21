'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedIcon, SuccessPulse } from './animations';

interface VaccinationVerificationCenterProps {
  walletAddress: string;
}

interface Verification {
  id: string;
  vaccineType: string;
  status: 'approved' | 'rejected' | 'pending';
  createdAt: string;
}

export function VaccinationVerificationCenter({ walletAddress }: VaccinationVerificationCenterProps) {
  const [verifications] = useState<Verification[]>([
    { id: '1', vaccineType: 'COVID-19 (Pfizer)', status: 'approved', createdAt: '2026-07-15' },
    { id: '2', vaccineType: 'Influenza 2025', status: 'pending', createdAt: '2026-07-18' },
    { id: '3', vaccineType: 'Hepatitis B', status: 'rejected', createdAt: '2026-07-10' },
  ]);

  const stats = {
    approved: verifications.filter((v) => v.status === 'approved').length,
    pending: verifications.filter((v) => v.status === 'pending').length,
    rejected: verifications.filter((v) => v.status === 'rejected').length,
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'approved':
        return {
          icon: CheckCircle,
          color: 'text-green-400',
          bg: 'bg-green-500/20',
          label: 'Approved',
          pulse: true,
        };
      case 'rejected':
        return {
          icon: XCircle,
          color: 'text-red-400',
          bg: 'bg-red-500/20',
          label: 'Rejected',
          pulse: false,
        };
      case 'pending':
        return {
          icon: Clock,
          color: 'text-yellow-400',
          bg: 'bg-yellow-500/20',
          label: 'Pending',
          pulse: false,
        };
      default:
        return {
          icon: AlertCircle,
          color: 'text-gray-400',
          bg: 'bg-gray-500/20',
          label: 'Unknown',
          pulse: false,
        };
    }
  };

  return (
    <div role="region" aria-labelledby="verification-heading">
      <h2 id="verification-heading" className="text-2xl font-bold text-white mb-6">
        Vaccination Verification Center
      </h2>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4 mb-6" role="group" aria-label="Verification statistics">
        {[
          { count: stats.approved, label: 'Verified', bg: 'bg-green-500/20', color: 'text-green-400' },
          { count: stats.pending, label: 'Pending', bg: 'bg-yellow-500/20', color: 'text-yellow-400' },
          { count: stats.rejected, label: 'Rejected', bg: 'bg-red-500/20', color: 'text-red-400' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            className={`${stat.bg} rounded-lg p-4 text-center`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, type: 'spring', stiffness: 300, damping: 25 }}
            whileHover={{ scale: 1.03 }}
            role="status"
            aria-label={`${stat.count} ${stat.label} verifications`}
          >
            <motion.div
              className={`text-3xl font-bold ${stat.color}`}
              key={stat.count}
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              aria-hidden="true"
            >
              {stat.count}
            </motion.div>
            <div className={`${stat.color} text-sm opacity-80`}>{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Verification list */}
      <div className="space-y-4" role="list" aria-label="Verification requests">
        <AnimatePresence mode="popLayout">
          {verifications.length === 0 ? (
            <motion.div
              key="empty"
              className="text-center py-8 text-green-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              role="status"
            >
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
              <p>No vaccination verifications yet</p>
            </motion.div>
          ) : (
            verifications.map((verification, index) => {
              const config = getStatusConfig(verification.status);
              return (
                <motion.div
                  key={verification.id}
                  className="bg-white/10 rounded-lg p-4 flex items-center justify-between"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{
                    delay: index * 0.08,
                    type: 'spring',
                    stiffness: 300,
                    damping: 25,
                  }}
                  layout
                  role="listitem"
                  aria-label={`${verification.vaccineType}, status: ${config.label}, submitted: ${new Date(verification.createdAt).toLocaleDateString()}`}
                >
                  <div className="flex items-center gap-4">
                    {config.pulse ? (
                      <SuccessPulse>
                        <AnimatedIcon
                          icon={config.icon}
                          size={20}
                          color="currentColor"
                          className={config.color}
                        />
                      </SuccessPulse>
                    ) : (
                      <AnimatedIcon
                        icon={config.icon}
                        size={20}
                        color="currentColor"
                        className={config.color}
                      />
                    )}
                    <div>
                      <p className="text-white font-medium">{verification.vaccineType}</p>
                      <p className="text-green-200 text-sm">
                        Submitted: {new Date(verification.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <motion.span
                    className={`px-3 py-1 rounded-full text-sm ${config.bg} ${config.color}`}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    aria-hidden="true"
                  >
                    {config.label}
                  </motion.span>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
