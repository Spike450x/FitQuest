# UI/UX Modernization Plan

> Source audit: ui-critic agent, 2026-05-21.
> Goal: make FitQuest look and feel like a modern game, not an admin dashboard.

## TL;DR

FitQuest is currently a competent admin dashboard with RPG content pasted on top. The combat dice/floating-damage system is genuinely impressive, but everything around it — victory modals, level-ups, quest claims, loot reveals — is flat. `framer-motion`, `canvas-confetti`, `sonner`, and `lucide-react` are already installed; the visual identity push just hasn't happened yet.

The **single biggest coherence break**: dungeons live in `bg-slate-900` dark fantasy, the rest of the app is white/indigo light mode. No `dark:` Tailwind classes anywhere. Pick one direction and commit.

The **template to copy**: `SpellCard.tsx`, `LevelUpCelebration.tsx`, combat dice overlays, and `CombatEffects.tsx`. These are the only components that already feel like a game.

---

## Current State Inventory

### Design tokens

- **One** custom color (`gold`, 3 shades) in `tailwind.config.ts:12-16`.
- **No display/heading font** (`tailwind.config.ts:19-22` notes "Tier 3 plan" — never implemented).
- **No custom spacing, shadow, radius, or keyframe tokens.**
- **CSS variables** in `globals.css:5-8` defined but immediately overridden by `bg-gray-50 text-gray-900` in `src/app/layout.tsx:14`.

### Rarity system (the one good thing)

`src/lib/gameLogic/items.ts:21-48` defines `RARITY_BADGE`, `RARITY_TEXT`, `RARITY_CARD`. Classic gray→green→blue→purple→orange. Consistently applied where used, but `RARITY_CARD.glow` is too subtle (`shadow-blue-100`) and is only honored by `SpellCard`.

### Ad-hoc patterns that should be tokens

| Pattern                                                                  | Count            | Location                      |
| ------------------------------------------------------------------------ | ---------------- | ----------------------------- |
| `bg-white border border-gray-200 rounded-xl` (card surface)              | **37 instances** | every screen                  |
| Hand-rolled primary button `bg-indigo-600 hover:bg-indigo-700`           | **14 instances** | many screens                  |
| `text-xs font-semibold text-gray-400 uppercase tracking-wider` (eyebrow) | ~20+             | dashboard, inventory, profile |
| `text-2xl font-bold text-gray-900` (page H1)                             | 9 instances      | every page top                |

### Unused primitives (dead code)

- `Heading` (`src/components/ui/Heading.tsx`) — **0 imports**
- `EmptyState` (`src/components/ui/EmptyState.tsx`) — **0 imports**
- `Button` (`src/components/ui/Button.tsx`) — **2 imports**
- No `Card` component exists at all

### Iconography

- **Lucide is installed and never imported** (0 grep matches).
- Nav glyphs (`src/app/(game)/layout.tsx:13-22`) rely on OS emoji — inconsistent across platforms, can't be tinted/animated.

---

## Quick Wins Checklist (≤1 day each)

