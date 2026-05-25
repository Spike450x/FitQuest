# FitQuest — Bugs & Enhancements Backlog

> Sourced from player report (2026-05-24). Root causes identified where code was inspectable.
> Items are grouped by category and prioritized: **Critical** → **High** → **Medium** → **Enhancement**.

---

## Bugs

### B1 — Quest Reroll: `extraProgress: undefined` causes Firestore crash

**Severity:** Critical — rerolling any quest that transitions to one without `extraTargets` is broken.

**Symptoms:** Console shows `FirebaseError: Function updateDoc() called with invalid data. Unsupported field value: undefined (found in field extraProgress in document activeQuests/<id>)`.

**Root cause (confirmed):** `src/store/questStore.ts:343,360` — when the newly-rolled quest has no `extraTargets`, the code assigns `extraProgress: undefined` to the Firestore payload. Firestore's `updateDoc` rejects `undefined` field values entirely.

```ts
// Current (broken for no-extraTargets quests):
extraProgress: pick.extraTargets ? {} : undefined,

// Fix: use deleteField() to explicitly remove the field
import { deleteField } from 'firebase/firestore';
extraProgress: pick.extraTargets ? {} : deleteField(),
```

**Files to change:** `src/store/questStore.ts` (two call sites: the `updateActiveQuestDoc` payload at line 343, and the local store `set()` update at line 360 — the latter can stay `undefined` for the local Zustand state since that's valid JS, only the Firestore payload needs `deleteField()`).

---

### B2 — Log Activity: FirebaseError "internal" on all submissions

**Severity:** Critical — players cannot log any workout, run, steps, nutrition, sleep, or water.

**Symptoms:** Clicking submit on the Activity Log form results in a `FirebaseError: internal` in the console. No activity is saved.

**Root cause (suspected):** The `logActivity` Cloud Function exists in source (`functions/src/index.ts:77`) and was previously listed as shipped, but the "internal" error code from Firebase Functions typically indicates one of:

1. **Function not deployed** — the Cloud Function is not live in the `fitness-rpg-claude` project (most common cause if this has never worked).
2. **IAM / invoker permissions** — the function requires `invoker: 'public'` in its config but the `allUsers` Cloud Run invoker binding may be missing (a similar issue was fixed for `logActivity` CORS in a previous sprint).
3. **Server-side crash** — an unhandled exception inside the function body returns a generic "internal" error to the client.

**Investigation steps:**

- Check the Firebase console → Functions → `logActivity` to confirm it exists and its last deployment date.
- Run `firebase functions:log --only logActivity` to see server-side error detail.
- Confirm `allUsers` has the `roles/run.invoker` binding on the `logActivity` function (same as the fix applied in commit `93572cd`).
- Confirm the CSP `connect-src` includes `https://*.cloudfunctions.net` (fixed in a prior sprint — verify it wasn't reverted).

**Files likely involved:** `functions/src/index.ts`, `.github/workflows/` (CI deploy step for functions), `next.config.ts` (CSP headers).

---

### B3 — Dungeon Victory: "Claim Rewards" button does nothing

**Severity:** High — completing a dungeon boss does not advance to reward screen.

**Symptoms:** After defeating the final boss, the victory screen renders with the "Claim Rewards" button. Clicking produces no visible response — no loading indicator, no navigation, no error toast. No console errors observed.

**Root cause (suspected):** `handleClaimVictory` (`src/app/(game)/combat/dungeons/run/page.tsx:781`) calls `claimDungeonRunCF`. If that Cloud Function fails silently (e.g., same deployment / IAM issue as B2), the `try` block throws, the `finally` resets `claiming` to `false`, but no toast surfaces the error and the route never changes — leaving the button visually re-enabled but functionally broken. The user can only leave via the browser back button, which surfaces loot already accumulated from earlier rooms.

**Note:** This may be fully explained by B2 (functions not deployed / IAM issue). Fixing B2's deployment should be the first step before further investigation here.

**Files to check:** `src/app/(game)/combat/dungeons/run/page.tsx:781–813`, `src/lib/functions.ts`, Cloud Function deployment.

---

### B4 — Shop Overcharge: item costs more gold than displayed price

**Severity:** High — players lose more gold than the listed price implies.

**Symptoms:** Player buys an item; the gold deducted visually after purchase is larger than the item's displayed price.

**Root cause (suspected):** `src/lib/inventoryData.ts:60` — `runBuyItemTransaction` is a Firestore transaction that reads the _server-side_ gold balance and deducts `price` from it. The client-side gold update after the transaction uses `character.gold - def.price` against the _local store's_ (potentially stale) gold snapshot:

```ts
// inventoryStore.ts:164 — deducts from possibly-stale local gold
useCharacterStore.setState((state) => ({
  character: state.character
    ? { ...state.character, gold: state.character.gold - def.price }
    : null,
}));
```

If the local gold is stale (higher than the real Firestore balance), the displayed post-purchase gold drops more than `def.price`. The transaction itself charges the correct price — the bug is a _display_ discrepancy, not an actual overcharge. A force-refresh of the character doc after purchase would resolve the UI desync.

**Fix:** After `runBuyItemTransaction` resolves, call `fetchCharacter(uid, true)` to pull the authoritative balance instead of relying on the local delta.

**Files to change:** `src/store/inventoryStore.ts:149–175`.

---

### B5 — Stat Item: equipping a +HP item also raises current HP

**Severity:** Medium — design inconsistency / player confusion.

**Symptoms:** Equipping gear with a health bonus raises both `currentHp` and `maxHp` by the item's HP delta. Most RPGs only raise `maxHp` when equipping gear.

**Root cause (confirmed):** `src/store/inventoryStore.ts:99–104` — `computeGearDelta` intentionally applies the HP delta to `currentHp`:

```ts
newCurrentHp = Math.max(1, Math.min((character.currentHp ?? oldMaxHp) + hpDelta, newMaxHp));
```

**Design resolution needed:** Two valid options —

- **Option A (current behavior):** Equipping gear "fills" HP by the bonus amount (feels like a quick heal; common in some ARPGs). The user finds this unintuitive.
- **Option B (proposed):** Equipping gear only raises `maxHp`; `currentHp` is unchanged. Unequipping lowers `maxHp` and _clamps_ `currentHp` to the new lower max if necessary. This is the standard RPG expectation.

**Recommendation:** Go with Option B for health. For stamina and magic the current behavior (delta applied to current) is less objectionable since those resources regenerate freely between combat — but it should be consistent.

**Files to change:** `src/store/inventoryStore.ts:80–118` (`computeGearDelta`).

---

### B6 — Stamina Item: +1 stamina stat reads as +5 current stamina

**Severity:** Low / likely not a bug.

**Symptoms:** Equipping a +1 stamina item appears to give +5 stamina points instead of +1.

**Root cause (expected formula behavior):** `playerMaxStamina` applies a multiplier to the stamina stat (formula is `base + stat * STAMINA_PER_STAT`). If `STAMINA_PER_STAT = 5`, a +1 stat item legitimately yields +5 max stamina — which is correct and intentional. The issue is the same B5 mechanic: `currentStamina` also increases by the full delta (+5), making it _look_ like +5 points were added rather than +1 stat.

**Recommendation:** Verify the stamina formula constant is correct, then add a tooltip or item card annotation that shows "**+1 Stamina** _(+5 max Stamina)_" so the stat-to-resource conversion is transparent to the player. If B5's fix (Option B) is applied to stamina, this display confusion goes away entirely since `currentStamina` would no longer jump on equip.

**Files to check:** `src/lib/gameLogic/combat.ts` (`playerMaxStamina`, `STAMINA_PER_STAT`), `src/store/inventoryStore.ts:106–114`.

---

## Enhancements

### E1 — Dungeon Stat Check: add RPG narrative flavor before options

**Priority:** High — missing player immersion context.

**Current state:** When a stat-check room is entered, the UI immediately renders three button options ("Force the door — STR · Need 12 · You have 9", etc.) with only a generic header: _"Choose your path. Passing requires meeting the stat threshold."_

**Desired state:** Before showing the options, display a short RPG narrative prompt that contextualizes _why_ a stat check is happening. Examples:

- A locked iron gate with a warning inscription → STR check to force it, WIS check to read the runes for a clue
- A narrow ledge over a chasm → AGI check to cross, STR check to climb
- A magical ward blocking passage → WIS check to dispel it

**Design spec:**

- Each dungeon tier (Goblin Caves, Spider Lair, Dark Sanctum, Dragon's Keep) should have a thematic flavor pool — 2–4 scenarios per tier.
- Scenario is seeded deterministically from `run.currentRoom * 100 + run.weekSeed` (same seed already used for `resolveStatCheckOptions`).
- Display: a short 2–3 sentence description paragraph above the choice buttons; optionally a small icon/color for the scenario type.
- The scenario description should hint at which stat is likely useful without spelling it out (the player sees the options below).

**Files to change:** `src/lib/gameLogic/dungeons.ts` (add `STAT_CHECK_SCENARIOS` data and a `resolveStatCheckFlavor()` helper), `src/app/(game)/combat/dungeons/run/page.tsx:1050–1116` (render flavor text above option buttons).

---

### E2 — Emoji → Custom Art: dashboard, character sheet, and activity icons

**Priority:** High — visual consistency with the rest of the UI.

**Current state:** Several locations still use emoji as visual anchors:

- `src/app/(game)/dashboard/page.tsx:26–30` — quick action buttons: `📋` `🐉` `📜` `🏪`
- `src/app/(game)/dashboard/page.tsx:33–36` — stat bars: `⚔️` `🧠` `🌬️`
- Character sheet stat display (same icons as dashboard)
- Activity type chips in the activity log and recent activity feed

**Approach:** Each use case needs a different treatment:

| Location                 | Recommended replacement                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Dashboard action buttons | Small SVG icons in a consistent style (sword, skull, scroll, coin-pouch). Keep 24×24, add to `src/components/art/`  |
| Stat icons (STR/WIS/AGI) | Per-stat SVG glyphs — sword blade (STR), open eye (WIS), wind spiral (AGI). Should look like a game HUD             |
| Activity type icons      | Reuse or extend `getActivityIcon()` in `src/lib/activityIcons.ts` to return SVG components instead of emoji strings |

**Note:** The `EntityArt` heraldic system (portraits, item silhouettes) is for cards and large-format displays; stat/action icons are a separate, smaller-format need. Purpose-built 20–24px SVG glyphs are the right choice here.

**Files to change:** `src/lib/activityIcons.ts`, `src/app/(game)/dashboard/page.tsx`, `src/app/(game)/character/page.tsx`, new `src/components/art/stat-icons.tsx` and `src/components/art/action-icons.tsx`.

---

### E3 — Spells: fix light-mode readability and hover shimmer artifact

**Priority:** Medium — cosmetic regression in light mode.

**Issues:**

1. Some spell cards have text or elements that are unreadable in light mode (insufficient contrast on card surfaces / borders).
2. The `PremiumSpellCard` hover-tilt shimmer (`mix-blend-mode: screen`) produces a slight white/light background artifact in light mode — the screen blend mode bleaches against light surfaces. Works correctly on dark backgrounds.

**Fix for shimmer:**

- Detect color scheme and switch `mix-blend-mode` to `overlay` in light mode (preserves the rainbow shimmer while avoiding bleaching).
- Or gate the shimmer overlay with `dark:block hidden` / `dark:hidden block` class pairs, using a `multiply` blend for light mode.

**Files to change:** `src/components/spells/PremiumSpellCard.tsx`, spell card CSS/Tailwind variants.

---

### E4 — Shop: rotate/paginate spells instead of displaying all

**Priority:** Medium — UX parity with how gear items are shown.

**Current state:** The spell section of the shop renders the entire spell catalog at once (all 21 spells listed).

**Desired state:** Show a rotating subset of spells — similar to how the gear shop rotates items. Suggested behavior:

- Display 3–5 spells at a time, seeded weekly (same week-seed pattern used elsewhere in the game).
- "Refresh" / "Restock" mechanic possible in a future update (ties into the Reputation / Wanted Board roadmap).
- Remaining spells should still be discoverable — a "Browse All" collapsed section or a separate Spellbook/Arcanist NPC page would work.

**Files to change:** `src/app/(game)/shop/page.tsx`, possibly a new `src/lib/gameLogic/shopRotation.ts` helper.

---

### E5 — Spell Casting: "top card" mechanic with charge-based consumption

**Priority:** Medium — significant game-feel and risk/reward change.

**Design spec (confirmed with player):**

- Spells have a charge count (e.g., 3 charges per spell by default; higher-rarity spells could have more).
- When casting in combat, the spell cast is **randomly selected** from the player's equipped spell loadout (not player-chosen) — simulates drawing from the top of a deck.
- Each cast consumes one charge from that spell. When all charges are spent, the spell is removed from the active loadout for that session.
- Charges replenish on some trigger (e.g., rest at a dungeon Rest Site, end of a combat session, or a new day — TBD; see Design Questions below).
- The "Cast Spell" action button should communicate: which spell will be drawn (unknown until cast), how many charges remain per spell, and that the outcome is random.

**Design questions to resolve before implementing:**

1. **When do charges replenish?** Options: (a) after every combat encounter, (b) at dungeon Rest Sites only, (c) daily reset, (d) never (must re-equip from inventory). Recommendation: (a) restores after every fight for the arena, (b) only at rest sites during dungeon runs — this makes dungeons meaningfully riskier without making arena unplayable.
2. **Charge count per spell:** Fixed (3 per spell) or tied to rarity (Common=2, Uncommon=3, Rare=4, Epic=5, Legendary=6)?
3. **"Draw" UX:** Should the player see a brief card-flip animation revealing which spell was drawn before it resolves? Or is the spell revealed only via the spell name in the battle log?

**Data model impact:**

- Add `charges: number` and `maxCharges: number` to `InventoryItem` (spells only) — or store as a transient combat state (preferred if charges always reset between fights in arena).
- If charges persist across fights in dungeons, they need to live on `DungeonRun` state.

**Files to change:** `src/types/index.ts`, `src/hooks/useCombatEncounter.ts`, `src/components/combat/CombatActionBar.tsx`, `src/app/(game)/combat/dungeons/run/page.tsx`, `src/lib/gameLogic/spells.ts`.

---

### E6 — Inventory: use consumables (potions) outside of combat

**Priority:** Medium — QoL for pre-combat preparation.

**Current state:** Consumable items (health potions, stamina potions, etc.) can only be used during active combat via the "Use Item" action.

**Desired state:** From the Inventory page, a consumable card should show a "Use" button that applies the item's effect immediately to the player's current HP/Stamina/Magic. The item is consumed (quantity decremented or item removed from inventory).

**Rules:**

- Cannot use consumables during an active dungeon run from the inventory page (would bypass dungeon resource risk). Block with a toast: _"You can't use items outside the dungeon from here during an active run."_
- Arena combat pages already support in-combat use — this adds only the out-of-combat case.

**Data model:** No schema change needed — consumable use just calls the existing `updateCharacterDoc` + `updateInventoryDoc` pattern.

**Files to change:** `src/app/(game)/inventory/page.tsx`, `src/store/inventoryStore.ts` (add `useConsumable` action), `src/lib/gameLogic/items.ts` (ensure consumable effect resolver is accessible outside the combat hook).

---

## Design Questions (no code change yet — needs decision)

| #   | Question                                                                                     | Context                                          |
| --- | -------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| DQ1 | Should equipping gear only raise max HP (not current HP)?                                    | See B5. Recommendation: yes — Option B.          |
| DQ2 | Should stamina follow the same rule as HP (equip only changes max, not current)?             | See B5/B6. Recommendation: yes, for consistency. |
| DQ3 | Spell charge replenishment trigger — after each combat, at rest sites only, or daily?        | See E5.                                          |
| DQ4 | Spell charges per rarity or flat 3?                                                          | See E5.                                          |
| DQ5 | When all spells in loadout are depleted mid-dungeon, can the player re-equip from inventory? | See E5.                                          |

---

---

## Next-Level Suggestions

- **Spell charges + dungeon Rest Sites** — Tying charge replenishment to Rest Sites (rather than after every combat) is the highest-leverage design move here. It turns each Rest Site into a meaningful decision: heal resources vs. preserve a strategic retreat option. Arena players get full resets between fights and never feel punished; dungeon players manage a finite spell economy across the whole run.

- **Stat check flavor as lore delivery** — The scenario pool for E1 doesn't need to be generic. Each dungeon tier's flavor text can carry setting-specific lore: Goblin Caves could have crude goblin traps and riddles, Spider Lair a web-bridge and poisoned air, Dark Sanctum magical wards and collapsed masonry, Dragon's Keep molten rock and draconic runes. 3–4 seeded scenarios per tier gives 12–16 distinct room descriptions with zero additional implementation cost beyond writing the text.

- **Charge count by rarity** — Flat 3 charges per spell is fine to ship first, but tying charges to rarity (Common 2 → Legendary 6) gives the rarity system a second dimension beyond stat bonuses and creates a clear upgrade incentive: higher-rarity spells aren't just stronger, they're more reliable mid-dungeon.

- **Inventory consumable use as pre-dungeon ritual** — E6 (out-of-combat consumable use) pairs naturally with a "prepare for the run" pre-entry screen. Before entering a dungeon, the player could see their current HP/Stamina/Magic and have one last chance to use potions. This avoids the mid-game flow interruption of navigating to Inventory → back to Dungeon.

- **Shop gold desync (B4) is a signal** — The stale-gold display issue shows the character store can drift from Firestore. A post-write force-refresh (`fetchCharacter(uid, true)`) on any gold-mutating operation (buy, reroll quest, dungeon entry fee) would eliminate this class of desync entirely, not just for shop purchases.

---

## Potential Risks & Gaps

- **B2/B3 deployment fragility** — If the root cause of the logActivity and claimDungeonRunCF failures is a missing IAM binding, it will re-break every time CI deploys functions without the binding repair step. The fix needs to land in the CI workflow itself (`.github/workflows/`) with an explicit `gcloud run services add-iam-policy-binding` step per function — not just applied manually in the console — otherwise the next deploy will regress it.

- **E5 schema risk** — The spell charge mechanic touches `InventoryItem`, `DungeonRun`, `useCombatEncounter`, and the dungeon run page simultaneously. If charges are stored on `InventoryItem` (Firestore) rather than as transient in-memory combat state, existing items in players' inventories will have no `charges` field and need a normalizer default. The `normalizeInventoryItem` function in `src/lib/inventoryData.ts` would need updating before the charge UI renders, or you'll get rendering errors on existing spell items.

- **Spell "random draw" UX legibility** — Removing player choice from spell casting is a significant risk to player agency. Players who have built spell loadouts around a specific strategy (e.g., always open with a stun) will find the random draw frustrating unless the UI clearly sets expectations before the first cast. A "your next draw is unknown" affordance on the Cast Spell button and a visible per-spell charge meter in the loadout panel are non-negotiable UX requirements before shipping this.

- **E2 icon scope creep** — "Emoji → custom art" sounds simple but involves at least 3 distinct icon contexts (action buttons, stat bars, activity type chips) across multiple pages and components. Without a single source-of-truth icon component (`StatIcon`, `ActionIcon`) introduced first, each page will solve it differently and introduce new inconsistency. Define the icon components before replacing any emoji.

- **B5 gear-equip behavior change** — Changing `computeGearDelta` so equipping gear no longer heals current HP is a silent behavior change that may surprise players who've relied on the "equip to heal" pattern (intentionally or not). A one-time in-game tooltip or patch note on the Inventory page ("Equipping gear no longer restores HP") would soften the change.

---

## Implementation Order (suggested)

| #   | Item                                                                                                   | Effort | Impact                                 |
| --- | ------------------------------------------------------------------------------------------------------ | ------ | -------------------------------------- |
| 1   | B1 — Quest reroll `deleteField()` fix                                                                  | XS     | Unblocks quest variety for all players |
| 2   | B2/B3 — Investigate & fix logActivity + dungeon claim (likely same root: functions not deployed / IAM) | M      | Unblocks core game loop                |
| 3   | B4 — Shop gold display: force-refresh after purchase                                                   | S      | Fixes confusing gold display           |
| 4   | B5/B6 — Gear equip: only change max HP/Stamina, clamp current                                          | S      | Design consistency + player trust      |
| 5   | E1 — Dungeon stat check flavor text                                                                    | S      | Immersion / RPG feel                   |
| 6   | E2 — Emoji → SVG art icons                                                                             | M      | Visual consistency                     |
| 7   | E3 — Spell light-mode + shimmer fix                                                                    | S      | Polish                                 |
| 8   | E4 — Shop spell rotation                                                                               | S      | UX parity                              |
| 9   | E6 — Inventory consumable use (out of combat)                                                          | M      | QoL                                    |
| 10  | E5 — Spell charge mechanic (resolve DQ3–DQ5 first)                                                     | L      | Major game mechanic change             |
