'use client';

import React from 'react';
import { ACCENT_EDGE, ACCENT_TINT, Chevron, FOCUS, Label } from './ctfUi';
import { TIERS, TIER_NAMES, levelTitle, levelsInTier, tierOf } from './ctfLevels';

interface Props {
  currentLevel: number;
  completedLevels: number[];
  maxUnlocked: number;
  onSelect: (level: number) => void;
  open: boolean;
  onToggle: () => void;
}

/**
 * The campaign map. A flat 20-wide strip was never the real model: the arena is
 * four named tiers of five, and the tier is what tells you which class of attack
 * you are about to write. Four blocks of five also gives every cell a 44px touch
 * target instead of the ~30px the 20-column grid produced inside a 720px page.
 */
export default function LevelNavigator({
  currentLevel,
  completedLevels,
  maxUnlocked,
  onSelect,
  open,
  onToggle,
}: Props) {
  return (
    <section
      aria-labelledby="level-nav-heading"
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
    >
      <h2 id="level-nav-heading" className="sr-only">
        Challenge levels
      </h2>

      {/* Below lg the 20-cell map would push the console off the first screen,
          so it collapses behind a summary that still names where you are. */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="level-nav-grid"
        className={`flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left lg:hidden ${FOCUS}`}
      >
        <span className="min-w-0">
          <Label>All levels</Label>
          <span className="mt-0.5 block truncate text-sm text-[var(--color-text)]">
            Level {currentLevel} · {levelTitle(currentLevel)}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-xs tabular-nums text-[var(--color-text-muted)]">
            {completedLevels.length}/20
          </span>
          <Chevron open={open} />
        </span>
      </button>

      <div
        id="level-nav-grid"
        className={`${open ? 'block' : 'hidden'} px-4 pb-4 pt-1 lg:block lg:pt-4`}
      >
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((tier) => {
            const levels = levelsInTier(tier);
            const solvedHere = levels.filter((l) => completedLevels.includes(l)).length;
            return (
              <div key={tier}>
                <div className="mb-2 flex items-baseline justify-between gap-2 border-b border-[var(--color-border)] pb-1.5">
                  <Label className="min-w-0 truncate">{TIER_NAMES[tier]}</Label>
                  <span className="shrink-0 text-xs tabular-nums text-[var(--color-text-muted)]">
                    {solvedHere}/5
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {levels.map((lvl) => {
                    const solved = completedLevels.includes(lvl);
                    const unlocked = lvl <= maxUnlocked;
                    const selected = lvl === currentLevel;
                    const state = solved ? ', solved' : unlocked ? '' : ', locked';
                    return (
                      <button
                        key={lvl}
                        type="button"
                        /* aria-disabled, not disabled: a locked level stays
                           focusable so a screen-reader user can find out it
                           exists and why it is shut. */
                        aria-disabled={unlocked ? undefined : true}
                        aria-current={selected ? 'true' : undefined}
                        aria-label={`Level ${lvl}, ${levelTitle(lvl)}${state}`}
                        title={
                          unlocked
                            ? `Level ${lvl}: ${levelTitle(lvl)}`
                            : `Locked — solve level ${maxUnlocked} first`
                        }
                        onClick={() => {
                          if (unlocked) onSelect(lvl);
                        }}
                        className={`flex h-11 items-center justify-center gap-0.5 rounded-md border font-mono text-xs tabular-nums transition-colors motion-reduce:transition-none ${FOCUS} ${
                          selected
                            ? `${ACCENT_EDGE} ${ACCENT_TINT} font-bold text-[var(--color-accent)]`
                            : solved
                            ? 'border-emerald-600/40 bg-emerald-500/10 font-medium text-emerald-700 dark:text-emerald-400'
                            : unlocked
                            ? 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] hover:border-[var(--color-accent)]'
                            : 'cursor-not-allowed border-dashed border-[var(--color-border)] bg-transparent text-[var(--color-text-muted)]'
                        }`}
                      >
                        {/* Solved and locked are carried by a glyph and a border
                            style, never by colour alone. */}
                        {solved && <span aria-hidden="true">✓</span>}
                        {lvl}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mb-0 mt-4 text-xs leading-5 text-[var(--color-text-muted)]">
          You are on tier {tierOf(currentLevel)}. Levels unlock in order; solving one opens the next
          and unlocks its OWASP post-mortem.
        </p>
      </div>
    </section>
  );
}
