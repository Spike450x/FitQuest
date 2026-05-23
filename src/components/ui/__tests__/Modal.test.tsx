// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Modal } from '../Modal';

beforeEach(() => {
  document.body.innerHTML = '';
  cleanup();
});

describe('Modal', () => {
  it('does not render content when open is false', () => {
    render(
      <Modal open={false}>
        <p>Hidden</p>
      </Modal>,
    );
    expect(screen.queryByText('Hidden')).toBeNull();
  });

  it('renders children when open', () => {
    render(
      <Modal open ariaLabel="Test modal">
        <p>Visible</p>
      </Modal>,
    );
    expect(screen.getByText('Visible')).toBeInTheDocument();
  });

  it('exposes role=dialog and aria-modal=true', () => {
    render(
      <Modal open ariaLabel="x">
        <p>x</p>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('invokes onClose on Escape key', () => {
    const onClose = vi.fn();
    render(
      <Modal open ariaLabel="x" onClose={onClose}>
        <p>x</p>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not respond to non-Escape keys', () => {
    const onClose = vi.fn();
    render(
      <Modal open ariaLabel="x" onClose={onClose}>
        <p>x</p>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('invokes onClose when the backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal open ariaLabel="x" onClose={onClose}>
        <p>content</p>
      </Modal>,
    );
    const backdrop = container.querySelector('[role="presentation"]') as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('locks body scroll while open and restores it on close', () => {
    const { rerender } = render(
      <Modal open ariaLabel="x">
        <p>x</p>
      </Modal>,
    );
    expect(document.body.style.overflow).toBe('hidden');
    rerender(
      <Modal open={false} ariaLabel="x">
        <p>x</p>
      </Modal>,
    );
    expect(document.body.style.overflow).toBe('');
  });
});
