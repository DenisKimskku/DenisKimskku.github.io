import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  STUB_MARKER,
  buildRedirectPlan,
  createOutProbe,
  expandPatternRules,
  normalizeSitePath,
  renderStub,
  stubFileFor,
  writeStubs,
} from '../scripts/generate-redirects.mjs';

// A probe over an in-memory set of live pages; no built out/ required.
function memoryProbe(livePages) {
  const live = new Set(livePages.map(normalizeSitePath));
  return {
    isRealPage: (p) => live.has(normalizeSitePath(p)),
    exists: (p) => live.has(normalizeSitePath(p)),
  };
}

test('normalizeSitePath adds a trailing slash to directory routes and keeps file paths', () => {
  assert.equal(normalizeSitePath('/writing/foo'), '/writing/foo/');
  assert.equal(normalizeSitePath('/writing/foo/'), '/writing/foo/');
  assert.equal(normalizeSitePath('/writing/foo?x=1#y'), '/writing/foo/');
  assert.equal(normalizeSitePath('/writing//foo'), '/writing/foo/');
  assert.equal(normalizeSitePath('/writing/articles/Old.html'), '/writing/articles/Old.html');
  assert.throws(() => normalizeSitePath('writing/foo'), /must start with/);
});

test('stubFileFor maps directory routes to index.html and file routes to themselves', () => {
  assert.equal(stubFileFor('/writing/tag/rag/'), 'writing/tag/rag/index.html');
  assert.equal(stubFileFor('/writing/tag/rag'), 'writing/tag/rag/index.html');
  assert.equal(stubFileFor('/writing/markdown-viewer.html'), 'writing/markdown-viewer.html');
});

test('expandPatternRules substitutes :slug from the named slug source', () => {
  const rules = [{ from: '/news/:slug/', to: '/writing/:slug/', slugs: 'articles' }];
  const expanded = expandPatternRules(rules, { articles: ['a', 'b'] });
  assert.deepEqual(expanded.map(({ from, to }) => [from, to]), [
    ['/news/a/', '/writing/a/'],
    ['/news/b/', '/writing/b/'],
  ]);
  assert.throws(() => expandPatternRules(rules, {}), /unknown slug source/);
  assert.throws(() => expandPatternRules([{ from: '/news/', to: '/writing/:slug/', slugs: 'articles' }], { articles: [] }), /:slug/);
});

test('buildRedirectPlan emits stubs only for targets that exist', () => {
  const config = {
    redirects: {
      '/writing/tag/rag/': '/writing/tag/rag-security/',
      '/writing/tag/graphrag/': '/writing/tag/rag-security',
    },
    patternRules: [{ from: '/news/:slug/', to: '/writing/:slug/', slugs: 'articles' }],
  };
  const probe = memoryProbe(['/writing/tag/rag-security/', '/writing/one/', '/writing/two/']);
  const plan = buildRedirectPlan({ config, slugSources: { articles: ['one', 'two'] }, probe });
  assert.deepEqual(plan.errors, []);
  assert.deepEqual(plan.skipped, []);
  assert.deepEqual(plan.stubs.map((s) => [s.from, s.to, s.file]), [
    ['/news/one/', '/writing/one/', 'news/one/index.html'],
    ['/news/two/', '/writing/two/', 'news/two/index.html'],
    ['/writing/tag/graphrag/', '/writing/tag/rag-security/', 'writing/tag/graphrag/index.html'],
    ['/writing/tag/rag/', '/writing/tag/rag-security/', 'writing/tag/rag/index.html'],
  ]);
});

test('buildRedirectPlan fails loudly when a target does not exist', () => {
  const config = { redirects: { '/old/': '/gone/' } };
  const plan = buildRedirectPlan({ config, probe: memoryProbe(['/']) });
  assert.equal(plan.stubs.length, 0);
  assert.match(plan.errors[0], /\/old\/ -> \/gone\/: target does not exist/);
});

