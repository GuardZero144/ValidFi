import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WalletConnect } from '../src/components/wallet-connect';
import { AccessibilityProvider } from '../src/contexts/AccessibilityContext';

jest.mock('framer-motion', () => {
  const React = require('react');
  return {
    ...jest.requireActual('framer-motion'),
    motion: new Proxy(
      {},
      {
        get: (_, tag) =>
          React.forwardRef(function MotionComponent(props: any, ref: any) {
            const { initial, animate, exit, transition, whileHover, whileTap, layout, ...rest } = props;
            return React.createElement(tag, { ...rest, ref });
          }),
      },
    ),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock('@stellar/freighter-api', () => ({
  __esModule: true,
  default: {
    isConnected: jest.fn(),
    getPublicKey: jest.fn(),
  },
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(<AccessibilityProvider>{ui}</AccessibilityProvider>);
}

// Reset the mocked freighter module state between tests
const mockFreighter = require('@stellar/freighter-api').default as {
  isConnected: jest.Mock;
  getPublicKey: jest.Mock;
};

describe('WalletConnect', () => {
  beforeEach(() => {
    mockFreighter.isConnected.mockReset();
    mockFreighter.getPublicKey.mockReset();
    (global as any).window.freighter = { getPublicKey: jest.fn() };
    (global as any).window.albedo = undefined;
    (global as any).window.lobstr = undefined;
  });

  afterEach(() => {
    delete (global as any).window.freighter;
    delete (global as any).window.albedo;
    delete (global as any).window.lobstr;
  });

  it('renders the connect button', () => {
    renderWithProviders(<WalletConnect onConnect={() => {}} />);
    expect(screen.getByLabelText('Connect wallet')).toBeInTheDocument();
  });

  it('connects via Freighter and calls onConnect with the address', async () => {
    mockFreighter.isConnected.mockResolvedValue(true);
    mockFreighter.getPublicKey.mockResolvedValue('GC4CQK3WXU7U7U7U7U7U7U7U7U7U7U7U7U7U7U7U7U7U7U');
    const onConnect = jest.fn();

    renderWithProviders(<WalletConnect onConnect={onConnect} />);
    fireEvent.click(screen.getByLabelText('Connect wallet'));

    await waitFor(() => {
      expect(mockFreighter.getPublicKey).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(onConnect).toHaveBeenCalledWith('GC4CQK3WXU7U7U7U7U7U7U7U7U7U7U7U7U7U7U7U7U7U7U');
    });
  });

  it('displays a truncated wallet address after connecting', async () => {
    mockFreighter.isConnected.mockResolvedValue(true);
    mockFreighter.getPublicKey.mockResolvedValue('GC4CQK3WXU7U7U7U7U7U7U7U7U7U7U7U7U7U7U7U7U7U7U');
    const onConnect = jest.fn();

    renderWithProviders(<WalletConnect onConnect={onConnect} />);
    fireEvent.click(screen.getByLabelText('Connect wallet'));

    await waitFor(() => {
      expect(screen.getByLabelText('Disconnect wallet')).toBeInTheDocument();
    });
    // Truncated address should be present (GC4CQ...U7U7U7U)
    expect(screen.getByText(/GC4CQ/)).toBeInTheDocument();
    const mono = screen.getByText(/U7U7U7U/);
    expect(mono).toBeInTheDocument();
    expect(mono.textContent).toBe('GC4CQ...U7U7U7U');
  });

  it('calls onDisconnect when the disconnect button is clicked', async () => {
    mockFreighter.isConnected.mockResolvedValue(true);
    mockFreighter.getPublicKey.mockResolvedValue('GC4CQK3WXU7U7U7U7U7U7U7U7U7U7U7U7U7U7U7U7U7U7U');
    const onDisconnect = jest.fn();

    renderWithProviders(
      <WalletConnect onConnect={() => {}} onDisconnect={onDisconnect} />,
    );
    fireEvent.click(screen.getByLabelText('Connect wallet'));

    await waitFor(() => {
      expect(screen.getByLabelText('Disconnect wallet')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText('Disconnect wallet'));

    await waitFor(() => {
      expect(onDisconnect).toHaveBeenCalled();
    });
    // Should return to connect state
    expect(screen.getByLabelText('Connect wallet')).toBeInTheDocument();
  });

  it('shows an error message when Freighter is not installed', async () => {
    mockFreighter.isConnected.mockRejectedValue(new Error('Freighter not found'));
    (global as any).window.freighter = undefined;

    renderWithProviders(<WalletConnect onConnect={() => {}} />);
    fireEvent.click(screen.getByLabelText('Connect wallet'));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert.textContent).toMatch(/Freighter/);
    });
  });

  it('opens the wallet selector when multiple wallets are available', () => {
    (global as any).window.freighter = { getPublicKey: jest.fn() };
    (global as any).window.albedo = { publicKey: jest.fn() };

    renderWithProviders(<WalletConnect onConnect={() => {}} />);
    // Button should indicate a selector
    const button = screen.getByLabelText('Select wallet to connect');
    fireEvent.click(button);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Freighter')).toBeInTheDocument();
    expect(screen.getByText('Albedo')).toBeInTheDocument();
  });

  it('shows copy button and Stellar Expert link when connected', async () => {
    mockFreighter.isConnected.mockResolvedValue(true);
    mockFreighter.getPublicKey.mockResolvedValue('GC4CQK3WXU7U7U7U7U7U7U7U7U7U7U7U7U7U7U7U7U7U7U');

    renderWithProviders(<WalletConnect onConnect={() => {}} />);
    fireEvent.click(screen.getByLabelText('Connect wallet'));

    await waitFor(() => {
      expect(screen.getByLabelText('Copy wallet address')).toBeInTheDocument();
      expect(screen.getByLabelText('View on Stellar Expert')).toBeInTheDocument();
    });
    const link = screen.getByLabelText('View on Stellar Expert');
    expect(link).toHaveAttribute(
      'href',
      'https://stellar.expert/explorer/public/account/GC4CQK3WXU7U7U7U7U7U7U7U7U7U7U7U7U7U7U7U7U7U7U',
    );
  });
});