'use client';

import { useState } from 'react';

interface PdfPreviewProps {
  pdfUrl: string;
  title: string;
}

export default function PdfPreview({ pdfUrl, title }: PdfPreviewProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        {expanded ? 'Hide' : 'Preview'}
      </button>

      {expanded && (
        <div className="mt-4">
          <iframe
            src={pdfUrl}
            title={`Preview: ${title}`}
            className="w-full rounded-lg border border-[var(--color-border)]"
            style={{ height: '600px' }}
          />
        </div>
      )}
    </div>
  );
}
