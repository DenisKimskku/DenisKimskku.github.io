// Auto-generated articles sometimes carry raw LaTeX (e.g. $\mathbf{z} or
// $\theta$) inside double-quoted frontmatter values. Invalid YAML escapes
// like \m make js-yaml throw and kill the build; valid ones (\t, \n, \b, \e)
// are worse — they parse "successfully" into mangled text ($\theta$ becomes
// "$<TAB>heta$") and ship silently. Frontmatter values on this site are always
// meant as literal text, so any escape other than \\ and \" is unintended.

function hasUnintendedEscape(value) {
  for (let i = 0; i < value.length; i++) {
    if (value[i] !== '\\') continue;
    const next = value[i + 1];
    if (next === '"' || next === '\\') {
      i++;
      continue;
    }
    return true;
  }
  return false;
}

// Rewrite each single-line double-quoted scalar whose raw contents use an
// unintended escape, re-serializing the value as literal text with proper
// escaping. Returns the repaired document, or null if nothing needed repair.
// Multi-line scalars, flow collections (tags: [...]), and comment-bearing
// lines are left alone — those fall through to a loud parse error instead.
//
// Line endings are preserved EXACTLY: the split keeps its separators via a
// capture group so each original CRLF/LF is rejoined untouched. Splitting on
// /\r?\n/ and joining on '\n' instead would rewrite every CRLF frontmatter to
// LF, making `fixed === body` false for any multi-line frontmatter on a
// Windows checkout (core.autocrlf=true) — so this reported EVERY article as
// needing repair, hard-failing `npm run build` locally with ~100 phantom
// errors and producing a whole-corpus diff that was pure line-ending churn.
// CI never saw it because Linux checkouts are already LF.
export function repairFrontmatterEscapes(raw) {
  const m = raw.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
  if (!m) return null;
  const body = m[2];
  // Odd indices are the captured separators; even indices are the lines.
  const fixed = body
    .split(/(\r?\n)/)
    .map((segment, i) => {
      if (i % 2 === 1) return segment;
      const kv = segment.match(/^(\s*[\w-]+:\s*)"(.*)"(\s*)$/);
      if (!kv || !hasUnintendedEscape(kv[2])) return segment;
      const literal = kv[2].replace(/\\(["\\])/g, '$1');
      return kv[1] + JSON.stringify(literal) + kv[3];
    })
    .join('');
  if (fixed === body) return null;
  return raw.slice(0, m[1].length) + fixed + raw.slice(m[1].length + body.length);
}
