import { z } from 'zod';

/**
 * Stellar public keys are 56 characters long and always start with 'G'.
 * The remaining 55 characters are uppercase letters and digits.
 */
export const STELLAR_ADDRESS_REGEX = /^G[A-Z0-9]{55}$/;

export const CREDENTIAL_OPTIONS = [
  { value: 'covid-19-vaccination', label: 'COVID-19 Vaccination' },
  { value: 'mmr-vaccination', label: 'MMR Vaccination' },
  { value: 'influenza-vaccination', label: 'Influenza Vaccination' },
] as const;

export const DURATION_OPTIONS = [
  { value: '3600', label: '1 hour' },
  { value: '86400', label: '1 day' },
  { value: '604800', label: '1 week' },
  { value: '2592000', label: '1 month' },
] as const;

export const credentialSharingSchema = z.object({
  recipientAddress: z
    .string()
    .min(1, 'Recipient wallet address is required')
    .regex(
      STELLAR_ADDRESS_REGEX,
      'Stellar wallet addresses start with G and are 56 characters long'
    ),
  credentialId: z.string().min(1, 'Please select a vaccination credential'),
  duration: z.string().min(1, 'Please select a proof duration'),
});

export type CredentialSharingFormValues = z.infer<typeof credentialSharingSchema>;