export const SCREEN_READER_ONLY_CLASS = 'sr-only';

export const SCREEN_READER_ONLY_STYLES = `
.${SCREEN_READER_ONLY_CLASS} {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
`;

export function createLiveRegion(id: string): HTMLDivElement {
  const existing = document.getElementById(id);
  if (existing) return existing as HTMLDivElement;

  const region = document.createElement('div');
  region.id = id;
  region.setAttribute('role', 'status');
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-atomic', 'true');
  region.className = SCREEN_READER_ONLY_CLASS;
  document.body.appendChild(region);
  return region;
}

export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const region = createLiveRegion(`live-region-${priority}`);
  region.setAttribute('aria-live', priority);
  region.textContent = '';

  requestAnimationFrame(() => {
    region.textContent = message;
  });
}

export function getAccessibleLabel(element: {
  label?: string;
  ariaLabel?: string;
  text?: string;
  id?: string;
}): string {
  if (element.ariaLabel) return element.ariaLabel;
  if (element.label) return element.label;
  if (element.text) return element.text;
  if (element.id) return element.id;
  return '';
}

export function getRoleDescription(role: string): string {
  const descriptions: Record<string, string> = {
    button: 'button',
    link: 'link',
    checkbox: 'checkbox',
    radio: 'radio',
    textbox: 'text input',
    combobox: 'dropdown',
    tab: 'tab',
    tabpanel: 'tab panel',
    dialog: 'dialog',
    alert: 'alert',
    status: 'status',
    progressbar: 'progress bar',
  };
  return descriptions[role] || role;
}
