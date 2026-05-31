import type { BountyDef } from '@/types';

// ─── Wanted Board Bounty Pool ─────────────────────────────────────────────────
//
// The Wanted Board posts a rotating set of bounties — fitness objectives that
// grant Reputation (the second currency) on completion. 3 are picked each day
// via the deterministic daily rotation (rotation.ts), so every player sees the
// same board on the same day.
//
// Bounties advance off the SAME activity logs that quests do — one workout can
// move both a quest (XP/gold) and a bounty (Reputation). This double-dip is
// intentional: the Wanted Board is a parallel earning surface, not a replacement.
//
// PR1 ships the Loot claim path only. The Fight fork (a combat encounter for
// bigger rewards) lands in a follow-up PR via the `claimBounty` seam.

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
];

const BOUNTY_BY_ID = new Map(BOUNTY_POOL.map((b) => [b.id, b]));

export function getBountyDef(bountyDefId: string): BountyDef | undefined {
  return BOUNTY_BY_ID.get(bountyDefId);
}
