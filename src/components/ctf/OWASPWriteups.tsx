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

  useEffect(() => {
    // Client-side gating only — the /api/owasp endpoint is unauthenticated, so
    // this is UX honesty (the sidebar promises "complete level X to unlock"),
    // not a security control. Anyone can curl it.
    if (!completedLevels.includes(selectedLevel)) {
      setData(null);
      return;
    }
    const ac = new AbortController();
    ctfFetch(`/api/owasp/${selectedLevel}`, { signal: ac.signal, timeoutMs: 15_000 })
      .then((r) => r.json())
      .then(setData)
      .catch((e: ApiError) => {
        if (e.kind !== 'aborted') setData(null);
      });
    return () => ac.abort();
  }, [selectedLevel, completedLevels]);

  return (
    <div className="space-y-6">
      <div className="border-b border-[var(--color-border)] pb-4">
        <h2 className="font-serif text-xl font-bold text-[var(--color-text)]">
          OWASP LLM Security Reference & Post-Mortems
        </h2>
        <p className="text-xs text-[var(--color-text-secondary)] mt-1">
          Explore research vulnerability breakdowns, real-world CVE impacts, and developer mitigation code for completed CTF levels.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Level Selector sidebar */}
        <div className="md:col-span-1 space-y-2">
          <div className="text-xs font-mono uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
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
                      ? 'border-[color:color-mix(in_srgb,var(--color-accent)_40%,transparent)] bg-[color:color-mix(in_srgb,var(--color-accent)_10%,transparent)] text-[var(--color-accent)] font-semibold'
                      : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text)] hover:border-[var(--color-accent)]'
                  }`}
                >
                  <span>Level {lvl}</span>
                  {isSolved ? (
                    <span className="text-emerald-500 font-bold text-[11px]">SOLVED ✓</span>
                  ) : (
                    <span className="text-[var(--color-text-muted)] text-[10px]">Unsolved</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detailed Post-Mortem Card */}
        <div className="md:col-span-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-6 space-y-5 text-xs">
          {data ? (
            <>
              <div className="border-b border-[var(--color-border)] pb-4 space-y-1">
                <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-[color:color-mix(in_srgb,var(--color-accent)_10%,transparent)] text-[var(--color-accent)] border border-[color:color-mix(in_srgb,var(--color-accent)_25%,transparent)] uppercase font-semibold">
                  {data.category}
                </span>
                <h3 className="font-serif text-lg font-bold text-[var(--color-text)] pt-1">
                  Level {selectedLevel}: {data.title}
                </h3>
                <div className="text-[var(--color-text-muted)] font-mono text-[11px]">
                  Reference: {data.cve_reference}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-[var(--color-text)] uppercase font-mono tracking-wider text-[11px] mb-1">
                  Vulnerability Mechanism
                </h4>
                <p className="text-[var(--color-text-secondary)] leading-relaxed">{data.summary}</p>
              </div>

              <div>
                <h4 className="font-semibold text-[var(--color-text)] uppercase font-mono tracking-wider text-[11px] mb-1">
                  Real-World CVE & Enterprise Risk
                </h4>
                <div className="bg-[var(--color-bg)] p-3 rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] leading-relaxed">
                  {data.real_world_risk}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-[var(--color-text)] uppercase font-mono tracking-wider text-[11px] mb-1">
                  Developer Defense Mitigation Code
                </h4>
                <pre className="bg-[#161b22] text-gray-200 p-4 rounded-md overflow-x-auto font-mono text-[11px] leading-relaxed border border-[#30363d]">
                  <code>{data.developer_mitigation}</code>
                </pre>
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-[var(--color-text-muted)] italic font-mono">
              Complete Level {selectedLevel} in the CTF Arena to unlock its research post-mortem breakdown!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
