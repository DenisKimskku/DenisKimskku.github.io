#!/usr/bin/env node
// Backfill source attribution for machine-written "Paper Review" articles that
// are missing a `paperUrl`. For each such article we query the arXiv API by
// title and, ONLY on a high-confidence title match, write `paperUrl` and
// `paperAuthors` into the frontmatter (surgically — every other field and the
// file's exact formatting are preserved). A wrong paperUrl is a NEW integrity
// bug, so anything short of a near-identical title is quarantined and reported
// rather than written.
//
// Usage:
//   node scripts/backfill-paper-attribution.mjs            # dry-run (default)
//   node scripts/backfill-paper-attribution.mjs --dry-run  # explicit dry-run
//   node scripts/backfill-paper-attribution.mjs --write    # apply changes
//   node scripts/backfill-paper-attribution.mjs --limit=5  # cap articles processed
//
// Pure Node (global fetch, no new deps). Sequential + polite delay; per-article
// try/catch so a single timeout or parse failure never aborts the whole run.
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const WRITE = process.argv.includes('--write'); // default (and --dry-run) = report only
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? Math.max(0, parseInt(limitArg.slice('--limit='.length), 10) || 0) : Infinity;

const ARTDIR = path.join(process.cwd(), 'src', 'content', 'articles');

// Near-identical is the bar: normalized exact match, robust whole-title
// containment, or >=0.85 significant-word overlap. Below this → quarantine.
const CONFIDENCE_THRESHOLD = 0.85;
const REQUEST_TIMEOUT_MS = 15000;
const POLITE_DELAY_MS = 3000; // arXiv asks for no more than ~1 request / 3s

// --- Title normalization / matching (mirrors scripts/lint-content.mjs) -------
const TITLE_STOPWORDS = new Set([
  'a', 'an', 'the', 'of', 'in', 'on', 'at', 'to', 'for', 'and', 'or', 'but', 'not', 'all',
  'with', 'via', 'from', 'into', 'over', 'under', 'across', 'against', 'between', 'about',
  'based', 'using', 'toward', 'towards', 'is', 'are', 'can', 'its', 'their', 'you', 'your',
  'how', 'what', 'when', 'why', 'do', 'does', 'if', 'me',
]);
const normalizeTitle = (t) => String(t ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const significantWords = (normalized) => [...new Set(normalized.split(' ').filter((w) => w.length >= 3 && !TITLE_STOPWORDS.has(w)))];
const wordsAlike = (a, b) => {
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 4 && long.startsWith(short); // leak/leakage, language/languages
};

// Returns { score, exact, minWords }. Acceptance also requires a length guard
// (see isConfident) so a 2-word title cannot coincidentally clear 0.85.
function scoreTitles(articleTitle, resultTitle) {
  const na = normalizeTitle(articleTitle);
  const nb = normalizeTitle(resultTitle);
  if (!na || !nb) return { score: 0, exact: false, minWords: 0 };
  const wa = significantWords(na);
  const wb = significantWords(nb);
  if (!wa.length || !wb.length) return { score: 0, exact: false, minWords: 0 };
  const minWords = Math.min(wa.length, wb.length);
  if (na === nb) return { score: 1, exact: true, minWords };
  const [small, big] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
  const matched = small.filter((w) => big.some((v) => wordsAlike(w, v))).length;
  let score = matched / small.length;
  // Whole-title containment (formal title carries an extra subtitle) — only
  // when the shorter title is long enough that containment can't be chance.
  if (minWords >= 4 && (na.includes(nb) || nb.includes(na))) score = Math.max(score, 1);
  return { score, exact: false, minWords };
}
const isConfident = ({ score, exact, minWords }) => score >= CONFIDENCE_THRESHOLD && (exact || minWords >= 4);

// --- arXiv Atom parsing ------------------------------------------------------
function decodeEntities(s) {
  return String(s)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&'); // last: never double-decode
}
const collapseWs = (s) => String(s).replace(/\s+/g, ' ').trim();

// Parse the <entry> elements only — the feed carries a top-level <title> (the
// echoed query) that must never be treated as a result.
function parseEntries(xml) {
  const entries = [];
  for (const m of xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/g)) {
    const block = m[1];
    const titleMatch = block.match(/<title\b[^>]*>([\s\S]*?)<\/title>/);
    const title = titleMatch ? collapseWs(decodeEntities(titleMatch[1])) : '';
    const idMatch = block.match(/<id\b[^>]*>([\s\S]*?)<\/id>/);
    const rawId = idMatch ? collapseWs(decodeEntities(idMatch[1])) : '';
    const authors = [];
    for (const a of block.matchAll(/<author\b[^>]*>[\s\S]*?<name\b[^>]*>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g)) {
      const name = collapseWs(decodeEntities(a[1]));
      if (name) authors.push(name);
    }
    entries.push({ title, rawId, authors });
  }
  return entries;
}

