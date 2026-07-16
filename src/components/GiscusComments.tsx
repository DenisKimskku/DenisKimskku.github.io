'use client';

import { useEffect, useRef, useState } from 'react';
import { useCurrentTheme } from '@/lib/hooks';

export default function GiscusComments() {
  const containerRef = useRef<HTMLDivElement>(null);
  const injectedRef = useRef(false);
  // Lazy initializer doubles as the no-IntersectionObserver fallback: load
  // immediately when the API is missing (setting state synchronously inside
  // the effect body trips react-hooks/set-state-in-effect).
  const [nearViewport, setNearViewport] = useState(
    () => typeof IntersectionObserver === 'undefined'
  );
  const theme = useCurrentTheme();

  // Defer loading the giscus script until the container is near the viewport.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || nearViewport) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [nearViewport]);

  useEffect(() => {
    const container = containerRef.current;
    if (!nearViewport || !container) return;

    const giscusTheme = theme === 'dark' ? 'dark' : 'light';

    // Once the iframe exists, switch themes via postMessage instead of
    // destroying and rebuilding the whole widget.
    const iframe = container.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
    if (iframe) {
      iframe.contentWindow?.postMessage(
        { giscus: { setConfig: { theme: giscusTheme } } },
        'https://giscus.app'
      );
      return;
    }
    if (injectedRef.current) {
      // Script injected but iframe still mounting: deliver this theme once it
      // lands, else a toggle during load leaves the widget in the stale theme.
      let tries = 0;
      const timer = window.setInterval(() => {
        const frame = container.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
        tries += 1;
        if (frame) {
          frame.contentWindow?.postMessage(
            { giscus: { setConfig: { theme: giscusTheme } } },
            'https://giscus.app'
          );
        }
        if (frame || tries >= 20) window.clearInterval(timer);
      }, 500);
      return () => window.clearInterval(timer);
    }

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
    script.setAttribute('data-theme', giscusTheme);
    script.setAttribute('data-lang', 'en');
    script.setAttribute('crossorigin', 'anonymous');
    script.async = true;

    container.appendChild(script);
    injectedRef.current = true;
  }, [nearViewport, theme]);

  return (
    <div className="mt-12 pt-8 border-t border-[var(--color-border)] no-print">
      <h2 className="text-sm font-semibold mb-6 text-[var(--color-text)] uppercase tracking-wider">
        Comments
      </h2>
      <div ref={containerRef} />
    </div>
  );
}
