export const FOCUS_VISIBLE_STYLES = `
:focus-visible {
  outline: 2px solid #10b981;
  outline-offset: 2px;
}

.high-contrast :focus-visible {
  outline: 3px solid #ffffff;
  outline-offset: 3px;
  box-shadow: 0 0 0 4px #000000;
}
`;

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return Array.from(container.querySelectorAll(selectors)) as HTMLElement[];
}

export function moveFocusToFirst(container: HTMLElement): void {
  const focusable = getFocusableElements(container);
  if (focusable.length > 0) {
    focusable[0].focus();
  }
}

export function moveFocusToLast(container: HTMLElement): void {
  const focusable = getFocusableElements(container);
  if (focusable.length > 0) {
    focusable[focusable.length - 1].focus();
  }
}

export function moveFocusToNext(container: HTMLElement, currentElement: HTMLElement): void {
  const focusable = getFocusableElements(container);
  const currentIndex = focusable.indexOf(currentElement);
  const nextIndex = (currentIndex + 1) % focusable.length;
  focusable[nextIndex].focus();
}

export function moveFocusToPrevious(container: HTMLElement, currentElement: HTMLElement): void {
  const focusable = getFocusableElements(container);
  const currentIndex = focusable.indexOf(currentElement);
  const prevIndex = (currentIndex - 1 + focusable.length) % focusable.length;
  focusable[prevIndex].focus();
}

export function restoreFocus(previousElement: HTMLElement | null): void {
  if (previousElement && document.body.contains(previousElement)) {
    previousElement.focus();
  }
}

export function manageFocusOnMount(ref: React.RefObject<HTMLElement>, autoFocus = true): void {
  if (autoFocus && ref.current) {
    const focusable = getFocusableElements(ref.current);
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      ref.current.focus();
    }
  }
}
