import { render, screen } from '@testing-library/react';
import { VaccinationProofGenerator } from '../src/components/vaccination-proof-generator';
import { AccessibilityProvider } from '../src/contexts/AccessibilityContext';

const MOCK_CREDENTIALS = [
  { id: 'cred-1', vaccineType: 'COVID-19 (Pfizer)', verificationStatus: true, vaccinationDate: '2026-01-15' },
  { id: 'cred-2', vaccineType: 'Influenza 2025', verificationStatus: false, vaccinationDate: '2025-09-20' },
];

function renderGenerator(credentials = MOCK_CREDENTIALS) {
  return render(
    <AccessibilityProvider>
      <VaccinationProofGenerator walletAddress="GABCDEF123456..." credentials={credentials} />
    </AccessibilityProvider>
  );
}

describe('VaccinationProofGenerator', () => {
  it('renders section heading', () => {
    renderGenerator();
    expect(screen.getByText('Vaccination Proof Generator')).toBeInTheDocument();
  });

  it('renders credential selection dropdown', () => {
    renderGenerator();
    expect(screen.getByLabelText('Select Vaccination Credential')).toBeInTheDocument();
  });

  it('renders credential options', () => {
    renderGenerator();
    expect(screen.getByText('COVID-19 (Pfizer) — Verified')).toBeInTheDocument();
    expect(screen.getByText('Influenza 2025 — Pending')).toBeInTheDocument();
  });

  it('renders proof duration selector', () => {
    renderGenerator();
    expect(screen.getByLabelText('Proof Duration')).toBeInTheDocument();
    expect(screen.getByText('1 hour')).toBeInTheDocument();
    expect(screen.getByText('1 day')).toBeInTheDocument();
    expect(screen.getByText('1 week')).toBeInTheDocument();
    expect(screen.getByText('1 month')).toBeInTheDocument();
    expect(screen.getByText('1 year')).toBeInTheDocument();
  });

  it('renders verification level selector', () => {
    renderGenerator();
    expect(screen.getByLabelText('Verification Level')).toBeInTheDocument();
    expect(screen.getByText('Basic — Status only')).toBeInTheDocument();
    expect(screen.getByText('Advanced — Status + issuer')).toBeInTheDocument();
    expect(screen.getByText('Full — All credential data')).toBeInTheDocument();
  });

  it('renders toggle options', () => {
    renderGenerator();
    expect(screen.getByText('Include issuer information')).toBeInTheDocument();
    expect(screen.getByText('Include vaccination date')).toBeInTheDocument();
  });

  it('renders generate button', () => {
    renderGenerator();
    const buttons = screen.getAllByText('Generate Proof');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows no credentials message when empty', () => {
    renderGenerator([]);
    expect(screen.getByText('No credentials available. Upload a vaccination record first.')).toBeInTheDocument();
  });

  it('renders generate button disabled when no credential selected', () => {
    renderGenerator();
    // Default state has no credential selected, so button should be disabled
    const buttons = screen.getAllByText('Generate Proof');
    const button = buttons.find((el) => el.tagName === 'BUTTON');
    expect(button).toBeDisabled();
  });

  it('renders duration options in correct order', () => {
    renderGenerator();
    const select = screen.getByLabelText('Proof Duration') as HTMLSelectElement;
    expect(select.value).toBe('86400'); // 1 day default
  });

  it('renders with empty credentials array', () => {
    renderGenerator([]);
    const select = screen.getByLabelText('Select Vaccination Credential') as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.options.length).toBe(1); // Only the placeholder
  });

  it('renders accessible region', () => {
    renderGenerator();
    const region = screen.getByRole('region', { name: 'Vaccination Proof Generator' });
    expect(region).toBeInTheDocument();
  });
});