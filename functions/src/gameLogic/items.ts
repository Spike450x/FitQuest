// Minimal gear stat-bonus lookup for resource-max computation.
// Only stamina and health bonuses affect playerMaxHp / playerMaxStamina formulas.
// All other item stat bonuses (strength, wisdom, agility, defense) do not factor
// into resource caps and are safely omitted here.
//
// Copied subset of ITEM_CATALOG from src/lib/gameLogic/items.ts.
// Keep in sync when gear items are added or their stamina/health stat bonuses change.

export const GEAR_STAT_BONUSES: Record<string, { stamina?: number; health?: number }> = {
  // ── Weapons ──────────────────────────────────────────────────────────────────
  'hunters-bow': { stamina: 1 },
  'twin-daggers': { stamina: 2 },
  shadowfang: { stamina: 4 },
  'phantom-blades': { stamina: 6 },
  'oblivion-edge': { stamina: 10 },

  // ── Armor ─────────────────────────────────────────────────────────────────────
  'padded-robe': { health: 1 },
  'battle-plate': { health: 2 },
  'shadowweave-cloak': { stamina: 4 },
  'specter-shroud': { stamina: 5 },
  'celestial-aegis': { health: 6 },

  // ── Accessories ───────────────────────────────────────────────────────────────
  'health-charm': { health: 2 },
  'stamina-band': { stamina: 2 },
  lifestone: { health: 6, stamina: 4 },
  'heart-of-the-cosmos': { stamina: 4 },
};
