# /generate-docs

Generate or update the FitQuest project documentation as a Word document (.docx).

If `$ARGUMENTS` is provided, it specifies what to document (e.g., "combat system", "auth flow", "data models"). Otherwise generate the full architecture document.

## Steps

1. Read current source files to ensure documentation reflects live code:
   - `src/types/index.ts`
   - `src/store/` (all files)
   - `src/lib/` (all files)
   - `src/app/` route structure
   - `src/middleware.ts`
   - `firestore.rules`
   - `src/hooks/`

2. Use the `anthropic-skills:docx` skill to produce a `.docx` file containing:

   ### Full Documentation (no arguments)
   - Executive Summary
   - Architecture Overview with diagram
   - Tech Stack
   - Application Routes
   - Firestore Data Models (all collections with TypeScript types)
   - Authentication & Session Flow
   - Security Architecture (Firestore rules + middleware)
   - Game Systems (XP/leveling, combat, quests, inventory, streaks, spells)
   - State Management (Zustand store reference)
   - Key Data Flows
   - Component Reference

   ### Targeted Documentation (with arguments)
   Focus the document on the specific system described in `$ARGUMENTS`, but still include an executive summary and relevant data models.

3. Save to: `docs/FitQuest_Architecture_[YYYY-MM-DD].docx`

4. Report the file path and a brief summary of sections generated.

## Diagram Style

Use Mermaid syntax for:
- Architecture diagrams: `graph TD` or `graph LR`
- User journey flows: `sequenceDiagram`
- State machines: `stateDiagram-v2`

Fall back to ASCII box/arrow diagrams if Mermaid is not supported in the docx context.
