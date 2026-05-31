# FitQuest → iOS Conversion: Assessment & Roadmap

> **Status:** Planning reference only — _no conversion work has started._
> Captured 2026-05-31. Gated on resolving the build-toolchain (no-Mac) question
> before any native phase begins. Revisit when a Mac or cloud-build path exists.

## Why this exists

The goal is to ship FitQuest on the Apple App Store. The three drivers are
**App Store presence**, **native feel / performance**, and **Apple Health
auto-logging**. The last one is the decisive constraint: HealthKit is on-device
only with no web API, so a PWA can never reach it — a native shell is required
(already noted in [`HEALTH-INTEGRATION.md §1`](HEALTH-INTEGRATION.md) and
CLAUDE.md).

This document records the recommended approach and a phased plan so the work can
be picked up cleanly later, without re-deriving the analysis.

---

## Verdict: Ready to convert. Use Capacitor with a Next.js static export.

**On timing — the app is mature enough.** Maturity is not the blocker. FitQuest
already has a deep, stable feature set (combat, dungeons, spells, achievements,
bestiary, ~880 passing tests, a server-authoritative Cloud Functions layer, and
a _provider-neutral health-ingestion core already scaffolded_). Waiting to
"build out more" mostly delays the conversion without de-risking it, because the
conversion work is orthogonal to gameplay. The one thing worth stabilizing first
is anything that changes core navigation or routing — that's exactly the surface
the conversion touches.

**On approach — Capacitor, bundling a Next.js static export.** The architecture
is about as Capacitor-friendly as it gets:

- ~17 of 18 pages are already `'use client'`. There are **no server actions, no
  `app/api` route handlers, and no `getServerSideProps`** (confirmed across
  `src/app/`).
- Firebase is the **JS Web SDK** (`src/lib/firebase.ts`) with IndexedDB auth
  persistence + Firestore offline cache — all of which run fine inside an iOS
  WebView. No native Firebase SDK needed.
- The docs already name Capacitor as the intended HealthKit path.

Capacitor wraps the existing web build in a native iOS shell, reusing ~100% of
the React/Tailwind UI. The only Swift required is the HealthKit bridge.

### Why not the alternatives

- **React Native / Expo rewrite** — discards the entire DOM/Tailwind UI layer
  and the combat/dungeon/spell screens. Months of work for zero gameplay gain.
  Reject.
- **Capacitor pointing at the live Vercel URL** (remote-load) — trivial to set
  up, but it's a glorified web wrapper: no offline, weak native feel, and a real
  risk of App Store rejection under guideline 4.2 ("minimum functionality").
  Reject in favor of a bundled static export.
- **Stay PWA-only** — already shipped, but iOS PWAs can't reach HealthKit, get
  no App Store listing, and have unreliable push. Fails all three drivers.

---

## The one real blocker: build toolchain (no Mac)

iOS apps must be compiled and signed on macOS, and submission needs the **Apple
Developer Program ($99/yr)**. Options, cheapest-effort first:

1. **Cloud Mac CI build** (recommended) — Codemagic or Ionic Appflow build the
   `.ipa` from the repo with no local Mac. Both have free tiers; Codemagic is
   well-suited to Capacitor. A Mac (or cloud Mac session) is still useful for
   occasional Xcode-native debugging of the HealthKit plugin.
2. **Rented cloud Mac** (MacStadium / Scaleway / AWS EC2 mac) — full Xcode when
   native code needs hands-on work.
3. **Buy a used Mac mini** — cheapest long-run if iOS becomes a primary target.

This decision is needed before Phase 2. It is logistics, not engineering.

---

## Phased Roadmap

### Phase 0 — Prerequisites (no code)

- Enroll in the Apple Developer Program ($99/yr).
- Pick a build path (Codemagic recommended). Get a "hello world" Capacitor app
  building to a signed `.ipa` from CI to prove the pipeline end-to-end _before_
  investing in FitQuest-specific work.

### Phase 1 — Make the web build Capacitor-ready (static export)

This is the core engineering slice and can land as normal PRs against `master`
_without_ any iOS code — it just makes a static build possible. **Phase 1 has
value on its own and needs no Mac**, so it's the natural starting point.

- **Enable static export**: add `output: 'export'` in `next.config.mjs`. This is
  what Capacitor bundles.
- **Relocate the middleware auth guard** (`src/middleware.ts`): middleware does
  **not run** in a static export. Move route protection to a client-side guard.
  The pieces already exist — `useAuth()` (`src/hooks/useAuth.ts`) +
  `onAuthStateChanged`. Add a client guard in `src/app/(game)/layout.tsx` that
  redirects to `/login` when unauthenticated, and drop the `__session` cookie
  dependency. (The security model is unchanged in practice: Firestore Security
  Rules remain the real enforcement; middleware was only UX routing.)
- **Relocate CSP / security headers**: the `headers()` function in
  `next.config.mjs` won't run in a static export. CSP moves to a `<meta>` tag in
  the root layout, and `connect-src` must continue to allow
  `https://*.cloudfunctions.net`, `*.googleapis.com` (Firebase),
  `*.firebaseio.com`, plus the Capacitor origins (`capacitor://localhost`,
  `https://localhost`).
