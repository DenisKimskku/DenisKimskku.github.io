'use client';

import React from 'react';
import { ACCENT_RULE, BTN_PRIMARY, BTN_QUIET, Badge, FOCUS, Label } from './ctfUi';
import type { ChatMessage } from './ctfLevels';

interface Props {
  messages: ChatMessage[];
  level: number;
  loading: boolean;
  /** `status` from the stream — currently "generating" on buffered levels. */
  phase: string;
  elapsed: number;
  /** True when the level has an egress filter: nothing streams until it passes. */
  buffered: boolean;
  multiTurn: boolean;
  contextWindow: number;
  logRef: React.RefObject<HTMLDivElement | null>;
  onRetry: (payload: string) => void;
  onUseFlag: (flag: string) => void;
  onStop: () => void;
}

/** A generation on the local Mac mini usually lands inside this. Used only to
 *  give the wait a shape — it degrades to an honest "longer than usual". */
const TYPICAL_S = 45;

export default function Transcript({
  messages, level, loading, phase, elapsed, buffered,
  multiTurn, contextWindow, logRef, onRetry, onUseFlag, onStop,
}: Props) {
  // Which turns the server still replays. System rows are client-side only and
  // never reach the model, so they do not count against the window.
  const conversational = messages.filter((m) => m.sender !== 'system');
  const retained = multiTurn ? conversational.slice(-contextWindow) : conversational;
  const retainedIds = new Set(retained.map((m) => m.id));
  const evicted = multiTurn && conversational.length > contextWindow;
  const firstRetainedId = retained.length > 0 ? retained[0].id : null;

  // Turn numbers derived before render, not accumulated during it.
  const turnOf = new Map<string, number>();
  let seen = 0;
  for (const m of messages) {
    if (m.sender === 'user') {
      seen += 1;
      turnOf.set(m.id, seen);
    }
  }

  return (
    <div
      ref={logRef}
      role="log"
      /* aria-relevant deliberately omits "text": with it, every streamed token
         is announced separately and a 2,000-character reply becomes unusable
         with a screen reader. Completion is announced once, from the status
         region in CTFTerminal. */
      aria-live="polite"
      aria-relevant="additions"
      aria-busy={loading}
      aria-label={`Transcript for level ${level}`}
      tabIndex={0}
      className={`min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 scrollbar-gutter-stable ${FOCUS}`}
    >
      {/* The first thing 59% of visitors ever saw here was a note about how
          output is escaped -- an implementation detail, where an invitation
          belonged. 57 of 97 sessions closed the tab without typing once. This is
          the only screen that gets a chance to change that, so it says what to
          do rather than what the renderer does. */}
      {messages.length === 0 && !loading && (
        <div className="max-w-prose space-y-2 py-6">
          <Label>Your move</Label>
          <p className="mb-0 text-sm leading-relaxed text-(--color-text-secondary)">
            A real language model is holding a secret, and it has been instructed not to give it
            to you. Talk to it in the box below — plain English works. You are not looking for a
            magic string; you are looking for a request it has no rule against answering.
          </p>
          <p className="mb-0 text-sm leading-relaxed text-(--color-text-secondary)">
            Nothing you type can break anything. Guessing is the intended method, and hints
            unlock as you attempt — soonest on the early levels.
          </p>
        </div>
      )}

      {messages.map((m) => {
        if (m.sender === 'system') {
          return (
            <div key={m.id} role="alert" className="rounded-md border border-amber-600/40 bg-amber-500/10 p-3">
              <Label className="mb-1 text-amber-700 dark:text-amber-400">Arena</Label>
              <p className="mb-0 text-sm leading-relaxed text-(--color-text)">{m.text}</p>
              {m.payload && (
                <button
                  type="button"
                  onClick={() => onRetry(m.payload as string)}
                  className={`${BTN_QUIET} mt-2 h-9 text-xs ${FOCUS}`}
                >
                  Retry that payload
                </button>
              )}
            </div>
          );
        }

        const isUser = m.sender === 'user';
        const outOfContext = multiTurn && !retainedIds.has(m.id);
        const showDivider = evicted && m.id === firstRetainedId;

        return (
          <React.Fragment key={m.id}>
            {showDivider && (
              <div className="flex items-center gap-3" aria-hidden="true">
                <span className="h-px flex-1 bg-(--color-border)" />
                <span className="text-xs uppercase tracking-[0.12em] text-(--color-text-muted)">
                  context window starts
                </span>
                <span className="h-px flex-1 bg-(--color-border)" />
              </div>
            )}

            <article
              className={`border-l-2 pl-4 ${isUser ? ACCENT_RULE : 'border-(--color-border)'} ${
                outOfContext ? 'opacity-55' : ''
              }`}
            >
              <p className="mb-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span
                  className={`text-xs font-semibold uppercase tracking-[0.12em] ${
                    isUser ? 'text-(--color-accent)' : 'text-(--color-text-muted)'
                  }`}
                >
                  {isUser ? `You · turn ${turnOf.get(m.id) ?? 1}` : 'Model'}
                </span>
                {outOfContext && (
                  <span className="text-xs text-(--color-text-muted)">
                    outside the model’s context
                  </span>
                )}
                {m.guardrail_blocked && <Badge tone="amber">Blocked before inference</Badge>}
              </p>

              {/* Model output is attacker-influenced by design and is rendered as
                  a TEXT NODE only — never HTML, never markdown. The role label
                  and the rule to its left live OUTSIDE this node, so a payload
                  cannot forge them. */}
              <div className="whitespace-pre-wrap wrap-break-word font-mono text-[0.8125rem] leading-relaxed">
                {m.text || (loading ? '' : '—')}
                {loading && !isUser && m.text === '' && (
                  <span
                    aria-hidden="true"
                    className="inline-block h-4 w-2 translate-y-0.5 bg-(--color-text-muted) motion-safe:animate-pulse"
                  />
                )}
              </div>

              {m.engineError && (
                <p className="mb-0 mt-2 text-xs leading-5 text-amber-700 dark:text-amber-400">
                  Platform limit, not a guardrail — the generation budget ran out. Retry or shorten
                  the payload.
                </p>
              )}

              {!m.win && !m.engineError && m.judge_reason && (
                <p className="mb-0 mt-2 text-xs leading-5 text-(--color-text-muted)">
                  Judge: {m.judge_reason}
                </p>
              )}
            </article>

            {/* The win is its own moment, not a green box tucked inside a reply. */}
            {m.win && (
              <div className="rounded-lg border border-emerald-600/40 bg-emerald-500/10 p-4">
                <Label className="text-emerald-700 dark:text-emerald-400">Flag captured</Label>
                <h4 className="mb-0 mt-1 font-serif text-lg font-semibold text-emerald-800 dark:text-emerald-300">
                  Level {level} defeated
                </h4>
                {m.judge_reason && (
                  <p className="mb-0 mt-1.5 text-sm leading-relaxed text-(--color-text-secondary)">
                    {m.judge_reason}
                  </p>
                )}
                {m.unlocked_flag && (
                  <>
                    <code className="mt-3 block select-all break-all rounded-md border border-emerald-600/30 bg-(--color-bg) px-3 py-2 font-mono text-xs">
                      {m.unlocked_flag}
                    </code>
                    <button
                      type="button"
                      onClick={() => onUseFlag(m.unlocked_flag as string)}
                      className={`${BTN_PRIMARY} mt-3 h-10 ${FOCUS}`}
                    >
                      Submit this flag
                    </button>
                  </>
                )}
              </div>
            )}
          </React.Fragment>
        );
      })}

      {loading && (
        <div className="rounded-md border border-(--color-border) bg-(--color-bg-secondary) p-3">
          <p className="mb-2 flex items-baseline justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-(--color-accent)">
              Running on the local model
            </span>
            <span className="shrink-0 text-xs tabular-nums text-(--color-text-muted)">
              {elapsed}s
            </span>
          </p>
          {/* Determinate against a typical generation rather than an infinite
              pulse: 20–45s of a pulsing dot reads as a hang. */}
          <div
            className="h-1 w-full overflow-hidden rounded-full bg-(--color-bg-tertiary)"
            role="progressbar"
            aria-label="Generation progress"
            aria-valuemin={0}
            aria-valuemax={TYPICAL_S}
            aria-valuenow={Math.min(elapsed, TYPICAL_S)}
          >
            <div
              className="h-full rounded-full bg-(--color-accent) transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
              style={{ width: `${Math.min(97, (elapsed / TYPICAL_S) * 100)}%` }}
            />
          </div>
          <p className="mb-0 mt-2 text-xs leading-5 text-(--color-text-secondary)">
            {elapsed > TYPICAL_S
              ? 'Longer than usual — the connection is still open and the judge has not run yet.'
              : buffered || phase === 'generating'
              ? 'This level filters what leaves the model, so the whole answer is generated before any of it is shown.'
              : 'Tokens appear as they are generated.'}
          </p>
          <button type="button" onClick={onStop} className={`${BTN_QUIET} mt-2 h-9 text-xs ${FOCUS}`}>
            Stop
          </button>
        </div>
      )}
    </div>
  );
}
