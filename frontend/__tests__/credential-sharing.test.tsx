import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CredentialSharing } from '../src/components/credential-sharing';
import { AccessibilityProvider } from '../src/contexts/AccessibilityContext';
import {
  credentialSharingSchema,
  CREDENTIAL_OPTIONS,
  DURATION_OPTIONS,
} from '../src/utils/credential-validation';

function renderWithProviders(ui: React.ReactElement) {
  return render(<AccessibilityProvider>{ui}</AccessibilityProvider>);
}

const VALID_ADDRESS = 'G' + 'A'.repeat(55); // 56 chars

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

  it('renders shared credentials section heading', () => {
    renderWithProviders(<CredentialSharing walletAddress={walletAddress} />);
    expect(screen.getByText('Shared Credentials')).toBeInTheDocument();
  });

  it('renders credential options in the select', () => {
    renderWithProviders(<CredentialSharing walletAddress={walletAddress} />);
    const select = screen.getByLabelText('Select Vaccination Credential');
    expect(select).toBeInTheDocument();
    for (const option of CREDENTIAL_OPTIONS) {
      expect(screen.getByText(option.label)).toBeInTheDocument();
    }
  });

  it('renders help text for each field', () => {
    renderWithProviders(<CredentialSharing walletAddress={walletAddress} />);
    expect(
      screen.getByText('Stellar wallet addresses start with G and are 56 characters long')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Choose which vaccination proof you want to share')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Choose how long the recipient can access your proof')
    ).toBeInTheDocument();
  });
});

describe('CredentialSharing validation', () => {
  const walletAddress = 'GABCDEF123456...';

  it('does not show errors for untouched empty fields initially', () => {
    renderWithProviders(<CredentialSharing walletAddress={walletAddress} />);
    expect(screen.queryByText('Recipient wallet address is required')).not.toBeInTheDocument();
    expect(screen.queryByText('Please select a vaccination credential')).not.toBeInTheDocument();
    expect(screen.queryByText('Please select a proof duration')).not.toBeInTheDocument();
  });

  it('shows required-field errors when submitting an empty form', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CredentialSharing walletAddress={walletAddress} />);

    const submitButton = screen.getByRole('button', { name: 'Share vaccination proof' });
    await user.click(submitButton);

    expect(screen.getByText('Recipient wallet address is required')).toBeInTheDocument();
    expect(screen.getByText('Please select a vaccination credential')).toBeInTheDocument();
    expect(screen.getByText('Please select a proof duration')).toBeInTheDocument();
  });

  it('validates the recipient address in real-time as the user types', async () => {
    renderWithProviders(<CredentialSharing walletAddress={walletAddress} />);

    // Type length must be 56 chars — we use a shorter invalid string
    const input = screen.getByLabelText('Recipient Wallet Address');

    // Type an invalid address (wrong length)
    await userEvent.type(input, 'GABCDEF1234567890');
    expect(
      screen.getByText('Stellar wallet addresses start with G and are 56 characters long')
    ).toBeInTheDocument();

    // Clear and type a valid 56-char address
    await userEvent.clear(input);
    await userEvent.type(input, VALID_ADDRESS);
    expect(document.getElementById('recipient-address-error')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Recipient wallet address is valid')).toBeInTheDocument();
  });

  it('highlights invalid fields with red border', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CredentialSharing walletAddress={walletAddress} />);

    // Submit empty form to trigger all errors
    await user.click(screen.getByRole('button', { name: 'Share vaccination proof' }));

    const input = screen.getByLabelText('Recipient Wallet Address');
    expect(input).toHaveAttribute('aria-invalid', 'true');

    // The credential select should also be invalid
    const credentialSelect = screen.getByLabelText('Select Vaccination Credential');
    expect(credentialSelect).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows success indicators when fields are valid', async () => {
    renderWithProviders(<CredentialSharing walletAddress={walletAddress} />);

    // Initially no success icons
    expect(
      screen.queryByLabelText('Recipient wallet address is valid')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('Vaccination credential is valid')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('Proof duration is valid')
    ).not.toBeInTheDocument();

    // Fill all fields with valid values
    const input = screen.getByLabelText('Recipient Wallet Address');
    await userEvent.clear(input);
    await userEvent.type(input, VALID_ADDRESS);

    const credentialSelect = screen.getByLabelText('Select Vaccination Credential');
    await userEvent.selectOptions(credentialSelect, CREDENTIAL_OPTIONS[0].value);

    const durationSelect = screen.getByLabelText('Proof Duration');
    await userEvent.selectOptions(durationSelect, '86400');

    // Now all success indicators should appear
    expect(
      screen.getByLabelText('Recipient wallet address is valid')
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Vaccination credential is valid')
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Proof duration is valid')
    ).toBeInTheDocument();
  });

  it('clears errors when valid input is provided', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CredentialSharing walletAddress={walletAddress} />);

    // Trigger errors by submitting
    await user.click(screen.getByRole('button', { name: 'Share vaccination proof' }));
    expect(screen.getByText('Please select a vaccination credential')).toBeInTheDocument();

    // Select a credential
    const credentialSelect = screen.getByLabelText('Select Vaccination Credential');
    await user.selectOptions(credentialSelect, CREDENTIAL_OPTIONS[0].value);

    // Error should clear
    expect(
      screen.queryByText('Please select a vaccination credential')
    ).not.toBeInTheDocument();
  });

  it('shows error icon on invalid fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CredentialSharing walletAddress={walletAddress} />);

    // Submit empty to trigger errors
    await user.click(screen.getByRole('button', { name: 'Share vaccination proof' }));

    // AlertCircle icons should be visible (rendered with aria-hidden, so we check presence of the error text)
    expect(screen.getByText('Recipient wallet address is required')).toBeInTheDocument();
    expect(screen.getByText('Please select a vaccination credential')).toBeInTheDocument();
    expect(screen.getByText('Please select a proof duration')).toBeInTheDocument();
  });

  it('shows the correct error message for invalid stellar address', async () => {
    renderWithProviders(<CredentialSharing walletAddress={walletAddress} />);

    const input = screen.getByLabelText('Recipient Wallet Address');
    await userEvent.type(input, 'BADADDRESS');

    expect(
      screen.getByText('Stellar wallet addresses start with G and are 56 characters long')
    ).toBeInTheDocument();
  });
});

describe('CredentialSharing zod schema', () => {
  it('accepts a valid form payload', () => {
    const result = credentialSharingSchema.safeParse({
      recipientAddress: VALID_ADDRESS,
      credentialId: 'covid-19-vaccination',
      duration: '86400',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid recipient address', () => {
    const result = credentialSharingSchema.safeParse({
      recipientAddress: 'BAD',
      credentialId: 'covid-19-vaccination',
      duration: '86400',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'Stellar wallet addresses start with G and are 56 characters long'
      );
    }
  });

  it('rejects an empty credential id', () => {
    const result = credentialSharingSchema.safeParse({
      recipientAddress: VALID_ADDRESS,
      credentialId: '',
      duration: '86400',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Please select a vaccination credential');
    }
  });

  it('rejects an empty duration', () => {
    const result = credentialSharingSchema.safeParse({
      recipientAddress: VALID_ADDRESS,
      credentialId: 'covid-19-vaccination',
      duration: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Please select a proof duration');
    }
  });

  it('validates the generated test address is exactly 56 characters', () => {
    expect(VALID_ADDRESS).toHaveLength(56);
    expect(VALID_ADDRESS.startsWith('G')).toBe(true);
  });
});