#!/usr/bin/env node
// Production dependency vulnerability check.
//
// Audits only production dependencies (--omit=dev) so devDependency chains
// (firebase-tools, jsdom, vitest, etc.) do not block CI. This allows individual
// Dependabot PRs to pass CI even while unrelated dev-chain advisories exist.
//
// Fails with exit code 1 if any MODERATE, HIGH, or CRITICAL vulnerability
// affects a production dependency.
//
// To audit dev chains manually: npm audit (without --omit=dev).
// See docs/SECURITY-SETUP.md § Known devDependency vulnerabilities.

import { execSync } from 'child_process';

const FAIL_SEVERITIES = new Set(['critical', 'high', 'moderate']);

let audit;
try {
  const stdout = execSync('npm audit --json --omit=dev', { encoding: 'utf8' });
  audit = JSON.parse(stdout);
} catch (err) {
  // npm audit exits non-zero when vulnerabilities exist; capture stdout from the error.
  try {
    audit = JSON.parse(/** @type {any} */ (err).stdout);
  } catch {
    console.error('Failed to parse npm audit output. Run "npm audit --omit=dev" manually.');
    process.exit(1);
  }
}

const vulns = Object.entries(audit.vulnerabilities ?? {});

const prodBlockers = vulns.filter(([, v]) => FAIL_SEVERITIES.has(v.severity));

if (prodBlockers.length > 0) {
  console.error(
    `\nFAIL: ${prodBlockers.length} moderate/high/critical production vulnerability(ies):\n`,
  );
  prodBlockers.forEach(([name, v]) => {
    const via = Array.isArray(v.via)
      ? v.via.map((x) => (typeof x === 'string' ? x : x.title)).join(', ')
      : '';
    console.error(`  [${v.severity.toUpperCase()}] ${name}${via ? ` — via ${via}` : ''}`);
  });
  console.error('\nRun "npm audit --omit=dev" for details and fix before merging.\n');
  process.exit(1);
}

console.log('\nOK: no moderate/high/critical production vulnerabilities found.\n');
