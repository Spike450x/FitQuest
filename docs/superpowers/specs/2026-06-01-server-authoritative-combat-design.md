# Server-Authoritative Combat — Design

**Status:** Draft / not started. Queued behind a real need (leaderboards / PvP / competitive seasons).
**Author:** Claude · 2026-06-01
**Related:** `docs/ARCHITECTURE.md` (combat layering), `src/lib/gameLogic/combatActions.ts` (resolver layer), `functions/src/gameLogic/` (existing parity mirror), `claimCombatVictory` / `claimDungeonRun` Cloud Functions.

---

## 1. Context & why

Combat is currently **100% client-authoritative**. Every round is resolved in the browser by the pure resolver layer (`combatActions.ts` → `combat.ts` / `abilities.ts` / `spells.ts`), and at the end the client calls:

- `claimCombatVictoryCF` — applies the daily combat-XP cap, increments `totalCombatWins` + `monstersKilled`, evaluates combat achievements. **But it trusts the client's claimed win.**
- `awardXpAndStats` / `awardGold` / `awardLoot` — client-mirrored Firestore writes for the rewards.

So a tampered client can fabricate a win against any monster (and the loot/gold for it) without fighting. **Today the blast radius is low** — single-player, no leaderboards, so a cheater only inflates their own save. The daily XP cap is the only server-enforced ceiling; gold and loot are not.

This becomes unacceptable the moment outcomes are **compared between players**: leaderboards, PvP, competitive seasons, or any reward that's scarce across the playerbase. This doc is the design to make combat outcomes server-verifiable **before** those features ship. It is deliberately **not** started yet — it's a multi-PR epic and there's no competitive surface to protect today.

## 2. Threat model

| Vector                         | Today                                     | After this work                    |
| ------------------------------ | ----------------------------------------- | ---------------------------------- |
| Forge a win (XP/gold)          | Possible (XP daily-capped; gold uncapped) | Rejected — replay diverges         |
| Forge loot (incl. legendaries) | Possible (`awardLoot` is a client write)  | Rejected — loot rolled server-side |
| Replay/duplicate a claim       | Partially (idempotency on some CFs)       | Nonce per fight                    |
| Inflate stats beyond caps      | Blocked by Firestore rules                | Unchanged                          |

Out of scope: memory-editing the local _display_, which doesn't touch the server.

## 3. Options considered

- **(A) Live server simulation** — client sends each action, server resolves and returns the round. Gold-standard authority, but a per-action round-trip kills the snappy dice-roll UX, and it's a full rewrite. ❌ latency.
- **(B) Deterministic replay (recommended)** — client plays locally (UX unchanged), recording the seed + action sequence; at claim time the server **re-runs the same pure resolvers under the same seeded RNG** and verifies the claimed outcome before awarding. ✅ snappy UX, ✅ true authority, ✅ reuses the existing pure, RNG-injectable resolver layer.
- **(C) Heuristic bounds-check** — server sanity-checks the claim (max reward per monster, plausible round count) without replay. Cheap but not authoritative — a careful cheater stays in-bounds. ❌ not real authority. (Worth keeping as a _cheap interim_ layer — see §7.)

**Recommendation: Option B — deterministic replay.**

## 4. Design — deterministic replay

### 4.1 Claim payload

```
claimCombatVictory({
  monsterId,
  seed,                      // PRNG seed chosen client-side at fight start
  actions: ActionRecord[],   // ordered: { kind: 'attack'|'magic'|'ability'|'spell'|'rest'|'meditate'|'flee'|'skipStunned'|'interceptFlee'|'useItem', spellInvItemId?, itemId? }
  claimedOutcome,            // 'win' | 'fled' (losses need no claim)
  nonce,                     // anti-replay
})
```

The server reconstructs the fight: load the character snapshot + monster def, seed a PRNG, and feed the action sequence through the **same resolvers** the client used. It compares the replayed terminal state (outcome, final HP/stamina/magic, dropped loot) to the claim. Mismatch → reject (and log). Match → award XP (with the existing daily-cap multiplier), gold, and the **server-rolled** loot, all atomically.

### 4.2 Two hard prerequisites

