'use client';

import { useState } from 'react';

interface AbstractToggleProps {
  abstract: string;
}

export default function AbstractToggle({ abstract }: AbstractToggleProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {expanded ? 'Hide Abstract' : 'Abstract'}
      </button>

      {expanded && (
        <p className="mt-3 text-sm text-[var(--color-text-secondary)] leading-relaxed border-l-2 border-[var(--color-border)] pl-3 italic">
          {abstract}
        </p>
      )}
    </div>
  );
}
