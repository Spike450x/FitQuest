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
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const INDEX_FILE = resolve(process.cwd(), 'firestore.indexes.json');
const VALID_ORDERS = new Set(['ASCENDING', 'DESCENDING']);
const VALID_ARRAY_CONFIGS = new Set(['CONTAINS', 'CONTAINS_ANY']);

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

console.log(`✓ firestore.indexes.json is valid (${parsed.indexes.length} index(es))`);

function fail(msg) {
  console.error(`✗ firestore.indexes.json: ${msg}`);
  process.exit(1);
}
