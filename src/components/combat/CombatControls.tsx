'use client';

import type { Character, InventoryItem, MonsterDef } from '@/types';
import type { UseCombatEncounterReturn } from '@/hooks/useCombatEncounter';
import type { CombatModifiers, FightState } from './types';
import { CombatActionBar, type EquippedSpellEntry } from './CombatActionBar';
import { CombatOverlays } from './CombatOverlays';

/**
 * Shared combat controls — the action bar (gated to a live fight) plus the
 * roll-result overlays — mounted identically by all three combat surfaces
 * (arena, dungeon run, wanted hunt).
 *
 * This is the single place the encounter's `actions.*` map onto the action-bar
 * `on*` handlers. Before this existed, every new combat action (e.g. the
 * recent `skipStunned` / `interceptFlee`) had to be wired into all three pages
 * by hand and risked drift; now it is a one-file change. Pages keep their own
 * outcome footers (Begin Again / Fight Again / dungeon advance / bounty claim),
 * which differ per surface.
 */
export function CombatControls({
  character,
  monster,
  fightState,
  rollingAction,
  usingItem,
  spellChargesUsed,
  pending,
  actions,
  equippedSpells,
  consumables,
  maxStamina,
  maxMagic,
  playerDefStat,
  showSpellPanel,
  showItemPanel,
  setShowSpellPanel,
  setShowItemPanel,
  modifiers,
}: {
  character: Character;
  monster: MonsterDef;
  fightState: FightState;
  rollingAction: UseCombatEncounterReturn['rollingAction'];
  usingItem: string | null;
  spellChargesUsed: Record<string, number>;
  pending: UseCombatEncounterReturn['pending'];
  actions: UseCombatEncounterReturn['actions'];
  equippedSpells: EquippedSpellEntry[];
  consumables: InventoryItem[];
  maxStamina: number;
  maxMagic: number;
  playerDefStat: number;
  showSpellPanel: boolean;
  showItemPanel: boolean;
  setShowSpellPanel: (next: boolean) => void;
  setShowItemPanel: (next: boolean) => void;
  /** Dungeon-only combat modifiers (venom, enrage, flee-disable). Arena/hunt omit. */
  modifiers?: CombatModifiers;
}) {
  return (
    <>
      {fightState.outcome === null && (
        <CombatActionBar
          character={character}
          fightState={fightState}
          maxStamina={maxStamina}
          maxMagic={maxMagic}
          equippedSpells={equippedSpells}
          consumables={consumables}
          rollingAction={rollingAction}
          usingItem={usingItem}
          showSpellPanel={showSpellPanel}
          showItemPanel={showItemPanel}
          setShowSpellPanel={setShowSpellPanel}
          setShowItemPanel={setShowItemPanel}
          onAttack={actions.attack}
          onMagic={actions.magic}
          onAbility={actions.rollAbility}
          onCastSpell={actions.castSpell}
          onRest={actions.rest}
          onMeditate={actions.meditate}
          onUseItem={actions.useItem}
          onFlee={actions.flee}
          onSkipStunned={actions.skipStunned}
          onInterceptFlee={actions.interceptFlee}
          modifiers={modifiers}
          spellChargesUsed={spellChargesUsed}
        />
      )}
      <CombatOverlays pending={pending} monster={monster} playerDefStat={playerDefStat} />
    </>
  );
}