// arXiv <id> is like http://arxiv.org/abs/2601.12345v2 → https abs URL, no version.
function absUrlFromId(rawId) {
  const m = String(rawId).match(/arxiv\.org\/abs\/(.+)$/i);
  if (!m) return null;
  const id = m[1].replace(/v\d+$/i, '');
  return `https://arxiv.org/abs/${id}`;
}

// Match the corpus convention: first three authors, "et al." when more remain.
function formatAuthors(authors) {
  if (!authors.length) return '';
  return authors.length > 3 ? `${authors.slice(0, 3).join(', ')}, et al.` : authors.join(', ');
}

async function queryArxiv(title) {
  // ti:"..." scopes the search to the title field; quotes keep it phrase-ish.
  const q = `ti:"${title.replace(/"/g, ' ')}"`;
  const url = `http://export.arxiv.org/api/query?search_query=${encodeURIComponent(q)}&max_results=5`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'deniskim1.com-backfill/1.0 (mailto:kor8821@gmail.com)' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return parseEntries(await res.text());
  } finally {
    clearTimeout(timer);
  }
}

// --- Surgical frontmatter write ---------------------------------------------
// Insert paperUrl + paperAuthors after the `type:` line (the corpus places
// them there), preserving the file's newline style and every other byte.
// YAML-safe values via JSON.stringify (escapes " and \ — the only escapes the
// content linter tolerates in quoted frontmatter).
function insertAttribution(raw, paperUrl, paperAuthors) {
  const m = raw.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
  if (!m) return null;
  const [, open, body, close] = m;
  const eol = open.includes('\r\n') ? '\r\n' : '\n';
  const lines = body.split(/\r?\n/);
  const typeIdx = lines.findIndex((l) => /^\s*type\s*:/.test(l));
  const indent = (typeIdx >= 0 ? lines[typeIdx].match(/^(\s*)/)[1] : '');
  const additions = [
    `${indent}paperUrl: ${JSON.stringify(paperUrl)}`,
    `${indent}paperAuthors: ${JSON.stringify(paperAuthors)}`,
  ];
  if (typeIdx >= 0) lines.splice(typeIdx + 1, 0, ...additions);
  else lines.push(...additions); // fallback: append before closing fence
  const newBody = lines.join(eol);
  return open + newBody + close + raw.slice(open.length + body.length + close.length);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Main --------------------------------------------------------------------
const files = fs.readdirSync(ARTDIR).filter((f) => f.endsWith('.md'));
const candidates = [];
for (const f of files) {
  const filePath = path.join(ARTDIR, f);
  let fm;
  try {
    fm = matter(fs.readFileSync(filePath, 'utf8'));
  } catch {
    continue; // broken frontmatter is the linter's problem, not ours
  }
  const d = fm.data;
  if (d.type !== 'Paper Review') continue;
  if (String(d.paperUrl ?? '').trim()) continue; // idempotent: already attributed
  const title = String(d.title ?? '').trim();
  if (!title) continue; // no title to search on
  candidates.push({ file: f, filePath, title });
}

console.log(`${WRITE ? 'WRITE' : 'DRY-RUN'} mode — ${candidates.length} "Paper Review" article(s) missing paperUrl${LIMIT !== Infinity ? ` (processing up to ${LIMIT})` : ''}.\n`);

const matched = [];   // confident matches (candidates for writing)
const written = [];   // successfully written (WRITE mode only)
const quarantined = []; // { file, title, reason, best }
let processed = 0;

for (const c of candidates) {
  if (processed >= LIMIT) break;
  if (processed > 0) await sleep(POLITE_DELAY_MS); // be polite to arXiv
  processed++;

  let entries;
  try {
    entries = await queryArxiv(c.title);
  } catch (err) {
    quarantined.push({ file: c.file, title: c.title, reason: `arXiv query failed (${err.name === 'AbortError' ? 'timeout' : err.message})` });
    console.log(`  ? ${c.file}\n      query failed: ${err.name === 'AbortError' ? 'timeout' : err.message}`);
    continue;
  }

  if (!entries.length) {
    quarantined.push({ file: c.file, title: c.title, reason: 'no arXiv results' });
    console.log(`  ? ${c.file}\n      no arXiv results for "${c.title}"`);
    continue;
  }

  // Best result across all five candidates.
  let best = null;
  for (const e of entries) {
    const s = scoreTitles(c.title, e.title);
    if (!best || s.score > best.s.score) best = { e, s };
  }

  if (!isConfident(best.s)) {
    quarantined.push({ file: c.file, title: c.title, reason: `best match ${best.s.score.toFixed(2)} below ${CONFIDENCE_THRESHOLD}`, best: best.e.title });
    console.log(`  ? ${c.file}\n      no confident match (best ${best.s.score.toFixed(2)}): "${best.e.title}"`);
    continue;
  }

  const paperUrl = absUrlFromId(best.e.rawId);
  const paperAuthors = formatAuthors(best.e.authors);
  if (!paperUrl) {
    quarantined.push({ file: c.file, title: c.title, reason: 'matched but arXiv id unparseable', best: best.e.title });
    console.log(`  ? ${c.file}\n      matched "${best.e.title}" but could not parse arXiv id (${best.e.rawId})`);
    continue;
  }

  matched.push({ file: c.file, title: c.title, paperUrl, paperAuthors, score: best.s.score });

  if (WRITE) {
    try {
      const raw = fs.readFileSync(c.filePath, 'utf8');
      const updated = insertAttribution(raw, paperUrl, paperAuthors);
      if (updated === null) {
        console.log(`  ! ${c.file}\n      matched but frontmatter block not found — skipped`);
        continue;
      }
      fs.writeFileSync(c.filePath, updated, 'utf8');
      written.push(c.file);
      console.log(`  ✓ ${c.file}\n      matched: "${best.e.title}" [${best.s.score.toFixed(2)}]\n      ${paperUrl} — ${paperAuthors || '(no authors listed)'}`);
    } catch (err) {
      console.log(`  ! ${c.file}\n      write failed: ${err.message}`);
    }
  } else {
    console.log(`  ✓ ${c.file}  (would write)\n      matched: "${best.e.title}" [${best.s.score.toFixed(2)}]\n      ${paperUrl} — ${paperAuthors || '(no authors listed)'}`);
  }
}

// --- Summary -----------------------------------------------------------------
console.log(`\n${'='.repeat(60)}`);
console.log(WRITE
  ? `Wrote: ${written.length}   Confident matches: ${matched.length}   Quarantined: ${quarantined.length}   (of ${processed} processed)`
  : `Would write: ${matched.length}   Quarantined: ${quarantined.length}   (of ${processed} processed)`);
if (quarantined.length) {
  console.log(`\nQuarantined (no confident match — NOT written):`);
  for (const q of quarantined) {
    console.log(`  - ${q.title}`);
    console.log(`      [${q.file}] ${q.reason}${q.best ? ` — closest: "${q.best}"` : ''}`);
  }
}
if (!WRITE && matched.length) {
  console.log(`\nRe-run with --write to apply the ${matched.length} confident match(es) above.`);
}
