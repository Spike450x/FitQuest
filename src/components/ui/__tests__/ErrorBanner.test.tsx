// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBanner } from '../ErrorBanner';

describe('ErrorBanner', () => {
  it('renders with a default title when none is provided', () => {
    render(<ErrorBanner />);
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
  });

  it('renders a custom title', () => {
    render(<ErrorBanner title="Quest fetch failed" />);
    expect(screen.getByText('Quest fetch failed')).toBeInTheDocument();
  });

  it('renders the underlying message when provided', () => {
    render(<ErrorBanner message="permission denied" />);
    expect(screen.getByText('permission denied')).toBeInTheDocument();
  });

  it('uses role=alert for assistive tech', () => {
    render(<ErrorBanner title="x" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders the Retry button only when onRetry is provided', () => {
    const { rerender } = render(<ErrorBanner title="x" />);
    expect(screen.queryByText('Retry')).toBeNull();
    rerender(<ErrorBanner title="x" onRetry={() => undefined} />);
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('fires onRetry when Retry button is clicked', () => {
    const onRetry = vi.fn();
    render(<ErrorBanner title="x" onRetry={onRetry} />);
    fireEvent.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
