# FitQuest — Technical Backlog

Known gaps, deferred work, and non-blocking improvements. Items graduate out of here when they ship (move to the Shipped section of CLAUDE.md and CHANGELOG.md) or are explicitly cancelled.

This is separate from the **feature backlog** in CLAUDE.md, which covers game content (Achievements page, Reputation, Champions, etc.). This file tracks engineering and polish debt.

---

## Deferred — dependency / risk not yet warranted

| Item                        | Detail                                                                                                                                                                                                                                                                           | Trigger to revisit                                                                                                 |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `uuid` audit vulns (×7)     | Inside `firebase-tools` transitive deps. `firebase-tools@15.19.0` is now available (up from 13.35.1) — test on a dedicated branch (`npm install -D firebase-tools@latest`) as the CLI interface may have breaking changes. If the upgrade fixes the uuid chain, close this item. | Run `npm install -D firebase-tools@latest` on a branch and verify `firebase deploy` + rules + functions still work |
| IndexedDB quota on mobile   | Browser can evict the Firestore cache below ~50 MB on low-storage devices. Currently single-user; harmless until mobile audience grows.                                                                                                                                          | User base grows to mobile-first                                                                                    |
| `resource-exhausted` jitter | Retries use fixed delays (`[1_000, 3_000]`). Exponential back-off with jitter would reduce thundering-herd under concurrent load.                                                                                                                                                | Concurrent user count makes fixed delays observable                                                                |
| iOS app (Capacitor)         | Native iOS conversion via Capacitor + Next.js static export, for App Store presence, native feel, and Apple Health (HealthKit) auto-logging. Full assessment + phased roadmap in [`IOS-CONVERSION.md`](IOS-CONVERSION.md). Architecture is ready; Phase 1 (static export) is pure web work and needs no Mac.   | Resolve build toolchain (no Mac) — cloud build (Codemagic) or a Mac; then start Phase 1                            |

---

## Polish / nice-to-have

_Nothing currently tracked._
