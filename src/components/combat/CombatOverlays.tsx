'use client';

import { ActionRollOverlay } from './overlays/ActionRollOverlay';
import { DiceRollOverlay } from './overlays/DiceRollOverlay';
import { SpellRollOverlay } from './overlays/SpellRollOverlay';
import type { MonsterDef } from '@/types';
import type { PendingAction, PendingAbility, PendingSpell } from './types';

/**
 * Single dispatch point for the three roll overlays, shared by every combat
 * surface (arena, dungeon run, wanted hunt). Centralising this guarantees all
 * surfaces render the action/ability/spell overlays identically — the previous
 * copy-pasted block in each page risked drift as overlay props grew.
 */
export function CombatOverlays({
  pending,
  monster,
  playerDefStat,
}: {
  pending: {
    action: PendingAction | null;
    ability: PendingAbility | null;
    spell: PendingSpell | null;
  };
  monster: MonsterDef;
  playerDefStat: number;
}) {
  return (
    <>
      {pending.action && (
        <ActionRollOverlay
          pending={pending.action}
          monster={monster}
          playerDefStat={playerDefStat}
        />
      )}
      {pending.ability && (
        <DiceRollOverlay
          dice={pending.ability.dice}
          pattern={pending.ability.pattern}
          ability={pending.ability.ability}
          formulaBreakdown={pending.ability.formulaBreakdown}
          monsterRoll={pending.ability.monsterRoll}
          monsterAtk={pending.ability.monsterAtk}
          monsterDamage={pending.ability.monsterDamage}
          monsterStunned={pending.ability.monsterStunned}
          dodged={pending.ability.dodged}
          monsterAttackType={pending.ability.monsterAttackType}
          playerDefFailed={pending.ability.playerDefFailed}
          playerDefStat={playerDefStat}
          monsterSpecial={pending.ability.monsterSpecial}
          monsterChargingPrimed={pending.ability.monsterChargingPrimed}
          playerStunnedApplied={pending.ability.playerStunnedApplied}
          spiritCrit={pending.ability.spiritCrit}
          spiritCritMultiplier={pending.ability.spiritCritMultiplier}
          outcome={pending.ability.outcome}
          onDismiss={pending.ability.applyResult}
        />
      )}
      {pending.spell && (
        <SpellRollOverlay
          spellDef={pending.spell.spellDef}
          dice={pending.spell.dice}
          requirementMet={pending.spell.requirementMet}
          monsterRoll={pending.spell.monsterRoll}
          monsterAtk={pending.spell.monsterAtk}
          monsterStunned={pending.spell.monsterStunned}
          monsterDamage={pending.spell.monsterDamage}
          dodged={pending.spell.dodged}
          monsterAttackType={pending.spell.monsterAttackType}
          playerDefFailed={pending.spell.playerDefFailed}
          playerDefStat={playerDefStat}
          monsterSpecial={pending.spell.monsterSpecial}
          monsterChargingPrimed={pending.spell.monsterChargingPrimed}
          playerStunnedApplied={pending.spell.playerStunnedApplied}
          spiritCrit={pending.spell.spiritCrit}
          spiritCritMultiplier={pending.spell.spiritCritMultiplier}
          outcome={pending.spell.outcome}
          onDismiss={pending.spell.applyResult}
        />
      )}
    </>
  );
}
