// Shared helpers for inferring description / tags from article body when the
// frontmatter is trivial (description equals title, or tags are empty).
//
// Used by:
//   - scripts/generate-articles-index.mjs (index entries)
//   - src/lib/markdown.ts (per-article page metadata)
//
// Keep this file ESM-compatible plain JavaScript so both Node scripts and the
// Next.js build can import it without a transpile step.

const STOP_HEADING_PREFIXES = ['executive summary', 'tl;dr', 'summary', 'overview', 'introduction', 'intro'];

// Topics we care about for AI / security writing. Each entry: tag => [keywords].
// Keywords are matched case-insensitively in the body. The tag is emitted when
// at least one keyword appears more than once (or hits a high-confidence phrase).
const TAG_VOCAB = [
  ['LLM Security',          ['llm security', 'large language model', 'language model security']],
  ['Agentic AI',            ['agentic', 'autonomous agent', 'ai agent', 'llm agent', 'agent system']],
  ['Multi-Agent Systems',   ['multi-agent', 'multi agent', 'agent-to-agent', 'a2a']],
  ['RAG',                   ['retrieval-augmented', 'retrieval augmented', 'rag pipeline', 'rag system']],
  ['Prompt Injection',      ['prompt injection', 'indirect prompt', 'jailbreak prompt']],
  ['Jailbreak',             ['jailbreak', 'jailbreaking']],
  ['Adversarial Attacks',   ['adversarial attack', 'adversarial example', 'adversarial perturbation', 'evasion attack']],
  ['Data Poisoning',        ['data poisoning', 'corpus poisoning', 'knowledge corruption', 'poisoned data']],
  ['Memory Attacks',        ['memory poisoning', 'agent memory', 'long-term memory', 'memory exfiltration']],
  ['Red Teaming',           ['red team', 'red-team', 'red teaming']],
  ['Federated Learning',    ['federated learning', 'federated ai', 'federated model']],
  ['Mixture of Experts',    ['mixture of experts', 'moe routing', 'moe expert']],
  ['Privacy',               ['differential privacy', 'membership inference', 'privacy-preserving']],
  ['Watermarking',          ['watermark', 'watermarking']],
  ['Binary Analysis',       ['binary analysis', 'binary code similarity', 'reverse engineering', 'decompilation']],
  ['Malware Detection',     ['malware detection', 'malware classifier', 'pe malware']],
  ['Supply Chain Security', ['supply chain', 'dependency confusion', 'package poisoning']],
  ['MCP',                   ['model context protocol', ' mcp ', '(mcp)', 'mcp server']],
  ['Chain of Thought',      ['chain of thought', 'chain-of-thought', ' cot ', '(cot)']],
  ['AI Safety',             ['ai safety', 'model alignment', 'safety alignment', 'safety guardrails']],
  ['Hardware Security',     ['hardware exploit', 'side-channel', 'sidechannel', 'hardware vulnerability']],
  ['Code Security',         ['code security', 'secure coding', 'sast', 'sca']],
];

function stripMarkdown(text) {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')                   // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')                // links → text
    .replace(/```[\s\S]*?```/g, ' ')                        // code fences
    .replace(/`([^`]+)`/g, '$1')                            // inline code
    .replace(/^>\s*/gm, '')                                 // blockquote markers
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')           // bold/italic
    .replace(/^#{1,6}\s+/gm, '')                            // ATX headings
    .replace(/\s+/g, ' ')                                   // collapse whitespace
    .trim();
}

function isTrivialDescription(description, title) {
  if (!description) return true;
  const normalized = description.trim();
  if (normalized === title.trim() || normalized.length < 60) return true;
  // Truncated descriptions (mid-sentence or mid-word cuts from upstream
  // automation) read broken in meta tags / cards — treat them as trivial so
  // extractDescriptionFromContent() regenerates a sentence-complete summary.
  // Terminal = . ! ? optionally followed by closing quotes/brackets; a
  // trailing ellipsis ('...' or '…') is a truncation marker, not terminal.
  if (/(\.\.\.|…)["'”’)\]]*$/.test(normalized)) return true;
  return !/[.!?]["'”’)\]]*$/.test(normalized);
}

// Pull the first substantive paragraph from the article body, preferring the
// one immediately under "## Executive Summary" / "## TL;DR" / similar.
function extractDescriptionFromContent(content, maxLen = 280) {
  if (!content) return '';

  // Split into blocks separated by blank lines.
  const blocks = content.split(/\n\s*\n/);

  // Look for a heading like "## Executive Summary" and take the next text block.
  for (let i = 0; i < blocks.length - 1; i++) {
    const heading = blocks[i].trim();
    const headingMatch = heading.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch && STOP_HEADING_PREFIXES.some((p) => headingMatch[1].toLowerCase().startsWith(p))) {
      for (let j = i + 1; j < blocks.length; j++) {
        const next = stripMarkdown(blocks[j]);
        if (next.length >= 80 && !next.startsWith('#') && !/^[!*\-]/.test(blocks[j].trim())) {
          return finalize(next, maxLen);
        }
      }
    }
  }

  // Fallback: first paragraph that is plain prose (not heading / image / list).
  for (const raw of blocks) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('!')) continue;          // image
    if (trimmed.startsWith('*') || trimmed.startsWith('-')) continue; // list
    if (trimmed.startsWith('>')) continue;
    if (trimmed.startsWith('```')) continue;
    if (trimmed.startsWith('|')) continue;          // table
    const cleaned = stripMarkdown(trimmed);
    if (cleaned.length >= 80) {
      return finalize(cleaned, maxLen);
    }
  }
  return '';
}

// A paragraph that ends by introducing a list (':' etc.) is not a complete
// summary on its own — mark the continuation explicitly.
function finalize(text, maxLen) {
  const t = truncate(text, maxLen);
  return /[,;:]$/.test(t) ? t.replace(/[,;:\s]+$/, '') + '…' : t;
}

function truncate(text, maxLen) {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  // Prefer ending on a complete sentence so summaries never stop mid-thought.
  const sentenceEnd = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (sentenceEnd > maxLen * 0.5) return cut.slice(0, sentenceEnd + 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > maxLen * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\s]+$/, '') + '…';
}

// Heuristic tag inference: count occurrences of each tag's keywords in the body.
// Emit a tag when total count >= 2, capped at maxTags.
function inferTagsFromContent(content, maxTags = 6) {
  if (!content) return [];
  const lower = ` ${content.toLowerCase()} `;
  const scored = [];
  for (const [tag, keywords] of TAG_VOCAB) {
    let score = 0;
    for (const kw of keywords) {
      // Count non-overlapping occurrences.
      const pattern = kw.toLowerCase();
      let idx = 0;
      while ((idx = lower.indexOf(pattern, idx)) !== -1) {
        score += 1;
        idx += pattern.length;
      }
    }
    if (score >= 2) scored.push([tag, score]);
  }
  scored.sort((a, b) => b[1] - a[1]);
  return scored.slice(0, maxTags).map(([tag]) => tag);
}

export { extractDescriptionFromContent, inferTagsFromContent, isTrivialDescription };
