'use client';

import { getAbility, type AbilityDef, type DicePattern } from '@/lib/gameLogic/abilities';
import { Die3D } from '@/components/ui/Die3D';

// ─── Pattern metadata ──────────────────────────────────────────────────────────

interface AbilityPatternEntry {
  pattern: DicePattern;
  /** 0 = wildcard die. */
  diceExample: number[];
  requirement: string;
}

export const ABILITY_PATTERNS: AbilityPatternEntry[] = [
  { pattern: 'four_of_a_kind', diceExample: [4, 4, 4, 4, 0, 0], requirement: '4+ matching dice' },
  {
    pattern: 'large_straight',
    diceExample: [2, 3, 4, 5, 6, 0],
    requirement: '5 consecutive (e.g. 2-3-4-5-6)',
  },
  {
    pattern: 'full_house',
    diceExample: [3, 3, 3, 5, 5, 0],
    requirement: '3 matching + 2 matching',
  },
  {
    pattern: 'small_straight',
    diceExample: [1, 2, 3, 4, 0, 0],
    requirement: '4 consecutive (e.g. 1-2-3-4)',
  },
  { pattern: 'three_of_a_kind', diceExample: [6, 6, 6, 0, 0, 0], requirement: '3+ matching dice' },
];

export const PATTERN_LABEL: Record<DicePattern, string> = {
  four_of_a_kind: 'Four of a Kind',
  large_straight: 'Large Straight',
  full_house: 'Full House',
  small_straight: 'Small Straight',
  three_of_a_kind: 'Three of a Kind',
};

export function abilityTags(ability: AbilityDef): string[] {
  const tags: string[] = [`${ability.damageMultiplier}× damage`];
  if (ability.bypassMonsterDef && ability.bypassPlayerDef) {
    tags.push('ignores all DEF');
  } else if (ability.bypassMonsterDef) {
    tags.push('bypasses DEF');
  }
  if (ability.stunMonster) tags.push('stuns enemy');
  if (ability.lifestealPct > 0) tags.push(`${(ability.lifestealPct * 100) | 0}% lifesteal`);
  return tags;
}

/** Returns the indices of dice that contribute to the detected pattern. */
export function getHighlightedDiceIndices(dice: number[], pattern: DicePattern | null): number[] {
  if (!pattern) return [];

  const indexMap = new Map<number, number[]>();
  dice.forEach((d, i) => {
    const existing = indexMap.get(d);
    if (existing) existing.push(i);
    else indexMap.set(d, [i]);
  });

  switch (pattern) {
    case 'four_of_a_kind': {
      let best: number[] = [];
      indexMap.forEach((idxs) => {
        if (idxs.length >= 4) best = idxs;
      });
      return best.slice(0, 4);
    }
    case 'three_of_a_kind': {
      let best: number[] = [];
      indexMap.forEach((idxs) => {
        if (idxs.length >= 3 && idxs.length > best.length) best = idxs;
      });
      return best.slice(0, 3);
    }
    case 'full_house': {
      const groups: number[][] = [];
      indexMap.forEach((idxs) => groups.push(idxs));
      groups.sort((a, b) => b.length - a.length);
      return [...(groups[0]?.slice(0, 3) ?? []), ...(groups[1]?.slice(0, 2) ?? [])];
    }
    case 'large_straight': {
      for (let start = 1; start <= 2; start++) {
        const idxs: number[] = [];
        let valid = true;
        for (let offset = 0; offset < 5; offset++) {
          const found = indexMap.get(start + offset)?.[0];
          if (found === undefined) {
            valid = false;
            break;
          }
          idxs.push(found);
        }
        if (valid) return idxs;
      }
      return [];
    }
    case 'small_straight': {
      for (let start = 1; start <= 3; start++) {
        const idxs: number[] = [];
        let valid = true;
        for (let offset = 0; offset < 4; offset++) {
          const found = indexMap.get(start + offset)?.[0];
          if (found === undefined) {
            valid = false;
            break;
          }
          idxs.push(found);
        }
        if (valid) return idxs;
      }
      return [];
    }
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AbilityReference({ characterClass }: { characterClass: string }) {
  return (
    <div className="space-y-0">
      {ABILITY_PATTERNS.map(({ pattern, diceExample, requirement }, idx) => {
        const ability = getAbility(characterClass, pattern);
        if (!ability) return null;
        const tags = abilityTags(ability);
        return (
          <div
            key={pattern}
            className={`flex items-start gap-3 py-2.5 ${
              idx < ABILITY_PATTERNS.length - 1
                ? 'border-b border-gray-100 dark:border-slate-800'
                : ''
            }`}
          >
            <div className="flex gap-1 shrink-0 pt-0.5">
              {diceExample.map((d, i) => (
                <Die3D key={i} value={d} variant={d === 0 ? 'wildcard' : 'highlighted'} size="sm" />
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xs font-bold text-gray-800 dark:text-slate-100">
                  {ability.emoji} {ability.name}
                </span>
                <span className="text-xs text-gray-400 dark:text-slate-500">
                  {PATTERN_LABEL[pattern]}
                </span>
              </div>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{requirement}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-medium px-1.5 py-0.5 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
