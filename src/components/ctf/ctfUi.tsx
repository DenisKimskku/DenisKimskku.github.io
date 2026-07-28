'use client';

import React from 'react';

/* ─────────────────────────────────────────────────────────────────────────
 * Shared primitives for the CTF arena.
 *
 * Two rules encoded here:
 *  1. Every interactive element gets a visible keyboard ring (FOCUS).
 *  2. The briefing rail and the console are the SAME object — one panel
 *     chrome, one header bar, one footer bar — so they read as a single
 *     workspace instead of two unrelated cards that end wherever they happen
 *     to end.
 * ───────────────────────────────────────────────────────────────────────── */

export const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]';

export const PANEL =
  'flex flex-col min-w-0 overflow-hidden rounded-lg border border-[var(--color-border)] ' +
  'bg-[var(--color-bg)]';

export const PANEL_HEAD =
  'shrink-0 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3';

export const PANEL_FOOT =
  'shrink-0 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3';

/* Tailwind v3 silently DROPS the opacity modifier on arbitrary var() colours:
   `bg-[var(--color-accent)]/10` compiles to NO CSS AT ALL. Verified against
   this repo's own Tailwind. Every accent tint in the arena was therefore
   invisible — the selected level cell had no background, and the writeups
   category pill had neither background nor border. Header.tsx already uses
   color-mix() for exactly this reason; these components never got it. */
export const ACCENT_TINT =
  'bg-[color:color-mix(in_srgb,var(--color-accent)_10%,transparent)]';
export const ACCENT_EDGE =
  'border-[color:color-mix(in_srgb,var(--color-accent)_40%,transparent)]';
export const ACCENT_RULE =
  'border-[color:color-mix(in_srgb,var(--color-accent)_55%,transparent)]';

export type Tone = 'accent' | 'emerald' | 'amber' | 'neutral';

const TONE_CLASS: Record<Tone, string> = {
  accent: `${ACCENT_EDGE} ${ACCENT_TINT} text-[var(--color-accent)]`,
  emerald: 'border-emerald-600/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  amber: 'border-amber-600/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  neutral: 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-secondary)]',
};

/** Small factual chip. Never the only carrier of meaning — always has a word. */
export function Badge({
  tone = 'neutral',
  title,
  children,
}: {
  tone?: Tone;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs leading-5 ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}

/** The one micro-label style in the arena. 12px is the floor; the old 11px and
 *  10px labels sat below anything else on the site, and --color-text-muted was
 *  tuned for 4.5:1 at normal sizes. */
export function Label({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)] ${className}`}
    >
      {children}
    </span>
  );
}

export function Chevron({ open, className = '' }: { open: boolean; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={`h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition-transform motion-reduce:transition-none ${
        open ? 'rotate-180' : ''
      } ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 7.5 10 12.5 15 7.5" />
    </svg>
  );
}

export const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-1.5 rounded-md bg-[var(--color-accent)] px-4 ' +
  'text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] ' +
  'motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50';

export const BTN_QUIET =
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-[var(--color-border)] ' +
  'bg-[var(--color-bg)] px-3 text-sm text-[var(--color-text-secondary)] transition-colors ' +
  'hover:border-[var(--color-accent)] hover:text-[var(--color-text)] motion-reduce:transition-none ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

/** Text input / textarea shell. text-base under sm: iOS zooms below 16px and
 *  never zooms back out. */
export const FIELD =
  'w-full min-w-0 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 ' +
  'text-base font-mono text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] sm:text-sm';
