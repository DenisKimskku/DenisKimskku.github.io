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
/** H5i: the dek below 860px, where the page is a list (interim wording until the list gains filters and sorting). */
export const ATLAS_DEK_NARROW =
  'Papers on AI security and neighbouring fields, as a list you can search. On a wider screen this is an interactive map.';
/** A0 */
export const ABOUT_HEADING = 'About the reviews';
/** A1 */
export const ABOUT_REVIEWS =
  'Each review was written by a Claude model from the paper’s full text, then checked against that same text in a separate pass by the same model. It is a reading aid, not peer review: confirm anything important in the paper itself.';
/** A2 */
export const ABOUT_ABSTRACTS =
  'Abstracts are shown as recorded in each paper’s bibliographic metadata; no model wrote or edited them.';
/** A3. True because every rendered paper link goes through `landingUrl()` below. */
export const ABOUT_LINKS =
  'Links point to a public landing page (publisher, DOI or arXiv). Links that look like direct file downloads are left out.';

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

/* --- numbers ----------------------------------------------------------------- */

const NUMBER = new Intl.NumberFormat('en-GB');

/** Counts shown to readers: always from data at runtime, always "35,903" style. */
export function formatCount(n: number): string {
  return NUMBER.format(n);
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

/**
 * P23 / P23b, adjusted so each clause is literally true for the paper shown:
 * - "venue" is named only when the paper has one (over a thousand papers in
 *   this tier have an empty venue, measured 2026-10-04);
 * - in packages 1-5 the panel's link sits in a band BELOW the body, so the
 *   pointer says "below". Package 6 moves the link above the body and must
 *   switch this back to the deck's "at the link above".
 */
export function bareNote(hasVenue: boolean, hasLink: boolean): string {
  const held = hasVenue ? 'title, venue and place on the map' : 'title and place on the map';
  return hasLink
    ? `The atlas has this paper’s ${held}, but no review or abstract. Read the paper itself at the link below.`
    : `The atlas has this paper’s ${held}, but no review, abstract or public landing page.`;
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
   bot walls but are named as file downloads, so A3 requires leaving them out. */
const RAW_FILE_EXTRA =
  /files\.osf\.io\/v\d+\/resources\/|\/bitstreams\/[^/?#]+\/content(?:$|[/?#])|\/ndownloader\/|\/download_pub(?:$|[/?#])|[?&]pdf=render(?:$|[&#])|get_pdf\.cgi/i;
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