- [x] **1. Constrain main-content width** — `max-w-7xl mx-auto` added inside `<main>` in `src/app/(game)/layout.tsx`. Also added `pb-20` for mobile so bottom-nav doesn't overlap content.
- [x] **2. Boost rarity glows** — `RARITY_CARD.glow` in `src/lib/gameLogic/items.ts:42-50` now uses `shadow-lg shadow-{color}-500/40` (and `shadow-xl shadow-orange-500/50` for legendary).
- [x] **3. Hover lifts on cards** — Dashboard quick-action cards, inventory item cards, shop gear cards now have `hover:-translate-y-0.5 hover:shadow-lg` + emoji `group-hover:scale-110`.
- [x] **4. Tabular-nums on numeric displays** — `AnimatedNumber`, `XPBar`, `GoldDisplay`, `BattleResultsModal` rewards all use `tabular-nums` to prevent number jitter.
- [x] **5. Lucide nav icons** — Home / Swords / ClipboardList / Skull / ScrollText / Backpack / Store / BarChart3 replacing the OS-emoji glyphs in `src/app/(game)/layout.tsx`.
- [x] **6. Fix mobile bottom nav** — All 8 nav items now visible on mobile (was `slice(0, 5)`). Active state gets scale + accent bar + thicker stroke.
- [x] **7. Display font via `next/font`** — Cinzel (headings) + Inter (body) wired through `--font-cinzel` / `--font-inter` CSS variables. `Heading` component now applies `font-display`. All page H1s (Dashboard hero, Character, Quests, Shop, Activities, Stats, Inventory, Profile, Combat) plus the `FitQuest` wordmark use the display face.
- [x] **8. Apply rarity treatment to gear cards** — Inventory and Shop non-spell cards now have rarity-tinted border + top accent strip + glow. Legendary gear gets the new `animate-legendary-glow` keyframe.
- [x] **9. Number tweens for XP / Gold gains** — new `AnimatedNumber` component (vanilla rAF easing, respects reduced-motion) used in `BattleResultsModal` and the post-modal rewards summary. `GoldDisplay` self-tweens and pulse-scales on increase.
- [ ] **10. Adopt existing primitives across the codebase** — wrap all 37 card sites in a new `Card` component; use `Heading` and `Button` everywhere they belong. 1 day. **(Still pending — moved to medium efforts since it touches every screen.)**

### Bonus polish landed in this pass

- New keyframes in `src/app/globals.css`: `fadeIn` (modals), `shimmer` (XP bar flash), `legendaryGlow` (legendary items). All gated by `prefers-reduced-motion: reduce`.
- Victory / Defeat / Escape banners in `combat/page.tsx` now use display font + uppercase wide-tracking, with subtle gradient depth and rarity-tinted shadows.
- `BattleResultsModal` got a gradient backdrop, drop-shadow on the ⚔️ emoji, and a violet-to-indigo gradient claim button with active-press scale.
- `XPBar` now flashes/glows for ~700ms when XP changes — closes the level-up feedback gap.
- "NEW" pill updated from `animate-pulse` to gradient + ring + colored shadow.
- Shop "Buy" button got the same amber-to-orange gradient + active-press feel.

---

## Medium Efforts (1–3 days)

- [x] **Real `Card` component with variants** — created `src/components/ui/Card.tsx` with `default | hero | highlight | legendary | dark | flat` variants and `interactive` hover lift. Adopted on dashboard hero + 3-column grid (Stats / Daily Quests / Recent Activity). Full migration of remaining 30+ sites is a follow-up sweep.
- [x] **`fireConfetti(intensity)` helper** — new `src/lib/confetti.ts` with `subtle | medium | celebration | legendary` presets (legendary uses gold-heavy palette, 3 staggered bursts). Wired into `LevelUpCelebration`, `BattleResultsModal` (rarity-scaled), quest claim (subtle for daily, celebration for weekly), dungeon clear (legendary if legendary-eligible), `toastAchievement`, `toastStreakTier`, `toastMasteryMilestone`. All gated by document visibility + `prefers-reduced-motion`.
- [x] **Cinematic Modal variant** — `Modal` now takes `feel="cinematic"` for celebratory moments (spring physics with 0.8→1.0→1 overshoot, longer easing). Adopted in `LevelUpCelebration`.
- [x] **Loot reveal animation upgrade** — `BattleResultsModal` loot list now uses staggered framer-motion entrance (`delay: 0.15 + idx * 0.12`), with rarity-tinted border + glow per item and `animate-legendary-glow` on legendaries.
- [x] **Themed empty states** — `EmptyState` adopted on inventory page (no items / no spells) and quests page (no quests). Dashboard recent-activity + daily-quests panels got themed empty-state markup inline.
- [x] **Character portrait / class frame** — `CharacterCard` rebuilt with class-themed gradient banner (red/violet/emerald for Warrior/Wizard/Rogue), ringed portrait frame, level chip in display font, rarity-tinted gear slot names with icons + empty-slot dashed borders.
- [x] **Glass / depth pass** — Top header / sidebar / mobile bottom-nav now use `backdrop-blur-xl backdrop-saturate-150` over `bg-white/70-80` with subtle shadow. `Card` hero variant got blur orbs (indigo + violet radial gradients) and stronger glass treatment. `BattleResultsModal` got the same orb pattern + `backdrop-blur-md` backdrop. Cinematic `Modal` variant gets stronger backdrop blur than default.
- [x] **Shimmer skeletons** — new `<Skeleton>` component (`src/components/ui/Skeleton.tsx`) with `line | block | circle | card` shapes and `light | dark` tones. Uses an absolute `before:` pseudo-element with a translating gradient via the new `shimmer-sweep` keyframe. `motion-reduce` collapses to a static block. Adopted on dashboard (recent activity, daily quests, full loading skeleton), character, inventory, quests, shop, stats, and dungeons (dark tone). Legendary loot in dungeon-run page also switched from `animate-pulse` to `animate-legendary-glow`.
- [x] **Card primitive rollout (15 of 22 sites)** — adopted on dashboard hero + 3-column grid, `EmptyState`, ActivityLogForm (main panel + result card), ActivitySidePanel (mastery + resources), profile (achievement gallery + settings sections), character page (class bonuses + stats explanation), inventory (gear / spell / consumable loadouts), stats (5 KPI cards + ChartCard), and combat rewards-claimed card. Remaining 6 sites in combat are deeply nested in framer-motion wrappers; left for a follow-up sweep where the combat refactor can be more comprehensive.

