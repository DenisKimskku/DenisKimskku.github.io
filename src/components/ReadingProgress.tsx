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

export default function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    function handleScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) {
        setProgress(0);
        return;
      }
      setProgress(Math.min((scrollTop / docHeight) * 100, 100));
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 w-full h-[3px] z-50"
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Reading progress"
    >
      <div
        className="h-full bg-[var(--color-accent)]"
        style={{
          width: `${progress}%`,
          transition: reducedMotion ? 'none' : 'width 100ms linear',
        }}
      />
    </div>
  );
}
