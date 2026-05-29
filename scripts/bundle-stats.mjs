#!/usr/bin/env node
// Tracks Next.js bundle size across commits.
//
// --write   Read .next/static/ sizes and commit them to docs/bundle-baseline.json
// --compare Read current sizes and compare against the saved baseline; exits 1 on regression

import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
  appendFileSync,
} from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, join } from 'node:path';

const REGRESSION_THRESHOLD_PCT = 10;
const BASELINE_PATH = resolve('docs/bundle-baseline.json');

function sumDirBytes(dirPath) {
  const abs = resolve(dirPath);
  if (!existsSync(abs)) return 0;
  let total = 0;
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    const full = join(abs, entry.name);
    if (entry.isDirectory()) {
      total += sumDirBytes(full);
    } else if (entry.isFile()) {
      total += statSync(full).size;
    }
  }
  return total;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const kb = bytes / 1024;
  return kb >= 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(1)} kB`;
}

function formatDelta(pct) {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

function writeOutput(key, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) return;
  const DELIM = 'GHADELIM';
  appendFileSync(outputFile, `${key}<<${DELIM}\n${value}\n${DELIM}\n`);
}

const mode = process.argv.includes('--write')
  ? 'write'
  : process.argv.includes('--compare')
    ? 'compare'
    : null;

if (!mode) {
  console.error('Usage: bundle-stats.mjs --write | --compare');
  process.exit(1);
}

const totalJsBytes = sumDirBytes('.next/static/chunks');
const totalCssBytes = sumDirBytes('.next/static/css');

if (mode === 'write') {
  const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  const baseline = { updatedAt: new Date().toISOString(), commit, totalJsBytes, totalCssBytes };
  writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n');
  console.log(`[bundle-stats] Baseline written (commit ${commit})`);
  console.log(`  JS:  ${formatBytes(totalJsBytes)}`);
  console.log(`  CSS: ${formatBytes(totalCssBytes)}`);
  process.exit(0);
}

// compare mode
if (!existsSync(BASELINE_PATH)) {
  console.warn(
    '[bundle-stats] No baseline found — skipping comparison (run --write on master first)',
  );
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));

if (baseline.totalJsBytes === 0) {
  console.warn(
    '[bundle-stats] Baseline JS size is 0 — treating delta as 0% to avoid divide-by-zero',
  );
}

const jsDeltaPct =
  baseline.totalJsBytes === 0
    ? 0
    : ((totalJsBytes - baseline.totalJsBytes) / baseline.totalJsBytes) * 100;
const cssDeltaPct =
  baseline.totalCssBytes === 0
    ? 0
    : ((totalCssBytes - baseline.totalCssBytes) / baseline.totalCssBytes) * 100;

const jsDeltaBytes = totalJsBytes - baseline.totalJsBytes;
const cssDeltaBytes = totalCssBytes - baseline.totalCssBytes;
const regression = jsDeltaPct > REGRESSION_THRESHOLD_PCT;

// Human-readable table
console.log('\n[bundle-stats] Bundle size comparison');
console.log('─'.repeat(60));
console.log(
  `  ${'Metric'.padEnd(8)} ${'Baseline'.padStart(12)} ${'Current'.padStart(12)} ${'Delta'.padStart(10)}`,
);
console.log('─'.repeat(60));
console.log(
  `  ${'JS'.padEnd(8)} ${formatBytes(baseline.totalJsBytes).padStart(12)} ${formatBytes(totalJsBytes).padStart(12)} ${formatDelta(jsDeltaPct).padStart(10)}`,
);
console.log(
  `  ${'CSS'.padEnd(8)} ${formatBytes(baseline.totalCssBytes).padStart(12)} ${formatBytes(totalCssBytes).padStart(12)} ${formatDelta(cssDeltaPct).padStart(10)}`,
);
console.log('─'.repeat(60));
console.log(`  Threshold: >${REGRESSION_THRESHOLD_PCT}% JS growth blocks the PR`);
if (regression) {
  console.error(
    `\n[bundle-stats] REGRESSION: JS grew ${formatDelta(jsDeltaPct)} (${formatBytes(Math.abs(jsDeltaBytes))} over baseline from ${baseline.commit})`,
  );
} else {
  console.log('\n[bundle-stats] OK: no regression detected');
}

// Build Discord fields
const title = regression ? `Bundle regression detected ⚠️` : `Bundle size comparison`;

const fields = [
  {
    name: 'JS bundle',
    value: `${formatBytes(baseline.totalJsBytes)} → ${formatBytes(totalJsBytes)} (${formatDelta(jsDeltaPct)})`,
    inline: true,
  },
  {
    name: 'CSS bundle',
    value: `${formatBytes(baseline.totalCssBytes)} → ${formatBytes(totalCssBytes)} (${formatDelta(cssDeltaPct)})`,
    inline: true,
  },
  {
    name: 'Baseline commit',
    value: baseline.commit,
    inline: true,
  },
];

writeOutput('title', title);
writeOutput('fields', JSON.stringify(fields));

process.exit(regression ? 1 : 0);
