// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from '../Card';

describe('Card', () => {
  it('renders children content', () => {
    render(
      <Card>
        <p>Hello</p>
      </Card>,
    );
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('applies the default surface classes', () => {
    const { container } = render(<Card>x</Card>);
    expect(container.firstChild).toHaveClass('bg-surface');
  });

  it('switches to legendary styling for legendary variant', () => {
    const { container } = render(<Card variant="legendary">x</Card>);
    expect((container.firstChild as HTMLElement).className).toContain('orange-300');
  });

  it('applies interactive hover classes only when interactive=true', () => {
    const { rerender, container } = render(<Card>x</Card>);
    expect((container.firstChild as HTMLElement).className).not.toContain('hover:-translate-y');
    rerender(<Card interactive>x</Card>);
    expect((container.firstChild as HTMLElement).className).toContain('hover:-translate-y');
  });

  it.each(['none', 'sm', 'md', 'lg'] as const)('applies %s padding variant', (padding) => {
    const { container } = render(<Card padding={padding}>x</Card>);
    const cls = (container.firstChild as HTMLElement).className;
    if (padding === 'sm') expect(cls).toContain('p-3');
    if (padding === 'md') expect(cls).toContain('p-4');
    if (padding === 'lg') expect(cls).toContain('p-5');
  });

  it('renders decorative blurs inside hero variant', () => {
    const { container } = render(<Card variant="hero">x</Card>);
    const decorations = container.querySelectorAll('[aria-hidden="true"]');
    expect(decorations.length).toBeGreaterThanOrEqual(2);
  });

  it('forwards arbitrary HTML props (data-testid)', () => {
    render(<Card data-testid="hero-card">x</Card>);
    expect(screen.getByTestId('hero-card')).toBeInTheDocument();
  });
});
