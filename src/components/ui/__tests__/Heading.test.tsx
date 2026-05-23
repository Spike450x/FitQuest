// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Heading } from '../Heading';

describe('Heading', () => {
  it.each([1, 2, 3, 4] as const)('renders an h%i tag matching the level by default', (level) => {
    render(<Heading level={level}>Title {level}</Heading>);
    expect(screen.getByText(`Title ${level}`).tagName).toBe(`H${level}`);
  });

  it('honors the `as` override to render a different tag at the same visual level', () => {
    render(
      <Heading level={1} as="h2">
        Looks H1, semantically H2
      </Heading>,
    );
    expect(screen.getByText(/H2/).tagName).toBe('H2');
  });

  it('applies an id when provided', () => {
    render(
      <Heading level={2} id="quest-title">
        Quests
      </Heading>,
    );
    expect(screen.getByText('Quests').id).toBe('quest-title');
  });

  it('merges custom className', () => {
    render(
      <Heading level={1} className="custom-class">
        x
      </Heading>,
    );
    expect(screen.getByText('x').className).toContain('custom-class');
  });
});
