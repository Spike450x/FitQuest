#!/usr/bin/env node
// Posts a Discord embed summarizing a Playwright run.
// Never logs the webhook URL — passes through env only.

import { readFileSync, existsSync } from 'node:fs';

const WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
if (!WEBHOOK) {
  console.error('[discord-notify] DISCORD_WEBHOOK_URL is not set — refusing to continue.');
  process.exit(1);
}

const STATUS = (process.env.JOB_STATUS || 'success').toLowerCase();
const WORKFLOW = process.env.WORKFLOW_NAME || 'CI';
const BRANCH = process.env.GITHUB_BRANCH || 'unknown';
const SHA = (process.env.GITHUB_SHA || '').slice(0, 7);
const RUN_URL = process.env.GITHUB_RUN_URL || '';
const ACTOR = process.env.GITHUB_ACTOR || 'system';
const RESULTS_PATH = process.env.RESULTS_PATH || 'test-results/results.json';

const COLORS = {
  success: 0x16a34a, // green
  failure: 0xdc2626, // red
  cancelled: 0xeab308, // yellow
};
const EMOJI = {
  success: '✅', // ✅
  failure: '❌', // ❌
  cancelled: '⚠️', // ⚠️
};

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
      failures.push({
        title: `${t.suitePath} > ${t.title}`,
        file: t.file,
        error: err,
      });
    }
  }
  const durationMs = report?.stats?.duration ?? 0;
  return { passed, failed, skipped, flaky, failures, durationMs };
}

function formatDuration(ms) {
  if (!ms) return '0s';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem.toString().padStart(2, '0')}s`;
}

let summary = { passed: 0, failed: 0, skipped: 0, flaky: 0, failures: [], durationMs: 0 };
let parseError = null;
if (existsSync(RESULTS_PATH)) {
  try {
    const report = JSON.parse(readFileSync(RESULTS_PATH, 'utf8'));
    summary = summarize(report);
  } catch (e) {
    parseError = e.message;
  }
} else {
  parseError = `Report not found at ${RESULTS_PATH}`;
}

const color = COLORS[STATUS] ?? COLORS.failure;
const emoji = EMOJI[STATUS] ?? EMOJI.failure;

const description = parseError
  ? `${emoji} ${STATUS.toUpperCase()} — could not read report: ${truncate(parseError, 200)}`
  : `${emoji} **${summary.passed}** passed · **${summary.failed}** failed · **${summary.skipped}** skipped${
      summary.flaky ? ` · **${summary.flaky}** flaky` : ''
    } · ${formatDuration(summary.durationMs)}`;

const fields = [];
if (summary.failures.length > 0) {
  const lines = summary.failures.slice(0, 10).map((f) => {
    const title = truncate(`${f.file}::${f.title}`, 80);
    const err = truncate(f.error, 180);
    return `• \`${title}\`\n  ${err}`;
  });
  if (summary.failures.length > 10) {
    lines.push(`*+ ${summary.failures.length - 10} more — see full report*`);
  }
  // Discord field.value max is 1024 chars.
  fields.push({ name: 'Failures', value: truncate(lines.join('\n'), 1024) });
}

const embed = {
  title: `FitQuest · ${WORKFLOW} · ${BRANCH}`,
  description,
  color,
  url: RUN_URL || undefined,
  fields,
  footer: { text: `${SHA || 'unknown'} · ${ACTOR}` },
  timestamp: new Date().toISOString(),
};

const payload = { embeds: [embed] };

try {
  const resp = await fetch(WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const body = await resp.text();
    console.error(`[discord-notify] Discord returned ${resp.status}: ${truncate(body, 300)}`);
  } else {
    console.log('[discord-notify] Posted.');
  }
} catch (err) {
  // Don't fail the job over a notification glitch. Discord rate-limits +
  // transient network errors happen; the underlying test status is the
  // source of truth.
  console.error(`[discord-notify] Network error posting to Discord: ${truncate(err.message, 200)}`);
}
