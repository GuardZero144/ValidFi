import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { CredentialAnalyticsDashboard } from '../src/components/credential-analytics-dashboard';

// Mock fetch to reject so the component falls back to MOCK_DATA
global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

describe('CredentialAnalyticsDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state initially', () => {
    render(<CredentialAnalyticsDashboard />);
    expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
  });

  it('renders dashboard with mock data after loading', async () => {
    render(<CredentialAnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Credential Analytics Dashboard')).toBeInTheDocument();
    });

    // Check usage stats
    expect(screen.getByText('Total Credentials Issued')).toBeInTheDocument();
    expect(screen.getByText('Total Verifications')).toBeInTheDocument();
    expect(screen.getByText('Data Shares')).toBeInTheDocument();

    // Check mock data values
    expect(screen.getByText('120')).toBeInTheDocument(); // totalIdentities
    expect(screen.getByText('300')).toBeInTheDocument(); // total verifications
    expect(screen.getByText('150')).toBeInTheDocument(); // total shares
  });

  it('renders system status', async () => {
    render(<CredentialAnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/operational/i)).toBeInTheDocument();
    });

    expect(screen.getByText('99.99%')).toBeInTheDocument(); // uptime
    expect(screen.getByText('45ms')).toBeInTheDocument(); // api latency
  });

  it('renders quick action buttons', async () => {
    render(<CredentialAnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Issue New')).toBeInTheDocument();
    });

    expect(screen.getByText('Export Report')).toBeInTheDocument();
  });

  it('renders recent activity section', async () => {
    render(<CredentialAnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });

    // Check for activity items
    expect(screen.getByText(/Vaccination verified by Clinic A/)).toBeInTheDocument();
    expect(screen.getByText(/Credential shared with Employer B/)).toBeInTheDocument();
  });

  it('renders verification trend section', async () => {
    render(<CredentialAnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Verification Trend (Last 7 Days)')).toBeInTheDocument();
    });
  });

  it('renders verification rates pie chart', async () => {
    render(<CredentialAnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Verification Rates')).toBeInTheDocument();
    });
  });

  it('shows loading while fetch is pending', async () => {
    // Make fetch never resolve/reject
    global.fetch = jest.fn(() => new Promise(() => {}));
    render(<CredentialAnalyticsDashboard />);
    expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
  });
});