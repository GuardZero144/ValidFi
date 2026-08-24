import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CredentialMetadataDisplay } from '../src/components/credential-metadata-display';
import { AccessibilityProvider } from '../src/contexts/AccessibilityContext';

function renderWithProviders(ui: React.ReactElement) {
  return render(<AccessibilityProvider>{ui}</AccessibilityProvider>);
}

const mockCredentials = [
  {
    id: 'cred-1',
    name: 'COVID-19 Vaccination',
    type: 'vaccination',
    issuer: 'issuer-1',
    issuerName: 'City Health Department',
    issuedAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-06-15T00:00:00Z',
    expiresAt: '2027-01-15T00:00:00Z',
    status: 'active' as const,
    description: 'COVID-19 vaccination record',
    version: '1.0',
    schema: 'https://example.com/schema/vaccination',
    proofType: 'BBS+',
    signatureAlgorithm: 'Ed25519',
    history: [
      {
        timestamp: '2026-06-15T10:00:00Z',
        action: 'Updated',
        field: 'status',
        oldValue: 'pending',
        newValue: 'active',
        performedBy: 'admin@health.gov',
      },
    ],
  },
  {
    id: 'cred-2',
    name: 'Flu Shot 2025',
    type: 'vaccination',
    issuer: 'issuer-2',
    issuerName: 'Wellness Center',
    issuedAt: '2025-10-01T00:00:00Z',
    updatedAt: '2025-10-01T00:00:00Z',
    status: 'expired' as const,
    proofType: 'Ed25519',
    signatureAlgorithm: 'Ed25519',
  },
  {
    id: 'cred-3',
    name: 'Hepatitis B',
    type: 'vaccination',
    issuer: 'issuer-3',
    issuerName: 'General Hospital',
    issuedAt: '2024-03-10T00:00:00Z',
    updatedAt: '2024-03-10T00:00:00Z',
    status: 'revoked' as const,
    proofType: 'Ed25519',
    signatureAlgorithm: 'Ed25519',
  },
];

describe('CredentialMetadataDisplay', () => {
  it('renders the heading', () => {
    renderWithProviders(<CredentialMetadataDisplay credentials={mockCredentials} />);
    expect(screen.getByText('Credential Metadata')).toBeInTheDocument();
  });

  it('renders credential names', () => {
    renderWithProviders(<CredentialMetadataDisplay credentials={mockCredentials} />);
    expect(screen.getByText('COVID-19 Vaccination')).toBeInTheDocument();
    expect(screen.getByText('Flu Shot 2025')).toBeInTheDocument();
    expect(screen.getByText('Hepatitis B')).toBeInTheDocument();
  });

  it('renders issuer names', () => {
    renderWithProviders(<CredentialMetadataDisplay credentials={mockCredentials} />);
    expect(screen.getByText('City Health Department')).toBeInTheDocument();
    expect(screen.getByText('Wellness Center')).toBeInTheDocument();
    expect(screen.getByText('General Hospital')).toBeInTheDocument();
  });

  it('renders summary section with totals', () => {
    renderWithProviders(<CredentialMetadataDisplay credentials={mockCredentials} />);
    expect(screen.getByText('Total Credentials')).toBeInTheDocument();
    // Active appears in multiple places, use getAllByText
    const activeElements = screen.getAllByText('Active');
    expect(activeElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Unique Issuers')).toBeInTheDocument();
    expect(screen.getByText('Credential Types')).toBeInTheDocument();
  });

  it('renders expired/revoked alert badges', () => {
    renderWithProviders(<CredentialMetadataDisplay credentials={mockCredentials} />);
    expect(screen.getByText('1 Expired')).toBeInTheDocument();
    expect(screen.getByText('1 Revoked')).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderWithProviders(<CredentialMetadataDisplay credentials={mockCredentials} />);
    expect(screen.getByPlaceholderText('Search by name, issuer, type, or description...')).toBeInTheDocument();
  });

  it('filters credentials by search query', () => {
    renderWithProviders(<CredentialMetadataDisplay credentials={mockCredentials} />);
    const searchInput = screen.getByPlaceholderText('Search by name, issuer, type, or description...');
    fireEvent.change(searchInput, { target: { value: 'Flu' } });
    expect(screen.getByText('Flu Shot 2025')).toBeInTheDocument();
    expect(screen.queryByText('COVID-19 Vaccination')).not.toBeInTheDocument();
    expect(screen.queryByText('Hepatitis B')).not.toBeInTheDocument();
  });

  it('shows empty state when no credentials match filter', () => {
    renderWithProviders(<CredentialMetadataDisplay credentials={mockCredentials} />);
    const searchInput = screen.getByPlaceholderText('Search by name, issuer, type, or description...');
    fireEvent.change(searchInput, { target: { value: 'ZZZNonexistent' } });
    // When no results, the filtered credentials list is empty
    expect(screen.getByText(/Showing 0 of/)).toBeInTheDocument();
  });

  it('shows empty state when credentials array is empty', () => {
    renderWithProviders(<CredentialMetadataDisplay credentials={[]} />);
    // When array is empty, the component should show an empty state
    expect(screen.getByText('Credential Metadata')).toBeInTheDocument();
  });

  it('renders filter dropdown', () => {
    renderWithProviders(<CredentialMetadataDisplay credentials={mockCredentials} />);
    expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
    expect(screen.getByText('All Status')).toBeInTheDocument();
  });

  it('filters by status via select', () => {
    renderWithProviders(<CredentialMetadataDisplay credentials={mockCredentials} />);
    const filterSelect = screen.getByLabelText('Filter by status');
    fireEvent.change(filterSelect, { target: { value: 'active' } });
    expect(screen.getByText('COVID-19 Vaccination')).toBeInTheDocument();
    expect(screen.queryByText('Flu Shot 2025')).not.toBeInTheDocument();
    expect(screen.queryByText('Hepatitis B')).not.toBeInTheDocument();
  });

  it('renders select all checkbox', () => {
    renderWithProviders(<CredentialMetadataDisplay credentials={mockCredentials} />);
    const selectAllCheck = screen.getByLabelText('Select all credentials');
    expect(selectAllCheck).toBeInTheDocument();
  });

  it('renders compare button', () => {
    renderWithProviders(<CredentialMetadataDisplay credentials={mockCredentials} />);
    expect(screen.getByText('Compare')).toBeInTheDocument();
  });

  it('renders refresh button', () => {
    renderWithProviders(<CredentialMetadataDisplay credentials={mockCredentials} />);
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('expands credential details when clicked', () => {
    renderWithProviders(<CredentialMetadataDisplay credentials={mockCredentials} />);
    // Click on the first credential name to expand
    fireEvent.click(screen.getByText('COVID-19 Vaccination'));
    // After expansion, extra details should appear
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Technical Details')).toBeInTheDocument();
    expect(screen.getByText('Change History')).toBeInTheDocument();
  });
});