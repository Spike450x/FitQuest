# /schema-review

Review the Firestore data model for the collection, document, or feature described in `$ARGUMENTS`.

Evaluate:

1. **Access patterns** — does the schema support the queries the UI needs without expensive reads?
2. **Document size** — any documents that will grow unboundedly?
3. **Subcollection vs root** — is the nesting depth appropriate?
4. **Denormalization** — is data duplicated intentionally for query performance?
5. **Security rules** — can game state be manipulated client-side? Are rules enforcing game logic?
6. **Index requirements** — which composite indexes will be needed?
7. **Future features** — does this model support multiplayer, guilds, leaderboards, and seasonal resets?
8. **Cost** — are there read patterns that will become expensive at scale?

Show the recommended document structure as a TypeScript type.

End with **Next-Level Suggestions** and **Potential Risks / Gaps**.

Firebase project: `fitness-rpg-claude`. Emulators: Firestore :8080, Auth :9099.
