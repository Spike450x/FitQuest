/**
 * Validates that the docs match the code — counts AND export coverage.
 * Zero dependencies — runs on plain Node.
 *
 * Why: docs drift silently. Catalogs grow ("21 monsters" → 22), functions get
 * renamed (the dungeons section once documented `generateDungeonRooms` long
 * after it became `generateDungeonLayout`), and prose falls behind. This script
 * computes the truth from source and fails CI when a doc no longer matches —
 * turning silent drift into a build error.
 *
 * Three classes of check:
 *   1. Counts — items / spells / monsters / achievements / quest pools / item
 *      silhouettes. Anchored on stable phrasing in the canonical doc so dated
 *      CHANGELOG entries (which keep old numbers on purpose) are never matched.
 *   2. Silhouette coverage — every non-spell item must have a per-id silhouette.
 *   3. GAME-LOGIC export coverage — every symbol exported from
 *      `src/lib/gameLogic/*` must appear in GAME-LOGIC.md, unless it is on the
 *      DOC_EXEMPT list below (with a reason). Catches new undocumented exports.
 *
 * When code changes: this script auto-detects the new value. The build then
 * fails until the doc prose is updated — by design. Update the doc, not the
 * script. Touch the CHECKS table or DOC_EXEMPT list only when you intentionally
 * rephrase an anchor, add a fact, or add a deliberately-internal export.
 */

import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const root = process.cwd();
const read = (p) => readFileSync(resolve(root, p), 'utf8');
// Match ASCII hyphen, en-dash, or em-dash so "1-14" / "1–14" / "1—14" all work.
const DASH = '[-–—]';

// ─── Derive canonical counts from source ──────────────────────────────────────

const itemsSrc = read('src/lib/gameLogic/items.ts');

// Sequential scan: each item object has an `id:` then a `type:` line.
const itemTypeCounts = { weapon: 0, armor: 0, accessory: 0, consumable: 0, spell: 0 };
const nonSpellIds = [];
{
  let curId = null;
  for (const line of itemsSrc.split('\n')) {
    const idm = line.match(/^\s+id: '([a-z0-9-]+)',/);
    if (idm) curId = idm[1];
    const t = line.match(/^\s+type: '(weapon|armor|accessory|consumable|spell)',/);
    if (t && curId) {
      itemTypeCounts[t[1]]++;
      if (t[1] !== 'spell') nonSpellIds.push(curId);
      curId = null;
    }
  }
}
const itemsTotal = Object.values(itemTypeCounts).reduce((a, b) => a + b, 0);
const nonSpellItems = nonSpellIds.length;

// Spell class split — only spell items carry `classRestriction`.
const spellClassCounts = { all: 0, warrior: 0, wizard: 0, rogue: 0 };
for (const m of itemsSrc.matchAll(/^\s+classRestriction: '(all|warrior|wizard|rogue)',/gm)) {
  spellClassCounts[m[1]]++;
}

// Monsters — top-level `id: '...',` lines (passive/active ids are inline, not line-start).
const monsterCount = (read('src/lib/gameLogic/monsters.ts').match(/^\s+id: '[a-z0-9-]+',/gm) || [])
  .length;

