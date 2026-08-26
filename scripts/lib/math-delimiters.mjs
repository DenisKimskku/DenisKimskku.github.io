// Article bodies render through remark-math + rehype-katex: `$...$` is inline
// math and `$$` on its own line is display math. A `$` that was never meant as
// a delimiter — a stray one, a currency figure, or math missing its closing
// `$` — does not fail anything. remark-math simply pairs it with the NEXT `$`
// in the same paragraph and renders everything between them as an equation.
//
// That shipped silently: 17 articles had whole sentences rendering as italic
// LaTeX on the live site, e.g. "per inference (a massive 147% overhead). If an
// edge device executes one gesture inference per second under the universal
// sponge attack alone". Nothing in the build complained, because the markup is
// perfectly valid — it just means something absurd.
//
// So: flag any paragraph whose inline `$` count is odd (guaranteed mispairing)
// and any `$...$` span that looks like prose rather than math. Fix by escaping
// the literal dollar as `\$` or by closing the intended math.

// An English function word inside a span means prose, not an equation.
const PROSE_MARKER = /\b(?:the|and|for|with|that|from|per|under|between|which|were|when|while|these|those|each)\b/i;
// Sentence punctuation alone is too weak: real math like `$cossim(gc, gbd)$`
// trips ",\s+[a-z]{3}". Require it to be backed by several real words.
const SENTENCE_PUNCT = /[.;:!?]\s+[a-z]|,\s+[a-z]{3}/i;
const MIN_WORDS_FOR_PUNCT = 6;

// LaTeX bodies legitimately contain words inside \text{...} and friends, so
// strip those before judging whether a span reads as prose.
const TEXTISH = /\\(?:text|mathrm|mbox|textbf|textit|textrm|operatorname)\s*\{[^{}]*\}/g;
// What makes an escaped-dollar payload "LaTeX, not a price": a control
// sequence (including `\%`, which the corpus uses inside math constantly),
// or any of ^ _ { }.
const LATEX_PAYLOAD = /\\[a-zA-Z%]+|[\^_{}]/;

function stripCodeSpans(line) {
  return line.replace(/`[^`\n]*`/g, '');
}

// GFM splits table rows into cells at the BLOCK level, before any inline
// math is parsed, so an unescaped `|` is a cell separator even in the middle
// of `$...$`. That is precisely why articles write `$\|\delta\|_2$` with
// escaped pipes. Mirroring that exactly -- split on unescaped `|` only -- is
// both the correct model and what makes per-cell parity meaningful: a
// "smarter" math-aware split lets two broken cells in one row cancel out and
// hides real breakage like `$\pm\$0.00`, which ships raw LaTeX to readers.
function splitRowIntoCells(row) {
  return row.split(/(?<!\\)\|/);
}

// Split a body into paragraphs, dropping fenced code blocks and $$ display
// math (both may legitimately contain unpaired or prose-adjacent `$`).
function proseParagraphs(body) {
  const lines = body.split(/\r?\n/);
  const kept = [];
  let inFence = false;
  let inDisplay = false;
  for (const line of lines) {
    const t = line.trim();
    if (/^(```|~~~)/.test(t)) {
      inFence = !inFence;
      kept.push('');
      continue;
    }
    if (inFence) continue;
    if (t === '$$') {
      inDisplay = !inDisplay;
      kept.push('');
      continue;
    }
    if (inDisplay) continue;
    // A single-line $$...$$ block is display math too.
    if (/^\$\$.*\$\$$/.test(t)) {
      kept.push('');
      continue;
    }
    kept.push(stripCodeSpans(line));
  }
  // Markdown splits table rows into cells and list items into their own
  // blocks BEFORE math is parsed, so `$` parity has to be judged at that
  // same granularity. Checking a whole paragraph instead hides the most
  // common shape of this defect: a table row whose cells each carry one
  // orphaned `$` sums to an even count per row while every cell renders
  // wrong. That blind spot silently passed 21 real defects in one batch.
  const units = [];
  for (const block of kept.join('\n').split(/\n\s*\n/)) {
    const rows = block.split('\n');
    const isTable = rows.some((r) => /^\s*\|.*\|\s*$/.test(r));
    if (!isTable) {
      units.push(block);
      continue;
    }
    for (const row of rows) {
      if (/^\s*\|?[\s:|-]+\|?\s*$/.test(row)) continue; // separator row
      for (const cell of splitRowIntoCells(row)) units.push(cell);
    }
  }
  return units;
}

