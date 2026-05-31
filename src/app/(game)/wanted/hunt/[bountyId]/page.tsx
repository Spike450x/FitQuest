'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCharacter } from '@/hooks/useCharacter';
import { useCharacterStore } from '@/store/characterStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { useBountyStore } from '@/store/bountyStore';
import { useCombatStore } from '@/store/combatStore';
import { getBountyDef } from '@/lib/gameLogic/bounties';
import { getMonsterById } from '@/lib/gameLogic/monsters';
import {
  playerMaxHp,
  playerMaxStamina,
  playerMaxMagic,
  gearDefenseBonus,
  monsterXpScaling,
} from '@/lib/gameLogic/combat';
import {
  getStreakLootMultiplier,
  getStreakXpMultiplier,
  WELCOME_BACK_LOOT_MULTIPLIER,
  WELCOME_BACK_XP_MULTIPLIER,
} from '@/lib/gameLogic/streaks';
import { useWelcomeBackActive } from '@/hooks/useWelcomeBackBoost';
import { getItemById } from '@/lib/gameLogic/items';
import { CLASS_DEFINITIONS } from '@/lib/gameLogic/constants';
import { ACHIEVEMENTS } from '@/lib/gameLogic/achievements';
import { CombatArena } from '@/components/combat/CombatArena';
import { CombatActionBar } from '@/components/combat/CombatActionBar';
import { HpBar } from '@/components/combat/HpBar';
import { LastActionSummary } from '@/components/combat/LastActionSummary';
import { BattleLogEntry } from '@/components/combat/BattleLogEntry';
import { MONSTER_EMOJI } from '@/components/combat/MonsterCard';
import { ActionRollOverlay } from '@/components/combat/overlays/ActionRollOverlay';
import { DiceRollOverlay } from '@/components/combat/overlays/DiceRollOverlay';
import { SpellRollOverlay } from '@/components/combat/overlays/SpellRollOverlay';
import { useCombatEncounter } from '@/hooks/useCombatEncounter';
import { claimCombatVictoryCF } from '@/lib/functions';
import { fireConfetti } from '@/lib/confetti';
import { playSound } from '@/hooks/useSound';
import { toast } from '@/components/ui/Toaster';
import type { ActiveBounty, Character, MonsterDef } from '@/types';

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function HuntPage() {
  const { character } = useCharacter();
  if (!character) return null;
  return <HuntPageBody character={character} />;
}

function HuntPageBody({ character }: { character: Character }) {
  const router = useRouter();
  const params = useParams();
  const bountyId = String(params.bountyId);

  const bounties = useBountyStore((s) => s.bounties);
  const lastFetchedUid = useBountyStore((s) => s.lastFetchedUid);
  const fetchAndAssignBounties = useBountyStore((s) => s.fetchAndAssignBounties);
  const fetchInventory = useInventoryStore((s) => s.fetchInventory);

  // Ensure bounties + inventory are loaded (TTL-guarded — cheap if already fresh).
  useEffect(() => {
    fetchAndAssignBounties(character.uid);
    fetchInventory(character.uid);
  }, [character.uid, fetchAndAssignBounties, fetchInventory]);

  const bounty = bounties.find((b) => b.id === bountyId);
  const def = bounty ? getBountyDef(bounty.bountyDefId) : undefined;
  const monster = bounty?.combatMonsterId ? getMonsterById(bounty.combatMonsterId) : undefined;

  // Redirect once we've actually fetched for this user and the hunt isn't engageable.
  const fetched = lastFetchedUid === character.uid;
  const engageable =
    !!bounty &&
    !!def &&
    !!monster &&
    bounty.completedAt !== null &&
    bounty.claimedAt === null &&
    bounty.expiresAt > Date.now();

  useEffect(() => {
    if (fetched && !engageable) router.replace('/wanted');
  }, [fetched, engageable, router]);

  if (!engageable || !monster || !bounty) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400 dark:text-slate-500 animate-pulse">Tracking quarry…</p>
      </div>
    );
  }

  return <HuntFight key={monster.id} monster={monster} bounty={bounty} character={character} />;
}

