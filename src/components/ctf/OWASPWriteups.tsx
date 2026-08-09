'use client';

import React, { useState, useEffect } from 'react';
import { ApiError, ctfFetch } from './ctfApi';

interface OWASPDetail {
  category: string;
  title: string;
  cve_reference: string;
  summary: string;
  real_world_risk: string;
  developer_mitigation: string;
}

export default function OWASPWriteups({
  completedLevels,
  initialLevel = 1,
}: {
  completedLevels: number[];
  /** Preselects a level when the arena links here from a solved briefing. */
  initialLevel?: number;
}) {
  const [selectedLevel, setSelectedLevel] = useState<number>(initialLevel);
  // Follow a new initialLevel by adjusting state during render -- the "you
  // might not need an effect" pattern, and it avoids a render with stale state.
  const [prevInitial, setPrevInitial] = useState(initialLevel);
  if (initialLevel !== prevInitial) {
    setPrevInitial(initialLevel);
    setSelectedLevel(initialLevel);
  }
  const [data, setData] = useState<OWASPDetail | null>(null);

  // `data` used to survive a level change, so between the click and the fetch
  // landing the card showed the PREVIOUS level's category, CWE, mechanism and
  // mitigation code under the newly selected level's heading -- and the
  // "Loading…" state added to prevent exactly that was unreachable after the
  // first successful load. Cleared during render, same pattern as above.
  const [prevSelected, setPrevSelected] = useState(selectedLevel);
  if (selectedLevel !== prevSelected) {
    setPrevSelected(selectedLevel);
    setData(null);
  }

  // Client-side gating only — the /api/owasp endpoint is unauthenticated, so
  // this is UX honesty (the sidebar promises "complete level X to unlock"),
  // not a security control. Anyone can curl it. Derived at render time: no
  // async work needed to know a level is locked.
  // Level 1 is ALWAYS open. This tab is the best thing on the site -- OWASP
  // category, CWE, mechanism, real-world risk, and mitigation code for each
  // level -- and it was gated entirely behind solving, which six people have
  // ever done. The payoff was locked behind the wall that stops everyone, so
  // one worked example is shown up front as a reason to try.
  const SAMPLE_LEVEL = 1;
  const locked = selectedLevel !== SAMPLE_LEVEL && !completedLevels.includes(selectedLevel);

  useEffect(() => {
    if (locked) return;
    const ac = new AbortController();
    ctfFetch(`/api/owasp/${selectedLevel}`, { signal: ac.signal, timeoutMs: 15_000 })
      .then((r) => r.json())
      .then(setData)
      .catch((e: ApiError) => {
        if (e.kind !== 'aborted') setData(null);
      });
    return () => ac.abort();
  }, [selectedLevel, locked]);

  return (
    <div className="space-y-6">
      <div className="border-b border-(--color-border) pb-4">
        <h2 className="font-serif text-xl font-bold text-(--color-text)">
          What each attack is, and how to defend it
        </h2>
        {/* Said "real-world CVE impacts"; the field holds CWE identifiers, which
            classify weakness types rather than specific vulnerabilities. This
            site's readers are the people who notice that. */}
        <p className="text-xs text-(--color-text-secondary) mt-1">
          For every level: its OWASP LLM Top 10 category, the underlying CWE weakness class, how the
          attack works, what it costs in production, and the mitigation code. Level 1 is open as a
          sample — the rest unlock as you solve them.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Level Selector sidebar */}
        <div className="md:col-span-1 space-y-2">
          <div className="text-xs font-mono uppercase tracking-wider text-(--color-text-muted) mb-2">
            Select Level
          </div>
          <div className="space-y-1 max-h-[460px] overflow-y-auto pr-1">
            {Array.from({ length: 20 }, (_, i) => i + 1).map((lvl) => {
              const isSolved = completedLevels.includes(lvl);
              const isSelected = lvl === selectedLevel;

              return (
                <button
                  key={lvl}
                  onClick={() => setSelectedLevel(lvl)}
                  className={`w-full text-left px-3 py-2 rounded-md font-mono text-xs border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-[color-mix(in_srgb,var(--color-accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] text-(--color-accent) font-semibold'
                      : 'border-(--color-border) bg-(--color-bg-secondary) text-(--color-text) hover:border-(--color-accent)'
                  }`}
                >
                  <span>Level {lvl}</span>
                  {isSolved ? (
                    <span className="text-emerald-500 font-bold text-[11px]">SOLVED ✓</span>
                  ) : lvl === SAMPLE_LEVEL ? (
                    <span className="text-(--color-accent) text-[10px] font-semibold">SAMPLE</span>
                  ) : (
                    <span className="text-(--color-text-muted) text-[10px]">Locked</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detailed Post-Mortem Card */}
        <div className="md:col-span-3 bg-(--color-bg-secondary) border border-(--color-border) rounded-lg p-6 space-y-5 text-xs">
          {!locked && data ? (
            <>
              <div className="border-b border-(--color-border) pb-4 space-y-1">
                <span className="px-2 py-0.5 rounded-sm font-mono text-[10px] bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] text-(--color-accent) border border-[color-mix(in_srgb,var(--color-accent)_25%,transparent)] uppercase font-semibold">
                  {data.category}
                </span>
                <h3 className="font-serif text-lg font-bold text-(--color-text) pt-1">
                  Level {selectedLevel}: {data.title}
                </h3>
                <div className="text-(--color-text-muted) font-mono text-[11px]">
                  Weakness class: {data.cve_reference}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-(--color-text) uppercase font-mono tracking-wider text-[11px] mb-1">
                  Vulnerability Mechanism
                </h4>
                <p className="text-(--color-text-secondary) leading-relaxed">{data.summary}</p>
              </div>

              <div>
                <h4 className="font-semibold text-(--color-text) uppercase font-mono tracking-wider text-[11px] mb-1">
                  Real-World Impact
                </h4>
                <div className="bg-(--color-bg) p-3 rounded-sm border border-(--color-border) text-(--color-text-secondary) leading-relaxed">
                  {data.real_world_risk}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-(--color-text) uppercase font-mono tracking-wider text-[11px] mb-1">
                  Developer Defense Mitigation Code
                </h4>
                <pre className="bg-[#161b22] text-gray-200 p-4 rounded-md overflow-x-auto font-mono text-[11px] leading-relaxed border border-[#30363d]">
                  <code>{data.developer_mitigation}</code>
                </pre>
              </div>
            </>
          ) : locked ? (
            <div className="py-16 text-center text-(--color-text-muted) space-y-2">
              <p className="mb-0">Solve level {selectedLevel} in the Arena to read its breakdown.</p>
              <button
                type="button"
                onClick={() => setSelectedLevel(SAMPLE_LEVEL)}
                className="text-(--color-accent) underline underline-offset-2 text-xs"
              >
                Read the level {SAMPLE_LEVEL} sample instead
              </button>
            </div>
          ) : (
            /* Unlocked but the fetch has not landed. This used to fall through
               to the locked message, so an open level flashed "complete this to
               unlock" -- telling the reader they had not done something they
               had. */
            <div className="py-16 text-center text-(--color-text-muted) italic">
              Loading the breakdown…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
