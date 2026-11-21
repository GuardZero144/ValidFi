import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeletionConfirmationModal } from '../src/components/deletion-confirmation-modal';
import { AccessibilityProvider } from '../src/contexts/AccessibilityContext';

function renderWithProviders(ui: React.ReactElement) {
  return render(<AccessibilityProvider>{ui}</AccessibilityProvider>);
}

const mockCredential = {
  id: 'cred-001',
  vaccineType: 'COVID-19 (Pfizer)',
  verificationStatus: true,
  vaccinationDate: '2026-07-15',
};

describe('DeletionConfirmationModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = renderWithProviders(
      <DeletionConfirmationModal
        isOpen={false}
        credential={mockCredential}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        deletionStatus="idle"
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when credential is null', () => {
    const { container } = renderWithProviders(
      <DeletionConfirmationModal
        isOpen={true}
        credential={null}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        deletionStatus="idle"
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders credential details when open', () => {
    renderWithProviders(
      <DeletionConfirmationModal
        isOpen={true}
        credential={mockCredential}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        deletionStatus="idle"
      />
    );
    expect(screen.getByText('Delete Credential')).toBeInTheDocument();
    expect(screen.getByText('COVID-19 (Pfizer)')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('2026-07-15')).toBeInTheDocument();
  });

  it('disables delete button until DELETE is typed', () => {
    renderWithProviders(
      <DeletionConfirmationModal
        isOpen={true}
        credential={mockCredential}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        deletionStatus="idle"
      />
    );
    const deleteButton = screen.getByText('Delete Permanently');
    expect(deleteButton).toBeDisabled();

    const input = screen.getByPlaceholderText('Type DELETE');
    fireEvent.change(input, { target: { value: 'DELETE' } });
    // Re-query the button after state change (component re-renders)
    const enabledButton = screen.getByText('Delete Permanently');
    expect(enabledButton).not.toBeDisabled();
  });

  it('calls onConfirm when delete button is clicked with confirmation', () => {
    const onConfirm = jest.fn();
    renderWithProviders(
      <DeletionConfirmationModal
        isOpen={true}
        credential={mockCredential}
        onConfirm={onConfirm}
        onCancel={jest.fn()}
        deletionStatus="idle"
      />
    );
    const input = screen.getByPlaceholderText('Type DELETE');
    fireEvent.change(input, { target: { value: 'DELETE' } });
    fireEvent.click(screen.getByText('Delete Permanently'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when Cancel button is clicked', () => {
    const onCancel = jest.fn();
    renderWithProviders(
      <DeletionConfirmationModal
        isOpen={true}
        credential={mockCredential}
        onConfirm={jest.fn()}
        onCancel={onCancel}
        deletionStatus="idle"
      />
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows deleting state', () => {
    renderWithProviders(
      <DeletionConfirmationModal
        isOpen={true}
        credential={mockCredential}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        deletionStatus="deleting"
      />
    );
    expect(screen.getByText('Deleting credential...')).toBeInTheDocument();
  });

  it('shows deleted state', () => {
    renderWithProviders(
      <DeletionConfirmationModal
        isOpen={true}
        credential={mockCredential}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        deletionStatus="deleted"
      />
    );
    expect(screen.getByText('Credential deleted')).toBeInTheDocument();
  });

  it('shows failed state', () => {
    renderWithProviders(
      <DeletionConfirmationModal
        isOpen={true}
        credential={mockCredential}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        deletionStatus="failed"
      />
    );
    expect(screen.getByText('Deletion failed')).toBeInTheDocument();
  });

  it('shows undoable state with undo button', () => {
    const onUndo = jest.fn();
    renderWithProviders(
      <DeletionConfirmationModal
        isOpen={true}
        credential={mockCredential}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        onUndo={onUndo}
        deletionStatus="undoable"
      />
    );
    expect(screen.getByText(/You can undo this action within/)).toBeInTheDocument();
    expect(screen.getByText('Undo Delete')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Undo Delete'));
    expect(onUndo).toHaveBeenCalled();
  });
});