'use client';

import { Die3D } from '@/components/ui/Die3D';
import { getHighlightedSpellDiceIndices } from '@/lib/gameLogic/spells';
import { getHighlightedDiceIndices } from './AbilityReference';
import type { MonsterDef } from '@/types';
import type { RoundEntry } from './types';

export function BattleLogEntry({
  entry,
  monster,
  emoji,
}: {
  entry: RoundEntry;
  monster: MonsterDef;
  emoji: string;
}) {
  return (
    <li className="text-sm border-l-2 border-indigo-100 dark:border-indigo-900 pl-3 space-y-0.5">
      <p className="text-xs font-semibold text-gray-400 dark:text-slate-500">
        Round {entry.round} · {entry.action === 'attack' && '⚔️ Attack'}
        {entry.action === 'magic' && '🔮 Magic'}
        {entry.action === 'run_failed' && '🏃 Run (failed)'}
        {entry.action === 'ability' &&
          (entry.abilityFizzled ? '🎲 Ability (fizzle)' : `🎲 ${entry.abilityName ?? 'Ability'}`)}
        {entry.action === 'spell' &&
          (entry.spellRequirementMet ? `✨ ${entry.spellName}` : `✨ ${entry.spellName} (fizzle)`)}
        {entry.action === 'rest' && '🛌 Rest'}
        {entry.action === 'meditate' && '🧘 Meditate'}
        {entry.action === 'stunned' && '😵 Stunned'}
      </p>

      {entry.action === 'stunned' ? (
        <>
          <p className="text-amber-600 dark:text-amber-400 font-medium">
            😵 Turn lost — you were stunned.
          </p>
          {(entry.monsterDamage ?? 0) > 0 && (
            <p>
              <span className="text-red-500">
                {emoji} free hit for {entry.monsterDamage} dmg
                {entry.monsterAttackType === 'magic' && ' 🔮'}
              </span>
            </p>
          )}
        </>
      ) : entry.action === 'run_failed' ? (
        <>
          <p>
            <span className="text-amber-600">You rolled {entry.playerRunRoll}</span>
            <span className="text-gray-400 dark:text-slate-500">
              {' '}
              vs Monster rolled {entry.monsterRunRoll}
            </span>
            <span className="text-red-500 font-medium"> · Blocked</span>
          </p>
          {(entry.monsterDamage ?? 0) > 0 && (
            <p>
              <span className="text-red-500">
                {emoji} hit for {entry.monsterDamage} dmg
                {entry.monsterAttackType === 'magic' && ' 🔮'}
              </span>
              {entry.playerDefFailed ? (
                <span className="text-orange-500"> · 💥 DEF failed</span>
              ) : (
                <span className="text-gray-400 dark:text-slate-500"> · 🛡️ held</span>
              )}
            </p>
          )}
        </>
      ) : entry.action === 'spell' ? (
        <>
          <div className="flex items-center gap-1 flex-wrap">
            {(entry.spellDice ?? []).map((d, i) => {
              const hi = entry.spellDiceReq
                ? getHighlightedSpellDiceIndices(entry.spellDice ?? [], entry.spellDiceReq)
                : [];
              return (
                <Die3D
                  key={i}
                  value={d}
                  size="sm"
                  variant={hi.includes(i) ? 'highlighted' : 'settled'}
                />
              );
            })}
            <span className="text-xs text-gray-400 dark:text-slate-500 ml-0.5">
              {entry.spellRequirementMet ? '(✓ hit)' : '(✗ fizzle)'}
            </span>
          </div>
          <p>
            <span className="text-violet-600 font-medium">
              ✨ {entry.spellRequirementMet ? `${entry.playerDamage ?? 0} dmg` : 'fizzled'}
            </span>
            {entry.monsterStunned && <span className="text-amber-500"> · stunned</span>}
            {(entry.healAmount ?? 0) > 0 && (
              <span className="text-emerald-600"> · +{entry.healAmount} HP</span>
            )}
            {(entry.spellStaminaRestored ?? 0) > 0 && (
              <span className="text-amber-500"> · +{entry.spellStaminaRestored} Stam</span>
            )}
            {entry.monsterHpAfter === 0 && (
              <span className="text-emerald-600 font-semibold"> · Slain!</span>
            )}
          </p>
          {(entry.monsterDamage ?? 0) > 0 && (
            <p>
              <span className="text-red-500">
                {emoji} hit for {entry.monsterDamage} dmg
                {entry.monsterAttackType === 'magic' && ' 🔮'}
              </span>
              {entry.playerDefFailed ? (
                <span className="text-orange-500"> · 💥 DEF failed</span>
              ) : (
                <span className="text-gray-400 dark:text-slate-500"> · 🛡️ held</span>
              )}
              {entry.playerHpAfter === 0 && (
                <span className="text-red-600 font-semibold"> · You fell!</span>
              )}
            </p>
          )}
        </>
      ) : entry.action === 'ability' ? (
        <>
          <div className="flex items-center gap-1 flex-wrap">
            {(() => {
              const hi = getHighlightedDiceIndices(
                entry.abilityDice ?? [],
                entry.abilityPattern ?? null,
              );
              return (entry.abilityDice ?? []).map((d, i) => (
                <Die3D
                  key={i}
                  value={d}
                  size="sm"
                  variant={hi.includes(i) ? 'highlighted' : 'settled'}
                />
              ));
            })()}
            <span className="text-gray-400 dark:text-slate-500 text-xs ml-0.5">
              {entry.abilityFizzled ? '(fizzle)' : `(${entry.abilityPattern?.replace(/_/g, ' ')})`}
            </span>
          </div>
          <p>
            <span className="text-rose-600 font-medium">
              {entry.abilityEmoji} {entry.playerDamage} dmg
            </span>
            {entry.monsterStunned && <span className="text-amber-500"> · stunned</span>}
            {(entry.healAmount ?? 0) > 0 && (
              <span className="text-emerald-600"> · +{entry.healAmount} HP</span>
            )}
            {entry.monsterHpAfter === 0 && (
              <span className="text-emerald-600 font-semibold"> · Slain!</span>
            )}
          </p>
          {(entry.monsterDamage ?? 0) > 0 && (
            <p>
              <span className="text-red-500">
                {emoji} hit for {entry.monsterDamage} dmg
                {entry.monsterAttackType === 'magic' && ' 🔮'}
              </span>
              {entry.playerDefFailed ? (
                <span className="text-orange-500"> · 💥 DEF failed</span>
              ) : (
                <span className="text-gray-400 dark:text-slate-500"> · 🛡️ held</span>
              )}
              {entry.playerHpAfter === 0 && (
                <span className="text-red-600 font-semibold"> · You fell!</span>
              )}
            </p>
          )}
        </>
      ) : entry.action === 'rest' || entry.action === 'meditate' ? (
        <>
          <p>
            {entry.action === 'rest' ? (
              <span className="text-sky-600">
                +{entry.recoveredStamina} stamina (d10={entry.recoveryRoll})
              </span>
            ) : (
              <span className="text-slate-600">
                +{entry.recoveredMagic} magic (d10={entry.recoveryRoll})
              </span>
            )}
          </p>
          {!entry.dodged && (
            <p>
              <span className="text-red-500">
                {emoji} free attack for {entry.monsterDamage} dmg
              </span>
              <span className="text-orange-500"> · 💥 no defense</span>
              {entry.playerHpAfter === 0 && (
                <span className="text-red-600 font-semibold"> · You fell!</span>
              )}
            </p>
          )}
        </>
      ) : (
        <>
          <p>
            <span
              className={
                entry.action === 'magic'
                  ? 'text-violet-600 font-medium'
                  : 'text-indigo-600 font-medium'
              }
            >
              🎲 {entry.roll}
            </span>
            <span className="text-gray-400 dark:text-slate-500">
              {' '}
              ({entry.roll} + {entry.attackBonusLabel === 'WIS' ? '🔮' : '⚔️'}
              {entry.attackBonus}
            </span>
            {entry.monsterDefFailed ? (
              <span className="text-orange-500"> · 💥 DEF broke!</span>
            ) : (
              <span className="text-gray-400 dark:text-slate-500"> − 🛡️{monster.defense}</span>
            )}
            <span className="text-gray-400 dark:text-slate-500">)</span>
            <span className="text-gray-800 dark:text-slate-100 font-medium">
              {' '}
              → {entry.playerDamage} dmg
            </span>
            {entry.monsterHpAfter === 0 && (
              <span className="text-emerald-600 font-semibold"> · Slain!</span>
            )}
          </p>
          {(entry.monsterDamage ?? 0) > 0 && (
            <p>
              <span className="text-red-500">
                {emoji} hit for {entry.monsterDamage} dmg
                {entry.monsterAttackType === 'magic' && ' 🔮'}
              </span>
              {entry.playerDefFailed ? (
                <span className="text-orange-500"> · 💥 DEF failed</span>
              ) : (
                <span className="text-gray-400 dark:text-slate-500"> · 🛡️ held</span>
              )}
              {entry.playerHpAfter === 0 && (
                <span className="text-red-600 font-semibold"> · You fell!</span>
              )}
            </p>
          )}
        </>
      )}

      {/* Monster special move — heavy / pierce / burst / drain. */}
      {entry.monsterSpecialName && (
        <p className="text-amber-600 dark:text-amber-400 font-medium">
          {entry.monsterSpecialEmoji} {entry.monsterSpecialName}!
          {(entry.monsterSpecialDrain ?? 0) > 0 && (
            <span className="text-fuchsia-500"> · 🩸 +{entry.monsterSpecialDrain} HP</span>
          )}
        </p>
      )}

      {/* Stun landed — the player will skip next turn. */}
      {entry.playerStunnedApplied && (
        <p className="text-amber-600 dark:text-amber-400 font-medium">
          😵 Stunned! You lose a turn.
        </p>
      )}

      {/* Telegraph — a special winding up for next round. */}
      {entry.monsterSpecialPrimedName && (
        <p className="text-amber-600 dark:text-amber-400 font-medium">
          ⚡ Winds up {entry.monsterSpecialPrimedEmoji} {entry.monsterSpecialPrimedName}…
        </p>
      )}

      {/* Rogue dodge — fully negated the monster's hit this round. */}
      {entry.dodged && (
        <p className="text-teal-600 dark:text-teal-400 font-medium">💨 Dodged! No damage taken</p>
      )}

      {/* Modifier notes — venom ticks, shield absorbs, etc. */}
      {entry.modifierNotes && entry.modifierNotes.length > 0 && (
        <ul className="text-xs text-emerald-600 dark:text-emerald-400 pl-0.5">
          {entry.modifierNotes.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      )}
    </li>
  );
}