// Achievements — one `name:` per definition.
const achievementCount = (read('src/lib/gameLogic/achievements.ts').match(/^\s+name: '/gm) || [])
  .length;

// Quest pools — count `id: '` entries inside each array literal.
const questsSrc = read('src/lib/gameLogic/quests.ts');
const poolSize = (constName) => {
  const start = questsSrc.indexOf(constName);
  const open = questsSrc.indexOf('[', start);
  const close = questsSrc.indexOf('\n];', open);
  return (questsSrc.slice(open, close).match(/id: '/g) || []).length;
};
const dailyQuests = poolSize('DAILY_QUEST_POOL');
const weeklyQuests = poolSize('WEEKLY_QUEST_POOL');

// Stores & hooks — file counts (informational).
const storeCount = readdirSync(resolve(root, 'src/store')).filter((f) => f.endsWith('.ts')).length;
const hookCount = readdirSync(resolve(root, 'src/hooks')).filter((f) => f.endsWith('.ts')).length;

// Item silhouettes — parse the ITEM_SILHOUETTES object body for BOTH quoted
// (kebab) keys and unquoted identifier keys (single-word ids need no quotes).
const silSrc = read('src/components/art/item-silhouettes.tsx');
const silKeys = new Set();
{
  const start = silSrc.indexOf('ITEM_SILHOUETTES');
  const open = silSrc.indexOf('{', start);
  const close = silSrc.indexOf('\n};', open);
  const fallbacks = new Set(['weapon', 'armor', 'accessory', 'consumable']);
  for (const line of silSrc.slice(open + 1, close).split('\n')) {
    const m = line.match(/^\s+'([a-z0-9-]+)':/) || line.match(/^\s+([A-Za-z][A-Za-z0-9]*):/);
    if (m && !fallbacks.has(m[1])) silKeys.add(m[1]);
  }
}
const perIdSilhouettes = silKeys.size;
const missingSilhouettes = nonSpellIds.filter((id) => !silKeys.has(id)).sort();

// ─── Checks ───────────────────────────────────────────────────────────────────
//
// { file, label, regex, expected }
//   regex: one capture group per expected number; `expected` is a number or an
//          array (matched positionally). Anchor must match ≥1×; every match
//          must equal `expected`.
//
const CHECKS = [
  // ── GAME-LOGIC.md ──
  {
    file: 'docs/GAME-LOGIC.md',
    label: 'monster roster',
    regex: new RegExp(`(\\d+) monsters \\(levels 1${DASH}14\\)`),
    expected: monsterCount,
  },
  {
    file: 'docs/GAME-LOGIC.md',
    label: 'item catalog breakdown',
    regex:
      /(\d+) total \((\d+) weapons \/ (\d+) armor \/ (\d+) accessories \/ (\d+) consumables \/ (\d+) spells\)/,
    expected: [
      itemsTotal,
      itemTypeCounts.weapon,
      itemTypeCounts.armor,
      itemTypeCounts.accessory,
      itemTypeCounts.consumable,
      itemTypeCounts.spell,
    ],
  },
  {
    file: 'docs/GAME-LOGIC.md',
    label: 'achievement count',
    regex: /All (\d+) achievement definitions/,
    expected: achievementCount,
  },
  {
    file: 'docs/GAME-LOGIC.md',
    label: 'spell catalog size',
    regex: /\((\d+) spells after content-scaling PR4/,
    expected: itemTypeCounts.spell,
  },
  {
    file: 'docs/GAME-LOGIC.md',
    label: 'daily quest pool',
    regex: /(\d+) daily quests across/,
    expected: dailyQuests,
  },
  {
    file: 'docs/GAME-LOGIC.md',
    label: 'weekly quest pool',
    regex: /(\d+) weekly quests across/,
    expected: weeklyQuests,
  },
  // ── README.md ──
  {
    file: 'README.md',
    label: 'item catalog (file tree)',
    regex:
      /(\d+) items: (\d+) weapons \/ (\d+) armor \/ (\d+) accessories \/ (\d+) consumables \/ (\d+) spells/,
    expected: [
      itemsTotal,
      itemTypeCounts.weapon,
      itemTypeCounts.armor,
      itemTypeCounts.accessory,
      itemTypeCounts.consumable,
      itemTypeCounts.spell,
    ],
  },
  {
    file: 'README.md',
    label: 'spell catalog total',
    regex: /Spell catalog\s*—\s*(\d+) spells total/,
    expected: itemTypeCounts.spell,
  },
  {
    file: 'README.md',
    label: 'generic spell count',
    regex: /(\d+) generic spells/,
    expected: spellClassCounts.all,
  },
  { file: 'README.md', label: 'warrior spells', regex: /(\d+) Warrior spells/, expected: spellClassCounts.warrior },
  { file: 'README.md', label: 'wizard spells', regex: /(\d+) Wizard spells/, expected: spellClassCounts.wizard },
  { file: 'README.md', label: 'rogue spells', regex: /(\d+) Rogue spells/, expected: spellClassCounts.rogue },
  {
    file: 'README.md',
    label: 'monster roster (mechanics section)',
    regex: new RegExp(`(\\d+) monsters spanning levels 1${DASH}14`),
    expected: monsterCount,
  },
  {
    file: 'README.md',
    label: 'achievement badge count',
    regex: /\*\*(\d+) one-time milestone badges\*\*/,
    expected: achievementCount,
  },
  {
    file: 'README.md',
    label: 'quest pools (file tree)',
    regex: /DAILY_QUEST_POOL \((\d+)\) \+ WEEKLY_QUEST_POOL \((\d+)\)/,
    expected: [dailyQuests, weeklyQuests],
  },
  // ── ART-ASSETS.md ──
  {
    file: 'docs/ART-ASSETS.md',
    label: 'per-id silhouettes + non-spell coverage',
    regex: /(\d+) unique per-`id` silhouettes \(one for every non-spell item\)/,
    expected: perIdSilhouettes,
  },
  {
    file: 'docs/ART-ASSETS.md',
    label: 'per-item art coverage claim',
    regex: /All (\d+) non-spell items have unique per-`id` silhouettes \((\d+) weapons, (\d+) armor, (\d+) accessories, (\d+) consumables\)/,
    expected: [
      nonSpellItems,
      itemTypeCounts.weapon,
      itemTypeCounts.armor,
      itemTypeCounts.accessory,
      itemTypeCounts.consumable,
    ],
  },
];

// ─── GAME-LOGIC export coverage ───────────────────────────────────────────────
//
// Every symbol exported from src/lib/gameLogic/* must be mentioned in
// GAME-LOGIC.md, unless it is intentionally internal and listed here.
//
const DOC_EXEMPT = new Set([
  // Achievement-checker input shapes — folded into their checker-function rows.
  'ActivityAchievementInput',
  'CollectionAchievementInput',
  'CombatAchievementInput',
  'MasteryAchievementInput',
  'QuestAchievementInput',
  // Combat round-resolution I/O — internal to calculateRound / resolveRoundOutcome.
  'RoundOutcomeInput',
  'RoundOutcomeResult',
  // combatActions overlay payload type — described narratively via ActionResolution.
  'PendingPayload',
]);

function gameLogicExports() {
  const names = new Set();
  const dir = resolve(root, 'src/lib/gameLogic');
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'))) {
    const src = readFileSync(resolve(dir, f), 'utf8');
    for (const m of src.matchAll(
      /^export (?:const|function|class|enum|interface|type) ([A-Za-z0-9_]+)/gm,
    )) {
      names.add(m[1]);
    }
    for (const m of src.matchAll(/^export \{([^}]+)\}/gm)) {
      for (const part of m[1].split(',')) {
        const n = part.split(' as ').pop().trim();
        if (n) names.add(n);
      }
    }
  }
  return names;
}

// ─── Run ────────────────────────────────────────────────────────────────────

let errors = 0;
const fileCache = {};
const load = (f) => (fileCache[f] ??= read(f));

for (const check of CHECKS) {
  const content = load(check.file);
  const expected = Array.isArray(check.expected) ? check.expected : [check.expected];
  const matches = [...content.matchAll(new RegExp(check.regex, 'g'))];

  if (matches.length === 0) {
    console.error(
      `✗ ${check.file}: anchor for "${check.label}" not found — the doc phrasing changed or the line was removed. Expected a phrase matching ${check.regex}.`,
    );
    errors++;
    continue;
  }
  for (const m of matches) {
    const got = expected.map((_, i) => Number(m[i + 1]));
    if (got.some((g, i) => g !== expected[i])) {
      console.error(
        `✗ ${check.file}: "${check.label}" says [${got.join(', ')}] but code has [${expected.join(', ')}]. Update the doc.`,
      );
      errors++;
    }
  }
}

// Silhouette coverage invariant.
if (missingSilhouettes.length > 0) {
  console.error(
    `✗ ${missingSilhouettes.length} non-spell item(s) have no per-id silhouette in item-silhouettes.tsx: ${missingSilhouettes.join(', ')}. Author a silhouette + register it in ITEM_SILHOUETTES.`,
  );
  errors++;
}

// Export coverage.
const exports = gameLogicExports();
const docText = load('docs/GAME-LOGIC.md');
const undocumented = [...exports].filter((e) => !DOC_EXEMPT.has(e) && !docText.includes(e)).sort();
if (undocumented.length > 0) {
  console.error(
    `✗ ${undocumented.length} gameLogic export(s) not documented in GAME-LOGIC.md (add a row, or add to DOC_EXEMPT with a reason): ${undocumented.join(', ')}`,
  );
  errors++;
}

// ─── Summary ──────────────────────────────────────────────────────────────────

if (errors > 0) {
  console.error(
    `\n✗ ${errors} documentation mismatch(es). Numbers/exports above are computed from source — update the docs to match.`,
  );
  process.exit(1);
}

console.log('✓ Documentation matches source. Canonical values:');
console.log(
  `  items=${itemsTotal} (w=${itemTypeCounts.weapon} a=${itemTypeCounts.armor} ` +
    `acc=${itemTypeCounts.accessory} con=${itemTypeCounts.consumable} spell=${itemTypeCounts.spell}) ` +
    `| spells by class: all=${spellClassCounts.all} war=${spellClassCounts.warrior} ` +
    `wiz=${spellClassCounts.wizard} rog=${spellClassCounts.rogue}`,
);
console.log(
  `  monsters=${monsterCount} | achievements=${achievementCount} | quests=${dailyQuests}d/${weeklyQuests}w ` +
    `| stores=${storeCount} | hooks=${hookCount}`,
);
console.log(
  `  item silhouettes: ${perIdSilhouettes} per-id covering all ${nonSpellItems} non-spell items (0 gaps)`,
);
console.log(
  `  gameLogic exports: ${exports.size} total, ${exports.size - undocumented.length - DOC_EXEMPT.size} documented + ${DOC_EXEMPT.size} exempt`,
);
console.log(`  ${CHECKS.length} count checks + silhouette coverage + export coverage all passed.`);
