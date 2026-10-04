// Copy and copy-adjacent helpers for /graph (the Research Atlas).
//
// PURE MODULE: no JSX, no React, no DOM, no `next/*`, no `@/` alias. Type-only
// imports are erased, so `tests/graph-truth.test.mjs` imports this file directly
// under Node's type stripping (CI runs Node 24). Keep the syntax erasable: no
// enums, namespaces or parameter properties.
//
// Truth rule for every string here: it must be literally true for every
// published review. Census of the payload on 2026-10-04: every review records
// the same model id as generator and checker, the source is the paper's full
// text, about half carry a `verified_at` batch stamp and the rest carry only a
// `date_note`, and two have the verdict `minor_issues`. So a review is written
// by a Claude model and then checked against the paper's text, in a separate
// pass, by that same model. Nothing here may imply an independent checker, a
// human reader or peer review; `tests/graph-truth.test.mjs` scans every string
// literal and JSX text under src/app/graph for such claims.

import type { AtlasNode, ReviewProvenance } from './atlasTypes';

/* --- page copy (SPEC §11.1) ------------------------------------------------ */

/** M2. Number-free on purpose: a hard-coded corpus count went stale once. */
export const ATLAS_DESCRIPTION =
  'Preview: an interactive map of papers in AI security and neighbouring fields, grouped into named topic regions. Some papers carry a review written by a Claude model from the full text and checked against it by the same model; it is a reading aid, not peer review.';
/** H3 */
export const ATLAS_HEADLINE = 'A map of AI-security research';
/** H4: the dek where the map is drawn (860px and wider). */
export const ATLAS_DEK_WIDE =
  'Each dot is a paper on AI security or a neighbouring field, placed near papers on similar topics. Search for one you know, or click a region name to explore.';
/** H5: the dek below 860px, where the page is a list with the Show, Region and Sort controls. */
export const ATLAS_DEK_NARROW =
  'Papers on AI security and neighbouring fields, as a list you can search, filter and sort. On a wider screen this is an interactive map.';
/** A0 */
export const ABOUT_HEADING = 'About the reviews';
/** A1 */
export const ABOUT_REVIEWS =
  'Each review was written by a Claude model from the paper’s full text, then checked against that same text in a separate pass by the same model. It is a reading aid, not peer review: confirm anything important in the paper itself.';
/** A2 */
export const ABOUT_ABSTRACTS =
  'Abstracts are shown as recorded in each paper’s bibliographic metadata; no model wrote or edited them.';
/**
 * A3. True for every rendered link: each goes through `landingUrl()` below,
 * which leaves out direct file downloads. The hosts are not a closed set
 * (publishers, doi.org, arXiv, repositories, databases), so the sentence gives
 * examples, and it does not say "public": some database record pages ask for
 * a sign-in (measured 2026-10-04).
 */
export const ABOUT_LINKS =
  'Links go to the paper’s landing page on another site, such as its publisher’s page, its DOI link or its arXiv entry. Links that look like direct file downloads are left out.';

/** H1: the page name in the rail masthead, the same in every state. */
export const ATLAS_NAME = 'Research Atlas';
/** H2: the badge beside the page name. */
export const PREVIEW_BADGE = 'Preview';
/** H2: the badge's `title`. */
export const PREVIEW_TITLE =
  'This page is a preview. It is not linked from the rest of the site, it asks search engines not to index it, and its data and design are still changing.';
/** E1 */
export const START_HEADING = 'Start with a well-known paper';
/** RA1-RA3: the rail body's accessible name, by what it shows. */
export const RAIL_LABEL = {
  explore: 'About the atlas',
  region: 'Region details',
  paper: 'Paper details',
} as const;
export type RailView = keyof typeof RAIL_LABEL;

/* --- tiers (SPEC §11.3, T1) -------------------------------------------------- */

export type Tier = 'review' | 'abstract' | 'none';

export const TIER_LABEL: Record<Tier, string> = {
  review: 'Review',
  abstract: 'Abstract',
  none: 'No summary',
};

