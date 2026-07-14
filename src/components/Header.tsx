'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import ThemeToggle from './ThemeToggle';

const navItems = [
  { href: '/', label: 'About', exact: true },
  { href: '/papers/', label: 'Papers' },
  { href: '/code/', label: 'Code' },
  { href: '/writing/', label: 'Writing' },
  { href: '/resume/', label: 'Resume' },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return pathname === path;
    }
    return pathname?.startsWith(path);
  };

  // Close the mobile menu on navigation (incl. back/forward) by resetting state
  // during render when the path changes — see react.dev "you might not need an effect".
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  // Close the mobile menu on Escape.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // Tailwind v3 drops opacity modifiers on var() arbitrary values, so use color-mix() directly.
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[color:color-mix(in_srgb,var(--color-bg)_92%,transparent)] backdrop-blur-sm border-b border-[var(--color-border)] no-print">
      <div className="container-custom">
        <div className="flex items-center justify-between h-[var(--header-height)]">
          {/* Logo/Name */}
          <Link
            href="/"
            className="text-base font-medium text-[var(--color-text)] hover:text-[var(--color-accent)] transition-colors tracking-tight"
          >
            Minseok Kim
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Primary navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href, item.exact) ? 'page' : undefined}
                className={`text-sm transition-colors px-3 py-1.5 rounded-md focus-ring ${
                  isActive(item.href, item.exact)
                    ? 'text-[var(--color-text)] font-medium'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="w-px h-4 bg-[var(--color-border)] mx-2" />
            <ThemeToggle />
          </nav>

          {/* Mobile controls */}
          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="mobile-nav"
              className="p-2 rounded-lg text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] transition-colors focus-ring"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {open ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation panel */}
      {open && (
        <nav
          id="mobile-nav"
          aria-label="Primary navigation"
          className="md:hidden border-t border-[var(--color-border)] bg-[color:color-mix(in_srgb,var(--color-bg)_95%,transparent)] backdrop-blur-sm"
        >
          <div className="container-custom py-2 flex flex-col">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href, item.exact) ? 'page' : undefined}
                onClick={() => setOpen(false)}
                className={`text-sm transition-colors px-3 py-3 rounded-md focus-ring ${
                  isActive(item.href, item.exact)
                    ? 'text-[var(--color-text)] font-medium'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)]'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
