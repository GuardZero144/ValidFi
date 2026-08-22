import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '../src/components/loading/loading-spinner';
import { SkeletonCard } from '../src/components/loading/skeleton-card';
import { SkeletonAnalytics } from '../src/components/loading/skeleton-analytics';

describe('LoadingSpinner', () => {
  it('renders default spinner', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<LoadingSpinner label="Loading..." />);
    const labels = screen.getAllByText('Loading...');
    expect(labels.length).toBeGreaterThanOrEqual(1);
    expect(labels[0]).toBeInTheDocument();
  });

  it('renders with custom size', () => {
    const { container } = render(<LoadingSpinner size="sm" />);
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    const { container } = render(<LoadingSpinner className="my-4" />);
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toBeInTheDocument();
  });

  it('has sr-only text for accessibility', () => {
    render(<LoadingSpinner />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('has aria-live polite for screen readers', () => {
    render(<LoadingSpinner label="fetching data" />);
    const statuses = screen.getAllByRole('status');
    expect(statuses.length).toBeGreaterThanOrEqual(1);
    expect(statuses[0]).toHaveAttribute('aria-live', 'polite');
  });
});

describe('SkeletonCard', () => {
  it('renders default skeleton with 3 cards', () => {
    const { container } = render(<SkeletonCard />);
    const skeleton = screen.getByTestId('skeleton-card');
    expect(skeleton).toBeInTheDocument();
    // Should have 3 skeleton card items
    const items = container.querySelectorAll('.rounded-lg');
    expect(items.length).toBeGreaterThanOrEqual(3);
  });

  it('renders custom count', () => {
    const { container } = render(<SkeletonCard count={5} />);
    const items = container.querySelectorAll('.rounded-lg');
    expect(items.length).toBeGreaterThanOrEqual(5);
  });

  it('has aria-busy true', () => {
    render(<SkeletonCard />);
    const skeleton = screen.getByTestId('skeleton-card');
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
  });

  it('has accessible label', () => {
    render(<SkeletonCard label="Loading vault" />);
    const skeleton = screen.getByTestId('skeleton-card');
    expect(skeleton).toHaveAttribute('aria-label', 'Loading vault');
  });

  it('has sr-only text', () => {
    render(<SkeletonCard />);
    expect(screen.getByText('Loading credentials...')).toBeInTheDocument();
  });
});

describe('SkeletonAnalytics', () => {
  it('renders analytics skeleton', () => {
    const { container } = render(<SkeletonAnalytics />);
    const skeleton = screen.getByTestId('skeleton-analytics');
    expect(skeleton).toBeInTheDocument();
  });

  it('has aria-busy true', () => {
    render(<SkeletonAnalytics />);
    const skeleton = screen.getByTestId('skeleton-analytics');
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
  });

  it('has sr-only text', () => {
    render(<SkeletonAnalytics />);
    expect(screen.getByText('Loading analytics dashboard...')).toBeInTheDocument();
  });
});