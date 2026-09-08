#!/usr/bin/env node
// Idempotently converge the zone's Cloudflare cache configuration:
//   1. Smart Tiered Cache ON  (POST/PATCH /zones/{zone}/cache/tiered_cache_smart_topology_enable)
//   2. Two code-managed Cache Rules in the http_request_cache_settings phase
//      (see scripts/lib/cloudflare-cache-rules.mjs for the rules and rationale)
//
// Usage:
//   node scripts/ensure-cloudflare-cache-config.mjs            # converge (needs CF_ZONE_ID + CF_API_TOKEN)
//   node scripts/ensure-cloudflare-cache-config.mjs --dry-run  # or CF_DRY_RUN=1: read-only, prints the plan
//   node scripts/ensure-cloudflare-cache-config.mjs --check    # read-only; exit 0 = active, 2 = drift/missing
//
// Exit codes: 0 converged / nothing to do / cannot tell (no creds or token
// lacks permission — printed as a ::warning:: with the exact dashboard steps
// so a deploy is never blocked by a config we cannot change); 1 unexpected
// API failure; 2 (--check only) configuration not active.
//
// Safety: never PUTs over an existing entrypoint ruleset (that would delete
// the owner's hand-made rules). Existing rules are only ever matched by our
// own description prefix and updated/created individually.

import {
  CACHE_PHASE,
  buildDesiredRules,
  dashboardInstructions,
  describeCloudflareErrors,
  isPermissionError,
  planRuleChanges,
} from './lib/cloudflare-cache-rules.mjs';

const API = 'https://api.cloudflare.com/client/v4';
const REQUEST_TIMEOUT_MS = 30000;
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run') || process.env.CF_DRY_RUN === '1';
const checkOnly = args.has('--check');
const readOnly = dryRun || checkOnly;
const inCi = process.env.GITHUB_ACTIONS === 'true';

const zoneId = process.env.CF_ZONE_ID;
const apiToken = process.env.CF_API_TOKEN;

const desiredRules = buildDesiredRules();
const state = { warnings: [], permissionDenied: false, changed: [], drift: false, failures: 0 };

function log(message) {
  console.log(`[cache-config] ${message}`);
}

function warn(message) {
  state.warnings.push(message);
  console.warn(`[cache-config] WARNING: ${message}`);
  if (inCi) {
    // Show up in the Actions run summary even though the step is continue-on-error.
    console.log(`::warning title=Cloudflare cache config::${message.split('\n')[0]}`);
  }
}

async function cf(method, path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }

    return { status: response.status, ok: response.ok && json?.success !== false, json, text };
  } finally {
    clearTimeout(timer);
  }
}

function printPlanWithoutCredentials() {
  log('CF_ZONE_ID / CF_API_TOKEN not set — printing the desired configuration only.');
  log('Desired: Smart Tiered Cache = on');
  for (const rule of desiredRules) {
    log(`Desired rule: ${rule.description}`);
    log(`  expression: ${rule.expression}`);
    log(`  action_parameters: ${JSON.stringify(rule.action_parameters)}`);
  }
  console.log(dashboardInstructions(desiredRules));
}

function handlePermissionDenied(what, response) {
  state.permissionDenied = true;
  warn(`token cannot ${what}: ${describeCloudflareErrors(response.status, response.json)}`);
}

async function ensureSmartTieredCache() {
  const path = `/zones/${zoneId}/cache/tiered_cache_smart_topology_enable`;
  const current = await cf('GET', path);

  if (!current.ok) {
    if (isPermissionError(current.status, current.json)) {
      handlePermissionDenied('read Smart Tiered Cache (needs Zone > Zone Settings > Edit)', current);
      return;
    }
    // A zone that never touched the setting can return 404 here; treat as "off".
    if (current.status !== 404) {
      throw new Error(`GET tiered_cache_smart_topology_enable failed: ${describeCloudflareErrors(current.status, current.json)}`);
    }
  }

  const value = current.json?.result?.value ?? 'off';
  if (value === 'on') {
    log('Smart Tiered Cache: already on');
    return;
  }

  state.drift = true;
  if (readOnly) {
    log(`Smart Tiered Cache: ${value} — would enable (${checkOnly ? 'check' : 'dry run'})`);
    return;
  }

  // PATCH edits an existing setting; POST creates it on zones where GET 404'd.
  const method = current.status === 404 ? 'POST' : 'PATCH';
  const updated = await cf(method, path, { value: 'on' });
  if (!updated.ok) {
    if (isPermissionError(updated.status, updated.json)) {
      handlePermissionDenied('enable Smart Tiered Cache (needs Zone > Zone Settings > Edit)', updated);
      return;
    }
    throw new Error(`${method} tiered_cache_smart_topology_enable failed: ${describeCloudflareErrors(updated.status, updated.json)}`);
  }

  state.changed.push('Smart Tiered Cache enabled');
  log('Smart Tiered Cache: enabled');
}