// Unescaped `$` positions, ignoring `\$`.
function inlineDollars(paragraph) {
  const out = [];
  for (let i = 0; i < paragraph.length; i++) {
    if (paragraph[i] !== '$') continue;
    if (i > 0 && paragraph[i - 1] === '\\') continue;
    out.push(i);
  }
  return out;
}

// Returns an array of { kind, excerpt } findings; empty when the body is fine.
export function findBrokenMathDelimiters(body) {
  const findings = [];
  for (const para of proseParagraphs(body)) {
    if (!para.trim()) continue;
    const pos = inlineDollars(para);

    // BOTH delimiters escaped -- `\$Y = F(X; \theta)\$`, `\$62\times\$`,
    // `\$X\$` -- is the generator's other escaping regime (a blanket "escape
    // dollar signs" instruction rather than the digit heuristic). It keeps
    // parity even and has no live `$` at all, so nothing below sees it, and
    // the math never renders: readers get the raw `$Y = F(X; \theta)$`. A
    // payload that is LaTeX, or a lone identifier letter, was never a price.
    const fully = [...para.matchAll(/\\\$((?:(?!\\\$)[^$\n])+?)\\\$/g)].find(
      (m) => LATEX_PAYLOAD.test(m[1]) || /^[A-Za-z]$/.test(m[1]),
    );
    if (fully) {
      findings.push({
        kind: 'fully-escaped-span',
        excerpt: para.slice(Math.max(0, fully.index - 40), fully.index + 70).replace(/\s+/g, ' ').trim(),
      });
      continue;
    }
    // Everything below is about live delimiters; a unit with none is done.
    if (pos.length === 0) continue;

    // An escaped `\$` whose payload is LaTeX was never currency -- it is the
    // defect's signature, and it catches what parity cannot: `\$336 \times
    // 336$` (escaped opener, live closer) keeps an EVEN count and carries no
    // prose, so both checks below miss it. Requiring LaTeX in the payload is
    // what separates it from a real price: articles legitimately mix
    // `from \$109 to \$219` with `$\phi_{t,i_t}$` in one paragraph, and a
    // bare amount must never be flagged. Two payload shapes count as LaTeX
    // that a naive signature misses and that shipped mis-rendered for months:
    // `\$95.5\%$` (only `\%`) and `\$768$` (a bare number closed by a live
    // `$` -- a price is never immediately followed by a math delimiter).
    const escaped = [...para.matchAll(/\\\$/g)];
    let flaggedMixed = false;
    for (const e of escaped) {
      const start = e.index + 2;
      const nextDollar = para.slice(start).search(/(?<!\\)\$/);
      const payload = para.slice(start, nextDollar === -1 ? start + 40 : start + nextDollar);
      // Digits with plain arithmetic punctuation only (`768`, `0.7528`,
      // `694 / 149 / 149`); letters excluded so two prices never match.
      const numericClosed = nextDollar !== -1 && /^[\d.,\s/+\-*×]*\d[\d.,\s/+\-*×]*$/.test(payload);
      if (LATEX_PAYLOAD.test(payload) || numericClosed) {
        findings.push({
          kind: 'mixed-escaping',
          excerpt: para.slice(Math.max(0, e.index - 40), e.index + 70).replace(/\s+/g, ' ').trim(),
        });
        flaggedMixed = true;
        break;
      }
    }
    if (flaggedMixed) continue;

    if (pos.length % 2 === 1) {
      const near = para.slice(Math.max(0, pos[pos.length - 1] - 60), pos[pos.length - 1] + 60);
      findings.push({
        kind: 'odd-dollar-count',
        excerpt: near.replace(/\s+/g, ' ').trim(),
      });
      continue;
    }

    for (let i = 0; i + 1 < pos.length; i += 2) {
      const span = para.slice(pos[i] + 1, pos[i + 1]);
      const probe = span.replace(TEXTISH, '');
      const wordCount = (probe.match(/[a-zA-Z]{2,}/g) || []).length;
      const readsAsProse =
        PROSE_MARKER.test(probe) ||
        (SENTENCE_PUNCT.test(probe) && wordCount >= MIN_WORDS_FOR_PUNCT);
      if (readsAsProse) {
        // Dense LaTeX control sequences mean it really is math that merely
        // mentions a word like "for" inside an operator name.
        const ctrl = (probe.match(/\\[a-zA-Z]+/g) || []).length;
        const words = (probe.match(/[a-zA-Z]{2,}/g) || []).length;
        if (ctrl > 0 && words / Math.max(ctrl, 1) < 2.0) continue;
        findings.push({
          kind: 'prose-in-math',
          excerpt: span.replace(/\s+/g, ' ').trim().slice(0, 120),
        });
      }
    }
  }
  return findings;
}
