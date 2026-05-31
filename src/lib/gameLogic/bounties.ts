import type { BountyDef, MonsterDef } from '@/types';
import { MONSTER_CATALOG } from './monsters';

// ─── Wanted Board Bounty Pool ─────────────────────────────────────────────────
//
// The Wanted Board posts a rotating set of bounties — fitness objectives that
// grant Reputation (the second currency). Two archetypes:
//   • 'standing' — activity-only loot path: log → collect Reputation (the floor).
//   • 'hunt'     — the activity is an UNLOCK: complete it to engage a level-scaled
//                  target in combat; WIN to collect a bigger Reputation payout.
// The daily board is composed mostly of hunts plus one standing bounty (see
// bountyStore.fetchAndAssignBounties).
//
// Bounties advance off the SAME activity logs that quests do — one workout can
// move both a quest (XP/gold) and a bounty (Reputation). This double-dip is
// intentional: the Wanted Board is a parallel earning surface, not a replacement.

export const BOUNTY_POOL: BountyDef[] = [
  // ── Single-activity bounties ──
  {
    id: 'bounty-workout-45',
    name: 'Hired Muscle',
    description: 'The Board wants 45 minutes of hard training',
    requirement: { activityType: 'workout', target: 45, unit: 'minutes' },
    rewards: { reputation: 45 },
  },
  {
    id: 'bounty-workout-90',
    name: 'Iron Contract',
    description: 'Log 90 minutes under the bar',
    requirement: { activityType: 'workout', target: 90, unit: 'minutes' },
    rewards: { reputation: 80, gold: 20 },
  },
  {
    id: 'bounty-run-3',
    name: 'Courier Run',
    description: 'Deliver 3 miles on foot',
    requirement: { activityType: 'run', target: 3, unit: 'miles' },
    rewards: { reputation: 45 },
  },
  {
    id: 'bounty-run-6',
    name: 'Long Haul',
    description: 'Cover 6 miles for the Board',
    requirement: { activityType: 'run', target: 6, unit: 'miles' },
    rewards: { reputation: 85, gold: 20 },
  },
  {
    id: 'bounty-steps-12k',
    name: 'Town Patrol',
    description: 'Walk 12,000 steps on patrol',
    requirement: { activityType: 'steps', target: 12000, unit: 'steps' },
    rewards: { reputation: 50 },
  },
  {
    id: 'bounty-steps-20k',
    name: 'Far Scout',
    description: 'Scout the territory — 20,000 steps',
    requirement: { activityType: 'steps', target: 20000, unit: 'steps' },
    rewards: { reputation: 90, gold: 25 },
  },
  {
    id: 'bounty-meditation-30',
    name: 'Quiet Vigil',
    description: 'Hold a 30-minute meditation vigil',
    requirement: { activityType: 'meditation', target: 30, unit: 'minutes' },
    rewards: { reputation: 50 },
  },
  {
    id: 'bounty-water-8',
    name: 'Well-Stocked',
    description: 'Drink 8 glasses of water',
    requirement: { activityType: 'water', target: 8, unit: 'glasses' },
    rewards: { reputation: 35 },
  },
  {
    id: 'bounty-sleep-8',
    name: "Sentry's Rest",
    description: 'Bank 8 hours of sleep',
    requirement: { activityType: 'sleep', target: 8, unit: 'hours' },
    rewards: { reputation: 40 },
  },
  {
    id: 'bounty-nutrition-3',
    name: 'Provisioner',
    description: 'Log 3 square meals',
    requirement: { activityType: 'nutrition', target: 3, unit: 'meals' },
    rewards: { reputation: 35 },
  },

  // ── Multi-activity bounties (cross-habit) ──
  {
    id: 'bounty-combo-run-workout',
    name: 'Field Operative',
    description: 'A real operative trains and moves',
    requirement: { activityType: 'workout', target: 30, unit: 'minutes' },
    extraTargets: [{ activityType: 'run', target: 2, unit: 'miles' }],
    rewards: { reputation: 75, gold: 15 },
  },
  {
    id: 'bounty-combo-steps-meditation',
    name: 'Body & Mind',
    description: 'Walk the land and still the mind',
    requirement: { activityType: 'steps', target: 10000, unit: 'steps' },
    extraTargets: [{ activityType: 'meditation', target: 15, unit: 'minutes' }],
    rewards: { reputation: 80, gold: 15 },
  },
  {
    id: 'bounty-combo-water-sleep',
    name: 'Frontier Fitness',
    description: 'Stay watered and well-rested',
    requirement: { activityType: 'water', target: 6, unit: 'glasses' },
    extraTargets: [{ activityType: 'sleep', target: 7, unit: 'hours' }],
    rewards: { reputation: 60 },
  },
  {
    id: 'bounty-combo-triathlon',
    name: 'Bounty Hunter',
    description: 'Lift, run, and walk to claim the big payout',
    requirement: { activityType: 'workout', target: 30, unit: 'minutes' },
    extraTargets: [
      { activityType: 'run', target: 2, unit: 'miles' },
      { activityType: 'steps', target: 8000, unit: 'steps' },
    ],
    rewards: { reputation: 120, gold: 30 },
  },

  // ── Hunt bounties (combat fork) ──
  // The activity TRACKS DOWN the quarry; completing it unlocks the fight. The
  // concrete target is drawn at assignment from a band RELATIVE to the player's
  // level (see pickHuntMonster), so hunts are always viable but vary in bite.
  // Reputation tiers by difficulty band: standard 130 / veteran 170 / elite 220
  // (all above the richest standing bounty — the fight pays more).
  {
    id: 'hunt-track-workout',
    name: 'Track the Quarry',
    description: 'Train hard to pick up the trail, then bring the target down.',
    requirement: { activityType: 'workout', target: 30, unit: 'minutes' },
    kind: 'hunt',
    combat: { levelBand: { min: -1, max: 1 } },
    rewards: { reputation: 130 },
  },
  {
    id: 'hunt-track-run',
    name: 'Run It Down',
    description: 'Cover ground to corner the target, then finish the job.',
    requirement: { activityType: 'run', target: 2, unit: 'miles' },
    kind: 'hunt',
    combat: { levelBand: { min: -1, max: 1 } },
    rewards: { reputation: 130 },
  },
  {
    id: 'hunt-track-steps',
    name: 'Scout & Strike',
    description: 'Patrol the territory to flush out the quarry, then engage.',
    requirement: { activityType: 'steps', target: 8000, unit: 'steps' },
    kind: 'hunt',
    combat: { levelBand: { min: -1, max: 1 } },
    rewards: { reputation: 130 },
  },
  {
    id: 'hunt-track-meditation',
    name: 'Read the Trail',
    description: 'Still your mind to sense the quarry, then close in for the kill.',
    requirement: { activityType: 'meditation', target: 20, unit: 'minutes' },
    kind: 'hunt',
    combat: { levelBand: { min: -1, max: 1 } },
    rewards: { reputation: 130 },
  },
  {
    id: 'hunt-veteran-workout',
    name: "Veteran's Mark",
    description: 'A tougher quarry. Train hard to track it, then take it down.',
    requirement: { activityType: 'workout', target: 45, unit: 'minutes' },
    kind: 'hunt',
    combat: { levelBand: { min: 0, max: 2 } },
    rewards: { reputation: 170 },
  },
  {
    id: 'hunt-veteran-run',
    name: 'Long Pursuit',
    description: 'Run far to corner a seasoned target, then finish it.',
    requirement: { activityType: 'run', target: 4, unit: 'miles' },
    kind: 'hunt',
    combat: { levelBand: { min: 0, max: 2 } },
    rewards: { reputation: 170 },
  },
  {
    id: 'hunt-veteran-steps',
    name: 'Wide Sweep',
    description: 'Sweep the whole region to flush out a tough quarry, then engage.',
    requirement: { activityType: 'steps', target: 12000, unit: 'steps' },
    kind: 'hunt',
    combat: { levelBand: { min: 0, max: 2 } },
    rewards: { reputation: 170 },
  },
  {
    id: 'hunt-elite-workout',
    name: 'Elite Contract',
    description: 'A dangerous quarry, above your weight. Train to its level, then strike.',
    requirement: { activityType: 'workout', target: 60, unit: 'minutes' },
    kind: 'hunt',
    combat: { levelBand: { min: 1, max: 3 } },
    rewards: { reputation: 220 },
  },
  {
    id: 'hunt-elite-run',
    name: 'Apex Chase',
    description: 'Chase down an apex predator over the long road, then bring it low.',
    requirement: { activityType: 'run', target: 5, unit: 'miles' },
    kind: 'hunt',
    combat: { levelBand: { min: 1, max: 3 } },
    rewards: { reputation: 220 },
  },
  {
    id: 'hunt-elite-steps',
    name: 'Deep Territory',
    description: 'March deep into hostile ground to find an elite quarry, then end it.',
    requirement: { activityType: 'steps', target: 15000, unit: 'steps' },
    kind: 'hunt',
    combat: { levelBand: { min: 1, max: 3 } },
    rewards: { reputation: 220 },
  },
];

