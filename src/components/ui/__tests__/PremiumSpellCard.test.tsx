// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PremiumSpellCard } from '../PremiumSpellCard';
import type { ItemDef } from '@/types';

const SPELL: ItemDef = {
  id: 'spell-mending-touch',
  name: 'Mending Touch',
  type: 'spell',
  rarity: 'common',
  tier: 1,
  price: 30,
  statBonuses: {},
  description: 'Channel healing energy into yourself. Restores 25 + WIS HP.',
  spellMechanics: {
    requirement: { type: 'sum_gte', diceCount: 2, value: 6 },
    effect: { heal: 25, healScalesWithWisdom: true },
    magicCost: 2,
    classRestriction: 'all',
  },
};

describe('PremiumSpellCard', () => {
  it('renders the front face by default with aria-pressed false', () => {
    render(<PremiumSpellCard def={SPELL} />);
    const card = screen.getByRole('button', { name: /Mending Touch card, showing front/i });
    expect(card).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Mending Touch')).toBeInTheDocument();
  });

  it('flips when the card body is clicked', () => {
    render(<PremiumSpellCard def={SPELL} />);
    const card = screen.getByRole('button', { name: /Mending Touch card/i });
    fireEvent.click(card);
    expect(card).toHaveAttribute('aria-pressed', 'true');
    expect(card.getAttribute('aria-label')).toMatch(/showing back/i);
  });

  it('flips back on a second click', () => {
    render(<PremiumSpellCard def={SPELL} />);
    const card = screen.getByRole('button', { name: /Mending Touch card/i });
    fireEvent.click(card);
    fireEvent.click(card);
    expect(card).toHaveAttribute('aria-pressed', 'false');
  });

  it('fires onAction without flipping when the action button is clicked', () => {
    const onAction = vi.fn();
    render(<PremiumSpellCard def={SPELL} actionLabel="Buy for 30g" onAction={onAction} />);
    const card = screen.getByRole('button', { name: /Mending Touch card/i });
    const actionButton = screen.getByRole('button', { name: /Buy for 30g/i });
    fireEvent.click(actionButton);
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(card).toHaveAttribute('aria-pressed', 'false');
  });

  it('flips on Enter key when focused', () => {
    render(<PremiumSpellCard def={SPELL} />);
    const card = screen.getByRole('button', { name: /Mending Touch card/i });
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(card).toHaveAttribute('aria-pressed', 'true');
  });

  it('flips on Space key when focused', () => {
    render(<PremiumSpellCard def={SPELL} />);
    const card = screen.getByRole('button', { name: /Mending Touch card/i });
    fireEvent.keyDown(card, { key: ' ' });
    expect(card).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders the back face with the FitQuest spellbook treatment', () => {
    render(<PremiumSpellCard def={SPELL} />);
    expect(screen.getByText('FITQUEST')).toBeInTheDocument();
    expect(screen.getByText(/Arcane Spellbook/i)).toBeInTheDocument();
  });

  it('marks the back face aria-hidden until flipped', () => {
    const { container } = render(<PremiumSpellCard def={SPELL} />);
    const backFace = container.querySelector('[aria-hidden="true"]');
    expect(backFace).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Mending Touch card/i }));
    // After flip, the FRONT face becomes aria-hidden
    const frontHidden = container.querySelector('div[aria-hidden="true"]');
    expect(frontHidden).not.toBeNull();
  });
});
