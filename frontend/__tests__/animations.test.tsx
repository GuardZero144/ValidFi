import { render, screen } from '@testing-library/react';
import { SuccessCheckmark } from '../src/components/animations/success-checkmark';
import { AnimatedProgress } from '../src/components/animations/animated-progress';
import { SuccessToast } from '../src/components/animations/success-overlay';

describe('SuccessCheckmark', () => {
  it('renders an SVG element', () => {
    const { container } = render(<SuccessCheckmark />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('accepts custom size', () => {
    const { container } = render(<SuccessCheckmark size={40} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '40');
    expect(svg).toHaveAttribute('height', '40');
  });

  it('applies className', () => {
    const { container } = render(<SuccessCheckmark className="text-green-400" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('text-green-400');
  });

  it('renders circle and path elements', () => {
    const { container } = render(<SuccessCheckmark />);
    const circles = container.querySelectorAll('circle');
    const paths = container.querySelectorAll('path');
    expect(circles.length).toBeGreaterThanOrEqual(2);
    expect(paths.length).toBeGreaterThanOrEqual(1);
  });
});

describe('AnimatedProgress', () => {
  it('renders progress percentage with label', () => {
    const { container } = render(<AnimatedProgress progress={50} label="Progress" />);
    expect(container.textContent).toContain('50%');
    expect(container.textContent).toContain('Progress');
  });

  it('displays label when provided', () => {
    const { container } = render(<AnimatedProgress progress={75} label="Uploading" />);
    expect(container.textContent).toContain('Uploading');
    expect(container.textContent).toContain('75%');
  });

  it('clamps progress above 100 to 100', () => {
    const { container } = render(<AnimatedProgress progress={150} label="Uploading" />);
    expect(container.textContent).toContain('100%');
  });

  it('clamps progress below 0 to 0', () => {
    const { container } = render(<AnimatedProgress progress={-10} label="Uploading" />);
    expect(container.textContent).toContain('0%');
  });

  it('renders the bar track element', () => {
    const { container } = render(<AnimatedProgress progress={30} />);
    const track = container.querySelector('.bg-white\\/10');
    expect(track).toBeInTheDocument();
  });

  it('renders without label', () => {
    const { container } = render(<AnimatedProgress progress={60} />);
    const track = container.querySelector('.bg-white\\/10');
    expect(track).toBeInTheDocument();
  });
});

describe('SuccessToast', () => {
  it('renders title and description when visible', () => {
    render(
      <SuccessToast
        show={true}
        title="Upload Complete"
        description="Your file was encrypted"
      />,
    );
    expect(screen.getByText('Upload Complete')).toBeInTheDocument();
    expect(screen.getByText('Your file was encrypted')).toBeInTheDocument();
  });

  it('renders title only when no description', () => {
    render(<SuccessToast show={true} title="Success" />);
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('has dismiss button', () => {
    const onDismiss = jest.fn();
    render(<SuccessToast show={true} title="Done" onDismiss={onDismiss} />);
    const dismissBtn = screen.getByText('\u00d7');
    dismissBtn.click();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
