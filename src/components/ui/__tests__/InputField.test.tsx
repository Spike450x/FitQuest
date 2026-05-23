// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InputField } from '../InputField';

describe('InputField', () => {
  it('renders a bare input when no label is supplied', () => {
    render(<InputField id="email" placeholder="Email" />);
    const input = screen.getByPlaceholderText('Email');
    expect(input).toBeInTheDocument();
    expect(input.id).toBe('email');
    expect(input.previousElementSibling).toBeNull();
  });

  it('renders a label and connects it to the input via htmlFor/id', () => {
    render(<InputField id="email" label="Email address" />);
    const label = screen.getByText('Email address');
    expect(label.tagName).toBe('LABEL');
    expect(label).toHaveAttribute('for', 'email');
  });

  it('shows the error message under the input when error is supplied', () => {
    render(<InputField id="email" label="Email" error="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('omits the error message when error is empty', () => {
    render(<InputField id="email" label="Email" />);
    expect(screen.queryByText(/required/i)).toBeNull();
  });

  it.each(['sm', 'md', 'lg'] as const)('applies the %s size variant classes', (size) => {
    render(<InputField id="email" inputSize={size} placeholder={size} />);
    const input = screen.getByPlaceholderText(size);
    if (size === 'sm') expect(input.className).toContain('text-sm');
    if (size === 'lg') expect(input.className).toContain('text-lg');
  });

  it('merges extra className without dropping the canonical classes', () => {
    render(<InputField id="x" placeholder="x" className="mt-4" />);
    const input = screen.getByPlaceholderText('x');
    expect(input.className).toContain('mt-4');
    expect(input.className).toContain('rounded-lg');
    expect(input.className).toContain('dark:bg-slate-950');
  });

  it('forwards standard HTML input attributes', () => {
    render(
      <InputField id="email" type="email" required autoComplete="email" placeholder="Email" />,
    );
    const input = screen.getByPlaceholderText('Email');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toBeRequired();
    expect(input).toHaveAttribute('autocomplete', 'email');
  });
});
