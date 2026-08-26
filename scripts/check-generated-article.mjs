#!/usr/bin/env node
// The executable contract for ONE generator-produced article.
//
// The external daily pipeline commits arXiv Paper Reviews, "AI Security
// Digest" posts and "This Week in AI Security" trend reports straight to main.
// Three read-only sweeps over all 322 of them AT THEIR ORIGINAL COMMIT (i.e.
// the generator's own output, before any repo-side repair) found the defects
// cited per rule below. The generator's author runs
//
//   node scripts/check-generated-article.mjs src/content/articles/<new>.md ...
//
// on every article BEFORE committing and fixes the generator until it prints
// nothing but "OK". Rules that an existing repo gate already enforces are
// delegated to that gate's module (scripts/lib/math-delimiters.mjs,
// scripts/lib/extract-frontmatter.mjs, scripts/lib/provenance.mjs,
// scripts/repair-dead-links.mjs); the rest live here because no repo gate
// enforces them today — the site silently degrades instead.
//
// Deterministic, no network, no dependencies beyond gray-matter and the
// repo's own scripts/lib modules.
//
// Usage: node scripts/check-generated-article.mjs <file>... [--json] [--warnings-as-errors]
//   one line per finding:  <file>:<line-or-fm>: <error|warn> <rule-id>: <message>
//   then a summary line; exit 1 if any error (or any warning with
//   --warnings-as-errors), exit 2 on usage, else 0. --json prints a JSON array.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { findBrokenMathDelimiters } from './lib/math-delimiters.mjs';
import { isTrivialDescription } from './lib/extract-frontmatter.mjs';
import { KNOWN_ARTICLE_TYPES, AUTOMATION_TYPES } from './lib/provenance.mjs';
import { MIN_PAYLOAD_LENGTH } from './repair-dead-links.mjs';

// ---------------------------------------------------------------------------
// Thresholds. Every number is taken from the evidence sweeps or from the repo
// module that already enforces the same limit — never guessed.
// ---------------------------------------------------------------------------
const SLUG_RE = /^[a-z0-9_]{1,60}\.md$/; // evidence: all 322 slugs lowercase [a-z0-9_], hard cut at 60 chars (223 exactly 60)
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MIN_DESCRIPTION_CHARS = 60; // isTrivialDescription() threshold in scripts/lib/extract-frontmatter.mjs
const MAX_DESCRIPTION_CHARS = 400; // scripts/lint-content.mjs MAX_DESCRIPTION_CHARS (exclusive)
const MAX_TAGS = 6; // inferTagsFromContent() maxTags default in scripts/lib/extract-frontmatter.mjs
const MAX_IMAGE_BYTES = 300 * 1024; // scripts/lint-content.mjs MAX_IMAGE_BYTES
const HEADER_IMAGE_EXT = /\.(jpg|png|webp)$/;
const KNOWN_KEYS = new Set(['title', 'date', 'type', 'description', 'tags', 'readingTime', 'headerImage', 'paperUrl', 'paperAuthors']);
// A backslash in a raw quoted scalar that is NOT one of the two escapes the
// site tolerates (`\\` and `\"`, per scripts/lib/frontmatter-escapes.mjs and the
// evidence's inventory RULE: "serialize it with a JSON encoder").
// Matches an odd run of backslashes whose last one is not followed by `\` or
// `"`, so the second half of a `\\` pair never trips it.
const UNTOLERATED_ESCAPE_RE = /(?<!\\)(?:\\\\)*\\(?![\\"])/;
// A markdown link whose URL never closes on the same line: `](https://…` or a
// bare `(https://…` running to end of line without a `)`.
const UNCLOSED_LINK_URL_RE = /(\]\(|\()\s*https?:\/\/[^\s)]*$/;

// Duplicated from scripts/lint-content.mjs (PLACEHOLDER, CVE, LINK, AUTHORSHIP,
// FAKE_STATS, EXPERIENTIAL_PERSONA). That file is a script with top-level side
// effects (it reads the whole corpus and calls process.exit), so it cannot be
// imported; keep these byte-identical to the source when either side changes.
const PLACEHOLDER_CVE_NUMBERS = new Set(['1234', '12345', '123456', '0000', '00000', '0001', '1111', '11111', '9999']);
const CVE_RE = /CVE-\d{4}-(\d{4,7})/gi;
const INTERNAL_LINK_RE = /\/writing\/([a-z0-9_-]+)/gi;
const AUTHORSHIP = [/\bmy work on\b/i, /\bI (?:previously )?proposed\b/i, /\bmy paper\b/i, /\bwe propose\b/i];
const FAKE_STATS = [/knowledge base of [0-9,]+ papers/i, /averaging [0-9.]+ citations/i];
const EXPERIENTIAL_PERSONA = [
  /in my experience/i,
  /as a practitioner/i,
  /when I (?:researched|tested|built|reproduced|ran)/i,
  /my analysis (?:of|on)/i,
  /what excites me/i,
  /I (?:personally )?(?:tested|ran|built|reproduced|verified)/i,
];

// Raw HTML is DROPPED by the renderer (remark-rehype without
// allowDangerousHtml, src/lib/markdown.ts): `| AUROC <br> TPR |` renders as
// "AUROC TPR" with the break silently gone.
const HTML_TAG_RE = /<\/?(br|div|span|p|table|img|a)(?=[\s>/])[^<>]*>?/i;

// Canonical news-item line (evidence, links sweep, CHECK of finding 2):
//   - **[<headline>](<url>)** (<publisher>) — <one-sentence summary>
// Link TEXT must be a headline, never a URL (the August variant printed the
// raw redirector as the text, producing 600-900 char lines).
const CANONICAL_NEWS_LINE_RE = /^- \*\*\[(?!https?:\/\/)[^\]\n]+\]\((https?:\/\/[^)\s]+)\)\*\* \([^)\n]+\) [—–-] .+$/;
const URL_AS_LINK_TEXT_RE = /\[https?:\/\/[^\]\n]*\]\(/;
const REDIRECTOR_RE = /https?:\/\/news\.google\.com\/rss\/articles\/([A-Za-z0-9_-]*)/g;
const PAPER_SECTION_RE = /^##\s+(?:Paper|Research) Highlights\b/;

const LIST_ITEM_RE = /^\s*(?:[-*+]|\d+[.)])\s+/;
const TABLE_ROW_RE = /^\s*\|/;
const TABLE_SEPARATOR_RE = /^\s*\|?[\s:|-]+\|?\s*$/;
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Which body lines sit inside a fenced code block (never linted as markdown).
function fencedLineMask(lines) {
  const mask = new Array(lines.length).fill(false);
  let fence = null;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(FENCE_RE);
    if (m) {
      const marker = m[1];
      if (!fence) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
      mask[i] = true;
      continue;
    }
    mask[i] = fence !== null;
  }
  return { mask, unclosed: fence !== null };
}

