export enum CredentialStatusEvent {
  CREATED = 'credential.created',
  UPDATED = 'credential.updated',
  REVOKED = 'credential.revoked',
  VERIFIED = 'credential.verified',
  EXPIRED = 'credential.expired',
  DUPLICATE_DETECTED = 'credential.duplicate_detected',
  MIGRATION_STARTED = 'credential.migration_started',
  MIGRATION_COMPLETED = 'credential.migration_completed',
}

export interface CredentialStatusUpdate {
  credentialId: string;
  event: CredentialStatusEvent;
  previousStatus?: string;
  currentStatus: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface StatusSubscription {
  credentialId?: string;
  holder?: string;
  events?: CredentialStatusEvent[];
}
