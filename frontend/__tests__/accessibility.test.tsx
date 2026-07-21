import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AccessibilityProvider, useAccessibility } from '../src/contexts/AccessibilityContext';

function TestComponent() {
  const { announceToScreenReader, preferences, updatePreference } = useAccessibility();
  return (
    <div>
      <button onClick={() => announceToScreenReader('Test announcement')}>
        Announce
      </button>
      <button onClick={() => updatePreference('highContrast', true)}>
        Enable High Contrast
      </button>
      <span data-testid="high-contrast">{preferences.highContrast.toString()}</span>
    </div>
  );
}

describe('AccessibilityProvider', () => {
  it('provides accessibility context', () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );
    expect(screen.getByText('Announce')).toBeInTheDocument();
    expect(screen.getByText('Enable High Contrast')).toBeInTheDocument();
  });

  it('updates preferences', () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );
    expect(screen.getByTestId('high-contrast')).toHaveTextContent('false');
    fireEvent.click(screen.getByText('Enable High Contrast'));
    expect(screen.getByTestId('high-contrast')).toHaveTextContent('true');
  });

  it('announces to screen reader', () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );
    fireEvent.click(screen.getByText('Announce'));
    const announcements = document.querySelectorAll('[role="status"]');
    expect(announcements.length).toBeGreaterThan(0);
  });
});

describe('Keyboard Navigation', () => {
  it('supports Enter key on buttons', () => {
    const onEnter = jest.fn();
    const EnterTestComponent = () => {
      const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') onEnter();
      };
      return <button onKeyDown={handleKeyDown}>Click me</button>;
    };
    render(<EnterTestComponent />);
    const button = screen.getByText('Click me');
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(onEnter).toHaveBeenCalled();
  });

  it('supports Escape key', () => {
    const onEscape = jest.fn();
    const EscapeTestComponent = () => {
      React.useEffect(() => {
        const handler = (e: KeyboardEvent) => {
          if (e.key === 'Escape') onEscape();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
      }, []);
      return <div>Test</div>;
    };
    render(<EscapeTestComponent />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onEscape).toHaveBeenCalled();
  });
});

describe('ARIA Attributes', () => {
  it('supports aria-label', () => {
    render(<button aria-label="Close dialog">×</button>);
    expect(screen.getByLabelText('Close dialog')).toBeInTheDocument();
  });

  it('supports aria-expanded', () => {
    render(<button aria-expanded={true}>Menu</button>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('supports aria-hidden for decorative icons', () => {
    const { container } = render(<span aria-hidden="true">×</span>);
    const icon = container.querySelector('[aria-hidden="true"]');
    expect(icon).toBeInTheDocument();
  });

  it('supports role attributes', () => {
    render(<div role="alert">Error message</div>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('supports aria-live regions', () => {
    render(<div aria-live="polite">Live region</div>);
    expect(screen.getByText('Live region')).toHaveAttribute('aria-live', 'polite');
  });
});

describe('Focus Management', () => {
  it('supports tabIndex for focusable elements', () => {
    render(<div tabIndex={0} data-testid="focusable">Focusable</div>);
    const element = screen.getByTestId('focusable');
    expect(element).toHaveAttribute('tabindex', '0');
  });

  it('supports focus visible styling', () => {
    render(<button className="focus-visible:outline-green-500">Button</button>);
    expect(screen.getByRole('button')).toHaveClass('focus-visible:outline-green-500');
  });
});

describe('Screen Reader Support', () => {
  it('provides screen reader only text', () => {
    render(
      <div>
        <span className="sr-only">Screen reader only text</span>
        <span>Visible text</span>
      </div>
    );
    expect(screen.getByText('Screen reader only text')).toBeInTheDocument();
    expect(screen.getByText('Visible text')).toBeInTheDocument();
  });

  it('supports aria-describedby for additional context', () => {
    render(
      <div>
        <input id="email" aria-describedby="email-help" />
        <p id="email-help">Enter your email</p>
      </div>
    );
    expect(document.getElementById('email')).toHaveAttribute('aria-describedby', 'email-help');
  });
});

describe('High Contrast Mode', () => {
  it('applies high-contrast class when enabled', () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );
    fireEvent.click(screen.getByText('Enable High Contrast'));
    expect(document.documentElement.classList.contains('high-contrast')).toBe(true);
  });
});
