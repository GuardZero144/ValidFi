import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationPreferences } from '../src/components/NotificationPreferences';
import { AccessibilityProvider } from '../src/contexts/AccessibilityContext';
import { NotificationProvider } from '../src/contexts/NotificationContext';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <AccessibilityProvider>
      <NotificationProvider>
        {ui}
      </NotificationProvider>
    </AccessibilityProvider>
  );
}

describe('NotificationPreferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the preferences heading', () => {
    renderWithProviders(<NotificationPreferences />);
    expect(screen.getByText('Notification Channels')).toBeInTheDocument();
    expect(screen.getByText('Alert Types')).toBeInTheDocument();
  });

  it('renders channel options', () => {
    renderWithProviders(<NotificationPreferences />);
    expect(screen.getByText('In-App Notifications')).toBeInTheDocument();
    expect(screen.getByText('Push Notifications')).toBeInTheDocument();
    expect(screen.getByText('Email Notifications')).toBeInTheDocument();
  });

  it('renders alert type options', () => {
    renderWithProviders(<NotificationPreferences />);
    expect(screen.getByText('Credential Expiry')).toBeInTheDocument();
    expect(screen.getByText('Verification Complete')).toBeInTheDocument();
    expect(screen.getByText('Sharing Requests')).toBeInTheDocument();
  });

  it('toggles in-app notifications checkbox', () => {
    renderWithProviders(<NotificationPreferences />);
    const inAppCheckbox = screen.getByLabelText('In-app notifications');
    expect(inAppCheckbox).toBeChecked();
    fireEvent.click(inAppCheckbox);
    expect(inAppCheckbox).not.toBeChecked();
  });

  it('shows email input when email notifications are enabled', () => {
    renderWithProviders(<NotificationPreferences />);
    // Email is disabled by default, so enable it first
    const emailCheckbox = screen.getByLabelText('Email notifications');
    expect(emailCheckbox).not.toBeChecked();
    fireEvent.click(emailCheckbox);
    expect(emailCheckbox).toBeChecked();
    // Now email input should appear
    expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument();
  });

  it('hides email input when email notifications are disabled', () => {
    renderWithProviders(<NotificationPreferences />);
    // Email is disabled by default, so no input
    expect(screen.queryByPlaceholderText('your@email.com')).not.toBeInTheDocument();
  });

  it('updates email address input', () => {
    renderWithProviders(<NotificationPreferences />);
    // Enable email first
    const emailCheckbox = screen.getByLabelText('Email notifications');
    fireEvent.click(emailCheckbox);
    const emailInput = screen.getByPlaceholderText('your@email.com');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    expect(emailInput).toHaveValue('test@example.com');
  });

  it('renders Enable button for push when push is disabled', () => {
    renderWithProviders(<NotificationPreferences />);
    // push defaults to false
    expect(screen.getByLabelText('Enable push notifications')).toBeInTheDocument();
  });

  it('toggles credential expiry checkbox', () => {
    renderWithProviders(<NotificationPreferences />);
    const expiryCheckbox = screen.getByLabelText('Credential expiry notifications');
    expect(expiryCheckbox).toBeChecked();
    fireEvent.click(expiryCheckbox);
    expect(expiryCheckbox).not.toBeChecked();
  });
});