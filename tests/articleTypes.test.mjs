import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NEWS_AND_TRENDS,
  getCategory,
  getCategoryLabel,
  getTypeMetaLabel,
  getCategories,
} from '../src/lib/articleTypes.ts';

test('getCategory merges News Digest and Trend Report into NEWS_AND_TRENDS', () => {
  assert.equal(getCategory('News Digest'), NEWS_AND_TRENDS);
  assert.equal(getCategory('Trend Report'), NEWS_AND_TRENDS);
});

test('getCategory passes every other type through unchanged', () => {
  for (const type of ['Paper Walkthrough', 'Research Paper', 'Paper Review', 'Tutorial', 'Project', 'Totally New Type']) {
    assert.equal(getCategory(type), type);
  }
});

test('getCategoryLabel returns configured labels for known categories', () => {
  assert.equal(getCategoryLabel(NEWS_AND_TRENDS), 'News & Trends');
  assert.equal(getCategoryLabel('Paper Walkthrough'), 'Walkthroughs');
  assert.equal(getCategoryLabel('Research Paper'), 'Research');
  assert.equal(getCategoryLabel('Paper Review'), 'Reviews');
  assert.equal(getCategoryLabel('Tutorial'), 'Tutorials');
  assert.equal(getCategoryLabel('Project'), 'Projects');
});

test('getCategoryLabel falls back to the category key itself when unknown', () => {
  assert.equal(getCategoryLabel('Field Notes'), 'Field Notes');
});

test('getTypeMetaLabel shows merged label for news/trend, raw type otherwise', () => {
  assert.equal(getTypeMetaLabel('News Digest'), NEWS_AND_TRENDS);
  assert.equal(getTypeMetaLabel('Trend Report'), NEWS_AND_TRENDS);
  assert.equal(getTypeMetaLabel('Paper Walkthrough'), 'Paper Walkthrough');
  assert.equal(getTypeMetaLabel('Research Paper'), 'Research Paper');
  assert.equal(getTypeMetaLabel('Paper Review'), 'Paper Review');
});

test('getCategories dedupes merged categories and sorts the result', () => {
  const categories = getCategories([
    'Tutorial',
    'News Digest',
    'Paper Review',
    'Trend Report',
    'News Digest',
    'Tutorial',
  ]);
  assert.deepEqual(categories, [NEWS_AND_TRENDS, 'Paper Review', 'Tutorial']);
});

test('getCategories on an empty list is an empty list', () => {
  assert.deepEqual(getCategories([]), []);
});
