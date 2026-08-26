import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classify,
  botHostileRedirector,
  isBotHostileRedirector,
} from '../scripts/check-external-links.mjs';

// Importing the module must not kick off main() (which would scan the article
// corpus and hit the network from inside the test runner). The guard compares
// process.argv[1] against the module path; under `node --test` argv[1] is the
// test file, so the import above is the assertion — if it ever started
// fetching, this suite would hang or leak handles.

// Real shape of what the digest generator emits: base64-ish payload + query.
const REDIRECTOR =
  'https://news.google.com/rss/articles/CBMiWkFVX3lxTE1abGtqU0ZqQ0Q?oc=5';

test('Google News redirector with 400 is a warning, not a failure', () => {
  const r = classify(REDIRECTOR, 400);
  assert.equal(r.ok, false);
  assert.equal(r.warning, true);
  assert.equal(r.failure, false);
  assert.equal(r.url, REDIRECTOR);
  assert.equal(r.detail, 'HTTP 400 (Google News redirector; answers 4xx to non-browser clients)');
});

test('Google News redirector with 404 / 500 is still only a warning', () => {
  for (const status of [404, 410, 500, 503]) {
    const r = classify(REDIRECTOR, status);
    assert.equal(r.warning, true, `status ${status} should warn`);
    assert.equal(r.failure, false, `status ${status} must not fail`);
    assert.match(r.detail, new RegExp(`^HTTP ${status} \\(Google News redirector`));
  }
});

test('Google News redirector with 200 is ok', () => {
  const r = classify(REDIRECTOR, 200);
  assert.deepEqual(r, {
    url: REDIRECTOR,
    ok: true,
    warning: false,
    failure: false,
    detail: 'HTTP 200',
  });
});

test('non-Google 400 is a failure (unchanged)', () => {
  const url = 'https://example.org/some/page';
  const r = classify(url, 400);
  assert.deepEqual(r, { url, ok: false, warning: false, failure: true, detail: 'HTTP 400' });
  const r404 = classify('https://arxiv.org/abs/0000.00000', 404);
  assert.equal(r404.failure, true);
  assert.equal(r404.detail, 'HTTP 404');
});

test('403 / 429 anywhere stay warnings (unchanged behavior)', () => {
  for (const status of [403, 429]) {
    const r = classify('https://arxiv.org/abs/2401.00001', status);
    assert.equal(r.ok, false);
    assert.equal(r.warning, true);
    assert.equal(r.failure, false);
    assert.equal(r.detail, `HTTP ${status} (likely bot-blocking)`);
  }
});

test('403 on the redirector is a warning with the more specific reason', () => {
  const r = classify(REDIRECTOR, 403);
  assert.equal(r.warning, true);
  assert.equal(r.failure, false);
  assert.match(r.detail, /^HTTP 403 \(Google News redirector/);
});

test('2xx / 3xx elsewhere are ok', () => {
  assert.equal(classify('https://example.org/', 200).ok, true);
  assert.equal(classify('https://example.org/', 204).ok, true);
  // fetch follows redirects, but a terminal 3xx (e.g. loop cut short) is still not >= 400.
  assert.equal(classify('https://example.org/', 301).ok, true);
});

// Deliberate choice: only the exact /rss/articles/ path prefix is the
// bot-hostile redirector. Other news.google.com URLs (topic pages, /articles/
// without /rss/, the homepage) keep ordinary failure semantics so a genuinely
// dead Google News link still gets reported.
test('news.google.com outside /rss/articles/ keeps failure semantics', () => {
  for (const url of [
    'https://news.google.com/articles/CBMiWkFVX3lxTE1abGtqU0ZqQ0Q?oc=5',
    'https://news.google.com/rss',
    'https://news.google.com/rss/search?q=ai+security',
    'https://news.google.com/',
    'https://news.google.com/rssarticles/x',
  ]) {
    assert.equal(isBotHostileRedirector(url), false, url);
    const r = classify(url, 400);
    assert.equal(r.failure, true, `${url} should fail on 400`);
    assert.equal(r.warning, false, `${url} should not warn on 400`);
    assert.equal(r.detail, 'HTTP 400');
  }
});

test('redirector match is host-exact and path-prefixed', () => {
  assert.equal(botHostileRedirector(REDIRECTOR), 'Google News redirector');
  assert.equal(isBotHostileRedirector(REDIRECTOR), true);
  // Hostname is case-insensitive per URL parsing.
  assert.equal(isBotHostileRedirector('https://NEWS.GOOGLE.COM/rss/articles/abc'), true);
  // http scheme still matches (it is the same redirector).
  assert.equal(isBotHostileRedirector('http://news.google.com/rss/articles/abc'), true);
  // Accepts a pre-parsed URL object as well as a string.
  assert.equal(isBotHostileRedirector(new URL(REDIRECTOR)), true);
  // Subdomains / lookalikes / other hosts with the same path are not matched.
  assert.equal(isBotHostileRedirector('https://evil.news.google.com/rss/articles/abc'), false);
  assert.equal(isBotHostileRedirector('https://news.google.com.evil.example/rss/articles/abc'), false);
  assert.equal(isBotHostileRedirector('https://news.yahoo.com/rss/articles/abc'), false);
  assert.equal(isBotHostileRedirector('https://google.com/rss/articles/abc'), false);
});

test('unparseable input is not a redirector and classifies by status alone', () => {
  assert.equal(botHostileRedirector('not a url'), null);
  assert.equal(isBotHostileRedirector(''), false);
  assert.equal(classify('not a url', 400).failure, true);
  assert.equal(classify('not a url', 403).warning, true);
  assert.equal(classify('not a url', 200).ok, true);
});
