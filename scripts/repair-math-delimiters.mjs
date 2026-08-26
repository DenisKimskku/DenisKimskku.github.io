// The external article generator sometimes escapes the OPENING `$` of a LaTeX
// span but leaves the closing one live: `\$336 \times 336$` instead of
// `$336 \times 336$`, or `\$10.34 \text{ ms}$`. The orphaned closer then pairs
// with the next `$` in the same paragraph and remark-math renders the prose
// between them as an equation -- or the raw LaTeX ships visibly to readers.
// Nothing fails: the markup is valid, it just means something absurd.
//
// ~250 instances were fixed by hand with one rule; a fresh one appeared two
// days later. This script applies that rule (and two narrow siblings) in
// place, gated by the detector in lib/math-delimiters.mjs: a unit's repair is
// kept ONLY if the detector's finding count for that unit strictly drops and
// no new finding kind appears. Anything the detector cannot vouch for is left
// exactly as it was. Frontmatter and fenced code are never touched, and each
// file's line endings are preserved byte-for-byte (Windows checkout,
// core.autocrlf=true -- see lib/frontmatter-escapes.mjs for the history).
//
//   node scripts/repair-math-delimiters.mjs            rewrite in place
//   node scripts/repair-math-delimiters.mjs --check    no writes; exit 1 if any file would change
//   node scripts/repair-math-delimiters.mjs --dry-run  no writes; always exit 0

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findBrokenMathDelimiters } from './lib/math-delimiters.mjs';

// Same signature the detector uses to tell a LaTeX payload from a price
// (`\%` included: `\$95.5\%$` shipped mis-rendered for months because a
// signature without it saw no LaTeX there).
const LATEX = /\\[a-zA-Z%]+|[\^_{}]/;
// A bare number -- or a plain arithmetic expression such as
// `694 / 149 / 149` -- closed by a live `$` (`\$768$`, `\$0.7528$`,
// `\$694 / 149 / 149$`) is the same escaped-opener defect with no control
// sequence to give it away; a price is never immediately followed by a math
// delimiter. Letters are excluded so `\$5 and $9` (two prices) never matches.
const NUMERIC_CLOSED = /^[\d.,\s/+\-*×]*\d[\d.,\s/+\-*×]*$/;
// R4: both delimiters escaped -- `\$Y = F(X; \theta)\$`, `\$62\times\$`,
// `\$X\$`. The math never renders. Payload must be LaTeX (or a lone
// identifier letter), short, and not read like a sentence.
const FULLY_ESCAPED = /\\\$((?:(?!\\\$)[^$\n])+?)\\\$/g;
const SENTENCE_LIKE = /\.\s+[A-Z]/;
// R1 must be narrower than the detector, not equal to it: the detector's
// mixed-escaping rule is a heuristic and has false positives (a real price
// followed by a markdown-escaped `gpt\_4` in prose, then a lone `$9` that
// remark-math leaves literal). Unescaping there would turn correctly
// rendering prose into a KaTeX span AND silence the detector, so the guard
// below cannot catch it. The intended shapes -- `10.34 \text{ ms}`,
// `0.5\text{K}`, `336 \times 336`, `0.930 \pm 0.021` -- are numbers, units
// and control sequences only. So after stripping `\text{...}`-style wrappers
// and `\command` tokens, an R1 payload must contain no word runs and no
// sentence punctuation; anything else reads as prose and is left alone.
const TEXTISH = /\\(?:text|mathrm|mbox|textbf|textit|textrm|operatorname)\s*\{[^{}]*\}/g;
const COMMAND = /\\[a-zA-Z]+/g;
const WORD_RUN = /[a-zA-Z]{2,}/;
const SENTENCE_PUNCT = /[;:!?]/;
const NEXT_LIVE_DOLLAR = /(?<!\\)\$/;
const COMMAND_TOKEN_AT_END = /\\[a-zA-Z]+$/;
const FENCE = /^(```|~~~)/;
const FM_DELIM = /^---\s*$/;
const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_SEPARATOR = /^\s*\|?[\s:|-]+\|?\s*$/;
const EXCERPT_BEFORE = 30;
const EXCERPT_AFTER = 50;

// Inline code may carry stray dollars (`$PATH`). The detector strips code
// spans outright; here they are masked to same-length whitespace so every
// index computed on the masked text maps 1:1 onto the original.
function maskCodeSpans(line) {
  return line.replace(/`[^`\n]*`/g, (m) => ' '.repeat(m.length));
}

