'use client';

import { COMBAT } from '@/lib/gameLogic/constants';
import { getSpellMaxCharges } from '@/lib/gameLogic/spells';
import { effectiveStat, gearAttackBonus } from '@/lib/gameLogic/combat';
import {
  canBloodPact,
  getAbilityStaminaCost,
  getEffectiveSpellCost,
} from '@/lib/gameLogic/passives';
import {
  consumableEffectColorHex,
  describeConsumableEffect,
  getItemById,
  RARITY_BADGE,
} from '@/lib/gameLogic/items';
import { PremiumSpellCard } from '@/components/ui/PremiumSpellCard';
import { ActionButton } from './ActionButton';
import type { Character, ItemDef, InventoryItem } from '@/types';
import type { CombatModifiers, FightState } from './types';

export interface EquippedSpellEntry {
  invItem: InventoryItem;
  def: ItemDef | undefined;
}

/**
 * Player action bar — Attack / Magic / Roll Ability / Cast Spell / Rest /
 * Meditate / Use Item / Flee. Shared between arena and dungeon combat.
 *
 * `modifiers.fleeDisabled` hides Flee (boss rooms). `modifiers.recoveryDisabled`
 * hides Rest + Meditate (reserved).
 */
export function CombatActionBar({
  character,
  fightState,
  maxStamina,
  maxMagic,
  equippedSpells,
  consumables,
  rollingAction,
  usingItem,
  showSpellPanel,
  showItemPanel,
  setShowSpellPanel,
  setShowItemPanel,
  onAttack,
  onMagic,
  onAbility,
  onCastSpell,
  onRest,
  onMeditate,
  onUseItem,
  onFlee,
  onSkipStunned,
  onInterceptFlee,
  modifiers,
  showMagicButton = false,
  spellChargesUsed,
}: {
  character: Character;
  fightState: FightState;
  maxStamina: number;
  maxMagic: number;
  equippedSpells: EquippedSpellEntry[];
  consumables: InventoryItem[];
  rollingAction: 'attack' | 'magic' | 'run' | 'ability' | 'rest' | 'meditate' | null;
  usingItem: string | null;
  showSpellPanel: boolean;
  showItemPanel: boolean;
  setShowSpellPanel: (next: boolean) => void;
  setShowItemPanel: (next: boolean) => void;
  onAttack: () => void;
  onMagic: () => void;
  onAbility: () => void;
  onCastSpell: (spellDef: ItemDef, invItemId: string) => void;
  onRest: () => void;
  onMeditate: () => void;
  onUseItem: (invItemId: string) => void;
  onFlee: () => void;
  /** Consume a monster stun: forfeit the turn and take the undefended free hit. */
  onSkipStunned: () => void;
  /** Intercept a fleeing monster: roll to one-hit-kill it, else it escapes. */
  onInterceptFlee: () => void;
  modifiers?: CombatModifiers;
  /** Show a dedicated Magic-attack button alongside Attack (optional — arena currently bundles magic into ability/spell flow only). */
  showMagicButton?: boolean;
  /**
   * Charges used per inventory item id this encounter (from useCombatEncounter).
   * Drives the dot meter and the exhausted-spell gate in the spell panel.
   */
  spellChargesUsed?: Record<string, number>;
}) {
  const isRolling = rollingAction !== null;
  const fleeDisabled = modifiers?.fleeDisabled ?? false;
  const recoveryDisabled = modifiers?.recoveryDisabled ?? false;
  const { playerHp, playerStamina, playerMagic } = fightState;

  const staCost = getAbilityStaminaCost(
    character,
    COMBAT.ABILITY_STAMINA_COST,
    fightState.isFirstAbility,
  );
  // 1-round ability cooldown: gated until at least one other action has passed.
  const abilityCooldownReady = (fightState.abilityReadyOnRound ?? 0) <= fightState.log.length;
  const canAbility = playerStamina >= staCost && abilityCooldownReady;

  // Compute which spells still have charges this encounter (per-rarity max)
  const spellsWithCharges = equippedSpells.filter(({ invItem, def }) => {
    if (!def) return false;
    const used = spellChargesUsed?.[invItem.id] ?? 0;
    return used < getSpellMaxCharges(def.rarity);
  });
  const allSpellsExhausted = equippedSpells.length > 0 && spellsWithCharges.length === 0;

  // Monster fleeing: one tap-to-intercept roll. Out-roll it → instant kill + full
  // rewards; lose → it escapes with nothing. Takes precedence over the stun panel.
  if (fightState.monsterFleeing) {
    return (
      <div className="rounded-xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-center space-y-2">
        <p className="text-2xl">🏃💨</p>
        <p className="font-bold text-emerald-700 dark:text-emerald-300">It&apos;s fleeing!</p>
        <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
          Out-roll it (d10 + AGI) for an instant kill — miss and it escapes with your reward.
        </p>
        <button
          onClick={onInterceptFlee}
          data-testid="combat-intercept-btn"
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold py-2.5 rounded-lg transition-all active:scale-[0.98]"
        >
          🗡️ Strike it down!
        </button>
      </div>
    );
  }

  // Stunned: the player forfeits this turn. Replace the whole action grid with a
  // single acknowledgment that triggers the skip (monster gets one free hit).
  if (fightState.playerStunned) {
    return (
      <div className="rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-4 text-center space-y-2 animate-pulse">
        <p className="text-2xl">😵</p>
        <p className="font-bold text-amber-700 dark:text-amber-300">You are stunned!</p>
        <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
          You lose this turn — the enemy gets a free hit.
        </p>
        <button
          onClick={onSkipStunned}
          data-testid="combat-skip-stunned-btn"
          className="w-full bg-amber-500 hover:bg-amber-400 text-white text-sm font-bold py-2.5 rounded-lg transition-all active:scale-[0.98]"
        >
          Brace yourself →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Row 1: Attack (and optional Magic) */}
      {showMagicButton ? (
        <div className="grid grid-cols-2 gap-2">
          <ActionButton
            label="⚔️ Attack"
            sublabel={(() => {
              const stat = Math.floor(
                effectiveStat(character, 'strength') * COMBAT.STRENGTH_ATTACK_FACTOR,
              );
              const gear = gearAttackBonus(character, 'attack');
              return gear > 0 ? `d10 + ${stat} STR + ${gear} gear` : `d10 + ${stat} STR`;
            })()}
            onClick={onAttack}
            loading={rollingAction === 'attack'}
            disabled={isRolling}
            color="indigo"
            testId="combat-attack-btn"
          />
          <ActionButton
            label="🔮 Magic"
            sublabel={(() => {
              const stat = Math.floor(
                effectiveStat(character, 'wisdom') * COMBAT.WISDOM_ATTACK_FACTOR,
              );
              const gear = gearAttackBonus(character, 'magic');
              return gear > 0 ? `d10 + ${stat} WIS + ${gear} gear` : `d10 + ${stat} WIS`;
            })()}
            onClick={onMagic}
            loading={rollingAction === 'magic'}
            disabled={isRolling}
            color="violet"
            testId="combat-magic-btn"
          />
        </div>
      ) : (
        <ActionButton
          label="⚔️ Attack"
          sublabel={(() => {
            const stat = Math.floor(
              effectiveStat(character, 'strength') * COMBAT.STRENGTH_ATTACK_FACTOR,
            );
            const gear = gearAttackBonus(character, 'attack');
            return gear > 0 ? `d10 + ${stat} STR + ${gear} gear` : `d10 + ${stat} STR`;
          })()}
          onClick={onAttack}
          loading={rollingAction === 'attack'}
          disabled={isRolling}
          color="indigo"
          fullWidth
          testId="combat-attack-btn"
        />
      )}

      {/* Row 2: Roll Ability + Cast Spell */}
      <div className="grid grid-cols-2 gap-2">
        <ActionButton
          label="🎲 Roll Ability"
          sublabel={
            !abilityCooldownReady
              ? '⏳ On cooldown — act once more'
              : playerStamina < staCost
                ? `Not enough stamina (need ${staCost})`
                : staCost === 0
                  ? 'FREE this roll · 6d6 class ability'
                  : `Costs ${staCost} sta · 6d6 class ability`
          }
          onClick={onAbility}
          loading={rollingAction === 'ability'}
          disabled={isRolling || !canAbility}
          color="rose"
        />
        <ActionButton
          label="✨ Cast Spell"
          sublabel={
            equippedSpells.length === 0
              ? 'No spells equipped'
              : allSpellsExhausted
                ? 'All spells exhausted'
                : `${spellsWithCharges.length} spell${spellsWithCharges.length !== 1 ? 's' : ''} ready · ${playerMagic}✨ left`
          }
          onClick={() => {
            setShowSpellPanel(!showSpellPanel);
            setShowItemPanel(false);
          }}
          loading={false}
          disabled={isRolling || equippedSpells.length === 0 || allSpellsExhausted}
          color="violet"
        />
      </div>

      {/* Row 3: Rest + Meditate */}
      {!recoveryDisabled && (
        <div className="grid grid-cols-2 gap-2">
          <ActionButton
            label="🛌 Rest"
            sublabel={
              playerStamina >= maxStamina
                ? 'Stamina already full'
                : `Roll d10 × 3 sta · monster free attack`
            }
            onClick={onRest}
            loading={rollingAction === 'rest'}
            disabled={isRolling || playerStamina >= maxStamina}
            color="sky"
          />
          <ActionButton
            label="🧘 Meditate"
            sublabel={
              playerMagic >= maxMagic
                ? 'Magic already full'
                : `Roll d10 + WIS magic · monster free attack`
            }
            onClick={onMeditate}
            loading={rollingAction === 'meditate'}
            disabled={isRolling || playerMagic >= maxMagic}
            color="slate"
          />
        </div>
      )}

      {/* Row 4: Use Item + Run Away */}
      <div className={`grid gap-2 ${fleeDisabled ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <ActionButton
          label={usingItem ? 'Using…' : '🧪 Use Item'}
          sublabel={consumables.length === 0 ? 'None in pack' : `${consumables.length} in pack`}
          onClick={() => {
            setShowItemPanel(!showItemPanel);
            setShowSpellPanel(false);
          }}
          loading={!!usingItem}
          disabled={isRolling || consumables.length === 0}
          color="emerald"
          fullWidth={fleeDisabled}
        />
        {!fleeDisabled && (
          <ActionButton
            label="🏃 Run Away"
            sublabel={(() => {
              const agi = Math.floor(
                effectiveStat(character, 'agility') * COMBAT.AGILITY_ESCAPE_FACTOR,
              );
              return agi > 0 ? `d10 + ${agi} AGI vs monster` : 'd10 vs monster to flee';
            })()}
            onClick={onFlee}
            loading={rollingAction === 'run'}
            disabled={isRolling}
            color="amber"
            testId="combat-flee-btn"
          />
        )}
      </div>

      {/* Spell selection panel */}
      {showSpellPanel && (
        <div className="bg-white dark:bg-slate-900 border border-violet-200 rounded-xl p-3 shadow-sm space-y-3">
          <p className="text-xs font-semibold text-violet-500 uppercase tracking-wider">
            ✨ Choose a Spell — {playerMagic} magic remaining
          </p>
          <div className="grid grid-cols-2 gap-3">
            {equippedSpells.map(({ invItem, def }) => {
              if (!def?.spellMechanics) return null;
              const sm = def.spellMechanics;
              const effectiveCost = getEffectiveSpellCost(character, sm.magicCost);
              const affordable = playerMagic >= effectiveCost;
              const bloodPactAvail = canBloodPact(character, effectiveCost, playerMagic, playerHp);
              const classOk =
                sm.classRestriction === 'all' || sm.classRestriction === character.class;
              const maxCharges = getSpellMaxCharges(def.rarity);
              const chargesUsed = spellChargesUsed?.[invItem.id] ?? 0;
              const chargesLeft = maxCharges - chargesUsed;
              const exhausted = chargesLeft <= 0;
              const canCast = (affordable || bloodPactAvail) && classOk && !exhausted;
              const actionLabel = exhausted
                ? 'No charges left'
                : !classOk
                  ? `${sm.classRestriction} only`
                  : bloodPactAvail
                    ? 'Cast (Blood Pact −10 HP)'
                    : !affordable
                      ? 'Not enough magic'
                      : 'Cast Spell';
              return (
                <div key={invItem.id} className="flex flex-col gap-1">
                  <PremiumSpellCard
                    def={def}
                    wisdomValue={character.stats.wisdom}
                    affordable={(affordable || bloodPactAvail) && !exhausted}
                    disabled={!canCast || isRolling}
                    actionLabel={actionLabel}
                    onAction={() => canCast && onCastSpell(def, invItem.id)}
                  />
                  {/* Charge dot meter */}
                  <div className="flex gap-1 justify-center">
                    {Array.from({ length: maxCharges }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          i < chargesLeft ? 'bg-violet-400' : 'bg-slate-700 dark:bg-slate-600'
                        }`}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Consumable selection panel */}
      {showItemPanel && (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3 shadow-sm space-y-1.5">
          <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
            Choose a Consumable
          </p>
          {consumables.map((invItem) => {
            const def = getItemById(invItem.itemDefId);
            if (!def?.effect) return null;
            return (
              <button
                key={invItem.id}
                onClick={() => onUseItem(invItem.id)}
                disabled={!!usingItem}
                className="w-full flex items-center justify-between bg-gray-50 dark:bg-slate-900 hover:bg-emerald-50 border border-gray-200 dark:border-slate-700 hover:border-emerald-300 rounded-lg px-3 py-2 text-left transition-colors disabled:opacity-40"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-800 dark:text-slate-100">
                    🧪 {def.name}
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full font-medium capitalize ${RARITY_BADGE[def.rarity]}`}
                  >
                    {def.rarity}
                  </span>
                </div>
                <span
                  className="text-xs font-semibold shrink-0"
                  style={{ color: consumableEffectColorHex(def.effect) }}
                >
                  {describeConsumableEffect(def.effect, true)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