/** r=1 is a review whether or not an abstract also exists; else a=1 is an abstract. */
export function tierOf(node: Pick<AtlasNode, 'r' | 'a'>): Tier {
  if (node.r === 1) return 'review';
  if (node.a === 1) return 'abstract';
  return 'none';
}

/* --- the "Show" filter and the zoom cluster (SPEC §7.2, §6.11, §11.3) --------- */

/** Cumulative: every option includes the tiers of the options after it. */
export type TierFilter = 'all' | 'text' | 'review';

/** F0: the filter's visible legend. */
export const FILTER_LEGEND = 'Show';
/** F1-F3, in display order. Each option's count is appended from data at runtime. */
export const FILTER_OPTIONS: ReadonlyArray<{ value: TierFilter; label: string }> = [
  { value: 'all', label: 'All papers' },
  { value: 'text', label: 'Review or abstract' },
  { value: 'review', label: 'Review only' },
];
/** V0-V2: the map-capable toolbar's view switch (V0 is its sr-only legend). */
export type AtlasView = 'map' | 'list';
export const VIEW_LEGEND = 'View';
export const VIEW_OPTIONS: ReadonlyArray<{ value: AtlasView; label: string }> = [
  { value: 'map', label: 'Map' },
  { value: 'list', label: 'List' },
];

/** LS3: the list's orders, in menu order. */
export type ListSort = 'reviews' | 'cited' | 'newest';
export const LIST_SORT_OPTIONS: ReadonlyArray<{ value: ListSort; label: string }> = [
  { value: 'reviews', label: 'Reviews first' },
  { value: 'cited', label: 'Most cited' },
  { value: 'newest', label: 'Newest' },
];

/** Z1-Z3: each button's aria-label and title. */
export const ZOOM_IN = 'Zoom in';
export const ZOOM_OUT = 'Zoom out';
export const ZOOM_FIT = 'Fit the whole map';
/** N1: above the list when the browser cannot draw the map at 860px and up. */
export const NO_WEBGL_NOTE =
  'Your browser can’t draw the map (WebGL is unavailable), so the papers are shown as a list.';

/* --- numbers ----------------------------------------------------------------- */

const NUMBER = new Intl.NumberFormat('en-GB');

/** Counts shown to readers: always from data at runtime, always "35,903" style. */
export function formatCount(n: number): string {
  return NUMBER.format(n);
}

/** "1,366 citations", or "1 citation". */
export function citationsText(n: number): string {
  return `${formatCount(n)} citation${n === 1 ? '' : 's'}`;
}

/* --- panel copy (SPEC §11.6) -------------------------------------------------- */

/** P8 */
export const NO_LANDING_PAGE = 'No public landing page is recorded for this paper.';
/** P9: fixed text, so the badge never depends on the fetch and never shifts. */
export const REVIEW_BADGE = 'Model-written review';
/** P11 */
export const MINOR_ISSUES = 'The check flagged minor issues with this review.';
/** P12 */
export const REVIEW_DISCLOSURE = 'How this review was made';
/** P14 */
export const REVIEW_CLOSING = 'A reading aid, not peer review. Confirm important details in the paper itself.';
/** P19 */
export const ABSTRACT_HEADING = 'Abstract';
/** P20. True: abstracts come from the bibliographic record with no model in the loop. */
export const ABSTRACT_NOTE =
  'As recorded in the paper’s bibliographic metadata. No model wrote, edited or checked this text.';
/** P22 */
export const BARE_HEADING = 'No review or abstract';
/** P28 */
export const SIMILAR_HEADING = 'Similar papers';
/** P1: the panel's close button (aria-label). */
export const CLOSE_PAPER = 'Close paper details';
/** P2: the trail button reads "‹ Back"; its sr-only tail names the paper it returns to. */
export const BACK_LABEL = 'Back';
export function backTail(previousTitle: string): string {
  return ` to ${previousTitle}`;
}
/** LS9: the list-mode way out of a paper, "‹ All papers". */
export const ALL_PAPERS = 'All papers';

/** E2: "{cc} citations · Review", under each "Start with" row. */
export function startRowNote(citations: number): string {
  return `${formatCount(citations)} citation${citations === 1 ? '' : 's'} · ${TIER_LABEL.review}`;
}