// ─── Fight shell ─────────────────────────────────────────────────────────────────

function HuntFight({
  monster,
  bounty,
  character,
}: {
  monster: MonsterDef;
  bounty: ActiveBounty;
  character: Character;
}) {
  const router = useRouter();

  const awardXpAndStats = useCharacterStore((s) => s.awardXpAndStats);
  const awardGold = useCharacterStore((s) => s.awardGold);
  const setHpLocal = useCharacterStore((s) => s.setHpLocal);
  const updateCurrentHp = useCharacterStore((s) => s.updateCurrentHp);
  const setStaminaLocal = useCharacterStore((s) => s.setStaminaLocal);
  const updateCurrentStamina = useCharacterStore((s) => s.updateCurrentStamina);
  const setMagicLocal = useCharacterStore((s) => s.setMagicLocal);
  const updateCurrentMagic = useCharacterStore((s) => s.updateCurrentMagic);
  const inventoryItems = useInventoryStore((s) => s.items);
  const consumeItem = useInventoryStore((s) => s.useConsumable);
  const replenishSpellCharges = useInventoryStore((s) => s.replenishSpellCharges);
  const claimBounty = useBountyStore((s) => s.claimBounty);

  const [pendingWin, setPendingWin] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [showItemPanel, setShowItemPanel] = useState(false);
  const [showSpellPanel, setShowSpellPanel] = useState(false);

  const maxHp = useMemo(() => playerMaxHp(character), [character]);
  const maxStamina = useMemo(() => playerMaxStamina(character), [character]);
  const maxMagic = useMemo(() => playerMaxMagic(character), [character]);

  const consumables = useMemo(
    () =>
      inventoryItems.filter((i) => {
        const d = getItemById(i.itemDefId);
        return d?.type === 'consumable' && i.equipped;
      }),
    [inventoryItems],
  );
  const equippedSpells = useMemo(
    () =>
      inventoryItems
        .filter((i) => i.equipped)
        .map((i) => ({ invItem: i, def: getItemById(i.itemDefId) }))
        .filter((x) => x.def?.type === 'spell' && x.def.spellMechanics !== undefined),
    [inventoryItems],
  );

  const welcomeBackActive = useWelcomeBackActive();
  const baseStreakLoot = getStreakLootMultiplier(character.streakData?.currentStreak ?? 0);
  const streakMultiplier = welcomeBackActive
    ? Math.max(baseStreakLoot, WELCOME_BACK_LOOT_MULTIPLIER)
    : baseStreakLoot;

  // Pity is irrelevant to hunts (no loot drops), so always 0.
  const getPityFor = () => 0;

  /** XP boost for the fight's own reward — streak + level-scaling (mirrors the arena). */
  function huntXpReward(): number {
    const streak = character.streakData?.currentStreak ?? 0;
    const baseXp = getStreakXpMultiplier(streak);
    const mult = welcomeBackActive ? Math.max(baseXp, WELCOME_BACK_XP_MULTIPLIER) : baseXp;
    return Math.round(monster.xpReward * mult * monsterXpScaling(character.level, monster.level));
  }

  const encounter = useCombatEncounter({
    monster,
    character,
    maxHp,
    maxStamina,
    maxMagic,
    modifiers: undefined,
    streakMultiplier,
    getPityFor,
    consumeItem,
    onResourceChange: ({ hp, stamina, magic }) => {
      setHpLocal(hp);
      setStaminaLocal(stamina);
      setMagicLocal(magic);
    },
    onVictory: async ({ finalHp, finalStamina, finalMagic }) => {
      await updateCurrentHp(finalHp);
      await updateCurrentStamina(finalStamina);
      await updateCurrentMagic(finalMagic);
      await replenishSpellCharges();
      // Stage the win; the player taps "Collect" to run the authoritative claim
      // (mirrors the arena's claim step → natural retry if the CF call fails).
      setPendingWin(true);
    },
    onDefeat: async ({ finalHp, finalStamina, finalMagic }) => {
      // Soft failure — persist resources, NO character reset. The unlock persists
      // so the player can heal up and re-engage from the Wanted Board.
      await updateCurrentHp(finalHp);
      await updateCurrentStamina(finalStamina);
      await updateCurrentMagic(finalMagic);
      await replenishSpellCharges();
      playSound('fail');
    },
    onFlee: async ({ finalHp, finalStamina, finalMagic }) => {
      await updateCurrentHp(finalHp);
      await updateCurrentStamina(finalStamina);
      await updateCurrentMagic(finalMagic);
      await replenishSpellCharges();
      router.push('/wanted');
    },
  });

  const { fightState, pending, bursts, expireBurst, usingItem, rollingAction, actions } = encounter;
  const { playerHp, playerStamina, playerMagic, monsterHp, log, outcome } = fightState;
  const emoji = MONSTER_EMOJI[monster.id] ?? '👾';
  const playerDefStat = (character.stats.defense ?? 0) + gearDefenseBonus(character);
  const lastEntry = log[log.length - 1] ?? null;

  // Nav-lock + unload guard while the fight is live.
  useEffect(() => {
    const active = outcome === null;
    useCombatStore.getState().setCombatActive(active);
    if (!active) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [outcome]);
  useEffect(() => () => useCombatStore.getState().setCombatActive(false), []);

  async function handleCollect() {
    if (collecting) return;
    setCollecting(true);
    playSound('claim');
    try {
      const claim = await claimCombatVictoryCF({
        xpReward: huntXpReward(),
        goldReward: monster.goldReward,
        monsterId: monster.id,
        monsterName: monster.name,
        idempotencyKey: crypto.randomUUID(),
        flawless: false,
      });
      await awardXpAndStats(claim.finalXp, {});
      await awardGold(monster.goldReward);
      // No awardLoot — hunts pay Reputation + XP/gold only (locked design).
      const result = await claimBounty(bounty.id, { path: 'fight' });
      const rep = result ? result.reputationAwarded : bounty.rewards.reputation;

      fireConfetti('subtle');
      playSound('victory');
      toast.success(`🎖️ Bounty collected — ${monster.name} down!`, {
        description: `+${rep} Reputation · +${claim.finalXp} XP · +${monster.goldReward} gold`,
      });
      for (const id of claim.newAchievements) {
        const ach = ACHIEVEMENTS[id as keyof typeof ACHIEVEMENTS];
        if (ach) {
          toast.success(`Achievement unlocked: ${ach.name}`, {
            description: `${ach.emoji} +${ach.goldReward}g — ${ach.description}`,
            duration: 7000,
          });
        }
      }
      if (claim.multiplier < 1.0) {
        toast.warning(`Daily combat XP at ${Math.round(claim.multiplier * 100)}%`, {
          description: 'Hunts share the arena daily XP cap — take a break to keep gains high.',
          duration: 6000,
        });
      }
      router.push('/wanted');
    } catch {
      toast.error("Couldn't reach the server — your win is safe, tap Collect again", {
        description: 'Nothing was awarded yet.',
      });
      setCollecting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
          Wanted: {emoji} {monster.name}
        </h1>
        <span className="text-xs text-violet-600 dark:text-violet-300 font-semibold shrink-0">
          +{bounty.rewards.reputation} Rep
        </span>
      </div>

      {/* Outcome banners */}
      {outcome === 'win' && (
        <div className="rounded-xl p-6 text-center bg-gradient-to-br from-violet-100 dark:from-violet-950/60 via-fuchsia-50 dark:via-fuchsia-950/40 to-amber-50 dark:to-amber-950/30 border border-violet-200 dark:border-violet-800 shadow-lg shadow-violet-500/10">
          <p className="text-5xl mb-2 drop-shadow-md">🎖️</p>
          <p className="font-display text-4xl font-bold text-violet-700 dark:text-violet-300 tracking-wider uppercase">
            Target Down!
          </p>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
            {emoji} {monster.name} bested — collect your bounty.
          </p>
        </div>
      )}
      {outcome === 'loss' && (
        <div className="rounded-xl p-6 text-center bg-gradient-to-br from-red-100 dark:from-red-950/60 via-red-50 dark:via-red-950/30 to-gray-100 dark:to-slate-900 border border-red-300 dark:border-red-900 shadow-lg shadow-red-500/20">
          <p className="text-5xl mb-2 grayscale-[30%]">🩸</p>
          <p className="font-display text-3xl font-bold text-red-700 dark:text-red-400 tracking-wider uppercase">
            Driven Off
          </p>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
            {emoji} {monster.name} got the better of you. Heal up and pick the trail back up — the
            bounty&apos;s still yours to claim.
          </p>
        </div>
      )}

      {/* Battle portraits */}
      <CombatArena
        shakeKey={`${log.length}-${lastEntry?.playerDamage ?? 0}-${lastEntry?.monsterDamage ?? 0}`}
        bursts={bursts}
        onBurstExpired={expireBurst}
        player={{
          name: character.name,
          classId: character.class,
          emoji: CLASS_DEFINITIONS[character.class].emoji,
          hp: playerHp,
          maxHp,
          defense: playerDefStat,
        }}
        monster={{
          name: monster.name,
          id: monster.id,
          emoji,
          hp: monsterHp,
          maxHp: monster.hp,
          defense: monster.defense,
          passive: monster.passive,
          activeLabel: fightState.activeUsed && monster.active ? monster.active.label : undefined,
        }}
      />

      {/* Player resources */}
      <div className="bg-white dark:bg-slate-900/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-xl p-4 shadow-sm space-y-3">
        <HpBar label="⚡ Stamina" current={playerStamina} max={maxStamina} color="bg-amber-400" />
        <HpBar
          label="✨ Magic"
          current={playerMagic}
          max={maxMagic}
          color="bg-violet-400"
          sub={
            equippedSpells.length === 0
              ? 'No spells equipped — visit Inventory'
              : `${equippedSpells.length} spell${equippedSpells.length !== 1 ? 's' : ''} ready`
          }
        />
      </div>

      {/* Last roll */}
      {lastEntry && (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 mb-2 uppercase tracking-wider">
            Last Action — Round {lastEntry.round}
          </p>
          <LastActionSummary entry={lastEntry} monster={monster} />
        </div>
      )}

      {/* Battle log */}
      {log.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 mb-3 uppercase tracking-wider">
            Battle Log · {log.length} {log.length === 1 ? 'round' : 'rounds'}
          </p>
          <ul className="space-y-3 max-h-52 overflow-y-auto pr-1">
            {[...log].reverse().map((entry) => (
              <BattleLogEntry key={entry.round} entry={entry} monster={monster} emoji={emoji} />
            ))}
          </ul>
        </div>
      )}

      {/* Action bar / outcome footer */}
      {outcome === null ? (
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
          spellChargesUsed={encounter.spellChargesUsed}
        />
      ) : outcome === 'win' && pendingWin ? (
        <button
          onClick={handleCollect}
          disabled={collecting}
          className="w-full bg-gradient-to-r from-violet-500 via-violet-400 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
        >
          {collecting ? 'Collecting…' : `Collect Bounty · +${bounty.rewards.reputation} Rep`}
        </button>
      ) : (
        <Link
          href="/wanted"
          className="block w-full text-center bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 hover:border-violet-300 text-gray-700 dark:text-slate-200 font-semibold py-3 rounded-xl transition-colors"
        >
          Heal up &amp; return to the Board
        </Link>
      )}

      {/* Overlays */}
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
          onDismiss={pending.ability.applyResult}
        />
      )}
      {pending.spell && (
        <SpellRollOverlay
          spellDef={pending.spell.spellDef}
          dice={pending.spell.dice}
          requirementMet={pending.spell.requirementMet}
          monsterRoll={pending.spell.monsterRoll}
          monsterStunned={pending.spell.monsterStunned}
          monsterDamage={pending.spell.monsterDamage}
          onDismiss={pending.spell.applyResult}
        />
      )}
    </div>
  );
}
