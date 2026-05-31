/**
 * @deprecated Activity-log operations have moved to activityData.ts.
 * Quest operations are in questData.ts. Inventory operations are in inventoryData.ts.
 * This file re-exports for backwards compatibility — update callers to import directly.
 */
export {
  normalizeActivityLog,
  fetchActivityLogs,
  subscribeToRecentActivity,
} from '@/lib/activityData';
export { normalizeActiveQuest, fetchActiveQuests } from '@/lib/questData';
export { normalizeActiveBounty, fetchActiveBounties } from '@/lib/bountyData';
export { normalizeInventoryItem, fetchInventoryItems } from '@/lib/inventoryData';
