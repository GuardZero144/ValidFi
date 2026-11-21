import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VaccinationVerificationCenter } from '../src/components/vaccination-verification-center';
import { AccessibilityProvider } from '../src/contexts/AccessibilityContext';

function renderWithProviders(ui: React.ReactElement) {
  return render(<AccessibilityProvider>{ui}</AccessibilityProvider>);
}

describe('VaccinationVerificationCenter', () => {
  it('renders the heading', () => {
    renderWithProviders(<VaccinationVerificationCenter walletAddress="GABCDEF123456..." />);
    expect(screen.getByText('Vaccination Verification Center')).toBeInTheDocument();
  });

  it('renders stats', () => {
    renderWithProviders(<VaccinationVerificationCenter walletAddress="GABCDEF123456..." />);
    // Mock data: 1 approved, 1 pending, 1 rejected
    // Stats and badges both show "Verified", "Pending", "Rejected" - use getAllByText
    expect(screen.getAllByText('Verified').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Rejected').length).toBeGreaterThanOrEqual(1);
  });

  it('renders count values', () => {
    renderWithProviders(<VaccinationVerificationCenter walletAddress="GABCDEF123456..." />);
    // Stats: 1 approved, 1 pending, 1 rejected
    const stats = screen.getAllByRole('status');
    expect(stats.length).toBeGreaterThanOrEqual(3);
  });

  it('renders verification items', () => {
    renderWithProviders(<VaccinationVerificationCenter walletAddress="GABCDEF123456..." />);
    expect(screen.getByText('COVID-19 (Pfizer)')).toBeInTheDocument();
    expect(screen.getByText('Influenza 2025')).toBeInTheDocument();
    expect(screen.getByText('Hepatitis B')).toBeInTheDocument();
  });

  it('renders status badges', () => {
    renderWithProviders(<VaccinationVerificationCenter walletAddress="GABCDEF123456..." />);
    // Status labels are shown in the badge
    expect(screen.getAllByText('Approved').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Rejected').length).toBeGreaterThanOrEqual(1);
  });

  it('renders date labels', () => {
    renderWithProviders(<VaccinationVerificationCenter walletAddress="GABCDEF123456..." />);
    // Mock data dates formatted as "Submitted: M/D/YYYY"
    expect(screen.getByText(/7\/15\/2026/)).toBeInTheDocument();
    expect(screen.getByText(/7\/18\/2026/)).toBeInTheDocument();
    expect(screen.getByText(/7\/10\/2026/)).toBeInTheDocument();
  });

  it('renders verification list', () => {
    renderWithProviders(<VaccinationVerificationCenter walletAddress="GABCDEF123456..." />);
    // The list has aria-label="Verification requests" but no visible heading
    const list = screen.getByRole('list', { name: /Verification requests/i });
    expect(list).toBeInTheDocument();
  });
});