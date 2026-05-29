#!/usr/bin/env node
// General-purpose Discord embed poster.
// Playwright result formatting lives in scripts/format-playwright-results.mjs.
// Never logs the webhook URL — passes through env only.

const WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
if (!WEBHOOK) {
  console.error('[discord-notify] DISCORD_WEBHOOK_URL is not set — refusing to continue.');
  process.exit(1);
}

const COLORS = {
  success: 3_900_732, // green
  failure: 15_746_117, // red
  cancelled: 9_807_270, // grey
};

const STATUS = (process.env.NOTIFY_STATUS || '').toLowerCase();
const TITLE = process.env.NOTIFY_TITLE || 'CI Notification';
const DESCRIPTION = process.env.NOTIFY_DESCRIPTION || '';
const COLOR_INPUT = process.env.NOTIFY_COLOR;
const FIELDS_RAW = process.env.NOTIFY_FIELDS || '[]';

const color = COLOR_INPUT ? parseInt(COLOR_INPUT, 10) : (COLORS[STATUS] ?? COLORS.failure);

let fields = [];
try {
  fields = JSON.parse(FIELDS_RAW);
} catch {
  console.error('[discord-notify] Could not parse NOTIFY_FIELDS JSON — posting without fields.');
}

const embed = {
  title: TITLE,
  ...(DESCRIPTION ? { description: DESCRIPTION } : {}),
  color,
  fields,
  timestamp: new Date().toISOString(),
};

try {
  const resp = await fetch(WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    // Intentional: do NOT exit non-zero — a notification glitch must not fail the job.
    console.error(`[discord-notify] Discord returned ${resp.status}: ${body.slice(0, 300)}`);
  } else {
    console.log('[discord-notify] Posted.');
  }
} catch (err) {
  // Same intentional swallow — Discord rate-limits and transient network errors happen.
  console.error(`[discord-notify] Network error: ${err.message.slice(0, 200)}`);
}
