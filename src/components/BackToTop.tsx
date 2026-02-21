'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';

function useReducedMotion(): boolean {
  const subscribe = useCallback((cb: () => void) => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener('change', cb);
    return () => mq.removeEventListener('change', cb);
  }, []);
  const getSnapshot = useCallback(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );
  const getServerSnapshot = useCallback(() => false, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default function BackToTop() {
  const [visible, setVisible] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > 400);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      aria-label="Back to top"
      className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-colors shadow-sm no-print"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    </button>
  );
}
