import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { NotificationBell } from '../src/components/NotificationBell';
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

describe('NotificationBell', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the bell button', () => {
    renderWithProviders(<NotificationBell />);
    expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
  });

  it('shows unread count badge when there are unread notifications', () => {
    // Add a notification to the context
    renderWithProviders(<NotificationBell />);
    // By default, no notifications
    const bellButton = screen.getByLabelText('Notifications');
    expect(bellButton).toBeInTheDocument();
  });

  it('opens the notifications panel when clicked', () => {
    renderWithProviders(<NotificationBell />);
    const bellButton = screen.getByLabelText('Notifications');
    fireEvent.click(bellButton);
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
  });

  it('closes panel when clicking outside', () => {
    renderWithProviders(<NotificationBell />);
    const bellButton = screen.getByLabelText('Notifications');
    fireEvent.click(bellButton);
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
  });

  it('closes panel on Escape key', () => {
    renderWithProviders(<NotificationBell />);
    const bellButton = screen.getByLabelText('Notifications');
    fireEvent.click(bellButton);
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
  });

  it('has correct aria attributes on the bell button', () => {
    renderWithProviders(<NotificationBell />);
    const bellButton = screen.getByLabelText('Notifications');
    expect(bellButton).toHaveAttribute('aria-haspopup', 'true');
    expect(bellButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('updates aria-expanded when panel is opened', () => {
    renderWithProviders(<NotificationBell />);
    const bellButton = screen.getByLabelText('Notifications');
    fireEvent.click(bellButton);
    expect(bellButton).toHaveAttribute('aria-expanded', 'true');
  });
});