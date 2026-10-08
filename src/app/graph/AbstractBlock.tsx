'use client';

import { useEffect, useRef, useState } from 'react';
import { ABSTRACT_HEADING, ABSTRACT_NOTE, ABSTRACT_NOTE_PAGE } from './atlasCopy';
import { displayText } from './atlasText';
import { fetchShardEntry } from './useAtlasData';

/* Copy deck P18–P21 and P34–P35 (SPEC §11.6); P19 and P20 come from atlasCopy. */
const SHOW_FULL = 'Show the full abstract';
const SHOW_LESS = 'Show less';
const LOADING_ABSTRACT = 'Loading the abstract…';
const ABSTRACT_FAILED = 'This paper’s abstract couldn’t be loaded.';
const TRY_AGAIN = 'Try again';

/** The shared small heading (SPEC §3.9), without a margin. */
const HEADING = 'font-sans text-xs font-medium uppercase tracking-wider text-(--color-text-muted)';
const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)';

export type AbstractStatus = 'loading' | 'ready' | 'error';

/** The display text of an abstract payload entry, reading only its `abstract` field; null when there is none. */
export function abstractOf(entry: unknown): string | null {
  if (!entry || typeof entry !== 'object') return null;
  const raw = (entry as { abstract?: unknown }).abstract;
  return typeof raw === 'string' ? displayText(raw) || null : null;
}

/** The note under an abstract: P20b when the payload says it was copied from the paper's first page, else P20. */
export function abstractNoteOf(entry: unknown): string {
  const prov = entry && typeof entry === 'object' ? (entry as { provenance?: { source?: unknown } }).provenance : undefined;
  return prov?.source === 'paper first page' ? ABSTRACT_NOTE_PAGE : ABSTRACT_NOTE;
}

/** The authors' abstract as a serif quotation, clamped to 12 lines, with the P20 / P20b note beneath it. */
function AbstractQuote({ text, note = ABSTRACT_NOTE }: { text: string; note?: string }) {
  const quoteRef = useRef<HTMLQuoteElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  // Offer "Show the full abstract" only when the clamp actually hides something.
  useEffect(() => {
    const el = quoteRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setOverflows(el.scrollHeight > el.clientHeight + 1));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <blockquote
        ref={quoteRef}
        data-atlas-measure="abstract"
        className={`mb-0 border-l-2 border-(--color-border) pl-4 font-serif text-[15px] leading-[1.7] whitespace-pre-line text-(--color-text) [overflow-wrap:anywhere] ${
          expanded ? '' : 'line-clamp-[12]'
        }`}
      >
        {text}
      </blockquote>
      {(expanded || overflows) && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className={`mt-1.5 ml-4 inline-flex min-h-6 items-center rounded-sm text-xs font-medium text-(--color-accent) hover:underline ${FOCUS_RING}`}
        >
          {expanded ? SHOW_LESS : SHOW_FULL}
        </button>
      )}
      <p data-atlas-measure="abstract-note" className="mt-2 mb-0 text-[12.5px] leading-snug text-(--color-text-muted)">
        {note}
      </p>
    </>
  );
}

function AbstractLoading() {
  return (
    <div data-atlas-measure="loading" className="space-y-2.5">
      <span className="sr-only">{LOADING_ABSTRACT}</span>
      <div aria-hidden="true" className="h-3 w-full rounded bg-(--color-bg-tertiary) motion-safe:animate-pulse" />
      <div aria-hidden="true" className="h-3 w-[92%] rounded bg-(--color-bg-tertiary) motion-safe:animate-pulse" />
      <div aria-hidden="true" className="h-3 w-[60%] rounded bg-(--color-bg-tertiary) motion-safe:animate-pulse" />
    </div>
  );
}

function AbstractError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" data-atlas-measure="load-error">
      <p className="mb-0 text-sm text-(--color-text-secondary)">{ABSTRACT_FAILED}</p>
      <button
        type="button"
        onClick={onRetry}
        className={`mt-2.5 min-h-8 rounded-md border border-(--color-border) px-3 py-1.5 text-sm font-medium text-(--color-text) hover:bg-(--color-bg-tertiary) ${FOCUS_RING}`}
      >
        {TRY_AGAIN}
      </button>
    </div>
  );
}

interface AbstractSectionProps {
  /** the abstract fetch, which is the panel's status for a paper with an abstract and no review (SPEC §9.6) */
  status: AbstractStatus;
  text: string | null;
  /** P20 or P20b, from the payload's provenance (abstractNoteOf) */
  note?: string;
  onRetry: () => void;
}

/* The abstract of a paper with no review (SPEC §9.5). Invariant 2: it is the
   authors' text, never presented as a review. It is set as a serif quotation
   under a neutral rule (the review is sans under an accent rule), headed
   "Abstract" and followed by the note that no model wrote, edited or checked
   it. */
export function AbstractSection({ status, text, note, onRetry }: AbstractSectionProps) {
  return (
    <section aria-labelledby="atlas-abstract-label" data-atlas-measure="abstract-section" className="mt-5">
      <h3 id="atlas-abstract-label" className={`mb-2 ${HEADING}`}>
        {ABSTRACT_HEADING}
      </h3>
      {status === 'loading' && <AbstractLoading />}
      {status === 'error' && <AbstractError onRetry={onRetry} />}
      {status === 'ready' && text && <AbstractQuote text={text} note={note} />}
    </section>
  );
}

/* The abstract of a paper that also has a review (143 papers): a closed
   disclosure after the review (P18) that fetches the abstract shard the first
   time it opens, so a reviewed paper's panel waits on the review alone. */
export function AbstractDisclosure({ paperId }: { paperId: string }) {
  const [status, setStatus] = useState<AbstractStatus | 'idle'>('idle');
  const [text, setText] = useState<string | null>(null);
  const [note, setNote] = useState<string | undefined>(undefined);
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const load = () => {
    setStatus('loading');
    fetchShardEntry<unknown>('abstracts', paperId)
      .then((entry) => {
        if (!aliveRef.current) return;
        const value = abstractOf(entry);
        setText(value);
        setNote(abstractNoteOf(entry));
        setStatus(value ? 'ready' : 'error');
      })
      .catch(() => {
        if (aliveRef.current) setStatus('error');
      });
  };

  return (
    <details
      data-atlas-measure="abstract-details"
      onToggle={(event) => {
        if (event.currentTarget.open && status === 'idle') load();
      }}
      className="group mt-6 border-t border-(--color-border) pt-4"
    >
      <summary
        className={`flex min-h-6 cursor-pointer list-none items-baseline justify-between gap-3 rounded-sm ${FOCUS_RING} [&::-webkit-details-marker]:hidden`}
      >
        <h3 id="atlas-abstract-label" className={`mb-0 ${HEADING}`}>
          {ABSTRACT_HEADING}
        </h3>
        <span
          aria-hidden="true"
          className="text-base leading-none text-(--color-text-muted) motion-safe:transition-transform group-open:rotate-90"
        >
          &rsaquo;
        </span>
      </summary>
      <div className="mt-3">
        {status === 'loading' && <AbstractLoading />}
        {status === 'error' && <AbstractError onRetry={load} />}
        {status === 'ready' && text && <AbstractQuote text={text} note={note} />}
      </div>
    </details>
  );
}