async function ensureCacheRules() {
  const entrypointPath = `/zones/${zoneId}/rulesets/phases/${CACHE_PHASE}/entrypoint`;
  const current = await cf('GET', entrypointPath);

  if (!current.ok && current.status !== 404) {
    if (isPermissionError(current.status, current.json)) {
      handlePermissionDenied('read Cache Rules (needs Zone > Cache Rules > Edit)', current);
      return;
    }
    throw new Error(`GET ${CACHE_PHASE} entrypoint failed: ${describeCloudflareErrors(current.status, current.json)}`);
  }

  const entrypointExists = current.ok;
  const ruleset = entrypointExists ? current.json.result : { id: null, rules: [] };
  const existingRules = Array.isArray(ruleset.rules) ? ruleset.rules : [];
  const plan = planRuleChanges(existingRules, desiredRules);

  log(`Cache Rules: ${existingRules.length} existing (${plan.foreign.length} not managed here), ` +
    `${plan.unchanged.length} up to date, ${plan.update.length} to update, ${plan.create.length} to create`);
  for (const rule of plan.foreign) {
    log(`  existing (kept as-is): ${rule.description || '(no description)'} :: ${rule.expression}`);
  }
  for (const rule of plan.orphans) {
    warn(`managed rule with an unknown description left in place — delete it by hand if unwanted: ${rule.description}`);
  }
  if (plan.overLimit) {
    warn(`zone would have ${plan.resultingCount} cache rules; the Free plan allows 10 — remove an unused rule first.`);
  }

  if (plan.create.length === 0 && plan.update.length === 0) {
    log('Cache Rules: nothing to change');
    return;
  }

  state.drift = true;
  if (readOnly) {
    for (const rule of plan.create) log(`  would create: ${rule.description}`);
    for (const { rule } of plan.update) log(`  would update: ${rule.description}`);
    return;
  }

  if (!entrypointExists) {
    // Nothing exists in this phase, so creating the entrypoint with exactly
    // our rules cannot delete anything.
    const created = await cf('PUT', entrypointPath, { rules: plan.create });
    if (!created.ok) {
      if (isPermissionError(created.status, created.json)) {
        handlePermissionDenied('create Cache Rules (needs Zone > Cache Rules > Edit)', created);
        return;
      }
      throw new Error(`PUT ${CACHE_PHASE} entrypoint failed: ${describeCloudflareErrors(created.status, created.json)}`);
    }
    for (const rule of plan.create) {
      state.changed.push(`created rule: ${rule.description}`);
      log(`  created: ${rule.description}`);
    }
    return;
  }

  for (const { id, rule } of plan.update) {
    const updated = await cf('PATCH', `/zones/${zoneId}/rulesets/${ruleset.id}/rules/${id}`, rule);
    if (!updated.ok) {
      if (isPermissionError(updated.status, updated.json)) {
        handlePermissionDenied('update Cache Rules (needs Zone > Cache Rules > Edit)', updated);
        return;
      }
      throw new Error(`PATCH rule ${id} failed: ${describeCloudflareErrors(updated.status, updated.json)}`);
    }
    state.changed.push(`updated rule: ${rule.description}`);
    log(`  updated: ${rule.description}`);
  }

  for (const rule of plan.create) {
    // POST appends at the end of the list — exactly where "last matching rule wins" needs it.
    const created = await cf('POST', `/zones/${zoneId}/rulesets/${ruleset.id}/rules`, rule);
    if (!created.ok) {
      if (isPermissionError(created.status, created.json)) {
        handlePermissionDenied('create Cache Rules (needs Zone > Cache Rules > Edit)', created);
        return;
      }
      throw new Error(`POST rule failed: ${describeCloudflareErrors(created.status, created.json)}`);
    }
    state.changed.push(`created rule: ${rule.description}`);
    log(`  created: ${rule.description}`);
  }
}

async function main() {
  log(`mode: ${checkOnly ? 'check (read-only)' : dryRun ? 'dry run (read-only)' : 'converge'}`);

  if (!zoneId || !apiToken) {
    printPlanWithoutCredentials();
    if (checkOnly) {
      warn('cannot verify the cache configuration without CF_ZONE_ID/CF_API_TOKEN.');
    }
    return 0;
  }

  await ensureSmartTieredCache();
  await ensureCacheRules();

  if (state.permissionDenied) {
    console.log(dashboardInstructions(desiredRules));
    return 0;
  }

  if (checkOnly) {
    if (state.drift) {
      log('CHECK: configuration is NOT fully active (see "would ..." lines above).');
      return 2;
    }
    log('CHECK: configuration active.');
    return 0;
  }

  if (state.changed.length > 0) {
    log(`applied ${state.changed.length} change(s): ${state.changed.join('; ')}`);
  } else if (!dryRun) {
    log('configuration already converged.');
  }
  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(`[cache-config] failed: ${error.message}`);
    process.exitCode = 1;
  });
