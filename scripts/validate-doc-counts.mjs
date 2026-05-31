/**
 * Validates that headline counts in the docs match the code.
 * Zero dependencies — runs on plain Node.
 *
 * Why: docs drift silently. The item catalog, spell catalog, monster roster,
 * and achievement list grow over time, and prose like "21 monsters" or
 * "149 items" in README.md / GAME-LOGIC.md / ART-ASSETS.md falls behind.
 * This script computes the real numbers from source and fails CI if a
 * documented number no longer matches — turning silent drift into a build error.
 *
 * How it works:
 *   1. Derive canonical counts from the source files (the single source of truth).
 *   2. For each check, find an anchored phrase in a canonical doc and assert the
 *      number(s) it contains equal the computed value(s).
 *   3. Anchors are specific enough that historical CHANGELOG entries (which keep
 *      old numbers on purpose) are never matched.
 *
 * When code changes a count: this script auto-detects the new number. The build
 * then fails until the doc prose is updated — by design. Update the doc, not this
 * script. Only touch the CHECKS table if you rephrase an anchor or add a new fact.
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
{
  let pendingId = false;
  for (const line of itemsSrc.split('\n')) {
    if (/^\s+id: '[a-z0-9-]+',/.test(line)) pendingId = true;
    const t = line.match(/^\s+type: '(weapon|armor|accessory|consumable|spell)',/);
    if (t && pendingId) {
      itemTypeCounts[t[1]]++;
      pendingId = false;
    }
  }
}
const itemsTotal = Object.values(itemTypeCounts).reduce((a, b) => a + b, 0);

// Spell class split — only spell items carry `classRestriction`.
const spellClassCounts = { all: 0, warrior: 0, wizard: 0, rogue: 0 };
for (const m of itemsSrc.matchAll(/^\s+classRestriction: '(all|warrior|wizard|rogue)',/gm)) {
  spellClassCounts[m[1]]++;
}

// Monsters — top-level `id: '...',` lines (passive/active ids are inline, not line-start).
const monstersSrc = read('src/lib/gameLogic/monsters.ts');
const monsterCount = (monstersSrc.match(/^\s+id: '[a-z0-9-]+',/gm) || []).length;

// Achievements — one `name:` per definition.
const achSrc = read('src/lib/gameLogic/achievements.ts');
const achievementCount = (achSrc.match(/^\s+name: '/gm) || []).length;

// Stores & hooks — file counts.
const storeCount = readdirSync(resolve(root, 'src/store')).filter((f) => f.endsWith('.ts')).length;
const hookCount = readdirSync(resolve(root, 'src/hooks')).filter((f) => f.endsWith('.ts')).length;

// Per-id item silhouettes + coverage of non-spell items.
const silSrc = read('src/components/art/item-silhouettes.tsx');
const silKeys = new Set([...silSrc.matchAll(/^\s+'([a-z0-9-]+)':/gm)].map((m) => m[1]));
const perIdSilhouettes = silKeys.size;
const nonSpellItems = itemsTotal - itemTypeCounts.spell;

// Which non-spell item ids lack a per-id silhouette.
const nonSpellIds = [];
{
  let curId = null;
  for (const line of itemsSrc.split('\n')) {
    const idm = line.match(/^\s+id: '([a-z0-9-]+)',/);
    if (idm) curId = idm[1];
    const t = line.match(/^\s+type: '(weapon|armor|accessory|consumable)',/);
    if (t && curId) {
      nonSpellIds.push(curId);
      curId = null;
    }
  }
}
const missingSilhouettes = nonSpellIds.filter((id) => !silKeys.has(id)).sort();

// ─── Checks ───────────────────────────────────────────────────────────────────
//
// { file, label, regex, expected }
//   regex: one capture group per expected number; `expected` is a number or
//          an array of numbers (matched positionally to the groups).
//   The anchor must match at least once; every match must equal `expected`.
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
  // ── ART-ASSETS.md ──
  {
    file: 'docs/ART-ASSETS.md',
    label: 'per-id silhouettes + non-spell coverage',
    regex: /(\d+) unique per-`id` silhouettes[\s\S]*?Covers (\d+) of the (\d+) non-spell items/,
    expected: [perIdSilhouettes, perIdSilhouettes, nonSpellItems],
  },
  {
    file: 'docs/ART-ASSETS.md',
    label: 'silhouette gap (missing count)',
    regex: /remaining (\d+) fall back/,
    expected: missingSilhouettes.length,
  },
];

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
      `✗ ${check.file}: anchor for "${check.label}" not found — the doc phrasing changed or the line was removed. Expected to find a phrase matching ${check.regex}.`,
    );
    errors++;
    continue;
  }

  for (const m of matches) {
    const got = expected.map((_, i) => Number(m[i + 1]));
    const mismatch = got.some((g, i) => g !== expected[i]);
    if (mismatch) {
      console.error(
        `✗ ${check.file}: "${check.label}" says [${got.join(', ')}] but code has [${expected.join(', ')}]. Update the doc.`,
      );
      errors++;
    }
  }
}

// ─── Summary ──────────────────────────────────────────────────────────────────

if (errors > 0) {
  console.error(
    `\n✗ ${errors} documentation count mismatch(es). The numbers above are computed from source — update the docs to match.`,
  );
  process.exit(1);
}

console.log('✓ Documentation counts match source. Canonical values:');
console.log(
  `  items=${itemsTotal} (w=${itemTypeCounts.weapon} a=${itemTypeCounts.armor} ` +
    `acc=${itemTypeCounts.accessory} con=${itemTypeCounts.consumable} spell=${itemTypeCounts.spell}) ` +
    `| spells by class: all=${spellClassCounts.all} war=${spellClassCounts.warrior} ` +
    `wiz=${spellClassCounts.wizard} rog=${spellClassCounts.rogue}`,
);
console.log(
  `  monsters=${monsterCount} | achievements=${achievementCount} | stores=${storeCount} | hooks=${hookCount}`,
);
console.log(
  `  item silhouettes: ${perIdSilhouettes} per-id for ${nonSpellItems} non-spell items ` +
    `(${missingSilhouettes.length} on type fallback${missingSilhouettes.length ? ': ' + missingSilhouettes.join(', ') : ''})`,
);
console.log(`  ${CHECKS.length} doc-count checks passed.`);
