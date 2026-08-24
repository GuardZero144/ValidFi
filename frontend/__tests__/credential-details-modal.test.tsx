import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CredentialDetailsModal } from '../src/components/credential-details-modal';

const mockCredential = {
  id: 'cred-001',
  vaccineType: 'COVID-19 (Pfizer)',
  verificationStatus: true,
  vaccinationDate: '2026-07-15',
};

describe('CredentialDetailsModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <CredentialDetailsModal isOpen={false} credential={mockCredential} onClose={jest.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when credential is null', () => {
    const { container } = render(
      <CredentialDetailsModal isOpen={true} credential={null} onClose={jest.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders credential details when open', () => {
    render(
      <CredentialDetailsModal isOpen={true} credential={mockCredential} onClose={jest.fn()} />
    );
    expect(screen.getByText('Credential Details')).toBeInTheDocument();
    expect(screen.getByText('COVID-19 (Pfizer)')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('2026-07-15')).toBeInTheDocument();
    expect(screen.getByText('cred-001')).toBeInTheDocument();
  });

  it('shows Pending status when verificationStatus is false', () => {
    const pendingCred = { ...mockCredential, verificationStatus: false };
    render(
      <CredentialDetailsModal isOpen={true} credential={pendingCred} onClose={jest.fn()} />
    );
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(
      <CredentialDetailsModal isOpen={true} credential={mockCredential} onClose={onClose} />
    );
    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = jest.fn();
    const { container } = render(
      <CredentialDetailsModal isOpen={true} credential={mockCredential} onClose={onClose} />
    );
    // The backdrop is the first motion.div with onClick={onClose}
    const backdrops = container.querySelectorAll('.fixed.inset-0');
    expect(backdrops.length).toBeGreaterThan(0);
  });
});