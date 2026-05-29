import type { QuestDef } from '@/types';

// ─── Daily Quest Pool ─────────────────────────────────────────────────────────
// 3 quests are picked each day via deterministic rotation (rotation.ts).
// Pool: 61 total (6 single-activity per type + 18 cross-habit combos). Rewards
// were balanced for level 1–5 — the level scaler in scaleQuestRewards() compounds
// at runtime, so base values stay consistent with the original tier (1×) at low level.

export const DAILY_QUEST_POOL: QuestDef[] = [
  // ── Running ──
  {
    id: 'daily-run-1',
    name: 'First Mile',
    description: 'Lace up and log 1 mile',
    type: 'daily',
    requirement: { activityType: 'run', target: 1, unit: 'miles' },
    rewards: { xp: 50, gold: 15 },
  },
  {
    id: 'daily-run-2',
    name: 'Distance Runner',
    description: 'Push through and log 3 miles',
    type: 'daily',
    requirement: { activityType: 'run', target: 3, unit: 'miles' },
    rewards: { xp: 90, gold: 25 },
  },
  {
    id: 'daily-run-3',
    name: 'Pavement Pounder',
    description: 'Log 2 miles at any pace',
    type: 'daily',
    requirement: { activityType: 'run', target: 2, unit: 'miles' },
    rewards: { xp: 70, gold: 20 },
  },
  {
    id: 'daily-run-4',
    name: 'Endurance Run',
    description: 'Push for 5 miles in a single day',
    type: 'daily',
    requirement: { activityType: 'run', target: 5, unit: 'miles' },
    rewards: { xp: 130, gold: 36 },
  },

  // ── Workout ──
  {
    id: 'daily-workout-1',
    name: 'Iron Pumper',
    description: 'Log 30 minutes of training',
    type: 'daily',
    requirement: { activityType: 'workout', target: 30, unit: 'minutes' },
    rewards: { xp: 50, gold: 15 },
  },
  {
    id: 'daily-workout-2',
    name: 'Grind Session',
    description: 'Log a solid 60-minute workout',
    type: 'daily',
    requirement: { activityType: 'workout', target: 60, unit: 'minutes' },
    rewards: { xp: 90, gold: 25 },
  },
  {
    id: 'daily-workout-3',
    name: 'Quick Burn',
    description: 'Squeeze in a 20-minute workout',
    type: 'daily',
    requirement: { activityType: 'workout', target: 20, unit: 'minutes' },
    rewards: { xp: 35, gold: 11 },
  },
  {
    id: 'daily-workout-4',
    name: 'Beast Mode',
    description: 'Train for 90 minutes today',
    type: 'daily',
    requirement: { activityType: 'workout', target: 90, unit: 'minutes' },
    rewards: { xp: 130, gold: 36 },
  },

  // ── Steps ──
  {
    id: 'daily-steps-1',
    name: '10K Steps',
    description: 'Walk 10,000 steps today',
    type: 'daily',
    requirement: { activityType: 'steps', target: 10000, unit: 'steps' },
    rewards: { xp: 50, gold: 14 },
  },
  {
    id: 'daily-steps-2',
    name: 'Power Walker',
    description: 'Log 15,000 steps in a single day',
    type: 'daily',
    requirement: { activityType: 'steps', target: 15000, unit: 'steps' },
    rewards: { xp: 80, gold: 22 },
  },
  {
    id: 'daily-steps-3',
    name: 'Stretch the Legs',
    description: 'Log 6,000 steps today',
    type: 'daily',
    requirement: { activityType: 'steps', target: 6000, unit: 'steps' },
    rewards: { xp: 30, gold: 9 },
  },
  {
    id: 'daily-steps-4',
    name: 'Marathon Pace',
    description: 'Cover 20,000 steps before sunset',
    type: 'daily',
    requirement: { activityType: 'steps', target: 20000, unit: 'steps' },
    rewards: { xp: 110, gold: 30 },
  },

  // ── Sleep ──
  {
    id: 'daily-sleep-1',
    name: 'Rest Up',
    description: 'Log 7 hours of sleep',
    type: 'daily',
    requirement: { activityType: 'sleep', target: 7, unit: 'hours' },
    rewards: { xp: 40, gold: 12 },
  },
  {
    id: 'daily-sleep-2',
    name: 'Full Recharge',
    description: 'Log a full 8 hours of sleep',
    type: 'daily',
    requirement: { activityType: 'sleep', target: 8, unit: 'hours' },
    rewards: { xp: 55, gold: 16 },
  },
  {
    id: 'daily-sleep-3',
    name: 'Power Nap',
    description: 'Log 6 hours of sleep',
    type: 'daily',
    requirement: { activityType: 'sleep', target: 6, unit: 'hours' },
    rewards: { xp: 28, gold: 8 },
  },
  {
    id: 'daily-sleep-4',
    name: 'Hibernation',
    description: 'Log 9 hours of restorative sleep',
    type: 'daily',
    requirement: { activityType: 'sleep', target: 9, unit: 'hours' },
    rewards: { xp: 75, gold: 22 },
  },

  // ── Water ──
  {
    id: 'daily-water-1',
    name: 'Hydration Check',
    description: 'Drink 8 glasses of water',
    type: 'daily',
    requirement: { activityType: 'water', target: 8, unit: 'glasses' },
    rewards: { xp: 35, gold: 10 },
  },
  {
    id: 'daily-water-2',
    name: 'Hydration Goal',
    description: 'Drink 10 glasses of water today',
    type: 'daily',
    requirement: { activityType: 'water', target: 10, unit: 'glasses' },
    rewards: { xp: 45, gold: 13 },
  },
  {
    id: 'daily-water-3',
    name: 'Wet Whistle',
    description: 'Log 5 glasses of water',
    type: 'daily',
    requirement: { activityType: 'water', target: 5, unit: 'glasses' },
    rewards: { xp: 22, gold: 6 },
  },
  {
    id: 'daily-water-4',
    name: 'Aqua Master',
    description: 'Log 12 glasses of water',
    type: 'daily',
    requirement: { activityType: 'water', target: 12, unit: 'glasses' },
    rewards: { xp: 60, gold: 18 },
  },

  // ── Nutrition ──
  {
    id: 'daily-nutrition-1',
    name: 'Clean Plate',
    description: 'Log 2 healthy meals today',
    type: 'daily',
    requirement: { activityType: 'nutrition', target: 2, unit: 'meals' },
    rewards: { xp: 35, gold: 10 },
  },
  {
    id: 'daily-nutrition-2',
    name: 'Meal Prep',
    description: 'Log 3 healthy meals today',
    type: 'daily',
    requirement: { activityType: 'nutrition', target: 3, unit: 'meals' },
    rewards: { xp: 50, gold: 14 },
  },
  {
    id: 'daily-nutrition-3',
    name: 'Breakfast Champion',
    description: 'Log 1 healthy meal today',
    type: 'daily',
    requirement: { activityType: 'nutrition', target: 1, unit: 'meals' },
    rewards: { xp: 18, gold: 5 },
  },
  {
    id: 'daily-nutrition-4',
    name: 'Feast Day',
    description: 'Log 4 healthy meals today',
    type: 'daily',
    requirement: { activityType: 'nutrition', target: 4, unit: 'meals' },
    rewards: { xp: 70, gold: 20 },
  },

  // ── Meditation ──
  {
    id: 'daily-meditation-1',
    name: 'Calm Center',
    description: 'Sit for 10 minutes of meditation',
    type: 'daily',
    requirement: { activityType: 'meditation', target: 10, unit: 'minutes' },
    rewards: { xp: 35, gold: 10 },
  },
  {
    id: 'daily-meditation-2',
    name: 'Steady Breath',
    description: 'Log 20 minutes of meditation today',
    type: 'daily',
    requirement: { activityType: 'meditation', target: 20, unit: 'minutes' },
    rewards: { xp: 60, gold: 17 },
  },
  {
    id: 'daily-meditation-3',
    name: 'Quick Centering',
    description: 'Find 5 minutes of stillness today',
    type: 'daily',
    requirement: { activityType: 'meditation', target: 5, unit: 'minutes' },
    rewards: { xp: 20, gold: 6 },
  },
  {
    id: 'daily-meditation-4',
    name: 'Deep Focus',
    description: 'Log a 30-minute meditation session',
    type: 'daily',
    requirement: { activityType: 'meditation', target: 30, unit: 'minutes' },
    rewards: { xp: 90, gold: 25 },
  },
  {
    id: 'daily-meditation-5',
    name: 'Spirit Communion',
    description: 'Log 45 minutes of meditation today',
    type: 'daily',
    requirement: { activityType: 'meditation', target: 45, unit: 'minutes' },
    rewards: { xp: 130, gold: 36 },
  },

  // ── Multi-target daily quests ──────────────────────────────────────────────
  // Rewards are ~1.4–1.6× the individual components — a meaningful bonus for
  // crossing two habits on the same day without making single-activity quests obsolete.
  {
    id: 'daily-combo-run-sleep',
    name: 'Active Recovery',
    description: 'Run 1 mile and get 7 hours of sleep',
    type: 'daily',
    requirement: { activityType: 'run', target: 1, unit: 'miles' },
    extraTargets: [{ activityType: 'sleep', target: 7, unit: 'hours' }],
    rewards: { xp: 110, gold: 30 },
  },
  {
    id: 'daily-combo-workout-water',
    name: 'Iron Hydration',
    description: 'Log 30 min of training and drink 8 glasses of water',
    type: 'daily',
    requirement: { activityType: 'workout', target: 30, unit: 'minutes' },
    extraTargets: [{ activityType: 'water', target: 8, unit: 'glasses' }],
    rewards: { xp: 120, gold: 33 },
  },
  {
    id: 'daily-combo-steps-nutrition',
    name: 'Fueled Explorer',
    description: 'Walk 5,000 steps and log 2 healthy meals',
    type: 'daily',
    requirement: { activityType: 'steps', target: 5000, unit: 'steps' },
    extraTargets: [{ activityType: 'nutrition', target: 2, unit: 'meals' }],
    rewards: { xp: 100, gold: 28 },
  },
  {
    id: 'daily-combo-run-water',
    name: 'Morning Grind',
    description: 'Run 2 miles and drink 6 glasses of water',
    type: 'daily',
    requirement: { activityType: 'run', target: 2, unit: 'miles' },
    extraTargets: [{ activityType: 'water', target: 6, unit: 'glasses' }],
    rewards: { xp: 140, gold: 39 },
  },
  {
    id: 'daily-combo-meditation-workout',
    name: 'Mind & Body',
    description: 'Meditate 15 minutes and train for 30 minutes',
    type: 'daily',
    requirement: { activityType: 'meditation', target: 15, unit: 'minutes' },
    extraTargets: [{ activityType: 'workout', target: 30, unit: 'minutes' }],
    rewards: { xp: 130, gold: 36 },
  },

  // ── PR5 expansion — single-activity dailies (2 more per activity) ───────────
  {
    id: 'daily-run-5',
    name: 'Long Hauler',
    description: 'Log 4 miles of running today',
    type: 'daily',
    requirement: { activityType: 'run', target: 4, unit: 'miles' },
    rewards: { xp: 110, gold: 30 },
  },
  {
    id: 'daily-run-6',
    name: 'Half-Marathon Spirit',
    description: 'Push for 7 miles in a single day',
    type: 'daily',
    requirement: { activityType: 'run', target: 7, unit: 'miles' },
    rewards: { xp: 175, gold: 48 },
  },
  {
    id: 'daily-workout-5',
    name: 'Solid Session',
    description: 'Train for 45 minutes today',
    type: 'daily',
    requirement: { activityType: 'workout', target: 45, unit: 'minutes' },
    rewards: { xp: 70, gold: 20 },
  },
  {
    id: 'daily-workout-6',
    name: 'Marathon Lift',
    description: 'Train for 120 minutes today',
    type: 'daily',
    requirement: { activityType: 'workout', target: 120, unit: 'minutes' },
    rewards: { xp: 165, gold: 45 },
  },
  {
    id: 'daily-steps-5',
    name: 'Daily Stroll',
    description: 'Walk 8,000 steps today',
    type: 'daily',
    requirement: { activityType: 'steps', target: 8000, unit: 'steps' },
    rewards: { xp: 42, gold: 12 },
  },
  {
    id: 'daily-steps-6',
    name: 'Ultra Walker',
    description: 'Cover 25,000 steps before sunset',
    type: 'daily',
    requirement: { activityType: 'steps', target: 25000, unit: 'steps' },
    rewards: { xp: 140, gold: 38 },
  },
  {
    id: 'daily-sleep-5',
    name: 'Solid Night',
    description: 'Log 7.5 hours of sleep',
    type: 'daily',
    requirement: { activityType: 'sleep', target: 7.5, unit: 'hours' },
    rewards: { xp: 48, gold: 14 },
  },
  {
    id: 'daily-sleep-6',
    name: 'Deep Slumber',
    description: 'Log 10 hours of restorative sleep',
    type: 'daily',
    requirement: { activityType: 'sleep', target: 10, unit: 'hours' },
    rewards: { xp: 90, gold: 26 },
  },
  {
    id: 'daily-water-5',
    name: 'First Sips',
    description: 'Drink 6 glasses of water today',
    type: 'daily',
    requirement: { activityType: 'water', target: 6, unit: 'glasses' },
    rewards: { xp: 28, gold: 8 },
  },
  {
    id: 'daily-water-6',
    name: 'Ocean Within',
    description: 'Drink 15 glasses of water today',
    type: 'daily',
    requirement: { activityType: 'water', target: 15, unit: 'glasses' },
    rewards: { xp: 75, gold: 22 },
  },
  {
    id: 'daily-nutrition-5',
    name: 'Balanced Day',
    description: 'Log 5 healthy meals today',
    type: 'daily',
    requirement: { activityType: 'nutrition', target: 5, unit: 'meals' },
    rewards: { xp: 88, gold: 25 },
  },
  {
    id: 'daily-nutrition-6',
    name: 'Snack Smart',
    description: 'Log 2 healthy meals before noon',
    type: 'daily',
    requirement: { activityType: 'nutrition', target: 2, unit: 'meals' },
    rewards: { xp: 35, gold: 10 },
  },
  {
    id: 'daily-meditation-6',
    name: 'Hour of Calm',
    description: 'Log a full 60 minutes of meditation today',
    type: 'daily',
    requirement: { activityType: 'meditation', target: 60, unit: 'minutes' },
    rewards: { xp: 165, gold: 46 },
  },
  {
    id: 'daily-meditation-7',
    name: 'Morning Ritual',
    description: 'Begin the day with 15 minutes of meditation',
    type: 'daily',
    requirement: { activityType: 'meditation', target: 15, unit: 'minutes' },
    rewards: { xp: 48, gold: 14 },
  },

  // ── PR5 expansion — combo dailies (Spirit-building + cross-habit variety) ───
  {
    id: 'daily-combo-meditation-run',
    name: 'Mindful Miles',
    description: 'Meditate 10 minutes and run 2 miles',
    type: 'daily',
    requirement: { activityType: 'meditation', target: 10, unit: 'minutes' },
    extraTargets: [{ activityType: 'run', target: 2, unit: 'miles' }],
    rewards: { xp: 120, gold: 33 },
  },
  {
    id: 'daily-combo-meditation-steps',
    name: 'Walking Meditation',
    description: 'Meditate 10 minutes and walk 8,000 steps',
    type: 'daily',
    requirement: { activityType: 'meditation', target: 10, unit: 'minutes' },
    extraTargets: [{ activityType: 'steps', target: 8000, unit: 'steps' }],
    rewards: { xp: 100, gold: 28 },
  },
  {
    id: 'daily-combo-meditation-water',
    name: 'Cleansing Ritual',
    description: 'Meditate 15 minutes and drink 8 glasses of water',
    type: 'daily',
    requirement: { activityType: 'meditation', target: 15, unit: 'minutes' },
    extraTargets: [{ activityType: 'water', target: 8, unit: 'glasses' }],
    rewards: { xp: 95, gold: 27 },
  },
  {
    id: 'daily-combo-meditation-sleep',
    name: 'Restful Mind',
    description: 'Meditate 20 minutes and get 8 hours of sleep',
    type: 'daily',
    requirement: { activityType: 'meditation', target: 20, unit: 'minutes' },
    extraTargets: [{ activityType: 'sleep', target: 8, unit: 'hours' }],
    rewards: { xp: 115, gold: 32 },
  },
  {
    id: 'daily-combo-meditation-nutrition',
    name: 'Mindful Eating',
    description: 'Meditate 10 minutes and log 3 healthy meals',
    type: 'daily',
    requirement: { activityType: 'meditation', target: 10, unit: 'minutes' },
    extraTargets: [{ activityType: 'nutrition', target: 3, unit: 'meals' }],
    rewards: { xp: 105, gold: 29 },
  },
  {
    id: 'daily-combo-workout-steps',
    name: 'Total Motion',
    description: 'Train 30 minutes and walk 10,000 steps',
    type: 'daily',
    requirement: { activityType: 'workout', target: 30, unit: 'minutes' },
    extraTargets: [{ activityType: 'steps', target: 10000, unit: 'steps' }],
    rewards: { xp: 125, gold: 35 },
  },
  {
    id: 'daily-combo-workout-sleep',
    name: 'Train & Recover',
    description: 'Train 45 minutes and get 8 hours of sleep',
    type: 'daily',
    requirement: { activityType: 'workout', target: 45, unit: 'minutes' },
    extraTargets: [{ activityType: 'sleep', target: 8, unit: 'hours' }],
    rewards: { xp: 130, gold: 36 },
  },
  {
    id: 'daily-combo-workout-nutrition',
    name: 'Gains Fuel',
    description: 'Train 60 minutes and log 3 healthy meals',
    type: 'daily',
    requirement: { activityType: 'workout', target: 60, unit: 'minutes' },
    extraTargets: [{ activityType: 'nutrition', target: 3, unit: 'meals' }],
    rewards: { xp: 145, gold: 40 },
  },
  {
    id: 'daily-combo-run-nutrition',
    name: "Runner's Fuel",
    description: 'Run 3 miles and log 2 healthy meals',
    type: 'daily',
    requirement: { activityType: 'run', target: 3, unit: 'miles' },
    extraTargets: [{ activityType: 'nutrition', target: 2, unit: 'meals' }],
    rewards: { xp: 130, gold: 36 },
  },
  {
    id: 'daily-combo-run-steps',
    name: 'Cardio Doubleheader',
    description: 'Run 2 miles and walk 8,000 steps',
    type: 'daily',
    requirement: { activityType: 'run', target: 2, unit: 'miles' },
    extraTargets: [{ activityType: 'steps', target: 8000, unit: 'steps' }],
    rewards: { xp: 120, gold: 33 },
  },
  {
    id: 'daily-combo-steps-water',
    name: 'Hydrated Hike',
    description: 'Walk 12,000 steps and drink 8 glasses of water',
    type: 'daily',
    requirement: { activityType: 'steps', target: 12000, unit: 'steps' },
    extraTargets: [{ activityType: 'water', target: 8, unit: 'glasses' }],
    rewards: { xp: 110, gold: 30 },
  },
  {
    id: 'daily-combo-sleep-water',
    name: 'Night Routine',
    description: 'Get 8 hours of sleep and drink 8 glasses of water',
    type: 'daily',
    requirement: { activityType: 'sleep', target: 8, unit: 'hours' },
    extraTargets: [{ activityType: 'water', target: 8, unit: 'glasses' }],
    rewards: { xp: 90, gold: 26 },
  },
  {
    id: 'daily-combo-nutrition-water',
    name: 'Clean Living',
    description: 'Log 3 healthy meals and drink 10 glasses of water',
    type: 'daily',
    requirement: { activityType: 'nutrition', target: 3, unit: 'meals' },
    extraTargets: [{ activityType: 'water', target: 10, unit: 'glasses' }],
    rewards: { xp: 100, gold: 28 },
  },
];

