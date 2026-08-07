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
  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--color-accent) ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-bg)';

export const PANEL =
  'flex flex-col min-w-0 overflow-hidden rounded-lg border border-(--color-border) ' +
  'bg-(--color-bg)';

export const PANEL_HEAD =
  'shrink-0 border-b border-(--color-border) bg-(--color-bg-secondary) px-4 py-3';

export const PANEL_FOOT =
  'shrink-0 border-t border-(--color-border) bg-(--color-bg-secondary) px-4 py-3';

/* These spell out color-mix() by hand because Tailwind v3 silently DROPPED the
   opacity modifier on arbitrary var() colours: the concise form compiled to no
   CSS at all, so every accent tint in the arena was invisible — the selected
   level cell had no background, the writeups pill had neither background nor
   border.

   The v4 migration FIXED that, verified by compiling against this repo's own
   toolchain: the concise form now emits color-mix(in oklab, …) plus a solid
   fallback for browsers without color-mix. So these constants are no longer
   required, and the concise form is slightly better (oklab interpolates more
   evenly than the srgb written here).

   Left as-is deliberately: swapping them changes the rendered colour space of
   every accent tint on the site, and nobody has looked at this UI in a browser
   yet. It is a tidy-up to do WITH eyes on the screen, not a blind sweep. */
export const ACCENT_TINT =
  'bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)]';
export const ACCENT_EDGE =
  'border-[color-mix(in_srgb,var(--color-accent)_40%,transparent)]';
export const ACCENT_RULE =
  'border-[color-mix(in_srgb,var(--color-accent)_55%,transparent)]';

export type Tone = 'accent' | 'emerald' | 'amber' | 'neutral';

const TONE_CLASS: Record<Tone, string> = {
  accent: `${ACCENT_EDGE} ${ACCENT_TINT} text-(--color-accent)`,
  emerald: 'border-emerald-600/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  amber: 'border-amber-600/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  neutral: 'border-(--color-border) bg-(--color-bg) text-(--color-text-secondary)',
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
      className={`block text-xs font-semibold uppercase tracking-[0.12em] text-(--color-text-muted) ${className}`}
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
      className={`h-4 w-4 shrink-0 text-(--color-text-muted) transition-transform motion-reduce:transition-none ${
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
  'inline-flex items-center justify-center gap-1.5 rounded-md bg-(--color-accent) px-4 ' +
  'text-sm font-medium text-white transition-colors hover:bg-(--color-accent-hover) ' +
  'motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50';

export const BTN_QUIET =
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-(--color-border) ' +
  'bg-(--color-bg) px-3 text-sm text-(--color-text-secondary) transition-colors ' +
  'hover:border-(--color-accent) hover:text-(--color-text) motion-reduce:transition-none ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

/** Text input / textarea shell. text-base under sm: iOS zooms below 16px and
 *  never zooms back out. */
export const FIELD =
  'w-full min-w-0 rounded-md border border-(--color-border) bg-(--color-bg) px-3 py-2 ' +
  'text-base font-mono text-(--color-text) placeholder:text-(--color-text-muted) sm:text-sm';