const BOUNTY_BY_ID = new Map(BOUNTY_POOL.map((b) => [b.id, b]));

export function getBountyDef(bountyDefId: string): BountyDef | undefined {
  return BOUNTY_BY_ID.get(bountyDefId);
}

/**
 * Pick a concrete, level-scaled hunt target from MONSTER_CATALOG. Pure +
 * deterministic given `seed` so the pinned target is stable across re-fetches.
 *
 * `band` is RELATIVE to the player's level (offsets), so a `{ min: -1, max: 1 }`
 * hunt targets monsters around the player's level while `{ min: 1, max: 3 }`
 * targets tougher quarry. The window widens symmetrically until a monster
 * exists, guaranteeing totality for any player level.
 */
export function pickHuntMonster(
  playerLevel: number,
  band: { min: number; max: number },
  seed = playerLevel,
): MonsterDef {
  for (let pad = 0; pad <= 20; pad++) {
    const lo = playerLevel + band.min - pad;
    const hi = playerLevel + band.max + pad;
    const pool = MONSTER_CATALOG.filter((m) => m.level >= lo && m.level <= hi);
    if (pool.length > 0) {
      // LCG (Numerical Recipes) — same generator family as rotation.ts's shuffle.
      const s = (Math.imul(seed, 1664525) + 1013904223) & 0x7fffffff;
      return pool[s % pool.length];
    }
  }
  return MONSTER_CATALOG[0];
}