function stripCodeSpans(line) {
  return line.replace(/`[^`\n]*`/g, '');
}

// Remove inline `$...$` spans (unescaped delimiters only) so rules about prose
// never fire on LaTeX payloads.
function stripInlineMath(line) {
  return line.replace(/(?<!\\)\$(?:\\.|[^$\n\\])+?(?<!\\)\$/g, ' ');
}

// Live (unescaped) `$` positions in a line.
function liveDollarPositions(line) {
  const out = [];
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '$' && (i === 0 || line[i - 1] !== '\\')) out.push(i);
  }
  return out;
}

// Map a whitespace-collapsed excerpt from findBrokenMathDelimiters() back to a
// body line: first a single line containing the whole excerpt, then the
// paragraph (blank-line-delimited block) containing it.
function locateExcerpt(bodyLines, bodyStartLine, excerpt) {
  const collapse = (s) => stripCodeSpans(s).replace(/\s+/g, ' ').trim();
  const needle = collapse(excerpt);
  if (!needle) return null;
  for (let i = 0; i < bodyLines.length; i++) {
    if (collapse(bodyLines[i]).includes(needle)) return bodyStartLine + i;
  }
  let start = 0;
  for (let i = 0; i <= bodyLines.length; i++) {
    if (i === bodyLines.length || !bodyLines[i].trim()) {
      const block = collapse(bodyLines.slice(start, i).join(' '));
      if (block.includes(needle)) {
        const head = needle.slice(0, 20);
        for (let j = start; j < i; j++) if (collapse(bodyLines[j]).includes(head)) return bodyStartLine + j;
        return bodyStartLine + start;
      }
      start = i + 1;
    }
  }
  return null;
}

function isRealDate(s) {
  const parsed = Date.parse(`${s}T00:00:00Z`);
  return !Number.isNaN(parsed) && new Date(parsed).toISOString().slice(0, 10) === s;
}

function fileSize(p) {
  try {
    return fs.statSync(p).size;
  } catch {
    return -1;
  }
}

// ---------------------------------------------------------------------------
// The contract
// ---------------------------------------------------------------------------

// Returns findings: [{ rule, severity: 'error' | 'warn', line: number | null, message }]
// `line` is the 1-based line in the file; null means "frontmatter" (printed as fm).
export function checkGeneratedArticle(rawText, { path: filePath = 'article.md', repoRoot = null } = {}) {
  const findings = [];
  const error = (rule, line, message) => findings.push({ rule, severity: 'error', line, message });
  const warn = (rule, line, message) => findings.push({ rule, severity: 'warn', line, message });

  // ---- FILE ---------------------------------------------------------------
  let text = String(rawText);
  // [file.eol] evidence: 0 BOM / 0 CRLF in 322 originals, but a Windows
  // checkout with core.autocrlf produced ~100 phantom repairs (b217dca);
  // the contract pins UTF-8 without BOM and LF so that can never recur.
  if (text.charCodeAt(0) === 0xfeff) {
    error('file.eol', 1, 'file starts with a UTF-8 BOM; write UTF-8 without BOM');
    text = text.slice(1);
  }
  if (text.includes('\r')) {
    const crLine = text.slice(0, text.indexOf('\r')).split('\n').length;
    error('file.eol', crLine, 'CR byte found; use LF line endings only');
    text = text.replace(/\r\n?/g, '\n');
  }
  // [file.trailing-newline] evidence: 322/322 originals lack a trailing newline.
  if (!text.endsWith('\n')) {
    error('file.trailing-newline', text.split('\n').length, 'file must end with exactly one "\\n" (none found)');
  } else if (text.endsWith('\n\n')) {
    error('file.trailing-newline', text.split('\n').length, 'file must end with exactly one "\\n" (found more than one)');
  }
  // [file.slug] evidence: slug convention on all 322: ^[a-z0-9_]{1,60}$; the
  // filename IS the /writing/<slug> route.
  const basename = path.basename(filePath);
  const slug = basename.replace(/\.md$/, '');
  if (!SLUG_RE.test(basename)) {
    error('file.slug', null, `filename "${basename}" must match ^[a-z0-9_]{1,60}\\.md$`);
  }

  // ---- FRONTMATTER --------------------------------------------------------
  const lines = text.split('\n');
  // [fm.parse] evidence: 2 hard YAML errors + 2 silent mangles (Jul 14-18)
  // from raw LaTeX backslashes in quoted scalars; one killed a deploy (417aef7).
  let close = -1;
  if (lines[0] === '---') {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '---') {
        close = i;
        break;
      }
    }
  }
  if (close === -1) {
    error('fm.parse', 1, 'no frontmatter block: file must start with "---" and close it with a "---" line');
    return findings;
  }
  let fm;
  try {
    fm = matter(text);
  } catch (err) {
    error('fm.parse', null, `frontmatter does not parse: ${String(err.message).split('\n')[0]}`);
    return findings;
  }
  const data = fm.data ?? {};

  // Raw key -> { line (1-based), value (raw text after the colon) }.
  const raw = new Map();
  for (let i = 1; i < close; i++) {
    const m = lines[i].match(/^([A-Za-z_][\w-]*):(.*)$/);
    if (m && !raw.has(m[1])) raw.set(m[1], { line: i + 1, value: m[2] });
  }
  const rawLine = (key) => raw.get(key)?.line ?? null;
  const isQuoted = (v) => /^\s*"(.*)"\s*$/.test(v);

  // [fm.quoted] evidence: 322/322 quote title/date/description; an UNQUOTED
  // date parses to a Date object and breaks the string comparison in
  // provenance.mjs (article silently stops counting as auto-generated).
  for (const key of ['title', 'date', 'description']) {
    const r = raw.get(key);
    if (r && !isQuoted(r.value)) error('fm.quoted', r.line, `${key} must be a double-quoted string (got ${r.value.trim() || '<empty>'})`);
  }

  // [fm.date] evidence: 322/322 quoted "YYYY-MM-DD" — pinned so a regression
  // (unquoted or malformed) is caught before provenance/sorting break.
  if (typeof data.date !== 'string' || !DATE_RE.test(data.date)) {
    error('fm.date', rawLine('date'), data.date === undefined ? 'date is missing' : `date must be a quoted "YYYY-MM-DD" string (got ${JSON.stringify(data.date)})`);
  } else if (!isRealDate(data.date)) {
    error('fm.date', rawLine('date'), `date "${data.date}" is not a real calendar date`);
  }

  // [fm.type] evidence: 322/322 in KNOWN_ARTICLE_TYPES (Paper Review 233,
  // News Digest 75, Trend Report 14); anything else falls through display code.
  const type = typeof data.type === 'string' ? data.type : '';
  if (!KNOWN_ARTICLE_TYPES.has(type)) {
    error('fm.type', rawLine('type'), data.type === undefined ? 'type is missing' : `unknown type ${JSON.stringify(data.type)} — known: ${[...KNOWN_ARTICLE_TYPES].join(', ')}`);
  }

  // [fm.title] evidence: 4 originals carried raw LaTeX backslashes in quoted
  // scalars (2 YAML errors, 2 silent mangles); '<' in title/description is a
  // hard lint failure (HTML injection in meta tags). The evidence RULE permits
  // exactly two raw escapes — `\\` and `\"` (JSON-encoder output; 27 committed
  // files use `\"` for quoted terms) — so the backslash test looks at the
  // PARSED value and, on the raw scalar, only at a backslash that is not one
  // of those two escapes.
  const title = typeof data.title === 'string' ? data.title : '';
  const titleRaw = raw.get('title')?.value ?? '';
  if (!title.trim()) {
    error('fm.title', rawLine('title'), data.title === undefined ? 'title is missing' : 'title must be a non-empty string');
  } else {
    if (title.includes('<')) error('fm.title', rawLine('title'), "title contains '<' (HTML is not allowed in metadata)");
    if (title.includes('\\') || UNTOLERATED_ESCAPE_RE.test(titleRaw)) error('fm.title', rawLine('title'), 'title contains a backslash; frontmatter values are plain text (strip LaTeX; only \\\\ and \\" escapes are tolerated)');
  }

  // [fm.description] evidence: 248/322 originals trip isTrivialDescription
  // (248 no terminal punctuation, 28 equal the title, 26 under 60 chars, 109
  // are exactly-200-char slices cut mid-word; max seen 331, none >= 400).
  const description = typeof data.description === 'string' ? data.description : '';
  const descRaw = raw.get('description')?.value ?? '';
  {
    const reasons = [];
    if (data.description === undefined) reasons.push('missing');
    else if (typeof data.description !== 'string') reasons.push(`must be a string (got ${typeof data.description})`);
    else {
      const d = description.trim();
      if (d === title.trim()) reasons.push('equals the title');
      if (d.length < MIN_DESCRIPTION_CHARS) reasons.push(`is ${d.length} chars (minimum ${MIN_DESCRIPTION_CHARS})`);
      if (d.length >= MAX_DESCRIPTION_CHARS) reasons.push(`is ${d.length} chars (must be under ${MAX_DESCRIPTION_CHARS})`);
      if (/(\.\.\.|…)["'”’)\]]*$/.test(d)) reasons.push('ends with an ellipsis (truncation marker)');
      else if (!/[.!?]["'”’)\]]*$/.test(d)) reasons.push('does not end with . ! or ? (cut mid-sentence)');
      if (d.includes('<')) reasons.push("contains '<'");
      if (d.includes('\\') || UNTOLERATED_ESCAPE_RE.test(descRaw)) reasons.push('contains a backslash (strip LaTeX; only \\\\ and \\" escapes are tolerated)');
      // Delegate the final verdict to the site's own notion of "trivial" so
      // this contract can never be looser than the index generator.
      if (!reasons.length && isTrivialDescription(description, title)) reasons.push('isTrivialDescription() rejects it');
    }
    if (reasons.length) error('fm.description', rawLine('description'), `description ${reasons.join('; ')} — write 1-2 complete sentences, ${MIN_DESCRIPTION_CHARS}-${MAX_DESCRIPTION_CHARS - 1} chars, ending in . ! or ?`);
  }

  // [fm.tags] evidence: 15/322 originals shipped `tags: []` (Apr 6, May 7, Jul 2);
  // 322/322 use the flow-sequence form; the index infers at most 6.
  {
    const r = raw.get('tags');
    if (r && !/^\s*\[.*\]\s*$/.test(r.value)) error('fm.tags', r.line, 'tags must be a flow sequence on one line: tags: ["A", "B"]');
    if (!Array.isArray(data.tags)) error('fm.tags', rawLine('tags'), data.tags === undefined ? 'tags is missing' : 'tags must be a list');
    else if (data.tags.length < 1) error('fm.tags', rawLine('tags'), 'tags is empty (1-6 tags required; never emit [])');
    else if (data.tags.length > MAX_TAGS) error('fm.tags', rawLine('tags'), `tags has ${data.tags.length} entries (maximum ${MAX_TAGS})`);
    else if (!data.tags.every((t) => typeof t === 'string' && t.trim())) error('fm.tags', rawLine('tags'), 'every tag must be a non-empty string');
  }

  // [fm.readingTime] evidence: 322/322 integers (4-11) — pinned so a string
  // or float never reaches the template.
  if (data.readingTime !== undefined && !(Number.isInteger(data.readingTime) && data.readingTime > 0)) {
    error('fm.readingTime', rawLine('readingTime'), `readingTime must be a positive integer (got ${JSON.stringify(data.readingTime)})`);
  }

  // [fm.headerImage] evidence: 13 originals had no headerImage (Jul 17 batch),
  // 24 used a non-convention .png path, 187/343 images committed over 300KB
  // (max 1.8MB) with no .webp sibling.
  const autoType = AUTOMATION_TYPES.has(type);
  const headerImage = typeof data.headerImage === 'string' ? data.headerImage : '';
  if (autoType && !headerImage) {
    error('fm.headerImage', rawLine('headerImage'), `headerImage is required for type "${type}" (expected "/images/news/${slug}.jpg")`);
  } else if (headerImage) {
    const expected = `/images/news/${slug}`;
    if (!HEADER_IMAGE_EXT.test(headerImage) || headerImage.replace(HEADER_IMAGE_EXT, '') !== expected) {
      error('fm.headerImage', rawLine('headerImage'), `headerImage "${headerImage}" must be "/images/news/${slug}.jpg" (or .png/.webp)`);
    } else if (repoRoot) {
      const abs = path.join(repoRoot, 'public', headerImage);
      const bytes = fileSize(abs);
      if (bytes < 0) {
        error('fm.headerImage', rawLine('headerImage'), `headerImage file not found: public${headerImage}`);
      } else if (bytes > MAX_IMAGE_BYTES) {
        const webp = abs.replace(HEADER_IMAGE_EXT, '.webp');
        const webpBytes = webp === abs ? -1 : fileSize(webp);
        if (!(webpBytes >= 0 && webpBytes <= MAX_IMAGE_BYTES)) {
          error('fm.headerImage', rawLine('headerImage'), `headerImage is ${Math.round(bytes / 1024)}KB (limit ${MAX_IMAGE_BYTES / 1024}KB) and no same-basename .webp <= ${MAX_IMAGE_BYTES / 1024}KB exists`);
        }
      }
    }
  }

  // [fm.attribution] evidence: 233/233 auto Paper Reviews committed WITHOUT
  // paperUrl/paperAuthors; 20 still unattributed because a title search
  // cannot recover the arXiv id the generator held at generation time.
  if (type === 'Paper Review') {
    const url = typeof data.paperUrl === 'string' ? data.paperUrl.trim() : '';
    if (!/^https:\/\//.test(url)) {
      error('fm.attribution', rawLine('paperUrl') ?? rawLine('type'), data.paperUrl === undefined ? 'paperUrl is missing (Paper Review must cite its source, e.g. "https://arxiv.org/abs/<id>")' : `paperUrl must start with https:// (got ${JSON.stringify(data.paperUrl)})`);
    }
    const authors = data.paperAuthors;
    const hasAuthors = (typeof authors === 'string' && authors.trim()) || (Array.isArray(authors) && authors.length && authors.every((a) => typeof a === 'string' && a.trim()));
    if (!hasAuthors) {
      error('fm.attribution', rawLine('paperAuthors') ?? rawLine('type'), 'paperAuthors is missing or empty (Paper Review must name the authors)');
    }
  }

  // [fm.keys] evidence: key set observed on 322/322 is exactly
  // title,date,type,description,tags,readingTime,headerImage (+ the two
  // attribution keys); anything else is a template drift nobody renders.
  for (const [key, r] of raw) {
    if (!KNOWN_KEYS.has(key)) warn('fm.keys', r.line, `unknown frontmatter key "${key}" (known: ${[...KNOWN_KEYS].join(', ')})`);
  }

  // ---- BODY ---------------------------------------------------------------
  const bodyStartLine = close + 2; // 1-based line number of the first body line
  const bodyLines = lines.slice(close + 1);
  const body = bodyLines.join('\n');
  const { mask: fenced, unclosed: fenceUnclosed } = fencedLineMask(bodyLines);
  const ln = (i) => bodyStartLine + i;

  // [body.h1] evidence: 317/322 originals carry an H1 and 211 differ from the
  // title; the site DROPS the first H1 of auto articles (remarkStripDuplicateTitle),
  // so a reworded headline is lost. Byte-equal or absent.
  for (let i = 0; i < bodyLines.length; i++) {
    if (fenced[i] || !/^# /.test(bodyLines[i])) continue;
    if (bodyLines[i] !== `# ${title}`) {
      error('body.h1', ln(i), `first H1 differs from frontmatter title and will be dropped by the renderer: "${bodyLines[i].slice(2)}"`);
    }
    break;
  }

  // [body.header-image] evidence: 309/322 originals re-embed the header image
  // as the first body line; the template already renders headerImage.
  for (let i = 0; i < bodyLines.length; i++) {
    if (!bodyLines[i].trim()) continue;
    const m = bodyLines[i].match(/^!\[[^\]]*\]\(([^)\s]+)\)/);
    if (m && headerImage && m[1] === headerImage) warn('body.header-image', ln(i), 'body re-embeds headerImage as its first element (the page template already renders it)');
    break;
  }

  // [body.math] evidence: 178 escaped-opener spans (`\$336 \times 336$`),
  // 9 escaped closers, 77 fully-escaped spans, 72 odd-dollar units and 67
  // odd-'$' table cells in generator output — all detected by the repo's own
  // scripts/lib/math-delimiters.mjs, which is the gate delegated to here.
  for (const f of findBrokenMathDelimiters(body)) {
    error('body.math', locateExcerpt(bodyLines, bodyStartLine, f.excerpt), `${f.kind}: "${f.excerpt}"`);
  }

  // [body.display-math] evidence: 419 single-line `$$...$$` lines in 123/322
  // originals, 77 indented under list items, 5 inside list text/table cells,
  // 0 bare `$$` fence lines anywhere; the renderer hides them (no repo gate).
  {
    let inDisplay = false;
    let prevNonBlank = -1;
    for (let i = 0; i < bodyLines.length; i++) {
      if (fenced[i]) continue;
      const line = bodyLines[i];
      const t = line.trim();
      if (t === '$$') {
        if (line !== '$$') {
          error('body.display-math', ln(i), 'display-math fence "$$" must start at column 0 (not indented / not inside a list item)');
        } else if (!inDisplay && prevNonBlank === i - 1 && LIST_ITEM_RE.test(bodyLines[prevNonBlank])) {
          error('body.display-math', ln(i), 'display-math fence "$$" directly continues a list item; end the list with a blank line first');
        }
        inDisplay = !inDisplay;
      } else if (line.replace(/`[^`\n]*`/g, '').includes('$$')) {
        // Inline code is masked first: prose that merely mentions the fence in
        // backticks ("use `$$` fences") is not display math.
        if (/^\s*\$\$.+\$\$\s*$/.test(line)) error('body.display-math', ln(i), 'single-line "$$...$$" display math; put each "$$" fence alone on its own line');
        else if (TABLE_ROW_RE.test(line)) error('body.display-math', ln(i), '"$$" inside a table cell; use inline "$...$" there');
        else if (LIST_ITEM_RE.test(line)) error('body.display-math', ln(i), '"$$" inside a list item\'s text; use inline "$...$" or end the list first');
        else error('body.display-math', ln(i), 'content on the same line as a "$$" fence (fused or escaped fence); fences must be alone on their lines');
      }
      if (t) prevNonBlank = i;
    }
  }

  // [body.table-pipe] evidence: 2 real instances (`$|f(x')| \le |f(x)|$`)
  // where GFM split the row inside the math and shifted every cell after it.
  for (let i = 0; i < bodyLines.length; i++) {
    if (fenced[i]) continue;
    const line = stripCodeSpans(bodyLines[i]);
    if (!TABLE_ROW_RE.test(line) || TABLE_SEPARATOR_RE.test(line)) continue;
    const pos = liveDollarPositions(line);
    for (let k = 0; k + 1 < pos.length; k += 2) {
      const span = line.slice(pos[k] + 1, pos[k + 1]);
      if (/(?<!\\)\|/.test(span)) {
        error('body.table-pipe', ln(i), `unescaped "|" inside "$...$" in a table row splits the cell: "$${span}$" (write "\\|" or "\\vert")`);
        break;
      }
    }
  }

  // [body.html] evidence: 57 `<br>` lines in 16/322 originals (GFM tables);
  // the renderer drops raw HTML silently.
  for (let i = 0; i < bodyLines.length; i++) {
    if (fenced[i]) continue;
    const probe = stripInlineMath(stripCodeSpans(bodyLines[i]));
    const m = probe.match(HTML_TAG_RE);
    if (m) error('body.html', ln(i), `raw HTML "${m[0]}" is dropped by the renderer; use markdown (one table row per line of data)`);
  }

  // [body.internal-links] evidence: 3 dead /writing/<slug> links in 2 originals
  // (hyphenated guesses; real slugs are underscore-based).
  if (repoRoot) {
    const articlesDir = path.join(repoRoot, 'src', 'content', 'articles');
    for (let i = 0; i < bodyLines.length; i++) {
      if (fenced[i]) continue;
      for (const m of bodyLines[i].matchAll(INTERNAL_LINK_RE)) {
        const target = m[1];
        if (target === 'archive' || target === 'tag' || target === slug) continue;
        if (!fs.existsSync(path.join(articlesDir, `${target}.md`))) {
          error('body.internal-links', ln(i), `dead internal link /writing/${target} (no src/content/articles/${target}.md)`);
        }
      }
    }
  }

  // [body.persona] evidence: EXPERIENTIAL_PERSONA hit 63 originals ("as a
  // practitioner" 36, "what excites me" 32), AUTHORSHIP hit 3, FAKE_STATS 2.
  // lint-content only warns for persona; the generator must never emit any.
  // Gated on the auto-generated types exactly as lint-content gates it: the
  // owner's hand-written Projects and Walkthroughs use "I built" and "we
  // propose" truthfully, and this tool is sometimes run over a mixed set.
  for (const [group, list] of autoType ? [['first-person authorship claim', AUTHORSHIP], ['fabricated corpus statistic', FAKE_STATS], ['faked experiential persona', EXPERIENTIAL_PERSONA]] : []) {
    for (const re of list) {
      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(re);
        if (m) {
          error('body.persona', i + 1, `${group}: "${m[0]}" (machine-written text must stay in neutral third person)`);
          break;
        }
      }
    }
  }

  // [body.cve] evidence: 0 placeholder CVE ids in generator originals (2 came
  // from an owner-run rewrite); hard-fail in lint-content in every mode, so
  // the generator must never introduce one.
  for (let i = 0; i < lines.length; i++) {
    for (const m of lines[i].matchAll(CVE_RE)) {
      if (PLACEHOLDER_CVE_NUMBERS.has(m[1])) error('body.cve', i + 1, `placeholder CVE id ${m[0]} (only ids present verbatim in the source may appear)`);
    }
  }

  // [body.pct-escape] evidence: 36 `\%` in prose across 14 originals — a LaTeX
  // escape leaking into Markdown; harmless to render, but a sign the writer
  // confuses the two escaping contexts.
  for (let i = 0; i < bodyLines.length; i++) {
    if (fenced[i]) continue;
    const probe = stripInlineMath(stripCodeSpans(bodyLines[i]));
    if (probe.includes('\\%')) warn('body.pct-escape', ln(i), '"\\%" outside math; write a plain "%" in prose');
  }

  // [body.truncation] evidence: 2 digests (Aug 18-19, e58f227) carry a news
  // item cut mid-token inside its markdown link (`… ([https://news.google.com/
  // rss/articles/CBMinAFBVV95cUxOQ`). Both are the FINAL news item, not the
  // final line — "## Den's Take" and prose follow — which points at the input
  // list being clipped, not the output. So link integrity is checked on EVERY
  // body line (evidence RULE: "every '[' must have a matching '](...)' closed
  // on the same line"), while only the end-of-file cutoff signs (open fence,
  // unbalanced "**" / "(" on the last line) stay on the last line.
  {
    const unescaped = (s, re) => (s.match(re) || []).length;
    for (let i = 0; i < bodyLines.length; i++) {
      if (fenced[i] || !bodyLines[i].trim()) continue;
      const line = stripInlineMath(stripCodeSpans(bodyLines[i]));
      const problems = [];
      // More "[" than "]" — a cut-off leaves an opener; a lone "]" (e.g. a
      // keyboard-key table cell) is not a truncation sign.
      if (unescaped(line, /(?<!\\)\[/g) > unescaped(line, /(?<!\\)\]/g)) problems.push('"[" without a closing "]("');
      if (UNCLOSED_LINK_URL_RE.test(line)) problems.push('link "(https://…" not closed by ")" on the same line');
      if (problems.length) error('body.truncation', ln(i), `line ends mid-markdown (${problems.join(', ')}): "${bodyLines[i].slice(-80)}"`);
    }
    if (fenceUnclosed) error('body.truncation', ln(bodyLines.length - 1), 'a code fence is still open at end of file (output cut off?)');
    let last = -1;
    for (let i = bodyLines.length - 1; i >= 0; i--) {
      if (bodyLines[i].trim()) {
        last = i;
        break;
      }
    }
    if (last >= 0 && !fenced[last]) {
      const line = stripInlineMath(stripCodeSpans(bodyLines[last]));
      const problems = [];
      if (unescaped(line, /\*\*/g) % 2 === 1) problems.push('unbalanced "**"');
      if (unescaped(line, /(?<!\\)\(/g) !== unescaped(line, /(?<!\\)\)/g)) problems.push('"(" without ")"');
      if (problems.length) error('body.truncation', ln(last), `last line ends mid-markdown (${problems.join(', ')}): "${bodyLines[last].slice(-80)}"`);
    }
  }

  // ---- DIGEST-SPECIFIC ----------------------------------------------------
  if (type === 'News Digest' || type === 'Trend Report') {
    // [digest.news-link-form] evidence: 300 redirector URLs on 287 lines in
    // 70/75 digests; the markdown form drifted month to month, 3 Aug digests
    // used the raw URL as link text, and 2 lines were cut mid-token (payload
    // < 40 chars, the scripts/repair-dead-links.mjs threshold).
    for (let i = 0; i < bodyLines.length; i++) {
      if (fenced[i] || !bodyLines[i].includes('news.google.com')) continue;
      const line = bodyLines[i];
      const problems = [];
      if (URL_AS_LINK_TEXT_RE.test(line)) problems.push('link text is a URL (must be the headline)');
      for (const m of line.matchAll(REDIRECTOR_RE)) {
        if (m[1].length < MIN_PAYLOAD_LENGTH) problems.push(`redirector payload is ${m[1].length} chars (minimum ${MIN_PAYLOAD_LENGTH}; cut off mid-token)`);
      }
      if (!CANONICAL_NEWS_LINE_RE.test(line)) problems.push('does not match "- **[<headline>](<url>)** (<publisher>) — <summary>"');
      if (problems.length) error('digest.news-link-form', ln(i), `news item line ${problems.join('; ')}`);
    }

    // [digest.paper-links] evidence: Paper/Research Highlights carried 0
    // arxiv.org/abs/ links in all 96 items since July (vs 129/78 in April).
    for (let i = 0; i < bodyLines.length; i++) {
      if (fenced[i] || !PAPER_SECTION_RE.test(bodyLines[i])) continue;
      let j = i + 1;
      let links = 0;
      for (; j < bodyLines.length && !/^##\s/.test(bodyLines[j]); j++) {
        links += (bodyLines[j].match(/arxiv\.org\/abs\//g) || []).length;
      }
      if (links === 0) warn('digest.paper-links', ln(i), 'Paper Highlights section has no arxiv.org/abs/ link; render each item as "**[<title>](https://arxiv.org/abs/<id>)** — <authors>. <summary>"');
      i = j - 1;
    }
  }

  return findings.sort((a, b) => (a.line ?? 0) - (b.line ?? 0) || a.rule.localeCompare(b.rule));
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const USAGE = 'Usage: node scripts/check-generated-article.mjs <file>... [--json] [--warnings-as-errors]';

export function formatFinding(file, f) {
  return `${file}:${f.line ?? 'fm'}: ${f.severity} ${f.rule}: ${f.message}`;
}

function main(argv) {
  const json = argv.includes('--json');
  const warningsAsErrors = argv.includes('--warnings-as-errors');
  const files = argv.filter((a) => !a.startsWith('--'));
  if (!files.length) {
    console.error(USAGE);
    return 2;
  }
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const all = [];
  for (const file of files) {
    let text;
    try {
      text = fs.readFileSync(file).toString('utf8');
    } catch (err) {
      all.push({ file, rule: 'file.read', severity: 'error', line: null, message: err.message });
      continue;
    }
    for (const f of checkGeneratedArticle(text, { path: file, repoRoot })) all.push({ file, ...f });
  }
  const errors = all.filter((f) => f.severity === 'error').length;
  const warnings = all.length - errors;
  if (json) {
    console.log(JSON.stringify(all, null, 2));
  } else {
    for (const f of all) console.log(formatFinding(f.file, f));
    if (!all.length) console.log(`OK (${files.length} file(s), 0 findings)`);
    else console.log(`${errors} error(s), ${warnings} warning(s) in ${files.length} file(s)`);
  }
  return errors || (warningsAsErrors && warnings) ? 1 : 0;
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (invokedDirectly) {
  process.exitCode = main(process.argv.slice(2));
}
