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
export function repairFrontmatterEscapes(raw) {
  const m = raw.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
  if (!m) return null;
  const body = m[2];
  const fixed = body
    .split(/\r?\n/)
    .map((line) => {
      const kv = line.match(/^(\s*[\w-]+:\s*)"(.*)"(\s*)$/);
      if (!kv || !hasUnintendedEscape(kv[2])) return line;
      const literal = kv[2].replace(/\\(["\\])/g, '$1');
      return kv[1] + JSON.stringify(literal) + kv[3];
    })
    .join('\n');
  if (fixed === body) return null;
  return raw.slice(0, m[1].length) + fixed + raw.slice(m[1].length + body.length);
}
