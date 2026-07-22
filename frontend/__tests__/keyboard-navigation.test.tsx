import { render, fireEvent } from '@testing-library/react';
import { useKeyboardNavigation } from '../src/hooks/useKeyboardNavigation';

function TestComponent({ onEscape, onEnter, onArrowUp, onArrowDown }: any) {
  useKeyboardNavigation({
    onEscape,
    onEnter,
    onArrowUp,
    onArrowDown,
  });
  return <button>Test</button>;
}

describe('useKeyboardNavigation', () => {
  it('calls onEscape when Escape key is pressed', () => {
    const onEscape = jest.fn();
    render(<TestComponent onEscape={onEscape} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onEscape).toHaveBeenCalled();
  });

  it('calls onEnter when Enter key is pressed on a button', () => {
    const onEnter = jest.fn();
    render(<TestComponent onEnter={onEnter} />);
    const button = document.querySelector('button')!;
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(onEnter).toHaveBeenCalled();
  });

  it('calls onArrowUp when ArrowUp key is pressed', () => {
    const onArrowUp = jest.fn();
    render(<TestComponent onArrowUp={onArrowUp} />);
    fireEvent.keyDown(document, { key: 'ArrowUp' });
    expect(onArrowUp).toHaveBeenCalled();
  });

  it('calls onArrowDown when ArrowDown key is pressed', () => {
    const onArrowDown = jest.fn();
    render(<TestComponent onArrowDown={onArrowDown} />);
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    expect(onArrowDown).toHaveBeenCalled();
  });

  it('does not call handlers when disabled', () => {
    const onEscape = jest.fn();
    function DisabledComponent() {
      useKeyboardNavigation({
        onEscape,
        enabled: false,
      });
      return <div>Test</div>;
    }
    render(<DisabledComponent />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onEscape).not.toHaveBeenCalled();
  });
});
