// Display text for /graph (SPEC §9.4, §6.8). Pure: no React, DOM or renderer
// imports, so tests/graph-encoding.test.mjs loads it under plain Node.
//
// The payload carries titles and venues as the bibliographic records had them:
// 19 titles hold tag markup (one is a whole MathML formula), 76 hold HTML
// entities, and thousands of venues are cut short in the source. These helpers
// clean that up for display only; the payload itself is never changed.

/* --- titles ------------------------------------------------------------------- */

/** A tag-shaped run: <i>, </scp>, <mml:mi mathvariant="normal">, <br/>, or the stray </>.
    "<1% Leaked" survives: a tag must start with a letter or a slash. */
const TAG = /<\/?[a-zA-Z][\w:.-]*(?:\s[^<>]*)?\/?>|<\/>/g;
const ENTITY = /&(?:(amp|apos|quot|lt|gt|nbsp)|#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6}));/g;
const NAMED: Record<string, string> = { amp: '&', apos: "'", quot: '"', lt: '<', gt: '>', nbsp: ' ' };

/** One pass, so "&amp;lt;" becomes "&lt;" and never "<". Invalid code points are left as written. */
function decodeEntities(s: string): string {
  return s.replace(ENTITY, (whole: string, name?: string, dec?: string, hex?: string) => {
    if (name) return NAMED[name];
    const cp = dec !== undefined ? Number(dec) : parseInt(hex ?? '', 16);
    const valid = Number.isInteger(cp) && cp > 0 && cp <= 0x10ffff && (cp < 0xd800 || cp > 0xdfff);
    return valid ? String.fromCodePoint(cp) : whole;
  });
}

/**
 * The title as a reader should see it (SPEC §9.4): whitespace between tags
 * collapsed, tag markup removed, entities decoded, whitespace collapsed and
 * trimmed. The MathML title becomes "D2 Fusion: Dual-domain fusion with
 * feature superposition for Deepfake detection". Every title surface uses it:
 * canvas labels, the tooltip, search results, list rows, the panel heading and
 * similar papers.
 */
export function displayTitle(raw: string | null | undefined): string {
  if (!raw) return '';
  let s = raw;
  if (s.includes('<')) s = s.replace(/>\s+</g, '><').replace(TAG, '');
  if (s.includes('&')) s = decodeEntities(s);
  return s.replace(/\s+/g, ' ').trim();
}

/* --- abstracts ------------------------------------------------------------------- */

/** Markup that ends a paragraph or a line: p, br, div, h1–h6 and namespaced paragraphs (jats:p, ns3:p). */
const BLOCK_TAG = /<\/?(?:p|br|div|h[1-6]|[a-z][\w.-]*:p)(?:\s[^<>]*)?\/?>/gi;
/* The inline markup the abstracts carry (census of 2026-10-04). Opening and
   closing tags are matched independently, because the records pair them
   loosely: <italic>…</i>, <sc>…</small>, <bold>…</b>. */
const INLINE_TAG =
  /<\/?(?:i|b|u|em|strong|sup|sub|sc|small|italic|bold|span|a|uri|tex|tex-math|inline-formula|mml:[\w.-]+)(?:\s[^<>]*)?\/?>/gi;

/* Markup a record stored entity-encoded (&lt;span&gt;…&lt;/span&gt;) reads as
   tags once decoded. Then only a matched pair of a known tag is removed: a
   lone decoded tag is text the authors wrote. */
const DECODED_PAIR = /<(p|div|span|i|b|u|em|strong|sup|sub|sc|small|italic|bold)(?:\s[^<>]*)?>([\s\S]*?)<\/\1\s*>/gi;
const BLOCK_NAMES = new Set(['p', 'div']);

/**
 * An abstract as a reader should see it (SPEC §9.5): the publisher markup its
 * record carries is removed (paragraph and line-break tags become line
 * breaks), entities are decoded, and runs of spaces are tidied while line
 * breaks are kept. Only known markup is removed. Anything else stays as
 * written, because some abstracts quote markup as part of their text
 * ("full privilege (<script>) and isolation (<iframe>)"), and those are the
 * authors' words.
 */
export function displayText(raw: string | null | undefined): string {
  if (!raw) return '';
  let s = raw;
  if (s.includes('<')) s = s.replace(BLOCK_TAG, '\n').replace(INLINE_TAG, '');
  if (s.includes('&')) {
    s = decodeEntities(s);
    for (let pass = 0; pass < 3 && s.includes('</'); pass += 1) {
      const next = s.replace(DECODED_PAIR, (_whole: string, name: string, inner: string) =>
        BLOCK_NAMES.has(name.toLowerCase()) ? `\n${inner}\n` : inner
      );
      if (next === s) break;
      s = next;
    }
  }
  return s
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* --- venues -------------------------------------------------------------------- */

/** What is left of a venue cut short in the source: never a venue name on its own. */
const VENUE_FRAGMENT =
  /^(proceedings of( the)?|advances in|international( journal of)?|ieee( transactions( on)?)?|acm transactions on|findings of the)$/i;

/** Of two spellings of one name, the one with more capitals (the title-cased one); the first on a tie. */
function properSpelling(a: string, b: string): string {
  const caps = (s: string) => s.replace(/[^A-Z]/g, '').length;
  return caps(b) > caps(a) ? b : a;
}

/**
 * The venue as a reader should see it (SPEC §9.4), or '' to omit it. Applied
 * in order:
 * 1. "..." becomes "…".
 * 2. A leading "…" and the whitespace after it are dropped.
 * 3. A trailing "…" is kept: the name is shortened in the source data.
 * 4. A bare fragment ("Proceedings of the", "IEEE Transactions on", …) is
 *    omitted. So is a cut-short venue of fewer than three words ("Advances
 *    in …", "Journal of …"). The word count applies only to venues the source
 *    cut short: applied to every venue it would erase complete names such as
 *    "arXiv", "ICML" and "USENIX Security".
 * 5. "X/X", the same name twice, keeps one.
 * A venue name is never expanded or guessed.
 */
export function displayVenue(raw: string | null | undefined): string {
  if (!raw) return '';
  let s = raw.replace(/\.\.\./g, '…').replace(/\s+/g, ' ').trim();
  const cutShort = s.startsWith('…') || s.endsWith('…');
  s = s.replace(/^…\s*/, '');
  const trailing = s.endsWith('…');
  const core = s.replace(/\s*…$/, '').trim();
  if (!core) return '';
  if (VENUE_FRAGMENT.test(core)) return '';
  if (cutShort && core.split(' ').length < 3) return '';
  const halves = /^([^/]+)\/([^/]+)$/.exec(core);
  if (halves && halves[1].trim().toLowerCase() === halves[2].trim().toLowerCase()) {
    const one = properSpelling(halves[1].trim(), halves[2].trim());
    return trailing ? `${one} …` : one;
  }
  return s;
}

/* --- fitting text into pixels ---------------------------------------------------- */

const ELLIPSIS = '…';

/**
 * `text` if it measures at most `maxPx`, otherwise its longest prefix that
 * fits with "…" appended (trailing spaces and separators trimmed first), or ''
 * when not even "…" fits. `measure` returns a string's width in pixels, so
 * the caller decides the font. Cuts between code points, never inside one.
 */
export function ellipsize(text: string, maxPx: number, measure: (s: string) => number): string {
  if (!text) return '';
  if (measure(text) <= maxPx) return text;
  if (measure(ELLIPSIS) > maxPx) return '';
  const chars = Array.from(text);
  const cut = (n: number) => `${chars.slice(0, n).join('').replace(/[\s,;:·–—-]+$/, '')}${ELLIPSIS}`;
  // The longest prefix length n whose cut(n) fits: cut(0) is "…", which fits.
  let lo = 0;
  let hi = chars.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (measure(cut(mid)) <= maxPx) lo = mid;
    else hi = mid - 1;
  }
  return cut(lo);
}
