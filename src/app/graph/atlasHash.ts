// The URL hash for /graph (SPEC §7.5). Pure: no JSX, no DOM, no React, sigma,
// graphology, next/* or @/ imports, so tests/graph-nav.test.mjs loads it under
// plain Node. Keep the syntax erasable (no enums, namespaces or parameter
// properties): CI imports it with Node 24's type stripping.
//
// Grammar: URLSearchParams-style, keys p (paper), r (display region), q (search
// seed) and view. `#p=<id>` is the form every shared link already uses
// (CONTEXT §5 invariant 7), so it must keep parsing to { p }.

export interface HashState {
  /** a paper id, as written by the exporter */
  p?: string;
  /** a display-region slug: the focused region (SPEC §7.3) */
  r?: string;
  /** a search seed, read once on load and never written back */
  q?: string;
  /** the List view on a screen that can draw the map */
  view?: 'list';
}

export type HistoryStep = 'push' | 'replace' | 'back';

const PAPER_ID = /^[A-Za-z0-9_-]{1,64}$/;
const REGION_KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const QUERY_MAX = 120;

/** Trim, then cap at QUERY_MAX code points (never splitting a surrogate pair). */
function cleanQuery(raw: string): string {
  const trimmed = raw.trim();
  const points = Array.from(trimmed);
  return points.length <= QUERY_MAX ? trimmed : points.slice(0, QUERY_MAX).join('').trim();
}

/**
 * Reads a location hash ('#p=…', with or without the '#'). Unknown keys and
 * invalid values are dropped; for a repeated key the first value wins.
 */
export function parseHash(hash: string): HashState {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const params = new URLSearchParams(raw);
  const out: HashState = {};
  const p = params.get('p');
  if (p !== null && PAPER_ID.test(p)) out.p = p;
  const r = params.get('r');
  if (r !== null && REGION_KEY.test(r)) out.r = r;
  const q = params.get('q');
  if (q !== null) {
    const query = cleanQuery(q);
    if (query) out.q = query;
  }
  if (params.get('view') === 'list') out.view = 'list';
  return out;
}

const ATLAS_KEYS = ['p', 'r', 'q', 'view'];

/**
 * Whether a location hash speaks the atlas grammar: empty (no state at all),
 * or naming at least one of its keys, valid value or not. Any other fragment
 * is a plain in-page anchor, such as the sitewide skip link's
 * '#main-content': following one must leave the atlas state alone instead of
 * reading as "no paper, no region, the map".
 */
export function isAtlasFragment(hash: string): boolean {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (raw === '') return true;
  const params = new URLSearchParams(raw);
  return ATLAS_KEYS.some((key) => params.has(key));
}

/**
 * The hash for a state, '#'-prefixed, with keys in the order r, p, view. `q` is
 * never written. The empty state is '' (pathname plus search, no '#'). Values
 * that would not parse back are left out, so a write never puts an invalid hash
 * in the address bar.
 */
export function serializeHash(state: HashState): string {
  const parts: string[] = [];
  if (state.r && REGION_KEY.test(state.r)) parts.push(`r=${state.r}`);
  if (state.p && PAPER_ID.test(state.p)) parts.push(`p=${state.p}`);
  if (state.view === 'list') parts.push('view=list');
  return parts.length > 0 ? `#${parts.join('&')}` : '';
}

/** A change to the hash state: a key given a value takes it, null removes it, and a key left out is kept. */
export interface HashPatch {
  p?: string | null;
  r?: string | null;
  view?: 'list' | null;
}

/**
 * `prev` with `patch` applied. Every history write goes through this, so a
 * write about one key (opening a paper, say) keeps the others (the region
 * and the List view). `q` is never carried: a search seed is read once on
 * load and never written back.
 */
export function withHash(prev: HashState, patch: HashPatch): HashState {
  const r = patch.r === undefined ? prev.r : patch.r;
  const p = patch.p === undefined ? prev.p : patch.p;
  const view = patch.view === undefined ? prev.view : patch.view;
  const next: HashState = {};
  if (r) next.r = r;
  if (p) next.p = p;
  if (view === 'list') next.view = 'list';
  return next;
}

/** Whether two states write the same hash (so `q`, never written, is ignored). */
export function sameHash(a: HashState, b: HashState): boolean {
  return serializeHash(a) === serializeHash(b);
}

/**
 * How a change of hash state is written to history:
 * - opening a paper when none is open pushes, so Back (and the phone's back
 *   gesture) closes it again;
 * - moving from one paper to another replaces, so Back never walks through
 *   every hop (the panel's own trail does that);
 * - closing goes back when the open was pushed by this page, otherwise (a
 *   deep-link arrival) it replaces. The caller passes `pushedPanel` true only
 *   when the entry before that push is exactly the state it is closing to:
 *   a paper opened from the overview and closed into a region must replace,
 *   or Back would drop the region;
 * - anything else (a change to r or view alone) replaces.
 */
export function historyStep(prev: HashState, next: HashState, pushedPanel: boolean): HistoryStep {
  const had = Boolean(prev.p);
  const has = Boolean(next.p);
  if (!had && has) return 'push';
  if (had && !has) return pushedPanel ? 'back' : 'replace';
  return 'replace';
}