test('buildRedirectPlan never overwrites a live page', () => {
  const config = { redirects: { '/writing/tag/privacy/': '/writing/tag/llm-security/' } };
  const probe = memoryProbe(['/writing/tag/privacy/', '/writing/tag/llm-security/']);
  const plan = buildRedirectPlan({ config, probe });
  assert.deepEqual(plan.errors, []);
  assert.equal(plan.stubs.length, 0);
  assert.equal(plan.skipped[0].from, '/writing/tag/privacy/');
});

test('buildRedirectPlan rejects chains, self-redirects and conflicting duplicates', () => {
  const probe = memoryProbe(['/c/']);
  const chain = buildRedirectPlan({ config: { redirects: { '/a/': '/b/', '/b/': '/c/' } }, probe });
  assert.ok(chain.errors.some((e) => /would chain/.test(e)), chain.errors.join('\n'));

  const self = buildRedirectPlan({ config: { redirects: { '/c': '/c/' } }, probe });
  assert.match(self.errors[0], /redirects to itself/);

  const dup = buildRedirectPlan({
    config: {
      redirects: { '/x/': '/c/' },
      patternRules: [{ from: '/:slug/', to: '/d/:slug/', slugs: 'articles' }],
    },
    slugSources: { articles: ['x'] },
    probe: memoryProbe(['/c/', '/d/x/']),
  });
  assert.ok(dup.errors.some((e) => /mapped to both/.test(e)), dup.errors.join('\n'));
});

test('renderStub is an instant meta refresh with canonical, JS fallback and visible link, no noindex', () => {
  const html = renderStub('/writing/tag/rag/', '/writing/tag/rag-security/');
  assert.ok(html.includes(STUB_MARKER));
  assert.ok(html.includes('<meta http-equiv="refresh" content="0; url=https://deniskim1.com/writing/tag/rag-security/">'));
  assert.ok(html.includes('<link rel="canonical" href="https://deniskim1.com/writing/tag/rag-security/">'));
  assert.ok(html.includes('location.replace("https://deniskim1.com/writing/tag/rag-security/")'));
  assert.ok(html.includes('<a href="https://deniskim1.com/writing/tag/rag-security/">'));
  assert.ok(!/noindex/i.test(html));
});

test('writeStubs + createOutProbe: stubs are re-writable, real pages are not', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'redirects-'));
  try {
    fs.mkdirSync(path.join(dir, 'writing', 'tag', 'rag-security'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'writing', 'tag', 'rag-security', 'index.html'), '<html>real</html>');
    const probe = createOutProbe(dir);
    const config = { redirects: { '/writing/tag/rag/': '/writing/tag/rag-security/', '/writing/old.html': '/writing/tag/rag-security/' } };

    const first = buildRedirectPlan({ config, probe });
    assert.deepEqual(first.errors, []);
    assert.equal(first.stubs.length, 2);
    writeStubs(dir, first.stubs);
    assert.ok(fs.existsSync(path.join(dir, 'writing', 'tag', 'rag', 'index.html')));
    assert.ok(fs.existsSync(path.join(dir, 'writing', 'old.html')));

    // Second run: our own stubs are not "live pages", so the plan is unchanged.
    const second = buildRedirectPlan({ config, probe });
    assert.deepEqual(second.errors, []);
    assert.equal(second.stubs.length, 2);
    assert.equal(second.skipped.length, 0);

    // A source that is a real page is skipped, and a stub is never a valid target.
    const third = buildRedirectPlan({
      config: { redirects: { '/writing/tag/rag-security/': '/writing/tag/rag/' } },
      probe,
    });
    assert.equal(third.stubs.length, 0);
    assert.equal(third.skipped.length, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the committed redirects.json is well-formed and free of self/chain entries', () => {
  const config = JSON.parse(fs.readFileSync(new URL('../src/data/redirects.json', import.meta.url), 'utf8'));
  const targets = new Set(Object.values(config.redirects));
  const probe = memoryProbe([...targets]);
  const plan = buildRedirectPlan({ config: { redirects: config.redirects }, probe });
  assert.deepEqual(plan.errors, []);
  assert.equal(plan.stubs.length, Object.keys(config.redirects).length);
  for (const to of targets) assert.ok(to.endsWith('/'), `target lacks trailing slash: ${to}`);
  for (const rule of config.patternRules) assert.equal(rule.slugs, 'articles');
});