---

## Larger Investments (1+ week)

- [x] **Commit to dark mode globally** — Tailwind `darkMode: 'class'` with proper light/dark toggle persisted to localStorage + system-preference fallback + no-flash bootstrap script. Theme toggle in header (icon) + profile settings (full label). All primitives (Card, Heading, EmptyState, Skeleton, Modal, Button, XPBar, GoldDisplay, ThemeToggle) and every screen got `dark:` variants. Recharts colors in stats page are theme-aware via `useChartColors()`. Sonner respects theme. Dungeons keep their always-dark fantasy aesthetic regardless of toggle (own `bg-slate-900` background). The audit's #1 single-impact change — shipped.
- [ ] **Full design system overhaul** — proper Tailwind tokens for color, spacing, typography, shadow, keyframes. Migrate codebase to tokens. 1–2 weeks.
- [ ] **Illustrated route backgrounds** — combat coliseum, dungeon caves, shop wooden shelves. SVG/CSS or commissioned. 1–2 weeks.
- [ ] **Combat scene redesign** — render player + monster as facing avatars/sprites in an arena, framer-motion or Lottie. 2+ weeks.
- [ ] **Sound design pass** — opt-in Howler.js for level-up/attack/dice/claim/legendary fanfare. Settings toggle on profile. 1 week.
- [ ] **PWA + install prompt** — branded splash, install banner with character preview, push notifications. 1 week.

---

## Game-Feel Juice Gaps

| Moment             | Current                    | Target                                                |
| ------------------ | -------------------------- | ----------------------------------------------------- |
| XP gain in chrome  | Width tween 500ms          | Spring with glow flash at fill point, +XP floats up   |
| Level-up           | Confetti + modal (decent)  | Add screen flash, sound, scaled stat-points badge     |
| Quest claim        | Plain amber button + toast | Button shimmer → coin fountain → "Claimed" stamp      |
| Loot drop          | Stagger reveal in combat   | Per-rarity entrance, screen flash on legendary        |
| Dungeon clear      | Reward summary             | Boss KO, all-rooms chain animation                    |
| Achievement unlock | Toast only                 | Full-screen modal, badge zoom-in, gold counter        |
| Personal record    | Toast                      | 🏆 ribbon overlay, brief screen border glow           |
| Streak milestone   | Toast                      | Flame intensification, scale-up, confetti at 7/30/100 |
| Combat hit         | Floating damage (great)    | Low-HP screen vignette, crit shake                    |
| Death              | Pastel red banner          | Desaturation, slow zoom, "You Have Fallen" type       |

