import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { HealthCredentialVault } from '../src/components/health-credential-vault';
import { AccessibilityProvider } from '../src/contexts/AccessibilityContext';

// Mock crypto.randomUUID
const mockUUID = 'test-uuid-12345';
global.crypto.randomUUID = jest.fn(() => mockUUID);

function renderWithProviders(ui: React.ReactElement) {
  return render(<AccessibilityProvider>{ui}</AccessibilityProvider>);
}

describe('HealthCredentialVault', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the vault heading', () => {
    renderWithProviders(<HealthCredentialVault walletAddress="GABCDEF123456..." />);
    expect(screen.getByText('Health Credential Vault')).toBeInTheDocument();
  });

  it('renders upload area', () => {
    renderWithProviders(<HealthCredentialVault walletAddress="GABCDEF123456..." />);
    expect(screen.getByText('Upload your vaccination records')).toBeInTheDocument();
    expect(screen.getByText('Select File')).toBeInTheDocument();
  });

  it('shows empty state when no credentials exist', () => {
    renderWithProviders(<HealthCredentialVault walletAddress="GABCDEF123456..." />);
    expect(screen.getByText('No health credentials uploaded yet')).toBeInTheDocument();
  });

  it('has file upload input accessible via label', () => {
    renderWithProviders(<HealthCredentialVault walletAddress="GABCDEF123456..." />);
    const fileInput = screen.getByLabelText('Upload vaccination record file');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('type', 'file');
  });

  it('renders with correct aria region', () => {
    renderWithProviders(<HealthCredentialVault walletAddress="GABCDEF123456..." />);
    const region = screen.getByRole('region', { name: 'Health Credential Vault' });
    expect(region).toBeInTheDocument();
  });

  it('renders file upload area', () => {
    renderWithProviders(<HealthCredentialVault walletAddress="GABCDEF123456..." />);
    const uploadRegion = screen.getByRole('region', { name: 'File upload area' });
    expect(uploadRegion).toBeInTheDocument();
  });

  it('does not render credential list items when empty', () => {
    renderWithProviders(<HealthCredentialVault walletAddress="GABCDEF123456..." />);
    const list = screen.getByRole('list', { name: 'Uploaded credentials' });
    expect(list).toBeInTheDocument();
    // Empty state should show
    expect(screen.getByText('No health credentials uploaded yet')).toBeInTheDocument();
  });
});