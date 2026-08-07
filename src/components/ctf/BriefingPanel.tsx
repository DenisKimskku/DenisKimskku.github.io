'use client';

import React from 'react';
import {
  BTN_PRIMARY, BTN_QUIET, Badge, Chevron, FIELD, FOCUS, Label,
  PANEL, PANEL_FOOT, PANEL_HEAD,
} from './ctfUi';
import type { HintData, LevelMeta } from './ctfLevels';

interface Props {
  meta: LevelMeta;
  solved: boolean;
  multiTurn: boolean;
  contextWindow: number;
  open: boolean;
  onToggleOpen: () => void;
  hints: HintData | null;
  hintsOpen: boolean;
  onToggleHints: () => void;
  flagInput: string;
  onFlagInput: (value: string) => void;
  onFlagSubmit: (e: React.FormEvent) => void;
  flagBusy: boolean;
  flagFeedback: { msg: string; ok: boolean } | null;
  sessionCode: string;
  codeCopied: boolean;
  onCopyCode: () => void;
  resumeInput: string;
  onResumeInput: (value: string) => void;
  onResume: (e: React.FormEvent) => void;
  onPostMortem: () => void;
  className?: string;
}

/**
 * The left half of the workspace. Same chrome as the console — header bar,
 * scrolling body, footer form — so the two panels read as one surface and agree
 * on height at every breakpoint instead of ending wherever they happen to end.
 *
 * Hierarchy, top to bottom: what you must do (objective), the fiction you are
 * doing it inside (scenario), what stands in your way (defenses), help (hints),
 * housekeeping (session). The flag form is pinned to the footer because it is
 * the one control whose position must never move.
 */
