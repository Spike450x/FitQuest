#!/usr/bin/env node
// Reads a Playwright JSON report and writes Discord embed fields to $GITHUB_OUTPUT.
// Extracted from .github/actions/discord-notify/notify.mjs so the discord-notify
// action can be general-purpose while keeping Playwright formatting in one place.

import { readFileSync, existsSync, appendFileSync } from 'node:fs';

const RESULTS_PATH = process.env.RESULTS_PATH || 'test-results/results.json';
const STATUS = (process.env.STATUS || process.env.JOB_STATUS || 'success').toLowerCase();
const WORKFLOW = process.env.WORKFLOW_NAME || 'CI';
const BRANCH = process.env.GITHUB_BRANCH || 'unknown';
const SHA = (process.env.GITHUB_SHA || '').slice(0, 7);
const RUN_URL = process.env.GITHUB_RUN_URL || '';
const ACTOR = process.env.GITHUB_ACTOR || 'system';

const EMOJI = { success: '✅', failure: '❌', cancelled: '⚠️' };

function truncate(s, max) {
  if (!s) return '';
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function flattenSuites(suites, parent = '') {
  const tests = [];
  for (const suite of suites ?? []) {
    const path = parent ? `${parent} > ${suite.title}` : suite.title;
    if (suite.specs) {
      for (const spec of suite.specs) {
        for (const t of spec.tests ?? []) {
          tests.push({
            file: spec.file ?? suite.file ?? '',
            title: spec.title,
            suitePath: path,
            results: t.results ?? [],
          });
        }
      }
    }
    if (suite.suites) tests.push(...flattenSuites(suite.suites, path));
  }
  return tests;
}

function summarize(report) {
  const all = flattenSuites(report?.suites ?? []);
  let passed = 0,
    failed = 0,
    skipped = 0,
    flaky = 0;
  const failures = [];
  for (const t of all) {
    const last = t.results[t.results.length - 1];
    if (!last) {
      skipped++;
      continue;
    }
    const status = last.status;
    if (status === 'skipped') skipped++;
    else if (status === 'passed') {
      passed++;
      if (t.results.length > 1) flaky++;
    } else if (status === 'failed' || status === 'timedOut' || status === 'interrupted') {
      failed++;
      const err = last.error?.message?.split('\n')[0] ?? 'unknown error';
      failures.push({ title: `${t.suitePath} > ${t.title}`, file: t.file, error: err });
    }
  }
  return { passed, failed, skipped, flaky, failures, durationMs: report?.stats?.duration ?? 0 };
}

function formatDuration(ms) {
  if (!ms) return '0s';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${(s % 60).toString().padStart(2, '0')}s`;
}

// Parse results
let summary = { passed: 0, failed: 0, skipped: 0, flaky: 0, failures: [], durationMs: 0 };
let parseError = null;
if (existsSync(RESULTS_PATH)) {
  try {
    summary = summarize(JSON.parse(readFileSync(RESULTS_PATH, 'utf8')));
  } catch (e) {
    parseError = e.message;
  }
} else {
  parseError = `Report not found at ${RESULTS_PATH}`;
}

const emoji = EMOJI[STATUS] ?? EMOJI.failure;
const title = `FitQuest · ${WORKFLOW} · ${BRANCH}`;
const description = parseError
  ? `${emoji} ${STATUS.toUpperCase()} — could not read report: ${truncate(parseError, 200)}`
  : `${emoji} **${summary.passed}** passed · **${summary.failed}** failed · **${summary.skipped}** skipped${
      summary.flaky ? ` · **${summary.flaky}** flaky` : ''
    } · ${formatDuration(summary.durationMs)}`;

const fields = [];
if (summary.failures.length > 0) {
  const lines = summary.failures.slice(0, 10).map((f) => {
    const t = truncate(`${f.file}::${f.title}`, 80);
    const err = truncate(f.error, 180);
    return `• \`${t}\`\n  ${err}`;
  });
  if (summary.failures.length > 10)
    lines.push(`*+ ${summary.failures.length - 10} more — see full report*`);
  fields.push({ name: 'Failures', value: truncate(lines.join('\n'), 1024) });
}
fields.push({ name: 'Run', value: `[${SHA || 'unknown'} · ${ACTOR}](${RUN_URL})`, inline: true });

const fieldsJson = JSON.stringify(fields);

// Write outputs
const outputFile = process.env.GITHUB_OUTPUT;
if (outputFile) {
  const DELIM = 'GHADELIM';
  appendFileSync(
    outputFile,
    `title<<${DELIM}\n${title}\n${DELIM}\ndescription<<${DELIM}\n${description}\n${DELIM}\nfields<<${DELIM}\n${fieldsJson}\n${DELIM}\n`,
  );
} else {
  // Local run — print to stdout
  console.log('title:', title);
  console.log('description:', description);
  console.log('fields:', fieldsJson);
}