---

## Screen-Specific Notes

### Top-level shell (`src/app/(game)/layout.tsx`)

- **Working:** sticky XP bar, mobile bottom nav structure.
- **Issues:** SaaS header (no logo/parchment/metal motif); emoji nav glyphs; sidebar has no game personality; no `max-w-*` container (widgets stretch on 2560px); mobile bottom-nav active state is just a color swap.

### Dashboard (`src/app/(game)/dashboard/page.tsx`)

- Hero banner is informational, not theatrical (line 109-171). Should be the punchiest hero on the site.
- Quick Actions cards (line 178-192) are 4 plain white tiles, no game treatment for "Fight a Monster".
- Stat sidebar bars don't glow or differentiate beyond color.
- Eyebrow inconsistency at line 298 (`font-medium text-gray-700` vs codebase's `text-xs font-semibold text-gray-400 uppercase tracking-wider`).
- Recent Activity feed (line 225-247) looks like a Slack message list, should feel like a quest journal.

### Combat (`src/app/(game)/combat/page.tsx`)

- **Working:** dice overlays, floating damage, shake-on-hit — the most game-feel in the app.
- Monster select looks identical to the shop (no environmental art, no contrast).
- Player/monster HP bars look identical regardless of tier.
- Victory banner uses the same pastel as the dashboard welcome — not celebratory.
- Loss banner is "soft warning toast" red, should feel ominous.
- Legendary loot reveals get the same animation as common loot.
- `BattleResultsModal` (line 3106-3190) is a plain modal with one ⚔️ emoji — needs cinematic treatment.

### Dungeons (`src/app/(game)/combat/dungeons/page.tsx`, `run/page.tsx`)

- The one screen that looks like a game (dark slate, gradient tier cards).
- **Also the biggest design-system breach** — dark mode in an otherwise light app.
- `roomIcon('rest')` returns `'?'` (run page line 76) — placeholder.
- Legendary loot uses `animate-pulse` — lazy, should be shimmer or slow rotate.

### Quests (`src/app/(game)/quests/page.tsx`)

- Flat white quest cards (line 84-170), no scroll/parchment motif.
- Claim button is plain amber — should feel like opening a chest.
- "~250+ XP" displays a tilde-plus; actual post-streak number unknown until claim — players will distrust the displayed reward.
- No empty state when 0 quests.

### Character (`src/app/(game)/character/page.tsx`, `CharacterCard.tsx`)

- Player identity hub looks like a SaaS card — needs character art, class crest, portrait frame.
- Equipped gear (line 84-96) is three gray squares with truncated text. No rarity color border.
- "How Stats Work" panel is a wall of color-keyed paragraph text.

### Activities (`src/app/(game)/activities/page.tsx`, `ActivityLogForm.tsx`)

- **Working:** mastery/restore result celebration cards, PR banner.
- Form inputs are plain (`border-gray-300 rounded-lg`), no game treatment.
- Submit button is the hand-rolled indigo — needs satisfying press animation.
- "Apple Health sync — Post-MVP" placeholder visible to users.

### Inventory (`src/app/(game)/inventory/page.tsx`)

- Gear loadout slots (line 211-241) are boring gray squares — no silhouette icons for empty slots, no rarity border for equipped items.
- Non-spell item cards (line 474-486) **ignore `RARITY_CARD` entirely** — legendary and common gear look identical.
- "NEW" pill uses `animate-pulse` — should shimmer.

### Shop (`src/app/(game)/shop/page.tsx`)

- Spells use `SpellCard` (collectible-card feel); gear uses plain rows (Excel feel). Major asymmetry.
- "Resets in 3h 24m" countdown is text-only — no urgency cue.

### Stats (`src/app/(game)/stats/page.tsx`)

- Works as analytics; that's the problem. No game-feel layer (number counters, sword-strikethrough backgrounds, per-monster breakdowns).

### Profile (`src/app/(game)/profile/page.tsx`)

- Achievement Gallery (line 35-93) is decent — locked are grayscale, unlocked are indigo.
- All unlocked badges look identical regardless of tier — legendary achievements should glow gold.

### Auth (`src/app/(auth)/login/page.tsx`)

- Form is a generic white card.
- "Enter the Realm" button is the standard indigo. Should feel like crossing a threshold.

---

## Component-Level Notes

| Component                          | Verdict                       | Issue                                                           |
| ---------------------------------- | ----------------------------- | --------------------------------------------------------------- |
| `ui/Button.tsx`                    | Decent, underused (2 imports) | No `iconic` variant for hero CTAs                               |
| `ui/XPBar.tsx`                     | Functional                    | Width tween only — no level-up flash/glow                       |
| `ui/Modal.tsx`                     | Solid (framer-motion 0.95→1)  | Generic — no cinematic variant                                  |
| `ui/EmptyState.tsx`                | **Dead code** (0 imports)     | Pages duplicate empty-state markup                              |
| `ui/Heading.tsx`                   | **Dead code** (0 imports)     | Pages hand-roll `text-2xl font-bold`                            |
| `ui/GoldDisplay.tsx`               | Used                          | No coin spin / value tween                                      |
| `ui/SpellCard.tsx`                 | **Excellent — template**      | Use as model for all item cards                                 |
| `ui/Toaster.tsx`                   | Good (sonner wrappers)        | Loot toast is plain white background — should be rarity-tinted  |
| `combat/CombatEffects.tsx`         | **Excellent**                 | Floating damage with crit glow — only real glow in the codebase |
| `character/LevelUpCelebration.tsx` | **Excellent — template**      | Confetti, gradient modal, blur orbs                             |
| `character/StatBar.tsx`            | Functional                    | No stat-up animation or class-baseline glow                     |
| `character/CharacterCard.tsx`      | Needs portrait/frame          | Bare text where identity should live                            |
| `character/ClassSelector.tsx`      | Mid                           | Three plain tiles, no class banner/silhouette                   |
| `character/StatAllocModal.tsx`     | Good two-click pattern        | Gradient inconsistent with level-up modal                       |

---

## Modern Patterns Missing

- **Motion** — `framer-motion` installed but barely used. No hover lifts, no number tweens, no page transitions, no spring physics on XP fill.
- **Glass/depth** — no `backdrop-blur-xl` anywhere meaningful, no animated border glows for legendaries.
- **Skeletons** — `animate-pulse` is fine but shimmer is more modern.
- **Toasts** — sonner is wired but loot/achievement toasts are visually flat.
- **Empty states** — `EmptyState` exists but nothing imports it.
- **Typography** — system font everywhere; no display face, no display-uppercase heading variant.
- **Iconography** — lucide-react installed, never used.
- **Dark mode** — zero `dark:` classes; dungeons are the only dark screens.
- **Sound/haptics** — zero. Web Audio + `navigator.vibrate(50)` would be huge.

---

## Risks / Gaps

- **Dungeons vs rest-of-app theme split** is the #1 coherence risk. Pick a direction.
- **Performance** — framer-motion `layout` animations on long lists can drop frames on mobile. Use `transform`-only animations.
- **Accessibility** — heavy animation must respect `prefers-reduced-motion` via `useReducedMotion()`.
- **Bundle size** — display font + Lucide + canvas-confetti + framer-motion + sonner adds up. Verify tree-shaking, lazy-load confetti.
- **Rarity glow exhaustion** — if every legendary glows constantly, the eye fatigues. Reserve loudest treatment for rare moments.
- **Recharts dark-mode** — stats page chart palette will need updating if dark mode lands globally.
- **OS emoji inconsistency** — Windows segoe-emoji ≠ Apple emoji. Lucide migration removes this entire class of issue.

---

## Already Working — Don't Break

- `SpellCard` — model component for item cards.
- Combat dice overlay system — engineering gold.
- `LevelUpCelebration` — the polish bar.
- `CombatEffects` floating damage numbers.
- Rarity token system in `items.ts` — under-applied but correct.
- Sonner toast wrappers — good DX.
- Achievement gallery on profile.
