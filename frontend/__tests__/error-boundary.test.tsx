import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../src/components/error-boundary';

// Mock the error-handling utility
jest.mock('../src/utils/error-handling', () => ({
  logError: jest.fn(),
}));

const GoodComponent = () => <div>Everything is fine</div>;

const BadComponent = () => {
  throw new Error('Test error');
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <GoodComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Everything is fine')).toBeInTheDocument();
  });

  it('renders error state when a child throws', () => {
    render(
      <ErrorBoundary>
        <BadComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <BadComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('resets error state when Try Again is clicked', () => {
    render(
      <ErrorBoundary>
        <BadComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Try Again'));
    // After reset, the component re-renders and will throw again since BadComponent always throws
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('calls onReset when provided and Try Again is clicked', () => {
    const onReset = jest.fn();
    render(
      <ErrorBoundary onReset={onReset}>
        <BadComponent />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByText('Try Again'));
    expect(onReset).toHaveBeenCalled();
  });

  it('shows generic error message when no error message is available', () => {
    const ThrowsNull = () => {
      throw null;
    };
    render(
      <ErrorBoundary>
        <ThrowsNull />
      </ErrorBoundary>
    );
    expect(screen.getByText('An unexpected error occurred while loading this component.')).toBeInTheDocument();
  });
});