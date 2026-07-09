'use client';

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

const API_BASE = (process.env.NEXT_PUBLIC_ASK_API_BASE ?? '').replace(/\/+$/, '');
const QUOTA_STORAGE_KEY = 'askai-quota';
const MIN_SELECTION = 20;
const MAX_SELECTION = 2000;
const MAX_QUESTION = 300;

const ERROR_GENERIC = "Couldn't reach the AI service. Please try again later.";
const ERROR_429_USER = "You've used your 5 free questions for today — resets at midnight UTC.";
const ERROR_429_GLOBAL = 'The daily budget for this feature is used up — try again tomorrow.';

type AskMode = 'explain' | 'summarize' | 'significance' | 'question';
type Status = 'idle' | 'streaming' | 'done' | 'error';

interface Quota {
  limit: number;
  remaining: number;
  resetAt: string | number;
}

interface PillPosition {
  top: number;
  left: number;
}

function useReducedMotion(): boolean {
  const subscribe = useCallback((cb: () => void) => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener('change', cb);
    return () => mq.removeEventListener('change', cb);
  }, []);
  const getSnapshot = useCallback(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );
  const getServerSnapshot = useCallback(() => false, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function useIsNarrow(): boolean {
  const subscribe = useCallback((cb: () => void) => {
    const mq = window.matchMedia('(max-width: 559px)');
    mq.addEventListener('change', cb);
    return () => mq.removeEventListener('change', cb);
  }, []);
  const getSnapshot = useCallback(() => window.matchMedia('(max-width: 559px)').matches, []);
  const getServerSnapshot = useCallback(() => false, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Truncate to MAX_SELECTION chars at a word boundary. */
function truncateSelection(text: string): string {
  if (text.length <= MAX_SELECTION) return text;
  const cut = text.slice(0, MAX_SELECTION);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > MAX_SELECTION / 2 ? cut.slice(0, lastSpace) : cut).trimEnd();
}

/** Parse a resetAt value (epoch seconds, epoch ms, or ISO string) into epoch ms. */
function parseResetAt(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number' || /^\d+$/.test(String(value))) {
    const n = Number(value);
    // Heuristic: values below 1e12 are epoch seconds.
    return n < 1e12 ? n * 1000 : n;
  }
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function readCachedQuota(): Quota | null {
  try {
    const raw = window.localStorage.getItem(QUOTA_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Quota;
    if (typeof parsed.limit !== 'number' || typeof parsed.remaining !== 'number') return null;
    // A past reset timestamp means the cached count is stale.
    if (parseResetAt(parsed.resetAt) <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedQuota(quota: Quota): void {
  try {
    window.localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(quota));
  } catch {
    // localStorage unavailable (private mode etc.) — non-fatal.
  }
}

/**
 * Minimal, safe renderer for the markdown subset model answers emit:
 * **bold**, *italic*, `code`, bullet/numbered lists, #-headings.
 * Builds React nodes directly — no HTML injection. Tolerates the
 * incomplete markdown that appears mid-stream (unclosed markers render
 * literally until their closing token arrives).
 */
function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const emphasis = (seg: string, kb: string): ReactNode[] => {
    const out: ReactNode[] = [];
    seg.split(/(\*\*.+?\*\*)/g).forEach((b, i) => {
      if (/^\*\*.+\*\*$/.test(b)) {
        out.push(
          <strong key={`${kb}-b${i}`} className="font-semibold text-[var(--color-text)]">
            {b.slice(2, -2)}
          </strong>
        );
      } else if (b) {
        b.split(/(\*[^*\s][^*]*\*)/g).forEach((it, j) => {
          if (/^\*[^*\s][^*]*\*$/.test(it)) {
            out.push(<em key={`${kb}-i${i}-${j}`}>{it.slice(1, -1)}</em>);
          } else if (it) {
            out.push(it);
          }
        });
      }
    });
    return out;
  };
  text.split(/(`[^`]+`)/g).forEach((seg, i) => {
    if (/^`[^`]+`$/.test(seg)) {
      nodes.push(
        <code
          key={`${keyBase}-c${i}`}
          className="bg-[var(--color-bg-secondary)] px-1.5 py-0.5 rounded text-[0.9em] font-mono"
        >
          {seg.slice(1, -1)}
        </code>
      );
    } else if (seg) {
      nodes.push(...emphasis(seg, `${keyBase}-s${i}`));
    }
  });
  return nodes;
}

interface AnswerBlock {
  type: 'p' | 'heading' | 'ul' | 'ol';
  children: ReactNode[];
  items?: ReactNode[][];
}

function AnswerMarkdown({ text, cursor }: { text: string; cursor?: ReactNode }) {
  const blocks: AnswerBlock[] = [];
  let list: AnswerBlock | null = null;

  text.split('\n').forEach((raw, idx) => {
    const line = raw.trimEnd();
    const key = `blk-${idx}`;
    const bullet = /^\s*[-*\u2022]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const heading = /^#{1,4}\s+(.*)$/.exec(line);

    if (bullet && !/^\*\s*\*/.test(line)) {
      if (!list || list.type !== 'ul') {
        list = { type: 'ul', children: [], items: [] };
        blocks.push(list);
      }
      list.items!.push(renderInline(bullet[1], key));
    } else if (numbered) {
      if (!list || list.type !== 'ol') {
        list = { type: 'ol', children: [], items: [] };
        blocks.push(list);
      }
      list.items!.push(renderInline(numbered[1], key));
    } else {
      list = null;
      if (heading) {
        blocks.push({ type: 'heading', children: renderInline(heading[1], key) });
      } else if (line.trim()) {
        blocks.push({ type: 'p', children: renderInline(line.replace(/^>\s?/, ''), key) });
      }
    }
  });

  // Streaming caret rides the end of the last block instead of a new line.
  if (cursor) {
    const last = blocks[blocks.length - 1];
    if (!last) {
      blocks.push({ type: 'p', children: [cursor] });
    } else if (last.type === 'ul' || last.type === 'ol') {
      const lastItem = last.items![last.items!.length - 1];
      if (lastItem) lastItem.push(cursor);
      else last.items!.push([cursor]);
    } else {
      last.children.push(cursor);
    }
  }

  return (
    <>
      {blocks.map((block, i) => {
        const key = `ans-${i}`;
        if (block.type === 'ul' || block.type === 'ol') {
          const ListTag = block.type;
          return (
            <ListTag
              key={key}
              className={`mb-2.5 last:mb-0 pl-5 space-y-1 ${
                block.type === 'ol' ? 'list-decimal' : 'list-disc'
              }`}
            >
              {block.items!.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ListTag>
          );
        }
        if (block.type === 'heading') {
          return (
            <p key={key} className="mb-1.5 mt-2 first:mt-0 font-semibold text-[var(--color-text)]">
              {block.children}
            </p>
          );
        }
        return (
          <p key={key} className="mb-2.5 last:mb-0">
            {block.children}
          </p>
        );
      })}
    </>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2l1.9 5.7a2 2 0 001.27 1.26L20.8 10.8l-5.63 1.88a2 2 0 00-1.27 1.26L12 19.6l-1.9-5.66a2 2 0 00-1.27-1.26L3.2 10.8l5.63-1.84A2 2 0 0010.1 7.7L12 2z" />
      <path d="M19.5 15.5l.85 2.55 2.55.85-2.55.85-.85 2.55-.85-2.55-2.55-.85 2.55-.85.85-2.55z" />
    </svg>
  );
}

const CHIP_ACTIONS: Array<{ label: string; mode: AskMode }> = [
  { label: 'Explain this', mode: 'explain' },
  { label: 'Summarize', mode: 'summarize' },
  { label: 'Why does it matter?', mode: 'significance' },
];

export default function AskAI() {
  const [mounted, setMounted] = useState(false);
  const [pillVisible, setPillVisible] = useState(false);
  const [pillPos, setPillPos] = useState<PillPosition | null>(null);
  const [pillShown, setPillShown] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelShown, setPanelShown] = useState(false);
  const [selectionText, setSelectionText] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [quota, setQuota] = useState<Quota | null>(null);

  const reducedMotion = useReducedMotion();
  const isNarrow = useIsNarrow();

  const panelRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const hidePillTimerRef = useRef<number | null>(null);
  const pillPressedRef = useRef(false);
  const headerQuotaAtRef = useRef(0);
  const panelOpenRef = useRef(false);
  panelOpenRef.current = panelOpen;

  useEffect(() => {
    setMounted(true);
  }, []);

  // --- Selection tracking -------------------------------------------------

  const cancelPillHide = useCallback(() => {
    if (hidePillTimerRef.current !== null) {
      window.clearTimeout(hidePillTimerRef.current);
      hidePillTimerRef.current = null;
    }
  }, []);

  // Hide with a short delay: on touch devices the tap that activates the pill
  // first collapses the selection, and hiding synchronously would unmount the
  // button before its tap can register. Cancelled when the pill is pressed.
  const hidePillSoon = useCallback(() => {
    if (hidePillTimerRef.current !== null) return;
    hidePillTimerRef.current = window.setTimeout(() => {
      hidePillTimerRef.current = null;
      if (pillPressedRef.current) return; // tap in progress on the pill
      setPillVisible(false);
    }, 150);
  }, []);

  useEffect(() => cancelPillHide, [cancelPillHide]);

  const updateFromSelection = useCallback(() => {
    if (panelOpenRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      hidePillSoon();
      return;
    }

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const element =
      container.nodeType === Node.ELEMENT_NODE
        ? (container as Element)
        : container.parentElement;

    if (!element || element.closest('[data-askai]') || !element.closest('.article-content')) {
      hidePillSoon();
      return;
    }

    const text = selection.toString().trim();
    if (text.length < MIN_SELECTION) {
      hidePillSoon();
      return;
    }

    setSelectionText(truncateSelection(text));

    if (window.innerWidth < 560) {
      // Narrow screens: pill is pinned bottom-center, no per-selection math.
      setPillPos(null);
    } else {
      const rect = range.getBoundingClientRect();
      const pillHeight = 32;
      const gap = 8;
      let top = rect.top - pillHeight - gap;
      if (top < gap) top = rect.bottom + gap;
      top = Math.min(Math.max(top, gap), window.innerHeight - pillHeight - gap);
      const left = Math.min(Math.max(rect.left + rect.width / 2, 60), window.innerWidth - 60);
      setPillPos({ top, left });
    }
    cancelPillHide();
    setPillVisible(true);
  }, [cancelPillHide, hidePillSoon]);

  useEffect(() => {
    if (!mounted) return;
    const handler = () => updateFromSelection();
    document.addEventListener('selectionchange', handler);
    document.addEventListener('mouseup', handler, { passive: true });
    document.addEventListener('touchend', handler, { passive: true });
    return () => {
      document.removeEventListener('selectionchange', handler);
      document.removeEventListener('mouseup', handler);
      document.removeEventListener('touchend', handler);
    };
  }, [mounted, updateFromSelection]);

  // Keep the pill glued to the selection while the page scrolls.
  useEffect(() => {
    if (!pillVisible) return;
    const handler = () => updateFromSelection();
    window.addEventListener('scroll', handler, { passive: true });
    window.addEventListener('resize', handler, { passive: true });
    return () => {
      window.removeEventListener('scroll', handler);
      window.removeEventListener('resize', handler);
    };
  }, [pillVisible, updateFromSelection]);

  // Pill entrance animation (fade/scale-in ~150ms, skipped for reduced motion).
  useEffect(() => {
    if (!pillVisible) {
      setPillShown(false);
      return;
    }
    if (reducedMotion) {
      setPillShown(true);
      return;
    }
    const id = requestAnimationFrame(() => setPillShown(true));
    return () => cancelAnimationFrame(id);
  }, [pillVisible, reducedMotion]);

  // --- Quota ---------------------------------------------------------------

  const refreshQuota = useCallback(async () => {
    const cached = readCachedQuota();
    if (cached) setQuota(cached);
    const startedAt = Date.now();
    try {
      const res = await fetch(`${API_BASE}/api/ask/quota`);
      if (!res.ok) return;
      const data = (await res.json()) as Quota;
      // A response from an ask() call may have delivered fresher
      // X-RateLimit-* headers while this GET was in flight — don't clobber it.
      if (headerQuotaAtRef.current >= startedAt) return;
      if (typeof data.limit === 'number' && typeof data.remaining === 'number') {
        setQuota(data);
        writeCachedQuota(data);
      }
    } catch {
      // Keep cached value; quota display is best-effort.
    }
  }, []);

  const applyQuotaHeaders = useCallback((res: Response) => {
    const limit = Number(res.headers.get('X-RateLimit-Limit'));
    const remaining = Number(res.headers.get('X-RateLimit-Remaining'));
    const resetAt = res.headers.get('X-RateLimit-Reset');
    if (Number.isFinite(limit) && Number.isFinite(remaining) && limit > 0 && resetAt) {
      const next: Quota = { limit, remaining, resetAt };
      headerQuotaAtRef.current = Date.now();
      setQuota(next);
      writeCachedQuota(next);
    }
  }, []);

  // --- Panel open / close ---------------------------------------------------

  const openPanel = useCallback(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelPillHide();
    pillPressedRef.current = false;
    setPanelOpen(true);
    setPillVisible(false);
    // Defensive: clear any answer/error left over from a previous session so a
    // late-resolving stream can never repopulate a freshly opened panel.
    setStatus('idle');
    setAnswer('');
    setErrorMessage('');
    refreshQuota();
  }, [refreshQuota, cancelPillHide]);

  const closePanel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPanelOpen(false);
    setStatus('idle');
    setAnswer('');
    setErrorMessage('');
    setQuestion('');

    // Return focus to where the reader was, falling back to the article.
    const previous = previousFocusRef.current;
    if (previous && document.contains(previous)) {
      previous.focus();
    } else {
      const article = document.querySelector<HTMLElement>('.article-content');
      if (article) {
        article.setAttribute('tabindex', '-1');
        article.focus({ preventScroll: true });
      }
    }
  }, []);

  // Panel entrance animation + initial focus.
  useEffect(() => {
    if (!panelOpen) {
      setPanelShown(false);
      return;
    }
    panelRef.current?.focus();
    if (reducedMotion) {
      setPanelShown(true);
      return;
    }
    const id = requestAnimationFrame(() => setPanelShown(true));
    return () => cancelAnimationFrame(id);
  }, [panelOpen, reducedMotion]);

  // Escape closes the panel.
  useEffect(() => {
    if (!panelOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closePanel();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [panelOpen, closePanel]);

  // Abort any in-flight request on unmount.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // --- Streaming ask --------------------------------------------------------

  const ask = useCallback(
    async (mode: AskMode, customQuestion?: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStatus('streaming');
      setAnswer('');
      setErrorMessage('');

      try {
        const body: { selection: string; mode: AskMode; question?: string } = {
          selection: selectionText,
          mode,
        };
        if (mode === 'question' && customQuestion) {
          body.question = customQuestion.slice(0, MAX_QUESTION);
        }

        const res = await fetch(`${API_BASE}/api/ask`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        applyQuotaHeaders(res);

        if (!res.ok) {
          let message = ERROR_GENERIC;
          if (res.status === 429) {
            message = ERROR_429_USER;
            try {
              const errBody = (await res.json()) as { scope?: string };
              if (errBody.scope === 'global') message = ERROR_429_GLOBAL;
            } catch {
              // Fall through with the user-scope message.
            }
          }
          if (controller.signal.aborted) return;
          setStatus('error');
          setErrorMessage(message);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('Response has no readable body');

        const decoder = new TextDecoder();
        let buffer = '';
        let finished = false;

        // Returns true when the [DONE] sentinel is reached.
        const processLine = (rawLine: string): boolean => {
          const line = rawLine.trim();
          if (!line.startsWith('data:')) return false;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') return true;
          try {
            const json = JSON.parse(payload) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const delta = json.choices?.[0]?.delta?.content;
            // Only append while this request is still the active one — a
            // resolved read from an aborted stream must not leak into a new
            // answer or a closed panel.
            if (
              typeof delta === 'string' &&
              delta.length > 0 &&
              abortRef.current === controller &&
              !controller.signal.aborted
            ) {
              setAnswer((prev) => prev + delta);
            }
          } catch {
            // Skip malformed SSE chunks.
          }
          return false;
        };

        while (!finished) {
          const { done, value } = await reader.read();
          if (controller.signal.aborted) return;
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const rawLine of lines) {
            if (processLine(rawLine)) {
              finished = true;
              break;
            }
          }
        }

        if (!finished) {
          // Flush the decoder and handle a final SSE line that arrived
          // without a trailing newline.
          buffer += decoder.decode();
          if (buffer.trim()) processLine(buffer);
        }
        reader.cancel().catch(() => {
          // Stream already closed — nothing to release.
        });

        if (!controller.signal.aborted && abortRef.current === controller) setStatus('done');
      } catch {
        if (controller.signal.aborted) return;
        setStatus('error');
        setErrorMessage(ERROR_GENERIC);
      }
    },
    [selectionText, applyQuotaHeaders]
  );

  const submitQuestion = useCallback(() => {
    const trimmed = question.trim();
    if (!trimmed || status === 'streaming') return;
    ask('question', trimmed);
  }, [question, status, ask]);

  // --- Render ----------------------------------------------------------------

  if (!mounted) return null;

  const busy = status === 'streaming';
  const enterClasses = (shown: boolean) =>
    reducedMotion
      ? ''
      : `transition-[opacity,transform] duration-150 ${shown ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`;

  // Portal to <body>: an ancestor with a transform (e.g. the page-transition
  // fade, whose fill-mode keeps `transform: translateY(0)` applied) would
  // otherwise become the containing block for these fixed-position elements,
  // pinning them to the page instead of the viewport.
  return createPortal(
    <>
      {pillVisible && !panelOpen && (
        <button
          type="button"
          data-askai
          aria-label="Ask AI about selected text"
          onMouseDown={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            // Keep the selection (and thus the pill) alive while pressing.
            e.preventDefault();
            pillPressedRef.current = true;
          }}
          onPointerUp={() => {
            pillPressedRef.current = false;
          }}
          onPointerLeave={() => {
            pillPressedRef.current = false;
          }}
          onPointerCancel={() => {
            pillPressedRef.current = false;
          }}
          onTouchStart={() => {
            pillPressedRef.current = true;
          }}
          onTouchCancel={() => {
            pillPressedRef.current = false;
          }}
          onTouchEnd={(e) => {
            // iOS collapses the selection on tap, which would hide the pill
            // before the synthesized click fires — open directly instead.
            e.preventDefault();
            openPanel();
          }}
          onClick={openPanel}
          className={`z-[60] flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--color-text)] text-[var(--color-bg)] text-[13px] font-medium shadow-md no-print ${
            pillPos
              ? 'fixed -translate-x-1/2'
              : 'fixed bottom-6 left-1/2 -translate-x-1/2'
          } ${enterClasses(pillShown)}`}
          style={pillPos ? { top: pillPos.top, left: pillPos.left } : undefined}
        >
          <SparkleIcon className="w-3.5 h-3.5" />
          Ask AI
        </button>
      )}

      {panelOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label="Ask AI about selected text"
          tabIndex={-1}
          data-askai
          className={`fixed z-[70] flex flex-col bg-[var(--color-bg)] border border-[var(--color-border)] shadow-xl outline-none no-print ${
            isNarrow
              ? 'inset-x-0 bottom-0 w-full max-h-[80vh] rounded-t-xl border-b-0'
              : 'bottom-6 right-6 w-[380px] max-h-[70vh] rounded-xl'
          } ${enterClasses(panelShown)}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
            <h2 className="font-serif text-[15px] font-semibold text-[var(--color-text)]">
              Ask AI
            </h2>
            <button
              type="button"
              onClick={closePanel}
              aria-label="Close"
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Selection preview */}
          <blockquote className="mx-4 mb-3 pl-3 border-l-2 border-[var(--color-border)] text-[13px] italic leading-snug text-[var(--color-text-secondary)] line-clamp-2">
            {selectionText}
          </blockquote>

          {/* Action chips + custom question */}
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {CHIP_ACTIONS.map((chip) => (
              <button
                key={chip.mode}
                type="button"
                disabled={busy}
                onClick={() => ask(chip.mode)}
                className="px-3 py-1 rounded-full border border-[var(--color-border)] text-[13px] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                {chip.label}
              </button>
            ))}
            <input
              type="text"
              value={question}
              disabled={busy}
              maxLength={MAX_QUESTION}
              placeholder="Or ask your own question…"
              aria-label="Ask your own question about the selected text"
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submitQuestion();
                }
              }}
              className="w-full mt-1 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-transparent text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors disabled:opacity-50"
            />
          </div>

          {/* Screen-reader announcements: discrete state changes only — the
              token-by-token stream stays out to avoid chatter. */}
          <div aria-live="polite" role="status" className="sr-only">
            {status === 'streaming' && 'Generating answer…'}
            {status === 'done' && answer}
            {status === 'error' && errorMessage}
          </div>

          {/* Answer area */}
          {(answer || busy || status === 'error') && (
            <div className="px-4 pb-3 overflow-y-auto border-t border-[var(--color-border)] pt-3 min-h-0">
              {status === 'error' ? (
                <p className="text-[13px] text-[var(--color-text-secondary)]">{errorMessage}</p>
              ) : (
                <div className="text-[15px] leading-[1.7] text-[var(--color-text)]">
                  <AnswerMarkdown
                    text={answer}
                    cursor={
                      busy ? (
                        <span
                          key="caret"
                          aria-hidden="true"
                          className={`inline-block w-[2px] h-[1em] align-text-bottom ml-0.5 bg-[var(--color-text-muted)] ${
                            reducedMotion ? '' : 'animate-pulse'
                          }`}
                        />
                      ) : undefined
                    }
                  />
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-[var(--color-border)] text-[11px] text-[var(--color-text-muted)] space-y-0.5">
            {quota && (
              <p>
                {quota.remaining} of {quota.limit} free questions left today
              </p>
            )}
            <p>Selected text is sent to NVIDIA&apos;s API to generate the answer.</p>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
