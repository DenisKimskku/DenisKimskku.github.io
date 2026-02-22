'use client';

import { useEffect, useRef } from 'react';
import { useCurrentTheme } from '@/lib/hooks';

export default function GiscusComments() {
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useCurrentTheme();

  useEffect(() => {
    if (!containerRef.current) return;

    // Remove existing iframe if any
    const existing = containerRef.current.querySelector('.giscus');
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', 'DenisKimskku/DenisKimskku.github.io');
    script.setAttribute('data-repo-id', 'R_kgDOPLUR7w');
    script.setAttribute('data-category', 'Announcements');
    script.setAttribute('data-category-id', 'DIC_kwDOPLUR784C26dh');
    script.setAttribute('data-mapping', 'pathname');
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'bottom');
    script.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    script.setAttribute('data-lang', 'en');
    script.setAttribute('crossorigin', 'anonymous');
    script.async = true;

    containerRef.current.appendChild(script);
  }, [theme]);

  return (
    <div className="mt-12 pt-8 border-t border-[var(--color-border)] no-print">
      <h2 className="text-sm font-semibold mb-6 text-[var(--color-text)] uppercase tracking-wider">
        Comments
      </h2>
      <div ref={containerRef} />
    </div>
  );
}
