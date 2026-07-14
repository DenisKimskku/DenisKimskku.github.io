#!/usr/bin/env node
// Credit-free content linter: blocks the build on machine-certain fabrications.
// (1) placeholder/fake CVE IDs, (2) dead internal /writing/<slug> links. Deterministic, no network.
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const ARTDIR = path.join(process.cwd(), 'src', 'content', 'articles');
const files = fs.readdirSync(ARTDIR).filter((f) => f.endsWith('.md'));
const validSlugs = new Set(files.map((f) => f.replace(/\.md$/, '')));

const PLACEHOLDER = new Set(['1234', '12345', '123456', '0000', '00000', '0001', '1111', '11111', '9999']);
const CVE = /CVE-\d{4}-(\d{4,7})/gi;
const LINK = /\/writing\/([a-z0-9_-]+)/gi;

const problems = [];
for (const f of files) {
  const text = fs.readFileSync(path.join(ARTDIR, f), 'utf8');
  let yamlError = null;
  try {
    matter(text);
  } catch (err) {
    // Broken frontmatter would otherwise be silently dropped by the article
    // loader (src/lib/markdown.ts catches parse errors and returns null).
    yamlError = String(err.message).split('\n')[0];
  }
  const ph = new Set();
  for (const m of text.matchAll(CVE)) if (PLACEHOLDER.has(m[1])) ph.add(m[0]);
  const dead = new Set();
  for (const m of text.matchAll(LINK)) {
    const tgt = m[1];
    if (tgt === 'archive' || tgt === 'tag') continue;
    if (!validSlugs.has(tgt)) dead.add(tgt);
  }
  if (ph.size || dead.size || yamlError) problems.push({ slug: f.replace(/\.md$/, ''), ph: [...ph], dead: [...dead], yamlError });
}

if (problems.length) {
  console.error('✗ Content lint FAILED:\n');
  for (const p of problems) {
    if (p.ph.length) console.error(`  ${p.slug}: placeholder CVE(s) ${p.ph.join(', ')}`);
    if (p.dead.length) console.error(`  ${p.slug}: dead internal link(s) ${p.dead.map((d) => '/writing/' + d).join(', ')}`);
    if (p.yamlError) console.error(`  ${p.slug}: unparseable frontmatter — ${p.yamlError} (run \`npm run generate:index\` to auto-repair)`);
  }
  console.error('\nRemove these before building. (scripts/lint-content.mjs)');
  process.exit(1);
}
console.log(`✓ Content lint passed (${files.length} articles; valid frontmatter, no placeholder CVEs or dead internal links).`);