1. **Determinism pass.** Every RNG call in the resolver path must route through an **injected seeded PRNG**, not `Math.random()`. Today these are scattered: `rollD10`, `rollSpellDice`, `rollMonsterSpecial` (default arg), `rollClassDodge`, `resolveCounterSpecial`, `rollFleeIntercept`, `rollRunAway`, `calculateRound`, `rollLoot`, plus the overlay-only cosmetic spins (which can stay `Math.random`). Thread an `Rng` through `ActionInput` and into every resolver. `mulberry32` already exists (`dungeons.ts`) and is the natural seeded PRNG. **This is the single biggest enabler and a self-contained first PR** (client stays client-authoritative; we just make it reproducible).
2. **Server has the full resolver layer.** Today `functions/src/gameLogic/` mirrors only pools / XP-cap / items / achievements — **not** the round resolvers. Replay needs `combat.ts` + `combatActions.ts` + `abilities.ts` + `spells.ts` + `passives.ts` server-side. Duplicating them (today's parity-test pattern) would balloon an already-large mirror. **Strongly prefer extracting `src/lib/gameLogic/` into a shared workspace package** (e.g. `packages/game-logic`) imported by both the Next app and Functions — this kills the duplication-drift problem permanently and is a prerequisite worth doing on its own merits.

### 4.3 Rewards move server-side

On a verified win, the Cloud Function becomes the source of truth: it rolls loot (`rollLoot` with the fight's seed), awards gold, and grants XP through the existing cap logic — then the client refetches. `awardLoot` / `awardGold` client writes are removed from the combat path (they remain for non-combat sources). The Firestore rules tighten so combat-derived fields are CF-only.

## 5. Surfaces already partway there

- **Dungeons** already use seeded weekly layouts (`mulberry32`) + an atomic `claimDungeonRunCF`. The room _combat_ is still client-resolved, but the claim-side scaffolding + per-room `advanceRoom` cursor are a good model.
- The resolver layer is **already pure and RNG-injectable by design** (e.g. `rollMonsterSpecial(monster, rng?)`, `resolveCounterSpecial(monster, charging, rng?)`) — the determinism pass is "thread the seed through," not "rewrite the math."

## 6. Rollout — shadow first, then enforce

1. **Determinism pass** (PR1) — seed everything; add a test that the same seed + actions reproduces the same fight bit-for-bit.
2. **Shared `game-logic` package** (PR2) — extract, consume from both `src/` and `functions/`; delete the duplicated mirrors + their parity tests (replaced by "one source").
3. **Shadow replay** (PR3) — `claimCombatVictory` replays and **logs** mismatches (Discord-ops alert via the existing notifications) but still trusts the client. Bake until mismatch-rate ≈ 0 (catches determinism bugs without breaking players).
4. **Enforce + server rewards** (PR4) — reject mismatches; move loot/gold/XP grants server-side; tighten rules.

## 7. Cheap interim (optional, pre-epic)

If a competitive surface lands before the full epic, a **bounds-check** layer in `claimCombatVictory` (reward ≤ the monster's max possible XP/gold, loot ∈ the monster's table, round count plausible vs HP/offense) raises the cheating bar cheaply without replay. Not authoritative, but a stop-gap.

## 8. Effort & risks

- **Effort:** large — 4 PRs, the determinism pass + the shared-package extraction being the bulk. The replay CF itself is small once those land.
- **Risk — determinism bugs:** floating-point, object-iteration order, stray `Date.now()`/`Math.random()`. Mitigated by the shadow phase + a reproduce-from-seed test.
- **Risk — parity drift:** _eliminated_ by the shared package (the reason to do PR2 rather than duplicate).
- **Risk — scope creep:** the shared-package extraction touches every gameLogic import. Do it as its own PR with no behavior change.
- **Non-goal:** anti-cheat for the local display or for non-competitive single-player. This work is justified _only_ by cross-player comparison.

## 9. Recommendation

Hold until a leaderboard/PvP/season feature is actually scheduled. When it is, sequence PR1 (determinism) → PR2 (shared package) → PR3 (shadow) → PR4 (enforce). PR1 and PR2 are valuable on their own (reproducible combat for debugging + tests; no more mirror drift) and can land early even if full enforcement waits.
