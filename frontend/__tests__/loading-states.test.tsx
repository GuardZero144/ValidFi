import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '../src/components/animations/loading-spinner';
import { Skeleton, CredentialSkeleton } from '../src/components/animations/skeleton';
import { LoadingButton } from '../src/components/animations/loading-button';

describe('LoadingSpinner', () => {
  it('renders with default size', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
  });

  it('renders with custom label', () => {
    render(<LoadingSpinner label="Fetching data" />);
    expect(screen.getByText('Fetching data')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Fetching data');
  });

  it('applies size classes correctly', () => {
    const { container, rerender } = render(<LoadingSpinner size="sm" />);
    expect(container.querySelector('.w-4')).toBeInTheDocument();

    rerender(<LoadingSpinner size="md" />);
    expect(container.querySelector('.w-6')).toBeInTheDocument();

    rerender(<LoadingSpinner size="lg" />);
    expect(container.querySelector('.w-8')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<LoadingSpinner className="mt-4" />);
    expect(container.firstChild).toHaveClass('mt-4');
  });
});

describe('Skeleton', () => {
  it('renders with default text variant', () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.querySelector('[role="status"]');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute('aria-label', 'Loading content');
  });

  it('renders multiple lines for text variant', () => {
    const { container } = render(<Skeleton variant="text" lines={3} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons).toHaveLength(3);
  });

  it('renders circular variant', () => {
    const { container } = render(<Skeleton variant="circular" width={40} height={40} />);
    const skeleton = container.querySelector('.rounded-full');
    expect(skeleton).toBeInTheDocument();
  });

  it('renders rectangular variant', () => {
    const { container } = render(<Skeleton variant="rectangular" width={200} height={100} />);
    const skeleton = container.querySelector('.rounded-lg');
    expect(skeleton).toBeInTheDocument();
  });

  it('applies custom dimensions', () => {
    const { container } = render(<Skeleton width={150} height={20} />);
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).toHaveStyle({ width: '150px', height: '20px' });
  });
});

describe('CredentialSkeleton', () => {
  it('renders default count of 3 skeleton items', () => {
    const { container } = render(<CredentialSkeleton />);
    // Count the top-level skeleton card items (direct children with bg-white/10 and rounded-lg)
    const items = container.querySelectorAll('.bg-white\\/10.rounded-lg.p-4');
    expect(items).toHaveLength(3);
  });

  it('renders custom count of skeleton items', () => {
    const { container } = render(<CredentialSkeleton count={5} />);
    const items = container.querySelectorAll('.bg-white\\/10.rounded-lg.p-4');
    expect(items).toHaveLength(5);
  });

  it('has loading status role', () => {
    const { container } = render(<CredentialSkeleton />);
    const skeleton = container.querySelector('[aria-label="Loading credentials"]');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute('role', 'status');
  });

  it('contains circular and rectangular skeleton elements', () => {
    const { container } = render(<CredentialSkeleton count={1} />);
    expect(container.querySelector('.rounded-full')).toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });
});

describe('LoadingButton', () => {
  it('renders children when not loading', () => {
    render(<LoadingButton>Submit</LoadingButton>);
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  it('shows loading text when loading', () => {
    render(<LoadingButton isLoading loadingText="Saving...">Submit</LoadingButton>);
    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.queryByText('Submit')).not.toBeInTheDocument();
  });

  it('shows children as loading text when no loadingText provided', () => {
    render(<LoadingButton isLoading>Submit</LoadingButton>);
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  it('is disabled when loading', () => {
    render(<LoadingButton isLoading>Submit</LoadingButton>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });

  it('is disabled when disabled prop is true', () => {
    render(<LoadingButton disabled>Submit</LoadingButton>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('applies variant classes correctly', () => {
    const { container, rerender } = render(<LoadingButton variant="primary">Test</LoadingButton>);
    expect(container.querySelector('.bg-green-600')).toBeInTheDocument();

    rerender(<LoadingButton variant="secondary">Test</LoadingButton>);
    expect(container.querySelector('.bg-white\\/10')).toBeInTheDocument();

    rerender(<LoadingButton variant="danger">Test</LoadingButton>);
    expect(container.querySelector('.bg-red-600')).toBeInTheDocument();
  });

  it('applies size classes correctly', () => {
    const { container, rerender } = render(<LoadingButton size="sm">Test</LoadingButton>);
    expect(container.querySelector('.px-3')).toBeInTheDocument();

    rerender(<LoadingButton size="md">Test</LoadingButton>);
    expect(container.querySelector('.px-4')).toBeInTheDocument();

    rerender(<LoadingButton size="lg">Test</LoadingButton>);
    expect(container.querySelector('.px-6')).toBeInTheDocument();
  });

  it('renders spinner icon when loading', () => {
    const { container } = render(<LoadingButton isLoading>Submit</LoadingButton>);
    const spinner = container.querySelector('svg');
    expect(spinner).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<LoadingButton className="mt-4">Test</LoadingButton>);
    expect(container.querySelector('button')).toHaveClass('mt-4');
  });
});
