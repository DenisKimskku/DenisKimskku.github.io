import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  BROWSER_TTL_CONTENT_SECONDS,
  CONTENT_RULE_EXCLUDED_PREFIXES,
  EDGE_TTL_CONTENT_SECONDS,
  EDGE_TTL_OG_SECONDS,
  FREE_PLAN_RULE_LIMIT,
  RULE_PREFIX,
  buildDesiredRules,
  dashboardInstructions,
  describeCloudflareErrors,
  isManagedRule,
  isPermissionError,
  planRuleChanges,
} from '../scripts/lib/cloudflare-cache-rules.mjs';

const desired = buildDesiredRules();
const [contentRule, ogRule] = desired;

test('desired rules are two clearly-named set_cache_settings rules', () => {
  assert.equal(desired.length, 2);
  for (const rule of desired) {
    assert.ok(rule.description.startsWith(RULE_PREFIX), rule.description);
    assert.equal(rule.action, 'set_cache_settings');
    assert.equal(rule.enabled, true);
    assert.equal(rule.action_parameters.cache, true);
    assert.equal(rule.action_parameters.edge_ttl.mode, 'override_origin');
    assert.equal(rule.action_parameters.browser_ttl.mode, 'override_origin');
    assert.match(rule.expression, /http\.host in \{"deniskim1\.com" "www\.deniskim1\.com"\}/);
  }
});

test('content rule: 30d edge TTL, 10 min browser TTL, short 4xx, no-cache 5xx', () => {
  const { edge_ttl: edge, browser_ttl: browser } = contentRule.action_parameters;
  assert.equal(edge.default, EDGE_TTL_CONTENT_SECONDS);
  assert.equal(EDGE_TTL_CONTENT_SECONDS, 30 * 86400);
  assert.equal(browser.default, BROWSER_TTL_CONTENT_SECONDS);
  assert.ok(browser.default <= 600, 'browser TTL for HTML must stay short so deploys reach repeat visitors');

  const byRange = Object.fromEntries(edge.status_code_ttl.map((entry) => [`${entry.status_code_range.from}-${entry.status_code_range.to}`, entry.value]));
  assert.equal(byRange['200-299'], EDGE_TTL_CONTENT_SECONDS);
  assert.ok(byRange['400-499'] <= 300, 'a 404 for a not-yet-deployed URL must expire quickly');
  assert.equal(byRange['500-599'], 0, '5xx must be no-cache');
});

test('content rule excludes the Worker route, Cloudflare internals, immutable chunks and /og/', () => {
  for (const prefix of ['/_next/static/', '/og/', '/api/', '/cdn-cgi/']) {
    assert.ok(CONTENT_RULE_EXCLUDED_PREFIXES.includes(prefix), `${prefix} must be excluded`);
    assert.ok(contentRule.expression.includes(`not starts_with(http.request.uri.path, "${prefix}")`), prefix);
  }
});

test('og rule: 7d edge TTL scoped to /og/', () => {
  assert.equal(ogRule.action_parameters.edge_ttl.default, EDGE_TTL_OG_SECONDS);
  assert.equal(EDGE_TTL_OG_SECONDS, 7 * 86400);
  assert.match(ogRule.expression, /starts_with\(http\.request\.uri\.path, "\/og\/"\)/);
  assert.ok(!ogRule.expression.includes('not starts_with'));
});

test('planRuleChanges creates everything on an empty phase', () => {
  const plan = planRuleChanges([], desired);
  assert.equal(plan.create.length, 2);
  assert.equal(plan.update.length, 0);
  assert.equal(plan.unchanged.length, 0);
  assert.equal(plan.overLimit, false);
});

test('planRuleChanges is idempotent and never touches foreign rules', () => {
  const foreign = { id: 'f1', description: 'owner: cache everything', expression: '(http.host eq "deniskim1.com")', action: 'set_cache_settings', action_parameters: { cache: true } };
  const live = [foreign, ...desired.map((rule, index) => ({ ...rule, id: `m${index}`, version: '3', last_updated: 'x' }))];
  const plan = planRuleChanges(live, desired);
  assert.equal(plan.create.length, 0);
  assert.equal(plan.update.length, 0);
  assert.deepEqual(plan.unchanged.map((entry) => entry.id), ['m0', 'm1']);
  assert.deepEqual(plan.foreign, [foreign]);
  assert.equal(plan.orphans.length, 0);
});

test('planRuleChanges updates a drifted managed rule by id and reports orphans', () => {
  const drifted = structuredClone(contentRule);
  drifted.id = 'm0';
  drifted.action_parameters.edge_ttl.default = 7200; // someone lowered it in the dashboard
  const orphan = { id: 'o1', description: `${RULE_PREFIX} old experiment`, expression: 'true', action: 'set_cache_settings', action_parameters: { cache: true } };
  const plan = planRuleChanges([drifted, { ...ogRule, id: 'm1' }, orphan], desired);
  assert.equal(plan.create.length, 0);
  assert.deepEqual(plan.update.map((entry) => entry.id), ['m0']);
  assert.equal(plan.update[0].rule.action_parameters.edge_ttl.default, EDGE_TTL_CONTENT_SECONDS);
  assert.deepEqual(plan.orphans.map((rule) => rule.id), ['o1']);
  assert.ok(isManagedRule(orphan));
});

test('planRuleChanges flags the Free-plan rule limit', () => {
  const many = Array.from({ length: FREE_PLAN_RULE_LIMIT - 1 }, (_, index) => ({ id: `x${index}`, description: `owner ${index}`, expression: 'true', action: 'set_cache_settings', action_parameters: { cache: true } }));
  const plan = planRuleChanges(many, desired);
  assert.equal(plan.create.length, 2);
  assert.equal(plan.resultingCount, FREE_PLAN_RULE_LIMIT + 1);
  assert.equal(plan.overLimit, true);
});

test('permission errors are recognised by status or Cloudflare error code', () => {
  assert.equal(isPermissionError(403, { success: false, errors: [{ code: 10000, message: 'Authentication error' }] }), true);
  assert.equal(isPermissionError(401, null), true);
  assert.equal(isPermissionError(400, { errors: [{ code: 9109, message: 'Unauthorized to access requested resource' }] }), true);
  assert.equal(isPermissionError(400, { errors: [{ code: 20217, message: 'invalid expression' }] }), false);
  assert.equal(isPermissionError(200, { success: true }), false);
  assert.equal(describeCloudflareErrors(403, { errors: [{ code: 10000, message: 'Authentication error' }] }), 'HTTP 403 (10000: Authentication error)');
});

test('dashboard instructions name the token permissions and both rules', () => {
  const text = dashboardInstructions(desired);
  assert.match(text, /Zone > Cache Rules > Edit/);
  assert.match(text, /Zone > Zone Settings > Edit/);
  assert.match(text, /Smart Tiered Cache/);
  for (const rule of desired) {
    assert.ok(text.includes(rule.expression), 'expression must be pasteable');
  }
  assert.match(text, /30 day\(s\)/);
  assert.match(text, /7 day\(s\)/);
});
