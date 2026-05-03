import type { QuestDef } from "@/types";

// ─── Daily Quest Pool ─────────────────────────────────────────────────────────
// 3 quests are picked each day via deterministic rotation (rotation.ts).
// Pool: 2 per activity type = 12 total.

export const DAILY_QUEST_POOL: QuestDef[] = [
  // ── Running ──
  {
    id: "daily-run-1",
    name: "First Mile",
    description: "Lace up and log 1 mile",
    type: "daily",
    requirement: { activityType: "run", target: 1, unit: "miles" },
    rewards: { xp: 50, gold: 15 },
  },
  {
    id: "daily-run-2",
    name: "Distance Runner",
    description: "Push through and log 3 miles",
    type: "daily",
    requirement: { activityType: "run", target: 3, unit: "miles" },
    rewards: { xp: 90, gold: 25 },
  },

  // ── Workout ──
  {
    id: "daily-workout-1",
    name: "Iron Pumper",
    description: "Log 30 minutes of training",
    type: "daily",
    requirement: { activityType: "workout", target: 30, unit: "minutes" },
    rewards: { xp: 50, gold: 15 },
  },
  {
    id: "daily-workout-2",
    name: "Grind Session",
    description: "Log a solid 60-minute workout",
    type: "daily",
    requirement: { activityType: "workout", target: 60, unit: "minutes" },
    rewards: { xp: 90, gold: 25 },
  },

  // ── Steps ──
  {
    id: "daily-steps-1",
    name: "10K Steps",
    description: "Walk 10,000 steps today",
    type: "daily",
    requirement: { activityType: "steps", target: 10000, unit: "steps" },
    rewards: { xp: 50, gold: 14 },
  },
  {
    id: "daily-steps-2",
    name: "Power Walker",
    description: "Log 15,000 steps in a single day",
    type: "daily",
    requirement: { activityType: "steps", target: 15000, unit: "steps" },
    rewards: { xp: 80, gold: 22 },
  },

  // ── Sleep ──
  {
    id: "daily-sleep-1",
    name: "Rest Up",
    description: "Log 7 hours of sleep",
    type: "daily",
    requirement: { activityType: "sleep", target: 7, unit: "hours" },
    rewards: { xp: 40, gold: 12 },
  },
  {
    id: "daily-sleep-2",
    name: "Full Recharge",
    description: "Log a full 8 hours of sleep",
    type: "daily",
    requirement: { activityType: "sleep", target: 8, unit: "hours" },
    rewards: { xp: 55, gold: 16 },
  },

  // ── Water ──
  {
    id: "daily-water-1",
    name: "Hydration Check",
    description: "Drink 8 glasses of water",
    type: "daily",
    requirement: { activityType: "water", target: 8, unit: "glasses" },
    rewards: { xp: 35, gold: 10 },
  },
  {
    id: "daily-water-2",
    name: "Hydration Goal",
    description: "Drink 10 glasses of water today",
    type: "daily",
    requirement: { activityType: "water", target: 10, unit: "glasses" },
    rewards: { xp: 45, gold: 13 },
  },

  // ── Nutrition ──
  {
    id: "daily-nutrition-1",
    name: "Clean Plate",
    description: "Log 2 healthy meals today",
    type: "daily",
    requirement: { activityType: "nutrition", target: 2, unit: "meals" },
    rewards: { xp: 35, gold: 10 },
  },
  {
    id: "daily-nutrition-2",
    name: "Meal Prep",
    description: "Log 3 healthy meals today",
    type: "daily",
    requirement: { activityType: "nutrition", target: 3, unit: "meals" },
    rewards: { xp: 50, gold: 14 },
  },
];

// ─── Weekly Quest Pool ────────────────────────────────────────────────────────
// 3 quests are picked each week via deterministic rotation (rotation.ts).
// Pool: 1 per activity type = 5 quests total; 3 are active each week.

export const WEEKLY_QUEST_POOL: QuestDef[] = [
  {
    id: "weekly-run",
    name: "Running Streak",
    description: "Log 15 miles of running this week",
    type: "weekly",
    requirement: { activityType: "run", target: 15, unit: "miles" },
    rewards: { xp: 250, gold: 70 },
  },
  {
    id: "weekly-workout",
    name: "Warrior's Training",
    description: "Log 150 minutes of workouts this week",
    type: "weekly",
    requirement: { activityType: "workout", target: 150, unit: "minutes" },
    rewards: { xp: 220, gold: 60 },
  },
  {
    id: "weekly-steps",
    name: "The Explorer",
    description: "Walk 50,000 steps this week",
    type: "weekly",
    requirement: { activityType: "steps", target: 50000, unit: "steps" },
    rewards: { xp: 200, gold: 55 },
  },
  {
    id: "weekly-sleep",
    name: "Sleep Champion",
    description: "Log 49 hours of sleep this week",
    type: "weekly",
    requirement: { activityType: "sleep", target: 49, unit: "hours" },
    rewards: { xp: 190, gold: 55 },
  },
  {
    id: "weekly-nutrition",
    name: "Nutritionist",
    description: "Log 12 healthy meals this week",
    type: "weekly",
    requirement: { activityType: "nutrition", target: 12, unit: "meals" },
    rewards: { xp: 180, gold: 50 },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ALL_QUESTS = [...DAILY_QUEST_POOL, ...WEEKLY_QUEST_POOL];

export function getQuestDef(questDefId: string): QuestDef | undefined {
  return ALL_QUESTS.find((q) => q.id === questDefId);
}
