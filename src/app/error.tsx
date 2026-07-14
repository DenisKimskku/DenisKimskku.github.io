'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-custom py-20 md:py-32">
      <div className="text-center max-w-md mx-auto">
        <h1 className="text-2xl md:text-3xl font-serif font-semibold text-[var(--color-text)] mb-4">
          Something went wrong
        </h1>
        <p className="text-[var(--color-text-secondary)] mb-8">
          An unexpected error occurred while rendering this page. You can try
          again or head back home.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[var(--color-accent)] text-white font-medium text-sm hover:opacity-90 transition-opacity focus-ring"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text)] font-medium text-sm hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
