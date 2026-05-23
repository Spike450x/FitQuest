// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCombatBursts } from '../useCombatBursts';

type LogEntry = Parameters<typeof useCombatBursts>[0][number];

describe('useCombatBursts', () => {
  it('returns no bursts for an empty log', () => {
    const { result } = renderHook(() => useCombatBursts([]));
    expect(result.current.bursts).toEqual([]);
  });

  it('emits a damage burst targeting the monster when player deals damage', () => {
    const log: LogEntry[] = [{ round: 1, playerDamage: 12 }];
    const { result } = renderHook(() => useCombatBursts(log));
    const burst = result.current.bursts.find((b) => b.target === 'monster');
    expect(burst).toBeDefined();
    expect(burst!.text).toBe('−12');
    expect(burst!.tone).toBe('damage');
  });

  it('upgrades the tone to "crit" when eagleEyeCrit is true', () => {
    const log: LogEntry[] = [{ round: 1, playerDamage: 20, eagleEyeCrit: true }];
    const { result } = renderHook(() => useCombatBursts(log));
    expect(result.current.bursts[0].tone).toBe('crit');
  });

  it('emits a damage burst targeting the player when the monster hits', () => {
    const log: LogEntry[] = [{ round: 1, monsterDamage: 5 }];
    const { result } = renderHook(() => useCombatBursts(log));
    const burst = result.current.bursts[0];
    expect(burst.target).toBe('player');
    expect(burst.tone).toBe('damage');
    expect(burst.text).toBe('−5');
  });

  it('emits a BLOCK burst when divineAegisBlocked is true and no monster damage', () => {
    const log: LogEntry[] = [{ round: 1, divineAegisBlocked: true }];
    const { result } = renderHook(() => useCombatBursts(log));
    expect(result.current.bursts[0].text).toBe('BLOCK');
    expect(result.current.bursts[0].tone).toBe('block');
  });

  it('aggregates heal sources into a single burst', () => {
    const log: LogEntry[] = [{ round: 1, healAmount: 5, soulDrainHeal: 2, flatPassiveHeal: 3 }];
    const { result } = renderHook(() => useCombatBursts(log));
    const heal = result.current.bursts.find((b) => b.tone === 'heal');
    expect(heal).toBeDefined();
    expect(heal!.text).toBe('+10');
  });

  it('only emits new bursts for rounds it has not seen before', () => {
    const log: LogEntry[] = [{ round: 1, playerDamage: 5 }];
    const { result, rerender } = renderHook(({ l }) => useCombatBursts(l), {
      initialProps: { l: log },
    });
    expect(result.current.bursts).toHaveLength(1);

    // Rerender with the same log — no new burst.
    rerender({ l: [...log] });
    expect(result.current.bursts).toHaveLength(1);

    // Rerender with a new round — one more burst.
    rerender({ l: [...log, { round: 2, playerDamage: 7 }] });
    expect(result.current.bursts).toHaveLength(2);
  });

  it('expires a burst by id', () => {
    const log: LogEntry[] = [{ round: 1, playerDamage: 5 }];
    const { result } = renderHook(() => useCombatBursts(log));
    const id = result.current.bursts[0].id;
    act(() => result.current.expire(id));
    expect(result.current.bursts).toEqual([]);
  });

  it('emits multiple bursts when a single round has player damage and a heal', () => {
    const log: LogEntry[] = [{ round: 1, playerDamage: 8, healAmount: 4 }];
    const { result } = renderHook(() => useCombatBursts(log));
    expect(result.current.bursts).toHaveLength(2);
  });

  it('ignores zero-valued damage so empty rounds do not emit ghost bursts', () => {
    const log: LogEntry[] = [{ round: 1, playerDamage: 0, monsterDamage: 0 }];
    const { result } = renderHook(() => useCombatBursts(log));
    expect(result.current.bursts).toEqual([]);
  });
});
