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

// A run of at least two words plus prose-only punctuation is not an equation.
const PROSE_MARKER = /\b(?:the|and|for|with|that|from|per|under|between|which|were|when|while|these|those|each)\b/i;
const SENTENCE_PUNCT = /[.;:!?]\s+[a-z]|,\s+[a-z]{3}/i;

// LaTeX bodies legitimately contain words inside \text{...} and friends, so
// strip those before judging whether a span reads as prose.
const TEXTISH = /\\(?:text|mathrm|mbox|textbf|textit|textrm|operatorname)\s*\{[^{}]*\}/g;

function stripCodeSpans(line) {
  return line.replace(/`[^`\n]*`/g, '');
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
  return kept.join('\n').split(/\n\s*\n/);
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
    if (pos.length === 0) continue;

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
      if (PROSE_MARKER.test(probe) || SENTENCE_PUNCT.test(probe)) {
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
