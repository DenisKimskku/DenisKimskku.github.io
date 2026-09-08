import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildPaths, fitToBudget } from '../scripts/warm-global.mjs';

test('global warm covers HTML, RSC payload and OG card of the newest posts, most valuable first', () => {
  const paths = buildPaths({ articles: ['a', 'b', 'c'], rscArticles: 2, ogArticles: 1 });
  assert.deepEqual(paths.slice(0, 4), ['/', '/writing/', '/index.txt', '/writing/index.txt']);
  assert.ok(paths.includes('/writing/a/'));
  assert.ok(paths.includes('/writing/a/index.txt'));
  assert.ok(paths.includes('/og/a.png'));
  assert.ok(paths.includes('/writing/b/index.txt'));
  assert.ok(!paths.includes('/writing/c/index.txt'), 'RSC only for the top rscArticles');
  assert.ok(!paths.includes('/og/b.png'), 'OG only for the top ogArticles');
  assert.ok(paths.indexOf('/writing/a/') < paths.indexOf('/writing/archive/'), 'archive is the least valuable page');
  assert.equal(new Set(paths).size, paths.length, 'no duplicates (each costs quota)');
});

test('fitToBudget never exceeds the anonymous Globalping quota of 250 tests/hour', () => {
  const paths = buildPaths({ articles: Array.from({ length: 30 }, (_, i) => `p${i}`), rscArticles: 30, ogArticles: 30 });
  const kept = fitToBudget(paths, 200, 10);
  assert.equal(kept.length, 20);
  assert.ok(kept.length * 10 <= 250);
  assert.deepEqual(kept.slice(0, 2), ['/', '/writing/']);
  assert.deepEqual(fitToBudget(paths, 5, 10), []);
});
