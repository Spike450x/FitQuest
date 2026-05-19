'use client';

import type { User } from 'firebase/auth';
import type { Character, ActivityLog, ActiveQuest, InventoryItem } from '@/types';
import { useCharacter } from './useCharacter';
import { useRecentActivity } from './useRecentActivity';
import { useTodayKey } from './useTodayKey';
import { useQuestStore } from '@/store/questStore';
import { useInventoryStore } from '@/store/inventoryStore';

export interface GameData {
  /** Authenticated Firebase user, or null while loading / unauthenticated. */
  user: User | null;
  /** Resolved character document, or null while loading / not yet created. */
  character: Character | null;
  /** True while either auth or character data is still loading. */
  loading: boolean;
  /** Character fetch error message, or null. */
  error: string | null;
  /** The last N activity logs for the current user (default 5). */
  recentLogs: ActivityLog[];
  /** True while the activity log subscription is resolving. */
  logsLoading: boolean;
  /** UTC date string ('YYYY-MM-DD') for today; updates at midnight or on tab focus. */
  todayKey: string;
  /** All active (non-expired) quests from the quest store. */
  quests: ActiveQuest[];
  /** True while the quest store is loading or assigning quests. */
  questsLoading: boolean;
  /** Quest fetch/assign error message, or null. */
  questsError: string | null;
  /** All inventory items from the inventory store. */
  inventoryItems: InventoryItem[];
}

/**
 * Facade hook that composes the data hooks most game pages need into a single
 * call, reducing per-page boilerplate. Action selectors (fetchAndAssignQuests,
 * fetchCharacter, etc.) are intentionally excluded — call those stores directly
 * so callers are explicit about side effects.
 */
export function useGameData(): GameData {
  const { character, loading, error, user } = useCharacter();
  const { logs: recentLogs, loading: logsLoading } = useRecentActivity(character?.uid);
  const todayKey = useTodayKey();
  const quests = useQuestStore((s) => s.quests);
  const questsLoading = useQuestStore((s) => s.loading);
  const questsError = useQuestStore((s) => s.error);
  const inventoryItems = useInventoryStore((s) => s.items);

  return {
    user,
    character,
    loading,
    error,
    recentLogs,
    logsLoading,
    todayKey,
    quests,
    questsLoading,
    questsError,
    inventoryItems,
  };
}
