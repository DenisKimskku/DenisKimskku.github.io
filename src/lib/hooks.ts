'use client';

import { useSyncExternalStore } from 'react';

function getThemeSnapshot(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function getServerSnapshot(): 'light' | 'dark' {
  return 'light';
}

function subscribeToTheme(callback: () => void): () => void {
  const observer = new MutationObserver(() => {
    callback();
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
  return () => observer.disconnect();
}

export function useCurrentTheme(): 'light' | 'dark' {
  return useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerSnapshot);
}
