import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CredentialEditModal } from '../src/components/credential-edit-modal';

const mockCredential = {
  id: 'cred-001',
  vaccineType: 'COVID-19 (Pfizer)',
  verificationStatus: true,
  vaccinationDate: '2026-07-15',
};

describe('CredentialEditModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <CredentialEditModal isOpen={false} credential={mockCredential} onSave={jest.fn()} onClose={jest.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when credential is null', () => {
    const { container } = render(
      <CredentialEditModal isOpen={true} credential={null} onSave={jest.fn()} onClose={jest.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders edit form with credential values', () => {
    render(
      <CredentialEditModal isOpen={true} credential={mockCredential} onSave={jest.fn()} onClose={jest.fn()} />
    );
    expect(screen.getByText('Edit Metadata')).toBeInTheDocument();
    expect(screen.getByDisplayValue('COVID-19 (Pfizer)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-07-15')).toBeInTheDocument();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onSave with updated credential on form submit', () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    render(
      <CredentialEditModal isOpen={true} credential={mockCredential} onSave={onSave} onClose={onClose} />
    );
    
    const vaccineInput = screen.getByDisplayValue('COVID-19 (Pfizer)');
    fireEvent.change(vaccineInput, { target: { value: 'COVID-19 (Moderna)' } });
    
    fireEvent.click(screen.getByText('Save Changes'));
    
    expect(onSave).toHaveBeenCalledWith({
      ...mockCredential,
      vaccineType: 'COVID-19 (Moderna)',
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Cancel button is clicked', () => {
    const onClose = jest.fn();
    render(
      <CredentialEditModal isOpen={true} credential={mockCredential} onSave={jest.fn()} onClose={onClose} />
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(
      <CredentialEditModal isOpen={true} credential={mockCredential} onSave={jest.fn()} onClose={onClose} />
    );
    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });
});