// R1 / R2 on one inline unit (a paragraph or a table cell). Returns the
// indices of the backslashes to delete, in ascending order.
function inlineEdits(unit) {
  const edits = [];
  // R4 first: `\$...\$` spans with no live `$` inside. Both backslashes go.
  // These units have no live `$` at all in practice, so the R1/R2 walk
  // below (which tracks live delimiters) sees nothing to do afterwards.
  const r4 = new Set();
  for (const m of unit.matchAll(FULLY_ESCAPED)) {
    const payload = m[1];
    const isLatex = LATEX.test(payload) || /^[A-Za-z]$/.test(payload);
    if (!isLatex || payload.length > 160 || SENTENCE_LIKE.test(payload)) continue;
    r4.add(m.index);
    r4.add(m.index + m[0].length - 2);
  }
  for (const idx of [...r4].sort((a, b) => a - b)) edits.push({ index: idx, rule: 'R4' });

  let open = false; // inside `$...$` with no closer seen yet
  for (let i = 0; i < unit.length; i++) {
    if (unit[i] !== '$') continue;
    const escaped = i > 0 && unit[i - 1] === '\\';
    if (escaped && r4.has(i - 1)) continue; // already handled by R4
    if (!escaped) {
      open = !open;
      continue;
    }
    if (!open) {
      // R1 (escaped opener): the payload up to the next LIVE `$` in this unit
      // is LaTeX -- a control sequence, ^ _ { }, or a bare number closed by
      // that `$` -- so this `\$` was never currency. A bare `\$25M` with no
      // later live `$` has no closer and is left alone.
      const rest = unit.slice(i + 1);
      const rel = rest.search(NEXT_LIVE_DOLLAR);
      if (rel === -1) continue;
      const payload = rest.slice(0, rel);
      if (!LATEX.test(payload) && !NUMERIC_CLOSED.test(payload)) continue;
      const residue = payload.replace(TEXTISH, '').replace(COMMAND, '');
      if (WORD_RUN.test(residue) || SENTENCE_PUNCT.test(residue)) continue;
      edits.push({ index: i - 1, rule: 'R1' });
      open = true;
    } else if (COMMAND_TOKEN_AT_END.test(unit.slice(0, i - 1))) {
      // R2 (escaped closer): `$\sim\$139ms` -> `$\sim$139ms`. Only a `\$`
      // fused to a LaTeX command token counts; `$x = \$5$` is left alone.
      edits.push({ index: i - 1, rule: 'R2' });
      open = false;
    }
  }
  // deleteAt() and the excerpt bookkeeping assume ascending indices; R4 and
  // R1/R2 edits were collected in separate passes.
  return edits.sort((a, b) => a.index - b.index);
}

// R3 on one display-math line: strip the single backslash fused to a `$$`
// fence at the start (`\$$ ... $$`) or the end (`... \$$`) of the line.
function displayEdits(line) {
  const edits = [];
  const lead = line.match(/^\s*\\(?=\$\$)/);
  if (lead) edits.push({ index: lead[0].length - 1, rule: 'R3' });
  const trail = line.match(/(?<!\\)\\(?=\$\$\s*$)/);
  if (trail && !(lead && trail.index === lead[0].length - 1)) edits.push({ index: trail.index, rule: 'R3' });
  return edits;
}

function deleteAt(text, indices) {
  let out = '';
  let prev = 0;
  for (const i of indices) {
    out += text.slice(prev, i);
    prev = i + 1;
  }
  return out + text.slice(prev);
}

// The safety guard: the detector must see strictly fewer findings on the
// repaired unit and no kind it did not already report.
function guardPasses(before, after) {
  const was = findBrokenMathDelimiters(before);
  const now = findBrokenMathDelimiters(after);
  if (now.length >= was.length) return false;
  const kinds = new Set(was.map((f) => f.kind));
  return now.every((f) => kinds.has(f.kind));
}

function excerpt(text, at) {
  return text
    .slice(Math.max(0, at - EXCERPT_BEFORE), at + EXCERPT_AFTER)
    .replace(/\s+/g, ' ')
    .trim();
}

