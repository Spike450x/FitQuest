'use client';

import { Die3D } from '@/components/ui/Die3D';
import { getHighlightedSpellDiceIndices } from '@/lib/gameLogic/spells';
import { getHighlightedDiceIndices } from './AbilityReference';
import type { MonsterDef } from '@/types';
import type { RoundEntry } from './types';

export function LastActionSummary({ entry, monster }: { entry: RoundEntry; monster: MonsterDef }) {
  if (entry.action === 'run_failed') {
    return (
      <div className="text-sm space-y-1">
        <p>
          <span className="text-amber-600 font-medium">🏃 Ran — </span>
          <span className="font-mono text-amber-700">
            You rolled {entry.playerRunRoll}
            {(entry.agilityBonus ?? 0) > 0 && (
              <>
                {' '}
                + <span className="text-green-600">{entry.agilityBonus} AGI</span> ={' '}
                {(entry.playerRunRoll ?? 0) + (entry.agilityBonus ?? 0)}
              </>
            )}
          </span>
          <span className="text-gray-400 dark:text-slate-500"> vs </span>
          <span className="font-mono text-gray-600 dark:text-slate-300">
            Monster rolled {entry.monsterRunRoll}
          </span>
          <span className="text-red-600 font-semibold"> · Failed to escape</span>
        </p>
        {(entry.monsterDamage ?? 0) > 0 && (
          <p className="text-red-500">
            Monster hit for {entry.monsterDamage} dmg
            {entry.monsterAttackType === 'magic' && (
              <span className="text-violet-500"> · 🔮 magic</span>
            )}
            {entry.playerDefFailed ? (
              <span className="text-orange-500 font-semibold"> · 💥 Your DEF failed!</span>
            ) : (
              <span className="text-gray-400 dark:text-slate-500"> · 🛡️ DEF held</span>
            )}
          </p>
        )}
        {entry.dodged && (
          <p className="text-teal-600 dark:text-teal-400 font-medium">💨 Dodged! No damage taken</p>
        )}
      </div>
    );
  }

  if (entry.action === 'spell') {
    const met = entry.spellRequirementMet;
    return (
      <div className="text-sm space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
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
          <span className="text-xs text-gray-400 dark:text-slate-500 ml-1">
            {met ? '✓ Requirement met!' : '✗ Fizzled'}
          </span>
        </div>
        <p>
          <span
            className={`font-bold ${met ? 'text-violet-600' : 'text-gray-400 dark:text-slate-500'}`}
          >
            ✨ {entry.spellName}
          </span>
          {!met && (
            <span className="text-gray-400 dark:text-slate-500 font-medium">
              {' '}
              — Fizzled (magic spent)
            </span>
          )}
          {met && entry.monsterStunned && (
            <span className="text-amber-500 font-semibold"> · 😵 Monster stunned!</span>
          )}
          {met && (entry.playerDamage ?? 0) > 0 && (
            <span className="text-gray-800 dark:text-slate-100 font-semibold">
              {' '}
              → {entry.playerDamage} dmg
            </span>
          )}
          {met && (entry.healAmount ?? 0) > 0 && (
            <span className="text-emerald-600 font-semibold"> · +{entry.healAmount} HP</span>
          )}
          {met && (entry.spellStaminaRestored ?? 0) > 0 && (
            <span className="text-amber-500 font-semibold">
              {' '}
              · +{entry.spellStaminaRestored} Stamina
            </span>
          )}
          {met && (entry.defenseBoost ?? 0) > 0 && (
            <span className="text-blue-500 font-semibold">
              {' '}
              · +{entry.defenseBoost} DEF this round
            </span>
          )}
        </p>
        <p className="text-xs text-violet-400">✨ {entry.spellMagicCost} magic spent</p>
        {(entry.monsterDamage ?? 0) > 0 && (
          <p className="text-red-500">
            Monster hit back for {entry.monsterDamage} dmg
            {entry.monsterAttackType === 'magic' && (
              <span className="text-violet-500"> · 🔮 magic</span>
            )}
            {entry.playerDefFailed ? (
              <span className="text-orange-500 font-semibold"> · 💥 Your DEF failed!</span>
            ) : (
              <span className="text-gray-400 dark:text-slate-500"> · 🛡️ DEF held</span>
            )}
          </p>
        )}
        {entry.dodged && (
          <p className="text-teal-600 dark:text-teal-400 font-medium">💨 Dodged! No damage taken</p>
        )}
        {entry.monsterStunned && (entry.monsterDamage ?? 0) === 0 && (
          <p className="text-amber-500 text-xs">
            Monster was stunned — no counter-attack this round.
          </p>
        )}
      </div>
    );
  }

  if (entry.action === 'ability') {
    return (
      <div className="text-sm space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
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
          <span className="text-xs text-gray-400 dark:text-slate-500 ml-1">
            {entry.abilityFizzled
              ? '— no pattern (fizzle)'
              : `— ${entry.abilityPattern?.replace(/_/g, ' ')}`}
          </span>
        </div>
        {entry.abilityFizzled ? (
          <p className="text-gray-500 dark:text-slate-400">
            <span className="font-medium text-rose-500">Fizzle! </span>
            Basic hit for{' '}
            <span className="font-semibold text-gray-800 dark:text-slate-100">
              {entry.playerDamage} dmg
            </span>
          </p>
        ) : (
          <p>
            <span className="font-bold text-rose-600">
              {entry.abilityEmoji} {entry.abilityName}
            </span>
            {entry.monsterStunned && (
              <span className="text-amber-500 font-semibold"> · 😵 Monster stunned!</span>
            )}
            <span className="text-gray-800 dark:text-slate-100 font-semibold">
              {' '}
              → {entry.playerDamage} dmg
            </span>
            {(entry.healAmount ?? 0) > 0 && (
              <span className="text-emerald-600 font-semibold">
                {' '}
                · +{entry.healAmount} HP restored
              </span>
            )}
          </p>
        )}
        {(entry.monsterDamage ?? 0) > 0 && (
          <p className="text-red-500">
            Monster hit back for {entry.monsterDamage} dmg
            {entry.monsterAttackType === 'magic' && (
              <span className="text-violet-500"> · 🔮 magic</span>
            )}
            {entry.playerDefFailed ? (
              <span className="text-orange-500 font-semibold"> · 💥 Your DEF failed!</span>
            ) : (
              <span className="text-gray-400 dark:text-slate-500"> · 🛡️ DEF held</span>
            )}
          </p>
        )}
        {entry.dodged && (
          <p className="text-teal-600 dark:text-teal-400 font-medium">💨 Dodged! No damage taken</p>
        )}
        {entry.monsterStunned && (entry.monsterDamage ?? 0) === 0 && (
          <p className="text-amber-500 text-xs">
            Monster was stunned — no counter-attack this round.
          </p>
        )}
      </div>
    );
  }

  if (entry.action === 'rest' || entry.action === 'meditate') {
    const isRest = entry.action === 'rest';
    return (
      <div className="text-sm space-y-1">
        <p>
          <span className={`font-medium ${isRest ? 'text-sky-600' : 'text-slate-600'}`}>
            {isRest ? '🛌 Rested' : '🧘 Meditated'} (rolled {entry.recoveryRoll})
          </span>
          {isRest && (entry.recoveredStamina ?? 0) > 0 && (
            <span className="text-sky-700 font-semibold"> → +{entry.recoveredStamina} Stamina</span>
          )}
          {!isRest && (entry.recoveredMagic ?? 0) > 0 && (
            <span className="text-slate-700 font-semibold"> → +{entry.recoveredMagic} Magic</span>
          )}
        </p>
        {entry.dodged ? (
          <p className="text-teal-600 dark:text-teal-400 font-medium">💨 Dodged! No damage taken</p>
        ) : (
          <p className="text-red-500">
            {isRest ? '🛌' : '🧘'} Monster free attack for{' '}
            <span className="font-semibold">{entry.monsterDamage} dmg</span>
            <span className="text-orange-500 font-semibold"> · 💥 No defense</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="text-sm space-y-1">
      <p>
        <span
          className={`font-medium ${entry.action === 'magic' ? 'text-violet-600' : 'text-indigo-600'}`}
        >
          🎲 {entry.roll}
        </span>
        <span className="text-gray-400 dark:text-slate-500"> + </span>
        <span className="font-mono text-emerald-600">
          {entry.attackBonusLabel === 'WIS' ? '🔮' : '⚔️'} {entry.attackBonus}{' '}
          {entry.attackBonusLabel}
        </span>
        {entry.monsterDefFailed ? (
          <span className="text-orange-500 font-semibold"> · 💥 DEF broke!</span>
        ) : (
          <>
            <span className="text-gray-400 dark:text-slate-500"> − </span>
            <span className="font-mono text-gray-500 dark:text-slate-400">
              🛡️ {monster.defense}
            </span>
          </>
        )}
        <span className="text-gray-800 dark:text-slate-100 font-semibold">
          {' '}
          = {entry.playerDamage} dmg
        </span>
      </p>
      {(entry.monsterDamage ?? 0) > 0 && (
        <p className="text-red-500">
          Monster hit back for {entry.monsterDamage} dmg
          {entry.monsterAttackType === 'magic' && (
            <span className="text-violet-500"> · 🔮 magic</span>
          )}
          {entry.playerDefFailed ? (
            <span className="text-orange-500 font-semibold"> · 💥 Your DEF failed!</span>
          ) : (
            <span className="text-gray-400 dark:text-slate-500"> · 🛡️ DEF held</span>
          )}
        </p>
      )}
      {entry.dodged && (
        <p className="text-teal-600 dark:text-teal-400 font-medium">💨 Dodged! No damage taken</p>
      )}
    </div>
  );
}
