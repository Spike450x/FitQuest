// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { OfflineBanner } from '../OfflineBanner';

let onLineGetter: () => boolean;

beforeEach(() => {
  onLineGetter = () => true;
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => onLineGetter(),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('OfflineBanner', () => {
  it('renders nothing when the browser is online', () => {
    onLineGetter = () => true;
    const { container } = render(<OfflineBanner />);
    expect(container.textContent).toBe('');
  });

  it('renders the offline copy when the browser is offline', () => {
    onLineGetter = () => false;
    render(<OfflineBanner />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
  });

  it('uses aria-live="assertive" so screen readers announce it immediately', () => {
    onLineGetter = () => false;
    render(<OfflineBanner />);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  });

  it('disappears when the browser returns online', () => {
    onLineGetter = () => false;
    const { container } = render(<OfflineBanner />);
    expect(container.textContent).toContain('offline');

    onLineGetter = () => true;
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(container.textContent).toBe('');
  });
});