/**
 * P23 / P23b, adjusted so each clause is literally true for the paper shown:
 * "venue" is named only when the paper has one (over a thousand papers in
 * this tier have an empty venue, measured 2026-10-04). The link sits in the
 * action row under the title, above this note, hence "at the link above".
 */
export function bareNote(hasVenue: boolean, hasLink: boolean): string {
  const held = hasVenue ? 'title, venue and place on the map' : 'title and place on the map';
  return hasLink
    ? `The atlas has this paper’s ${held}, but no review or abstract. Read the paper itself at the link above.`
    : `The atlas has this paper’s ${held}, but no review, abstract or public landing page.`;
}

/**
 * P7: what the paper's link says, from the landing page's host: arxiv.org
 * gives "Open on arXiv", doi.org and dx.doi.org give "Open via DOI", and any
 * other host gives "Open on {host}" with a leading "www." dropped (for
 * example "Open on dl.acm.org"). The ↗ and the sr-only "(opens in a new tab)"
 * are the panel's. Null when the URL has no readable host: the panel then
 * shows P8 rather than a link it cannot name. Only ever called with the
 * output of landingUrl(), so it never names a raw file.
 */
export function linkLabel(url: string | null | undefined): string | null {
  if (!url) return null;
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  host = host.replace(/^www\./, '').replace(/\.$/, '');
  if (!host) return null;
  if (host === 'arxiv.org') return 'Open on arXiv';
  if (host === 'doi.org' || host === 'dx.doi.org') return 'Open via DOI';
  return `Open on ${host}`;
}

/* --- list mode and search (SPEC §11.2, §11.5) --------------------------------- */

const papersWord = (n: number) => (n === 1 ? 'paper' : 'papers');

/** LS4: the list's status line, naming the region when the list is narrowed to one. */
export function listStatus(shown: number, total: number, regionLabel?: string | null): string {
  const line = `Showing ${formatCount(shown)} of ${formatCount(total)} ${papersWord(total)}`;
  return regionLabel ? `${line} in ${regionLabel}` : line;
}

/** LS5: "Show {k} more ({left} left)", or "Show the last {left}" once a page or less is left. */
export function listMoreLabel(left: number, page: number): string {
  return left > page
    ? `Show ${formatCount(page)} more (${formatCount(left)} left)`
    : `Show the last ${formatCount(left)}`;
}

/** F-sel and R3: a native select's option with its count, "All papers (35,903)" or "Watermarking (309)". */
export function optionWithCount(label: string, count: number): string {
  return `${label} (${formatCount(count)})`;
}

/** S2 / S2b: the search placeholder, with the corpus size once it is known. */
export function searchPlaceholder(papers: number | null): string {
  return papers === null ? 'Search papers by title or venue' : `Search ${formatCount(papers)} papers by title or venue`;
}

/** S6: the empty state's first line, quoting what the reader typed. */
export function noMatchNote(query: string): string {
  return `No titles or venues match “${query}”.`;
}

/** S7 */
export const SEARCH_SCOPE_NOTE = 'Search covers titles and venues, not authors.';

/** S8: what the search's live region says once typing pauses. */
export function searchAnnouncement(results: number): string {
  if (results === 0) return 'No matching papers.';
  if (results === 1) return '1 result. Press Enter to open.';
  return `${formatCount(results)} results. Use the up and down arrows to choose, then Enter to open.`;
}

/** P25: the paper's display region, counted. */
export function regionPapersLine(papers: number, reviewed: number): string {
  return `${formatCount(papers)} ${papersWord(papers)} in this region · ${formatCount(reviewed)} with a review`;
}

/* --- review provenance (SPEC §9.3) -------------------------------------------- */

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * "2026-07-21T11:43:52Z" -> "21 Jul 2026". Anything that is not a YYYY-MM-DD
 * prefix with a real month and day is returned unchanged rather than guessed.
 * Deliberately not toLocaleDateString: engines disagree ("Sept" vs "Sep").
 */
export function formatCheckDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso).slice(0, 10));
  if (!m) return iso;
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return iso;
  return `${day} ${MON[month - 1]} ${m[1]}`;
}