// Split the document into the units the detector judges (see
// proseParagraphs in lib/math-delimiters.mjs): paragraphs, table rows split
// per cell on unescaped `|`, fenced code and `$$` display blocks skipped.
// Each unit is an [start, end) range into `joined` (lines joined by '\n');
// display lines are their own units so R3 can look at them.
function segment(lines, masked) {
  const units = [];
  const offsets = [];
  let off = 0;
  for (const l of lines) {
    offsets.push(off);
    off += l.length + 1;
  }

  let start = 0;
  if (lines.length > 0 && FM_DELIM.test(lines[0].replace(/^\uFEFF/, ''))) {
    const close = lines.findIndex((l, i) => i > 0 && FM_DELIM.test(l));
    if (close === -1) return units; // unterminated frontmatter: nothing is body
    start = close + 1;
  }

  let block = [];
  const flush = () => {
    if (block.length === 0) return;
    const rows = block;
    block = [];
    const isTable = rows.some((i) => TABLE_ROW.test(masked[i]));
    if (!isTable) {
      units.push({ kind: 'inline', start: offsets[rows[0]], end: offsets[rows[rows.length - 1]] + lines[rows[rows.length - 1]].length });
      return;
    }
    for (const i of rows) {
      if (TABLE_SEPARATOR.test(masked[i])) continue;
      let cellStart = offsets[i];
      const row = masked[i];
      for (let j = 0; j <= row.length; j++) {
        if (j === row.length || (row[j] === '|' && !(j > 0 && row[j - 1] === '\\'))) {
          units.push({ kind: 'inline', start: cellStart, end: offsets[i] + j });
          cellStart = offsets[i] + j + 1;
        }
      }
    }
  };

  let inFence = false;
  let inDisplay = false;
  for (let i = start; i < lines.length; i++) {
    const t = lines[i].trim();
    if (FENCE.test(t)) {
      inFence = !inFence;
      flush();
      continue;
    }
    if (inFence) continue;
    if (t === '$$') {
      inDisplay = !inDisplay;
      flush();
      continue;
    }
    const line = { kind: 'display', start: offsets[i], end: offsets[i] + lines[i].length };
    if (inDisplay || /^\$\$.*\$\$$/.test(t) || /^\\\$\$.*\$\$$/.test(t)) {
      flush();
      units.push(line);
      continue;
    }
    if (masked[i].trim() === '') {
      flush();
      continue;
    }
    block.push(i);
  }
  flush();
  return units;
}

// Pure repair over a whole article file (frontmatter included). Returns
// { text, changed, repairs: [{ rule, before, after }] }. Frontmatter, fenced
// code, and every line ending pass through byte-identical.
export function repairMathDelimiters(text) {
  const parts = text.split(/(\r?\n)/);
  const lines = [];
  const eols = [];
  for (let i = 0; i < parts.length; i++) (i % 2 === 0 ? lines : eols).push(parts[i]);
  const masked = lines.map(maskCodeSpans);
  const joined = lines.join('\n');
  const maskedJoined = masked.join('\n');

  const deletions = [];
  const repairs = [];
  for (const u of segment(lines, masked)) {
    const orig = joined.slice(u.start, u.end);
    const view = maskedJoined.slice(u.start, u.end);
    const edits = u.kind === 'display' ? displayEdits(view) : inlineEdits(view);
    if (edits.length === 0) continue;
    const fixed = deleteAt(orig, edits.map((e) => e.index));
    if (!guardPasses(orig, fixed)) continue;
    edits.forEach((e, n) => {
      deletions.push(u.start + e.index);
      repairs.push({ rule: e.rule, before: excerpt(orig, e.index), after: excerpt(fixed, e.index - n) });
    });
  }
  if (deletions.length === 0) return { text, changed: false, repairs: [] };

  deletions.sort((a, b) => a - b);
  const repairedLines = deleteAt(joined, deletions).split('\n');
  let out = '';
  for (let i = 0; i < repairedLines.length; i++) out += repairedLines[i] + (eols[i] ?? '');
  return { text: out, changed: out !== text, repairs };
}

function main() {
  const args = process.argv.slice(2);
  const CHECK = args.includes('--check');
  const DRY_RUN = args.includes('--dry-run');
  const WRITE = !CHECK && !DRY_RUN;

  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  const ARTDIR = path.join(root, 'src', 'content', 'articles');
  const files = fs.readdirSync(ARTDIR).filter((f) => f.endsWith('.md'));

  let repaired = 0;
  for (const f of files) {
    const filePath = path.join(ARTDIR, f);
    const text = fs.readFileSync(filePath, 'utf8');
    const out = repairMathDelimiters(text);
    if (!out.changed) continue;
    repaired++;
    const byRule = {};
    for (const r of out.repairs) byRule[r.rule] = (byRule[r.rule] ?? 0) + 1;
    const tally = Object.entries(byRule)
      .map(([k, v]) => `${k} x${v}`)
      .join(', ');
    console.log(`${WRITE ? 'Repaired' : 'Would repair'} math delimiters in ${f} (${tally})`);
    for (const r of out.repairs) console.log(`  ${r.rule}: ${r.before}\n      -> ${r.after}`);
    if (WRITE) fs.writeFileSync(filePath, out.text, 'utf8');
  }

  if (repaired > 0) {
    console.log(
      WRITE
        ? `Successfully repaired math delimiters in ${repaired} article(s).`
        : `${repaired} article(s) would be repaired.`
    );
  } else {
    console.log('No math delimiter repair needed.');
  }
  if (CHECK && repaired > 0) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
