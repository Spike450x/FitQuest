// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Save</Button>);
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('defaults to type="button" so it does not submit forms', () => {
    render(<Button>x</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('honors an explicit type="submit"', () => {
    render(<Button type="submit">x</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('fires onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>x</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire onClick when disabled', () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        x
      </Button>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders the loading label and a spinner while loading', () => {
    render(
      <Button loading loadingLabel="Saving…">
        Save
      </Button>,
    );
    expect(screen.getByText('Saving…')).toBeInTheDocument();
    expect(screen.queryByText('Save')).toBeNull();
  });

  it('falls back to children text when no loadingLabel is provided', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('marks the button aria-busy while loading', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  it('disables the button when loading is true', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it.each(['primary', 'secondary', 'danger', 'ghost'] as const)(
    'applies %s variant classes',
    (variant) => {
      render(<Button variant={variant}>x</Button>);
      const cls = screen.getByRole('button').className;
      if (variant === 'primary') expect(cls).toContain('bg-indigo-600');
      if (variant === 'danger') expect(cls).toContain('bg-red-600');
      if (variant === 'ghost') expect(cls).toContain('bg-transparent');
    },
  );

  it('applies fullWidth class when prop is true', () => {
    render(<Button fullWidth>x</Button>);
    expect(screen.getByRole('button').className).toContain('w-full');
  });
});