export interface ProvenanceRow {
  term: string;
  value: string;
  /** render `value` in a monospace face: it is a raw identifier from the payload */
  mono?: boolean;
  /** a plain-language explanation shown under the value */
  note?: string;
}

export interface ProvenanceCopy {
  /** P9, the same for every review */
  badge: string;
  /** P10a / P10b / P10c */
  summary: string;
  /** P11 when the recorded verdict is `minor_issues`, otherwise null */
  minorIssues: string | null;
  /** P13 rows for the "How this review was made" disclosure, in a fixed order */
  details: ProvenanceRow[];
  /** P14 */
  closing: string;
}

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

/**
 * The only producer of provenance text. It reads an explicit whitelist of
 * fields (never iterates the payload), and states nothing the payload does not
 * carry:
 * - the writer is "Claude" only when the recorded id starts with "claude-";
 *   ids are never mapped to product names;
 * - a check is mentioned only when a checking model is recorded;
 * - a date is given only from `verified_at`, worded as when the check was
 *   RECORDED (it is a batch stamp shared by hundreds of reviews, measured
 *   2026-10-04), never as when it ran;
 * - `date_note` is never read, so its text can never reach a reader;
 * - raw model ids appear only in `details`, never in `summary` (unless the
 *   writer and the checker differ, when naming the checker is the point).
 */
export function reviewProvenance(p?: ReviewProvenance | null): ProvenanceCopy {
  const gen = text(p?.generator_model);
  const checker = text(p?.verifier_model);
  const rawSource = text(p?.source);
  const verdict = text(p?.verifier_verdict);
  const recordedAt = text(p?.verified_at);

  const fullText = rawSource === 'PDF full text';
  const sameModel = gen !== null && checker !== null && gen === checker;
  const writer = gen !== null && /^claude-/i.test(gen) ? 'Claude' : 'a language model';
  const source = fullText ? 'the paper’s full text' : rawSource;

  let sentence = `Written by ${writer}`;
  if (source) sentence += ` from ${source}`;
  if (checker) {
    const by = sameModel ? 'the same model' : checker;
    sentence += source ? `, then checked against that text by ${by}` : `, then checked by ${by}`;
  }

  let summary: string;
  if (checker && recordedAt) {
    summary = `${sentence}; the check was recorded on ${formatCheckDate(recordedAt)}.`;
  } else if (checker) {
    summary = `${sentence}. The check date was not recorded.`;
  } else {
    summary = `${sentence}.`;
  }

  const details: ProvenanceRow[] = [];
  if (gen !== null && sameModel) {
    details.push({
      term: 'Model',
      value: gen,
      mono: true,
      note: 'The exact identifier recorded for the model that wrote this review and then checked it.',
    });
  } else {
    if (gen) details.push({ term: 'Written by', value: gen, mono: true });
    if (checker) details.push({ term: 'Checked by', value: checker, mono: true });
  }
  if (rawSource) details.push({ term: 'Source', value: fullText ? 'The paper’s full text' : rawSource });
  if (checker) {
    const who = sameModel ? 'the same model' : checker;
    details.push({
      term: 'Check',
      value: fullText
        ? `A separate pass in which ${who} compared the review with the paper’s text.`
        : `A separate pass in which ${who} checked the review.`,
    });
  }
  if (verdict) {
    details.push({
      term: 'Check result',
      value:
        verdict === 'clean' ? 'No issues found' : verdict === 'minor_issues' ? 'Minor issues found' : verdict,
    });
  }
  if (checker) {
    details.push({ term: 'Check recorded', value: recordedAt ? formatCheckDate(recordedAt) : 'Not recorded' });
  }

  return {
    badge: REVIEW_BADGE,
    summary,
    minorIssues: verdict === 'minor_issues' ? MINOR_ISSUES : null,
    details,
    closing: REVIEW_CLOSING,
  };
}

/* --- review text hygiene (SPEC §9.3) ------------------------------------------- */

