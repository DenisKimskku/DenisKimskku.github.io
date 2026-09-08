import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeInternalHref } from '../scripts/lib/internal-links.mjs';

test('site-relative page links gain the trailing slash GitHub Pages serves directly', () => {
  assert.equal(normalizeInternalHref('/writing/some_slug'), '/writing/some_slug/');
  assert.equal(normalizeInternalHref('/writing/some_slug/'), '/writing/some_slug/');
  assert.equal(normalizeInternalHref('/writing/some_slug#section'), '/writing/some_slug/#section');
  assert.equal(normalizeInternalHref('/writing/some_slug?ref=x'), '/writing/some_slug/?ref=x');
  assert.equal(normalizeInternalHref('/calendar-plus-plus'), '/calendar-plus-plus/');
  assert.equal(normalizeInternalHref('/'), '/');
});

test('index.html suffixes and doubled slashes collapse to the directory URL', () => {
  assert.equal(normalizeInternalHref('/writing/index.html'), '/writing/');
  assert.equal(normalizeInternalHref('/writing//slug'), '/writing/slug/');
});

test('absolute URLs on any of the site hosts become site-relative canonical paths', () => {
  assert.equal(normalizeInternalHref('https://deniskim1.com/writing/slug'), '/writing/slug/');
  assert.equal(normalizeInternalHref('http://deniskim1.com/writing/slug/'), '/writing/slug/');
  assert.equal(normalizeInternalHref('https://www.deniskim1.com/papers'), '/papers/');
  assert.equal(normalizeInternalHref('https://deniskimskku.github.io/writing/'), '/writing/');
  assert.equal(normalizeInternalHref('https://DenisKim1.com'), '/');
  assert.equal(normalizeInternalHref('https://deniskim1.com/papers/kcc26/x.pdf'), '/papers/kcc26/x.pdf');
});

test('files, anchors, mail links, relative and external URLs are left alone', () => {
  for (const href of [
    '/resume.pdf',
    '/news/rss.xml',
    '/images/news/pic.jpg',
    '#toc',
    'mailto:x@example.com',
    'tel:+1',
    'https://arxiv.org/abs/2401.00001',
    'https://dz.deniskim1.com/',
    'other-page',
    '../up',
    '',
  ]) {
    assert.equal(normalizeInternalHref(href), href, href);
  }
  assert.equal(normalizeInternalHref(undefined), undefined);
});
