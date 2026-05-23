// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders the title', () => {
    render(<EmptyState title="No quests" />);
    expect(screen.getByText('No quests')).toBeInTheDocument();
  });

  it('renders the description when provided', () => {
    render(<EmptyState title="No quests" description="Pick one up at the board." />);
    expect(screen.getByText('Pick one up at the board.')).toBeInTheDocument();
  });

  it('omits the description when not provided', () => {
    const { container } = render(<EmptyState title="No quests" />);
    expect(container.textContent).toBe('No quests');
  });

  it('renders an icon when provided', () => {
    render(<EmptyState title="Empty" icon="📦" />);
    expect(screen.getByText('📦')).toBeInTheDocument();
  });

  it('renders a link CTA when cta.href is provided', () => {
    render(<EmptyState title="Empty" cta={{ label: 'Browse', href: '/shop' }} />);
    const link = screen.getByText(/Browse/);
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/shop');
  });

  it('renders a button CTA and fires onClick when cta.onClick is provided', () => {
    const onClick = vi.fn();
    render(<EmptyState title="Empty" cta={{ label: 'Refresh', onClick }} />);
    fireEvent.click(screen.getByText('Refresh'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