- **Add `generateStaticParams`** to the one dynamic route
  `src/app/(game)/combat/dungeons/[tierId]/page.tsx` — return the 4 known tier
  ids (`goblin-caves`, `spider-lair`, `dark-sanctum`, `dragons-keep`).
- **Verify next/font + manifest** still emit under export (`src/app/manifest.ts`,
  `next/font` in `src/app/layout.tsx` — both supported by export).
- Add an `npm run build:static` script and confirm `out/` renders correctly when
  served as plain static files (no Next server).

> Note: this static export must stay compatible with the existing Vercel deploy,
> or two build modes are maintained. Decide whether Vercel keeps the server
> build while Capacitor consumes the static one (cleanest), or Vercel moves to
> static too.

### Phase 2 — Add the Capacitor iOS shell

- Add `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`; `webDir: 'out'`.
- Swap the web-API touchpoints for Capacitor plugins where it improves native
  feel (all currently work in WebView, so this is polish, not blocking):
  - Haptics: `navigator.vibrate` (`src/app/(game)/combat/layout.tsx`) →
    `@capacitor/haptics`.
  - Network status: `navigator.onLine` (`src/hooks/useOnlineStatus.ts`) →
    `@capacitor/network`.
  - Preferences: `localStorage` (theme/sound) → `@capacitor/preferences`
    (optional; localStorage works in WebView).
  - OAuth redirects (Strava/Garmin) → `@capacitor/browser` + deep-link callback
    handling, if health-sync is enabled on mobile.
  - Web Audio synth sounds (`src/lib/sounds.ts`) work as-is in the iOS WebView.
- Wire iOS app icons / splash from the existing PWA icon assets.

### Phase 3 — Apple HealthKit auto-logging (the native-only feature)

- Add a HealthKit Capacitor plugin (`@perfood/capacitor-healthkit` or similar,
  or a thin custom Swift plugin) to read steps / workouts / sleep with user
  consent.
- **Reuse the existing ingestion core** — feed HealthKit samples through the
  same provider-neutral path the Strava/Garmin scaffold already uses:
  `functions/src/logActivityCore.ts` (server-authoritative cap → log → mastery →
  resources → achievements) and the dedupe/snapshot helpers in
  `functions/src/gameLogic/healthDedupe.ts`. Add HealthKit as a third "source"
  alongside `garmin`/`strava` (an `ActivityLog.source = 'apple-health'` badge,
  mirroring the existing `'garmin'` badge).
- This is the payoff slice: it's why a PWA was never enough, and the backend is
  already shaped to receive it.

### Phase 4 — Submit to the App Store

- App Store Connect listing, screenshots, privacy nutrition labels (declare
  HealthKit data usage — Apple scrutinizes this), TestFlight beta, then review.
- Budget for a review round or two, especially around HealthKit justification
  and the "is this more than a website" bar (the bundled static export + native
  HealthKit clears 4.2 comfortably).

---

## Critical files (Phase 1, the pure-web work)

- `next.config.mjs` — add `output: 'export'`; relocate `headers()` CSP.
- `src/middleware.ts` — retire; move guard to client.
- `src/app/(game)/layout.tsx` — add client-side auth-redirect guard.
- `src/hooks/useAuth.ts` — drop `__session` cookie write; keep listener.
- `src/app/(game)/combat/dungeons/[tierId]/page.tsx` — add `generateStaticParams`.
- `src/app/layout.tsx` / `src/app/manifest.ts` — verify font + manifest export.

## Verification

- **Phase 1**: `npm run build:static` produces `out/`; serve it with a static
  server (e.g. `npx serve out`) and walk the golden path — login, dashboard, log
  an activity, combat, dungeon `[tierId]`, shop — with **no Next server
  running**. Confirm Firebase auth + Firestore reads/writes work and CSP allows
  Cloud Function calls. `npm run typecheck` + `npm test` stay green.
- **Phase 2**: `npx cap run ios` in the iOS Simulator (via cloud Mac/CI); verify
  haptics, offline banner, and sound.
- **Phase 3**: On a physical device, grant HealthKit permission, log a real
  walk, confirm it flows through `logActivityCore` and awards XP with the daily
  cap respected and the synced-source badge shown.

## Risks / Gaps

- **Dual build modes** — static export for Capacitor vs. server build for
  Vercel. Cleanest to keep both; document which deploy uses which.
- **Auth-guard regression** — moving protection from middleware to client is the
  highest-risk change. Firestore Rules are the real backstop, so a momentary
  client flash of a protected route is a UX bug, not a security hole, but test
  the unauthenticated → `/login` redirect carefully.
- **HealthKit review scrutiny** — Apple is strict on health-data justification
  and privacy labels; under-declaring is the most common rejection cause here.
- **No Mac** — gates Phases 2–4; resolve the build path in Phase 0 or the rest
  stalls.
- **Background sync limits** — iOS won't let a WebView poll HealthKit in the
  background freely; auto-logging realistically syncs on app foreground unless
  native background-delivery (HKObserverQuery) is added, which is extra Swift
  work.
