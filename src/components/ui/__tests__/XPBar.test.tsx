// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { XPBar } from '../XPBar';

describe('XPBar', () => {
  it('renders the level text and XP / next-level numbers', () => {
    render(<XPBar level={3} xp={75} xpToNextLevel={200} />);
    expect(screen.getByText('Level 3')).toBeInTheDocument();
    expect(screen.getByText(/75/)).toBeInTheDocument();
    expect(screen.getByText(/200/)).toBeInTheDocument();
  });

  it('exposes an accessible progressbar with valuenow/min/max', () => {
    render(<XPBar level={1} xp={50} xpToNextLevel={100} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar).toHaveAttribute('aria-valuenow');
  });

  it('formats large numbers with locale separators', () => {
    render(<XPBar level={20} xp={12_345} xpToNextLevel={50_000} />);
    expect(screen.getByText(/12,345/)).toBeInTheDocument();
    expect(screen.getByText(/50,000/)).toBeInTheDocument();
  });
});
