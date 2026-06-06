#!/usr/bin/env node
// Credit-free content linter: blocks the build on machine-certain fabrications.
// (1) placeholder/fake CVE IDs, (2) dead internal /writing/<slug> links. Deterministic, no network.
import fs from 'node:fs';
import path from 'node:path';

const ARTDIR = path.join(process.cwd(), 'src', 'content', 'articles');
const files = fs.readdirSync(ARTDIR).filter((f) => f.endsWith('.md'));
const validSlugs = new Set(files.map((f) => f.replace(/\.md$/, '')));

const PLACEHOLDER = new Set(['1234', '12345', '123456', '0000', '00000', '0001', '1111', '11111', '9999']);
const CVE = /CVE-\d{4}-(\d{4,7})/gi;
const LINK = /\/writing\/([a-z0-9_-]+)/gi;

const problems = [];
for (const f of files) {
  const text = fs.readFileSync(path.join(ARTDIR, f), 'utf8');
  const ph = new Set();
  for (const m of text.matchAll(CVE)) if (PLACEHOLDER.has(m[1])) ph.add(m[0]);
  const dead = new Set();
  for (const m of text.matchAll(LINK)) {
    const tgt = m[1];
    if (tgt === 'archive' || tgt === 'tag') continue;
    if (!validSlugs.has(tgt)) dead.add(tgt);
  }
  if (ph.size || dead.size) problems.push({ slug: f.replace(/\.md$/, ''), ph: [...ph], dead: [...dead] });
}

if (problems.length) {
  console.error('✗ Content lint FAILED — fabricated/placeholder content detected:\n');
  for (const p of problems) {
    if (p.ph.length) console.error(`  ${p.slug}: placeholder CVE(s) ${p.ph.join(', ')}`);
    if (p.dead.length) console.error(`  ${p.slug}: dead internal link(s) ${p.dead.map((d) => '/writing/' + d).join(', ')}`);
  }
  console.error('\nRemove these before building. (scripts/lint-content.mjs)');
  process.exit(1);
}
console.log(`✓ Content lint passed (${files.length} articles; no placeholder CVEs or dead internal links).`);
