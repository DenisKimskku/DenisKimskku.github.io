'use client';

import { useEffect, useState, useCallback } from 'react';

export default function KeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    if (e.key === 'Escape') {
      if (showHelp) {
        setShowHelp(false);
        return;
      }
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      return;
    }

    if (isTyping) return;

    if (e.key === '?') {
      e.preventDefault();
      setShowHelp((prev) => !prev);
      return;
    }

    if (e.key === '/') {
      const searchInput = document.getElementById('writing-search');
      if (searchInput) {
        e.preventDefault();
        searchInput.focus();
      }
      return;
    }

    if (e.key === 'j' || e.key === 'k') {
      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-article-link]'));
      if (links.length === 0) return;

      const currentIndex = links.findIndex(
        (link) => link === document.activeElement || link.contains(document.activeElement)
      );

      let nextIndex: number;
      if (e.key === 'j') {
        nextIndex = currentIndex < links.length - 1 ? currentIndex + 1 : 0;
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : links.length - 1;
      }

      links[nextIndex].focus();
      links[nextIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
  }, [showHelp]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const shortcuts = [
    { key: '/', description: 'Focus search' },
    { key: 'j / k', description: 'Navigate articles' },
    { key: '?', description: 'Toggle this help' },
    { key: 'Esc', description: 'Close / blur' },
  ];

  return (
    <>
      {/* Floating help button */}
      <button
        type="button"
        onClick={() => setShowHelp((prev) => !prev)}
        className="fixed bottom-20 right-6 z-40 w-9 h-9 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text-muted)] transition-colors flex items-center justify-center text-sm font-mono no-print"
        aria-label="Keyboard shortcuts"
      >
        ?
      </button>

      {/* Help modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center no-print">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowHelp(false)}
          />
          <div className="relative bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl shadow-lg p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[var(--color-text)] uppercase tracking-wider">
                Keyboard Shortcuts
              </h2>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              {shortcuts.map((s) => (
                <div key={s.key} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-text-secondary)]">{s.description}</span>
                  <kbd className="px-2 py-0.5 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-muted)]">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