// ─── Weekly Quest Pool ────────────────────────────────────────────────────────
// 3 quests are picked each week via deterministic rotation (rotation.ts).
// Pool: 31 total (3 single-activity per type + 10 cross-habit combos); 3 active each week.

export const WEEKLY_QUEST_POOL: QuestDef[] = [
  {
    id: 'weekly-run-1',
    name: 'Running Streak',
    description: 'Log 15 miles of running this week',
    type: 'weekly',
    requirement: { activityType: 'run', target: 15, unit: 'miles' },
    rewards: { xp: 250, gold: 70 },
  },
  {
    id: 'weekly-run-2',
    name: 'Trailblazer',
    description: 'Log 25 miles of running this week',
    type: 'weekly',
    requirement: { activityType: 'run', target: 25, unit: 'miles' },
    rewards: { xp: 380, gold: 105 },
  },
  {
    id: 'weekly-workout-1',
    name: "Warrior's Training",
    description: 'Log 150 minutes of workouts this week',
    type: 'weekly',
    requirement: { activityType: 'workout', target: 150, unit: 'minutes' },
    rewards: { xp: 220, gold: 60 },
  },
  {
    id: 'weekly-workout-2',
    name: 'Iron Will',
    description: 'Log 300 minutes of workouts this week',
    type: 'weekly',
    requirement: { activityType: 'workout', target: 300, unit: 'minutes' },
    rewards: { xp: 400, gold: 110 },
  },
  {
    id: 'weekly-steps-1',
    name: 'The Explorer',
    description: 'Walk 50,000 steps this week',
    type: 'weekly',
    requirement: { activityType: 'steps', target: 50000, unit: 'steps' },
    rewards: { xp: 200, gold: 55 },
  },
  {
    id: 'weekly-steps-2',
    name: 'World Walker',
    description: 'Walk 100,000 steps this week',
    type: 'weekly',
    requirement: { activityType: 'steps', target: 100000, unit: 'steps' },
    rewards: { xp: 360, gold: 100 },
  },
  {
    id: 'weekly-sleep-1',
    name: 'Sleep Champion',
    description: 'Log 49 hours of sleep this week',
    type: 'weekly',
    requirement: { activityType: 'sleep', target: 49, unit: 'hours' },
    rewards: { xp: 190, gold: 55 },
  },
  {
    id: 'weekly-sleep-2',
    name: 'Well Rested',
    description: 'Log 56 hours of sleep this week',
    type: 'weekly',
    requirement: { activityType: 'sleep', target: 56, unit: 'hours' },
    rewards: { xp: 240, gold: 70 },
  },
  {
    id: 'weekly-water-1',
    name: 'Water Bearer',
    description: 'Log 50 glasses of water this week',
    type: 'weekly',
    requirement: { activityType: 'water', target: 50, unit: 'glasses' },
    rewards: { xp: 170, gold: 48 },
  },
  {
    id: 'weekly-water-2',
    name: 'Tide Master',
    description: 'Log 70 glasses of water this week',
    type: 'weekly',
    requirement: { activityType: 'water', target: 70, unit: 'glasses' },
    rewards: { xp: 250, gold: 70 },
  },
  {
    id: 'weekly-nutrition-1',
    name: 'Nutritionist',
    description: 'Log 12 healthy meals this week',
    type: 'weekly',
    requirement: { activityType: 'nutrition', target: 12, unit: 'meals' },
    rewards: { xp: 180, gold: 50 },
  },
  {
    id: 'weekly-nutrition-2',
    name: 'Master Chef',
    description: 'Log 21 healthy meals this week',
    type: 'weekly',
    requirement: { activityType: 'nutrition', target: 21, unit: 'meals' },
    rewards: { xp: 320, gold: 90 },
  },

  {
    id: 'weekly-meditation-1',
    name: 'Daily Stillness',
    description: 'Log 100 minutes of meditation this week',
    type: 'weekly',
    requirement: { activityType: 'meditation', target: 100, unit: 'minutes' },
    rewards: { xp: 220, gold: 60 },
  },
  {
    id: 'weekly-meditation-2',
    name: 'Inner Sanctum',
    description: 'Log 200 minutes of meditation this week',
    type: 'weekly',
    requirement: { activityType: 'meditation', target: 200, unit: 'minutes' },
    rewards: { xp: 380, gold: 105 },
  },

  // ── Multi-target weekly quests ─────────────────────────────────────────────
  {
    id: 'weekly-combo-run-sleep',
    name: "Athlete's Rhythm",
    description: 'Run 10 miles and log 49 hours of sleep this week',
    type: 'weekly',
    requirement: { activityType: 'run', target: 10, unit: 'miles' },
    extraTargets: [{ activityType: 'sleep', target: 49, unit: 'hours' }],
    rewards: { xp: 480, gold: 135 },
  },
  {
    id: 'weekly-combo-workout-nutrition',
    name: 'Clean Machine',
    description: 'Log 200 minutes of training and 14 healthy meals this week',
    type: 'weekly',
    requirement: { activityType: 'workout', target: 200, unit: 'minutes' },
    extraTargets: [{ activityType: 'nutrition', target: 14, unit: 'meals' }],
    rewards: { xp: 560, gold: 155 },
  },
  {
    id: 'weekly-combo-meditation-steps',
    name: 'Mindful Mover',
    description: 'Meditate 90 minutes and walk 60,000 steps this week',
    type: 'weekly',
    requirement: { activityType: 'meditation', target: 90, unit: 'minutes' },
    extraTargets: [{ activityType: 'steps', target: 60000, unit: 'steps' }],
    rewards: { xp: 500, gold: 140 },
  },

  // ── PR5 expansion — third single-activity weekly per activity ───────────────
  {
    id: 'weekly-run-3',
    name: 'Marathon Month',
    description: 'Log 40 miles of running this week',
    type: 'weekly',
    requirement: { activityType: 'run', target: 40, unit: 'miles' },
    rewards: { xp: 540, gold: 150 },
  },
  {
    id: 'weekly-workout-3',
    name: 'Unbreakable',
    description: 'Log 450 minutes of workouts this week',
    type: 'weekly',
    requirement: { activityType: 'workout', target: 450, unit: 'minutes' },
    rewards: { xp: 560, gold: 155 },
  },
  {
    id: 'weekly-steps-3',
    name: 'Continental Trek',
    description: 'Walk 150,000 steps this week',
    type: 'weekly',
    requirement: { activityType: 'steps', target: 150000, unit: 'steps' },
    rewards: { xp: 500, gold: 140 },
  },
  {
    id: 'weekly-sleep-3',
    name: 'Sleep Sovereign',
    description: 'Log 63 hours of sleep this week',
    type: 'weekly',
    requirement: { activityType: 'sleep', target: 63, unit: 'hours' },
    rewards: { xp: 300, gold: 85 },
  },
  {
    id: 'weekly-water-3',
    name: 'Ocean Tamer',
    description: 'Log 90 glasses of water this week',
    type: 'weekly',
    requirement: { activityType: 'water', target: 90, unit: 'glasses' },
    rewards: { xp: 320, gold: 90 },
  },
  {
    id: 'weekly-nutrition-3',
    name: 'Grandmaster Chef',
    description: 'Log 28 healthy meals this week',
    type: 'weekly',
    requirement: { activityType: 'nutrition', target: 28, unit: 'meals' },
    rewards: { xp: 430, gold: 120 },
  },
  {
    id: 'weekly-meditation-3',
    name: 'Ascended Mind',
    description: 'Log 300 minutes of meditation this week',
    type: 'weekly',
    requirement: { activityType: 'meditation', target: 300, unit: 'minutes' },
    rewards: { xp: 520, gold: 145 },
  },

  // ── PR5 expansion — combo weeklies (Spirit-building + cross-habit) ──────────
  {
    id: 'weekly-combo-meditation-workout',
    name: 'Tempered Spirit',
    description: 'Meditate 150 minutes and train 200 minutes this week',
    type: 'weekly',
    requirement: { activityType: 'meditation', target: 150, unit: 'minutes' },
    extraTargets: [{ activityType: 'workout', target: 200, unit: 'minutes' }],
    rewards: { xp: 560, gold: 155 },
  },
  {
    id: 'weekly-combo-meditation-run',
    name: 'Zen Runner',
    description: 'Meditate 120 minutes and run 15 miles this week',
    type: 'weekly',
    requirement: { activityType: 'meditation', target: 120, unit: 'minutes' },
    extraTargets: [{ activityType: 'run', target: 15, unit: 'miles' }],
    rewards: { xp: 540, gold: 150 },
  },
  {
    id: 'weekly-combo-meditation-water',
    name: 'Pure Mind',
    description: 'Meditate 100 minutes and drink 60 glasses of water this week',
    type: 'weekly',
    requirement: { activityType: 'meditation', target: 100, unit: 'minutes' },
    extraTargets: [{ activityType: 'water', target: 60, unit: 'glasses' }],
    rewards: { xp: 460, gold: 130 },
  },
  {
    id: 'weekly-combo-run-workout',
    name: 'Cross-Trainer',
    description: 'Run 15 miles and train 150 minutes this week',
    type: 'weekly',
    requirement: { activityType: 'run', target: 15, unit: 'miles' },
    extraTargets: [{ activityType: 'workout', target: 150, unit: 'minutes' }],
    rewards: { xp: 540, gold: 150 },
  },
  {
    id: 'weekly-combo-steps-sleep',
    name: 'Active Rest',
    description: 'Walk 70,000 steps and log 49 hours of sleep this week',
    type: 'weekly',
    requirement: { activityType: 'steps', target: 70000, unit: 'steps' },
    extraTargets: [{ activityType: 'sleep', target: 49, unit: 'hours' }],
    rewards: { xp: 470, gold: 130 },
  },
  {
    id: 'weekly-combo-nutrition-water',
    name: 'Clean Fuel',
    description: 'Log 18 healthy meals and 60 glasses of water this week',
    type: 'weekly',
    requirement: { activityType: 'nutrition', target: 18, unit: 'meals' },
    extraTargets: [{ activityType: 'water', target: 60, unit: 'glasses' }],
    rewards: { xp: 450, gold: 125 },
  },
  {
    id: 'weekly-combo-steps-nutrition',
    name: 'Fueled Journey',
    description: 'Walk 80,000 steps and log 18 healthy meals this week',
    type: 'weekly',
    requirement: { activityType: 'steps', target: 80000, unit: 'steps' },
    extraTargets: [{ activityType: 'nutrition', target: 18, unit: 'meals' }],
    rewards: { xp: 500, gold: 140 },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ALL_QUESTS = [...DAILY_QUEST_POOL, ...WEEKLY_QUEST_POOL];

export function getQuestDef(questDefId: string): QuestDef | undefined {
  return ALL_QUESTS.find((q) => q.id === questDefId);
}

/**
 * Scales quest reward XP/gold by player level so quests stay meaningful at
 * higher levels. Uses a sqrt curve that tracks the level^1.5 XP curve:
 *   level 1   → 1.00× (0.6 + 0.4)
 *   level 4   → 1.40×
 *   level 10  → 1.86×
 *   level 25  → 2.60×
 *   level 50  → 3.43×
 *
 * Sub-linear by design — quests should never out-pace combat as the dominant
 * XP source, but the floor must rise so daily quests don't become rounding
 * error past level 8–10.
 */
export function scaleQuestRewards(
  base: { xp: number; gold: number },
  level: number,
): { xp: number; gold: number } {
  const safeLevel = Math.max(1, level);
  // Sub-linear by design, but with a steeper slope than the old 0.6 + 0.4·√l —
  // quests were falling behind monster XP at high levels because √-growth was
  // weighted too low. Inverting the coefficients keeps the level-1 anchor at
  // 1.0× while lifting level-25 from 2.6× to 3.4×.
  const factor = 0.4 + 0.6 * Math.sqrt(safeLevel);
  return {
    xp: Math.round(base.xp * factor),
    gold: Math.round(base.gold * factor),
  };
}