/* First-person pipeline phrasing only ("based on the provided excerpt", "I only
   had a portion of"). The earlier, looser pattern matched "only a portion" and
   deleted genuine review sentences, one of them an authors' stated limitation.
   On the 2026-10-04 build this pattern matches no review field at all. */
const PIPELINE_NOISE =
  /\b(?:(?:the|this) (?:excerpt|portion) (?:provided|i (?:was given|received))|text provided to me|based on the provided excerpt|pages read|i (?:only )?(?:had|saw|read) (?:only )?(?:a portion|part) of)\b/i;

/**
 * Drops any sentence that is pipeline plumbing rather than review content.
 * Text with no such sentence comes back exactly as given (trimmed). A sentence
 * ends at . ! or ? followed by whitespace, so "3.5" and "arXiv:2310.08419" are
 * never split. No regex lookbehind: older Safari cannot parse it.
 */
export function stripPipelineNoise(input?: string | null): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (!PIPELINE_NOISE.test(trimmed)) return trimmed;
  return trimmed
    .replace(/([.!?])\s+/g, '$1\u0000')
    .split('\u0000')
    .filter((sentence) => !PIPELINE_NOISE.test(sentence))
    .join(' ')
    .trim();
}

/* --- paper links (SPEC §9.4; CONTEXT §5 invariant 1) --------------------------- */

/** SPEC §9.4, verbatim. */
const RAW_FILE = /\.pdf(?:$|[?#&])|\/download\b|viewcontent\.cgi|[?&]type=chapterpdf|\/pdf(?:\/|\?|$)|stamp\.jsp/i;
/* File endpoints the SPEC pattern misses (invariant 1 outranks the spec).
   Probed read-only on 2026-10-04: files.osf.io answers with an attachment
   named *.pdf and %PDF- bytes; a DSpace .../bitstreams/<uuid>/content answers
   application/pdf with %PDF- bytes. figshare /ndownloader/, preprints.org
   /download_pub, Europe PMC ?pdf=render and HeinOnline get_pdf.cgi sit behind
   bot walls but are named as file downloads, so A3 requires leaving them out.
   Probed again on 2026-10-04 (final review): repository.tudelft.nl/file/...
   and edepot.wur.nl/<number> answer application/pdf with %PDF- bytes, and
   /servlets/purl/ is the full-text file route of NSF PAR (and OSTI). None of
   them carries a DOI, so each is dropped rather than rescued. */
const RAW_FILE_EXTRA =
  /files\.osf\.io\/v\d+\/resources\/|\/bitstreams\/[^/?#]+\/content(?:$|[/?#])|\/ndownloader\/|\/download_pub(?:$|[/?#])|[?&]pdf=render(?:$|[&#])|get_pdf\.cgi|repository\.tudelft\.nl\/file\/|edepot\.wur\.nl\/\d+(?:$|[/?#])|\/servlets\/purl\//i;
const DOI_IN_URL = /[?&](?:identifierValue|urlId)=(10\.\d{4,9}(?:%2F|\/)[^&#]+)/i;
/** A DOI whose suffix is letters only, e.g. https://doi.org/10.5281/zenodo (a repository, not a paper). */
const STUB_DOI = /^https?:\/\/(?:dx\.)?doi\.org\/10\.\d{4,9}\/[a-z]+\/?$/i;

function looksLikeFile(u: string): boolean {
  return RAW_FILE.test(u) || RAW_FILE_EXTRA.test(u);
}

/**
 * The only way a paper link reaches the page. Returns the recorded public
 * landing page, a doi.org link rescued from a download URL that carries its
 * DOI, or null when the record holds no usable landing page: no link, a
 * non-http(s) link, a stub DOI, or a direct file download.
 */
export function landingUrl(u: string | null | undefined): string | null {
  if (!u || !/^https?:\/\//i.test(u) || STUB_DOI.test(u)) return null;
  if (!looksLikeFile(u)) return u;
  const m = u.match(DOI_IN_URL);
  if (!m) return null;
  let rescued: string;
  try {
    rescued = `https://doi.org/${decodeURIComponent(m[1])}`;
  } catch {
    return null;
  }
  return STUB_DOI.test(rescued) || looksLikeFile(rescued) ? null : rescued;
}
