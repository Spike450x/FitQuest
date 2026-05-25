# FitQuest — Technical Backlog

Known gaps, deferred work, and non-blocking improvements. Items graduate out of here when they ship (move to the Shipped section of CLAUDE.md and CHANGELOG.md) or are explicitly cancelled.

This is separate from the **feature backlog** in CLAUDE.md, which covers game content (Achievements page, Reputation, Champions, etc.). This file tracks engineering and polish debt.

---

## Deferred — dependency / risk not yet warranted

| Item                        | Detail                                                                                                                                                                                             | Trigger to revisit                                  |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `uuid` audit vulns (×7)     | Inside `firebase-tools` transitive deps. `npm audit fix --force` would install `firebase-tools@1.2.0` (breaking). Run `npm update firebase-tools` on a branch when a Node-24-compatible fix lands. | Firebase CLI release notes mention a uuid fix       |
| Firestore offline write UX  | `OfflineBanner` signals read-offline state but doesn't mention the pending-write queue. A "changes will sync when you reconnect" message would complete the offline story.                         | Before any mobile-first push                        |
| IndexedDB quota on mobile   | Browser can evict the Firestore cache below ~50 MB on low-storage devices. Currently single-user; harmless until mobile audience grows.                                                            | User base grows to mobile-first                     |
| `resource-exhausted` jitter | Retries use fixed delays (`[1_000, 3_000]`). Exponential back-off with jitter would reduce thundering-herd under concurrent load.                                                                  | Concurrent user count makes fixed delays observable |

---

## Polish / nice-to-have

_Nothing currently tracked._
