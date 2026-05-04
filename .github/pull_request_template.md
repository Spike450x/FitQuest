## Summary
<!-- 1–3 bullets: what changed and why -->

## Game Design Impact
<!-- XP/balance/progression effects, or "none" -->

## Verification
- [ ] `npm run typecheck` passes (pre-commit hook covers this)
- [ ] `npm run lint` passes (pre-commit hook covers staged files)
- [ ] `npm test` passes (pre-commit hook covers this)
- [ ] If new game logic added: vitest tests added in `src/lib/gameLogic/__tests__/`
- [ ] Touched feature manually verified in browser (golden path + edge cases)
- [ ] No `.env*` or secrets committed
- [ ] If schema or write-pattern changed: `firestore.rules` updated
- [ ] If a meaningful feature/change shipped: `docs/CHANGELOG.md` updated (skip for trivial commits)

## Next-Level Suggestions
<!-- forward-looking ideas, follow-ups -->

## Potential Risks / Gaps
<!-- things that might break, scale poorly, or reduce engagement -->
