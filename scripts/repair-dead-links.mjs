// The external generator sometimes emits a Google News redirector link whose
// URL was cut off mid-token. A real redirector looks like
//   https://news.google.com/rss/articles/CBMikwFBVV95cUxQ...(100-200 chars)...?oc=5
// while a truncated one is
//   https://news.google.com/rss/articles/CBMinAFBVV95cUxOQ
// and returns HTTP 400 forever: the payload is an opaque token, so a short one
// is unrecoverable. This repair removes the dead link and keeps the human-
// readable text. It never touches full-length redirectors (handled elsewhere)
// or any other host, never modifies frontmatter or fenced code, and preserves
// each line's CRLF/LF byte-for-byte.
//
// Usage: node scripts/repair-dead-links.mjs [--check | --dry-run]
//   (default)   rewrite in place, one line per repaired file + summary, exit 0
//   --check     no writes; exit 1 if any file would change
//   --dry-run   no writes; exit 0

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Real payloads are 100-200 chars; anything shorter than this was cut off.
export const MIN_PAYLOAD_LENGTH = 40;

// Group 1 is the opaque payload; the optional query string (?oc=5&hl=...) is
// not part of it. Only this host and path are ever considered.
const REDIRECTOR = String.raw`https?://news\.google\.com/rss/articles/([A-Za-z0-9_-]*)(?:\?[^\s)\]]*)?`;

// A well-formed markdown link `[text](url)`, optionally wrapped in the
// generator's ` (...)` parens so an emptied link can take them along.
const LINK_RE = new RegExp(String.raw`(\s*\()?\[([^\]\n]*)\]\(\s*${REDIRECTOR}\s*\)(\))?`, 'g');

// The observed cut-off form: the line ends inside the link, e.g.
//   **Headline** ([https://news.google.com/rss/articles/CBMinAFBVV95cUxOQ
// Everything from the dangling ` ([` to end of line is dropped.
const DANGLING_RE = new RegExp(String.raw`\s*\(\[${REDIRECTOR}\s*$`);

const isTruncated = (payload) => payload.length < MIN_PAYLOAD_LENGTH;
const isBareUrl = (text) => /^https?:\/\/\S*$/.test(text.trim());

function repairLine(line) {
  let out = line.replace(LINK_RE, (match, pre, text, payload, post) => {
    if (!isTruncated(payload)) return match;
    // The generator's canonical form uses the URL itself as link text; there
    // is nothing human-readable to keep, so drop the link and its parens.
    if (isBareUrl(text)) return pre && post ? '' : (pre ?? '') + (post ?? '');
    return (pre ?? '') + text + (post ?? '');
  });
  out = out.replace(DANGLING_RE, (match, payload) => (isTruncated(payload) ? '' : match));
  return out;
}

// Line endings are preserved EXACTLY: the split keeps its separators via a
// capture group so each original CRLF/LF is rejoined untouched (many articles
// on a Windows checkout mix both within one file). Odd indices are the
// captured separators; even indices are the lines.
export function repairDeadLinks(text) {
  const segments = text.split(/(\r?\n)/);
  const repairs = [];
  let inFrontmatter = false;
  let fence = null;

  for (let i = 0; i < segments.length; i += 2) {
    const line = segments[i];

    if (i === 0 && /^---\s*$/.test(line)) {
      inFrontmatter = true;
      continue;
    }
    if (inFrontmatter) {
      if (/^---\s*$/.test(line)) inFrontmatter = false;
      continue;
    }

    const fenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (!fence) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
      continue;
    }
    if (fence) continue;

    const fixed = repairLine(line);
    if (fixed !== line) {
      repairs.push({ before: line, after: fixed });
      segments[i] = fixed;
    }
  }

  const out = segments.join('');
  return { text: out, changed: out !== text, repairs };
}

function main(argv) {
  const check = argv.includes('--check');
  const dryRun = argv.includes('--dry-run');
  const write = !check && !dryRun;

  const ARTDIR = path.join(process.cwd(), 'src', 'content', 'articles');
  const files = fs.readdirSync(ARTDIR).filter((f) => f.endsWith('.md'));

  let repaired = 0;

  for (const f of files) {
    const filePath = path.join(ARTDIR, f);
    const text = fs.readFileSync(filePath, 'utf8');
    const { text: modifiedText, changed, repairs } = repairDeadLinks(text);
    if (!changed) continue;

    repaired++;
    if (write) {
      fs.writeFileSync(filePath, modifiedText, 'utf8');
      console.log(`Repaired ${repairs.length} dead link(s) in ${f}`);
    } else {
      console.log(`Would repair ${repairs.length} dead link(s) in ${f}`);
    }
  }

  if (repaired > 0) {
    console.log(
      write
        ? `Successfully repaired dead links in ${repaired} article(s).`
        : `${repaired} article(s) would be repaired (no files written).`
    );
  } else {
    console.log('No dead link repair needed.');
  }

  return check && repaired > 0 ? 1 : 0;
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (invokedDirectly) {
  process.exitCode = main(process.argv.slice(2));
}
