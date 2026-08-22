import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { CredentialSharing } from '../src/components/credential-sharing';
import { AccessibilityProvider } from '../src/contexts/AccessibilityContext';

function renderWithProviders(ui: React.ReactElement) {
  return render(<AccessibilityProvider>{ui}</AccessibilityProvider>);
}

describe('CredentialSharing', () => {
  const walletAddress = 'GABCDEF123456...';

  it('renders the heading', () => {
    renderWithProviders(<CredentialSharing walletAddress={walletAddress} />);
    expect(screen.getByText('Credential Sharing')).toBeInTheDocument();
  });

  it('renders share form elements', () => {
    renderWithProviders(<CredentialSharing walletAddress={walletAddress} />);
    expect(screen.getByText('Recipient Wallet Address')).toBeInTheDocument();
    expect(screen.getByText('Select Vaccination Credential')).toBeInTheDocument();
    expect(screen.getByText('Proof Duration')).toBeInTheDocument();
  });

  it('renders empty state when no credentials shared', () => {
    renderWithProviders(<CredentialSharing walletAddress={walletAddress} />);
    expect(screen.getByText('No credentials shared yet')).toBeInTheDocument();
  });

  it('renders share button', () => {
    renderWithProviders(<CredentialSharing walletAddress={walletAddress} />);
    const buttons = screen.getAllByText('Share Vaccination Proof');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
    const shareButton = buttons.find((el) => el.tagName === 'BUTTON');
    expect(shareButton).toBeInTheDocument();
  });

  it('renders duration options', () => {
    renderWithProviders(<CredentialSharing walletAddress={walletAddress} />);
    expect(screen.getByText('1 hour')).toBeInTheDocument();
    expect(screen.getByText('1 day')).toBeInTheDocument();
    expect(screen.getByText('1 week')).toBeInTheDocument();
    expect(screen.getByText('1 month')).toBeInTheDocument();
  });

  it('renders shared credentials section heading and status filters', () => {
    renderWithProviders(<CredentialSharing walletAddress={walletAddress} />);
    expect(screen.getByText('Shared Credentials')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Revoked')).toBeInTheDocument();
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('shares a credential and displays it with active status', async () => {
    jest.useFakeTimers();
    renderWithProviders(<CredentialSharing walletAddress={walletAddress} />);

    // Make the simulated network call deterministic (avoid the 10% random error)
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);

    const shareButton = screen
      .getAllByText('Share Vaccination Proof')
      .find((el) => el.tagName === 'BUTTON') as HTMLElement;

    // Wait for the share flow to complete inside act
    await act(async () => {
      fireEvent.click(shareButton);
      // Advance all setTimeout (stages + 2400ms final resolution)
      jest.runAllTimers();
    });

    // Flush remaining microtasks
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText(/COVID-19 Vaccination/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Status: Active/)).toBeInTheDocument();

    randomSpy.mockRestore();
    jest.useRealTimers();
  });
});