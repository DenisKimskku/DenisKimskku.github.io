import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getIssueTopics, getSeoTitle, truncateForMeta } from '../src/lib/seo.ts';

test('getSeoTitle front-loads digest topics and shortens the date', () => {
  assert.equal(
    getSeoTitle({ title: 'AI Security Digest — September 08, 2026: Backdoors & AI Agents' }),
    'Backdoors & AI Agents — AI Security Digest, Sep 8, 2026',
  );
});

test('getSeoTitle handles topic-suffixed trend reports the same way', () => {
  assert.equal(
    getSeoTitle({ title: 'This Week in AI Security — July 19, 2026: Agent Memory Poisoning & Multi-Turn Jailbreaks' }),
    'Agent Memory Poisoning & Multi-Turn Jailbreaks — This Week in AI Security, Jul 19, 2026',
  );
});

test('getSeoTitle derives topics from the most specific tags when the title has none', () => {
  assert.equal(
    getSeoTitle({
      title: 'AI Security Digest — August 03, 2026',
      tags: ['LLM Security', 'Adversarial Attacks', 'Multi-Agent Systems', 'Neuromorphic Computing'],
    }),
    'Adversarial Attacks & Multi-Agent Systems — AI Security Digest, Aug 3, 2026',
  );
  // Generic tags are only used when nothing more specific exists.
  assert.equal(
    getSeoTitle({ title: 'This Week in AI Security — May 17, 2026', tags: ['AI Security'] }),
    'AI Security — This Week in AI Security, May 17, 2026',
  );
});

test('getSeoTitle falls back to the bare series title without topics or tags', () => {
  assert.equal(
    getSeoTitle({ title: 'AI Security Digest — July 30, 2026', tags: [] }),
    'AI Security Digest, Jul 30, 2026',
  );
});

test('getSeoTitle leaves hand-written titles untouched', () => {
  for (const title of [
    'AgentFuzz: Automatic Detection of Taint-Style Vulnerabilities in LLM-based Agents',
    'Rescuing the Unpoisoned: Efficient Defense against Knowledge Corruption Attacks on RAG Systems',
    'Digest — not a series',
  ]) {
    assert.equal(getSeoTitle({ title, tags: ['LLM Security'] }), title);
  }
});

test('getSeoTitle keeps the distinguishing part inside the first 60 characters', () => {
  const title = getSeoTitle({ title: 'AI Security Digest — September 05, 2026: Adversarial Attacks & AI Agents' });
  assert.ok(title.startsWith('Adversarial Attacks & AI Agents'));
  assert.ok(title.length <= 75, title);
});

test('truncateForMeta cuts at a word boundary and appends an ellipsis', () => {
  const long = 'word '.repeat(60).trim();
  const cut = truncateForMeta(long, 50);
  assert.ok(cut.length <= 50);
  assert.ok(cut.endsWith('…'));
  assert.equal(truncateForMeta('short', 50), 'short');
});

test('getIssueTopics returns the topics alone for series issues and the title otherwise', () => {
  assert.equal(
    getIssueTopics({ title: 'AI Security Digest — September 08, 2026: Backdoors & AI Agents' }),
    'Backdoors & AI Agents',
  );
  assert.equal(
    getIssueTopics({ title: 'This Week in AI Security — May 24, 2026: GraphRAG Poisoning & Multimodal Jailbreaks' }),
    'GraphRAG Poisoning & Multimodal Jailbreaks',
  );
  assert.equal(
    getIssueTopics({ title: 'AI Security Digest — July 30, 2026', tags: ['LLM Security', 'Adversarial ML', 'Privacy'] }),
    'Adversarial ML & Privacy',
  );
  // Nothing to derive from: fall back to the title rather than an empty label.
  assert.equal(getIssueTopics({ title: 'AI Security Digest — July 30, 2026' }), 'AI Security Digest — July 30, 2026');
  assert.equal(getIssueTopics({ title: 'Reinforcement Unlearning' }), 'Reinforcement Unlearning');
});
