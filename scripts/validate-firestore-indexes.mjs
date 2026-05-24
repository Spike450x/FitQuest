/**
 * Validates firestore.indexes.json structure before CI and deploy.
 * Zero dependencies — runs on plain Node 20.
 *
 * Checks:
 *   • File is valid JSON
 *   • Top-level shape: { indexes: [...], fieldOverrides: [...] }
 *   • Each index: collectionGroup (string), queryScope (string), fields (array ≥ 1)
 *   • Each field: fieldPath (string) + one of order ('ASCENDING'|'DESCENDING') or
 *     arrayConfig ('CONTAINS'|'CONTAINS_ANY')
 *   • Every known composite query in functions/src/ has a matching index
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const INDEX_FILE = resolve(process.cwd(), 'firestore.indexes.json');
const VALID_ORDERS = new Set(['ASCENDING', 'DESCENDING']);
const VALID_ARRAY_CONFIGS = new Set(['CONTAINS', 'CONTAINS_ANY']);

// ─── Known required composite indexes ────────────────────────────────────────
//
// Each entry maps to a Firestore query in functions/src/ or src/lib/.
// Add an entry here whenever a new composite query is introduced in a CF or
// client lib — CI will catch the missing index before it reaches production.
//
// Format: { collection, fields: [{ path, order }] }
// order: 'ASCENDING' for ==/range queries; 'DESCENDING' for ORDER BY DESC reads.
//
const REQUIRED_INDEXES = [
  // logActivity CF: daily cap query (uid == X, type == Y, loggedAt >= today)
  {
    collection: 'activityLogs',
    fields: [
      { path: 'uid', order: 'ASCENDING' },
      { path: 'type', order: 'ASCENDING' },
      { path: 'loggedAt', order: 'ASCENDING' },
    ],
    source: 'functions/src/index.ts logActivity daily-cap query',
  },
  // fetchRecentActivityLogs (stats page): uid == X ORDER BY loggedAt DESC
  {
    collection: 'activityLogs',
    fields: [
      { path: 'uid', order: 'ASCENDING' },
      { path: 'loggedAt', order: 'DESCENDING' },
    ],
    source: 'src/lib/activityData.ts fetchRecentActivityLogs',
  },
  // claimCombatVictory CF: daily wins query (uid == X, loggedAt >= today)
  {
    collection: 'combatLogs',
    fields: [
      { path: 'uid', order: 'ASCENDING' },
      { path: 'loggedAt', order: 'ASCENDING' },
    ],
    source: 'functions/src/claimCombatVictory.ts daily-wins query',
  },
  // fetchRecentCombatLogs (stats page): uid == X ORDER BY loggedAt DESC
  {
    collection: 'combatLogs',
    fields: [
      { path: 'uid', order: 'ASCENDING' },
      { path: 'loggedAt', order: 'DESCENDING' },
    ],
    source: 'src/lib/combatData.ts fetchRecentCombatLogs',
  },
  // dungeonStore.fetchActiveDungeonRun: uid == X, status == 'active', ORDER BY startedAt DESC
  {
    collection: 'dungeonRuns',
    fields: [
      { path: 'uid', order: 'ASCENDING' },
      { path: 'status', order: 'ASCENDING' },
      { path: 'startedAt', order: 'DESCENDING' },
    ],
    source: 'src/lib/dungeonData.ts fetchActiveDungeonRun',
  },
  // dungeonStore.fetchRecentDungeonRuns: uid == X ORDER BY startedAt DESC
  {
    collection: 'dungeonRuns',
    fields: [
      { path: 'uid', order: 'ASCENDING' },
      { path: 'startedAt', order: 'DESCENDING' },
    ],
    source: 'src/lib/dungeonData.ts fetchRecentDungeonRuns',
  },
];

// ─── Load and parse ───────────────────────────────────────────────────────────

let raw;
try {
  raw = readFileSync(INDEX_FILE, 'utf8');
} catch {
  fail(`Cannot read ${INDEX_FILE}`);
}

let parsed;
try {
  parsed = JSON.parse(raw);
} catch (e) {
  fail(`Invalid JSON: ${e.message}`);
}

if (!Array.isArray(parsed.indexes)) {
  fail('Missing or non-array "indexes" key at root.');
}
if (!Array.isArray(parsed.fieldOverrides)) {
  fail('Missing or non-array "fieldOverrides" key at root.');
}

// ─── Structure validation ─────────────────────────────────────────────────────

parsed.indexes.forEach((idx, i) => {
  const prefix = `indexes[${i}]`;

  if (typeof idx.collectionGroup !== 'string' || idx.collectionGroup.length === 0) {
    fail(`${prefix}.collectionGroup must be a non-empty string.`);
  }
  if (typeof idx.queryScope !== 'string' || idx.queryScope.length === 0) {
    fail(`${prefix}.queryScope must be a non-empty string.`);
  }
  if (!Array.isArray(idx.fields) || idx.fields.length === 0) {
    fail(`${prefix}.fields must be a non-empty array.`);
  }

  idx.fields.forEach((field, j) => {
    const fp = `${prefix}.fields[${j}]`;
    if (typeof field.fieldPath !== 'string' || field.fieldPath.length === 0) {
      fail(`${fp}.fieldPath must be a non-empty string.`);
    }
    const hasOrder = 'order' in field;
    const hasArrayConfig = 'arrayConfig' in field;
    if (!hasOrder && !hasArrayConfig) {
      fail(`${fp} must have either "order" or "arrayConfig".`);
    }
    if (hasOrder && !VALID_ORDERS.has(field.order)) {
      fail(`${fp}.order "${field.order}" is invalid. Must be ASCENDING or DESCENDING.`);
    }
    if (hasArrayConfig && !VALID_ARRAY_CONFIGS.has(field.arrayConfig)) {
      fail(
        `${fp}.arrayConfig "${field.arrayConfig}" is invalid. Must be CONTAINS or CONTAINS_ANY.`,
      );
    }
  });
});

// ─── Coverage validation ──────────────────────────────────────────────────────
//
// For each required index, confirm a matching entry exists in the file.
// Matching = same collectionGroup + same ordered field sequence (ignoring
// __name__ auto-appended by Firestore CLI on deploy).

let coverageErrors = 0;

for (const req of REQUIRED_INDEXES) {
  const match = parsed.indexes.find((idx) => {
    if (idx.collectionGroup !== req.collection) return false;
    // Filter out the __name__ sentinel Firestore appends during deploy
    const meaningful = idx.fields.filter((f) => f.fieldPath !== '__name__');
    if (meaningful.length !== req.fields.length) return false;
    return req.fields.every(
      (rf, i) => meaningful[i].fieldPath === rf.path && meaningful[i].order === rf.order,
    );
  });

  if (!match) {
    console.error(
      `✗ Missing index for: ${req.collection} [${req.fields.map((f) => `${f.path} ${f.order}`).join(', ')}]`,
    );
    console.error(`  Required by: ${req.source}`);
    coverageErrors++;
  }
}

if (coverageErrors > 0) {
  fail(`${coverageErrors} required composite index(es) missing from firestore.indexes.json.`);
}

console.log(
  `✓ firestore.indexes.json is valid (${parsed.indexes.length} index(es), ${REQUIRED_INDEXES.length} coverage checks passed)`,
);

function fail(msg) {
  console.error(`✗ firestore.indexes.json: ${msg}`);
  process.exit(1);
}