export default function BriefingPanel(props: Props) {
  const {
    meta, solved, multiTurn, contextWindow, open, onToggleOpen,
    hints, hintsOpen, onToggleHints, flagInput, onFlagInput, onFlagSubmit,
    flagBusy, flagFeedback, sessionCode, codeCopied, onCopyCode,
    resumeInput, onResumeInput, onResume, onPostMortem, className = '',
  } = props;

  const defenses = [
    meta.has_input_filter && { key: 'in', label: 'Input filter' },
    meta.has_prefilter && { key: 'pre', label: 'Intent pre-filter' },
    meta.has_output_filter && { key: 'out', label: 'Egress filter' },
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <section aria-labelledby="brief-heading" className={`${PANEL} ${className}`}>
      <div className={`${PANEL_HEAD} flex items-start justify-between gap-2`}>
        <div className="min-w-0">
          <Label>
            Level {meta.level} · Tier {meta.tier}
            {meta.tier_name ? ` · ${meta.tier_name}` : ''}
          </Label>
          <h3
            id="brief-heading"
            className="mb-0 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-serif text-lg font-semibold leading-snug"
          >
            <span className="min-w-0">{meta.title}</span>
            {solved && <Badge tone="emerald">✓ Solved</Badge>}
          </h3>
        </div>
        {/* Chevron-only toggle so no heading is nested inside a button, and it
            is lg:hidden so aria-expanded never lies about content that is
            unconditionally visible on desktop. */}
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={open}
          aria-controls="brief-body"
          aria-label={open ? 'Hide briefing details' : 'Show briefing details'}
          className={`-my-1 -mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-md lg:hidden ${FOCUS}`}
        >
          <Chevron open={open} />
        </button>
      </div>

      <div
        id="brief-body"
        className={`${open ? 'block' : 'hidden'} min-h-0 flex-1 space-y-5 px-4 py-4 lg:block lg:overflow-y-auto`}
      >
        {meta.description ? (
          <div>
            <Label className="mb-1.5">Objective</Label>
            <p className="mb-0 text-sm leading-relaxed">{meta.description}</p>
          </div>
        ) : (
          <p className="mb-0 text-sm text-(--color-text-muted)">Loading the briefing…</p>
        )}

        {meta.scenario && (
          <div>
            <Label className="mb-1.5">Scenario</Label>
            {/* Matches .article-content blockquote: left rule, italic, secondary. */}
            <blockquote className="border-l-2 border-(--color-border) pl-3 text-sm italic leading-relaxed text-(--color-text-secondary)">
              {meta.scenario}
            </blockquote>
          </div>
        )}

        <div>
          <Label className="mb-2">Defenses in force</Label>
          <div className="flex flex-wrap gap-1.5">
            {defenses.length > 0 ? (
              defenses.map((d) => (
                <Badge key={d.key} tone="amber">
                  {d.label}
                </Badge>
              ))
            ) : (
              <Badge tone="neutral">No mechanical filter</Badge>
            )}
            {meta.defense_status === 'narrative_only' && (
              <Badge tone="neutral" title="The named defense is scenario framing, not code.">
                Narrative only
              </Badge>
            )}
          </div>

          {/* Whether a level remembers you is load-bearing information for an
              attacker, and the old UI never stated it anywhere. */}
          <p className="mb-0 mt-2.5 text-xs leading-5 text-(--color-text-muted)">
            {multiTurn
              ? `Multi-turn — the server replays the last ${contextWindow} messages of this level back into the prompt. Build the frame over several turns, or clear it from the console.`
              : 'Stateless — every prompt is sent on its own. Nothing you wrote earlier is in the model’s context.'}
          </p>

          {/* Disclosed limitations read as rigour; undisclosed ones read as fraud. */}
          {meta.defense_note && (
            <p className="mb-0 mt-2.5 border-l-2 border-amber-600/40 pl-3 text-xs leading-5 text-(--color-text-muted)">
              {meta.defense_note}
            </p>
          )}
        </div>

        <div className="border-t border-(--color-border) pt-4">
          <button
            type="button"
            onClick={onToggleHints}
            aria-expanded={hintsOpen}
            aria-controls="hint-drawer"
            className={`flex w-full items-center justify-between gap-2 rounded-md border border-(--color-border) bg-(--color-bg) px-3 py-2.5 text-sm transition-colors hover:border-(--color-accent) motion-reduce:transition-none ${FOCUS}`}
          >
            <span className="font-medium">Hints</span>
            <span className="flex items-center gap-2">
              <span className="text-xs tabular-nums text-(--color-text-muted)">
                {hints ? `${hints.attempts} attempt${hints.attempts === 1 ? '' : 's'}` : '—'}
              </span>
              <Chevron open={hintsOpen} />
            </span>
          </button>

          <div id="hint-drawer" className={`${hintsOpen ? 'block' : 'hidden'} mt-3 space-y-2`}>
            {hints ? (
              <>
                <HintRow
                  n={1}
                  threshold={hints.hint_1_after ?? 3}
                  attempts={hints.attempts}
                  unlocked={hints.hint_1_unlocked}
                  text={hints.hint_1}
                />
                <HintRow
                  n={2}
                  threshold={hints.hint_2_after ?? 5}
                  attempts={hints.attempts}
                  unlocked={hints.hint_2_unlocked}
                  text={hints.hint_2}
                />
              </>
            ) : (
              <p className="mb-0 text-sm text-(--color-text-muted)">
                Hints appear once the arena answers.
              </p>
            )}
          </div>
        </div>

        {solved && (
          <button type="button" onClick={onPostMortem} className={`${BTN_QUIET} h-10 w-full ${FOCUS}`}>
            Read the post-mortem for this level →
          </button>
        )}

        <details className="border-t border-(--color-border) pt-4">
          <summary
            className={`cursor-pointer rounded-md text-sm text-(--color-text-secondary) hover:text-(--color-text) ${FOCUS}`}
          >
            Move progress to another device
          </summary>
          {/* Replaces the old IP+User-Agent heuristic, which silently shared one
              session between everyone behind a NAT — and lost your progress
              whenever your browser auto-updated. */}
          <div className="mt-3 space-y-3">
            <div>
              <p className="mb-1.5 text-xs leading-5 text-(--color-text-muted)">
                Your resume code. Keep it private — anyone holding it has your progress.
              </p>
              <div className="flex gap-2">
                <code className="min-w-0 flex-1 truncate rounded-md border border-(--color-border) bg-(--color-bg) px-2 py-1.5 font-mono text-xs">
                  {sessionCode || '—'}
                </code>
                <button
                  type="button"
                  disabled={!sessionCode}
                  onClick={onCopyCode}
                  className={`${BTN_QUIET} h-9 shrink-0 text-xs ${FOCUS}`}
                >
                  {codeCopied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <form onSubmit={onResume} className="space-y-1.5">
              <p className="mb-0 text-xs leading-5 text-(--color-text-muted)">
                Restoring replaces the session stored in this browser. Copy the code above first if
                you want to come back to it.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={resumeInput}
                  onChange={(e) => onResumeInput(e.target.value)}
                  placeholder="Paste a resume code"
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  aria-label="Resume code"
                  className={`${FIELD} h-9 flex-1 py-0 sm:text-xs ${FOCUS}`}
                />
                <button
                  type="submit"
                  disabled={!resumeInput.trim()}
                  className={`${BTN_QUIET} h-9 shrink-0 text-xs ${FOCUS}`}
                >
                  Restore
                </button>
              </div>
            </form>
          </div>
        </details>
      </div>

      <form onSubmit={onFlagSubmit} className={`${PANEL_FOOT} space-y-2`}>
        {/* This was presented as THE success control -- pinned to the footer,
            labelled "unlocks level N+1". It is not how anyone wins: a judged win
            already banks the level. It is a fallback for a restored session, or
            for a secret you decoded yourself that the scorer did not catch.
            Labelling the fallback as the goal is why the success criteria read
            as unclear. */}
        <label htmlFor="flag-input" className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium">Enter a flag manually</span>
          <span className="text-xs text-(--color-text-muted)">optional</span>
        </label>
        <p className="mb-0 text-xs leading-5 text-(--color-text-muted)">
          Only needed if you decoded the secret yourself and the scorer missed it, or you restored
          an old session. Winning in the console is enough on its own.
        </p>
        <div className="flex gap-2">
          <input
            id="flag-input"
            type="text"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="CTF{…}"
            value={flagInput}
            onChange={(e) => onFlagInput(e.target.value)}
            className={`${FIELD} h-10 flex-1 py-0 ${FOCUS}`}
          />
          <button
            type="submit"
            disabled={flagBusy || !flagInput.trim()}
            className={`${BTN_PRIMARY} h-10 shrink-0 ${FOCUS}`}
          >
            {flagBusy ? 'Checking…' : 'Submit'}
          </button>
        </div>
        {/* The live region exists before it has content, or the first result is
            not announced. */}
        <div role="status" aria-live="polite" className="empty:hidden">
          {flagFeedback && (
            <p
              className={`mb-0 rounded-md border px-3 py-2 text-xs leading-5 ${
                flagFeedback.ok
                  ? 'border-emerald-600/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400'
              }`}
            >
              {flagFeedback.msg}
            </p>
          )}
        </div>
      </form>
    </section>
  );
}

function HintRow({
  n, threshold, attempts, unlocked, text,
}: {
  n: number;
  threshold: number;
  attempts: number;
  unlocked: boolean;
  text: string;
}) {
  const remaining = Math.max(0, threshold - attempts);
  return (
    <div className="rounded-md border border-(--color-border) bg-(--color-bg) p-3">
      <p className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-(--color-text-muted)">
          Hint {n}
        </span>
        <span className="text-xs tabular-nums text-(--color-text-muted)">
          {unlocked ? 'unlocked' : `${remaining} more attempt${remaining === 1 ? '' : 's'}`}
        </span>
      </p>
      <p className={`mb-0 text-sm leading-relaxed ${unlocked ? '' : 'italic text-(--color-text-muted)'}`}>
        {text}
      </p>
    </div>
  );
}
