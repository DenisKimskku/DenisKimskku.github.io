'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === path;
    }
    return pathname?.startsWith(path);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-bg)]/80 backdrop-blur-md border-b border-[var(--color-border)] no-print">
      <div className="container-custom">
        <div className="flex items-center justify-between h-[var(--header-height)]">
          {/* Logo/Title */}
          <Link
            href="/"
            className="text-xl font-bold text-[var(--color-text)] hover:text-[var(--color-accent)] transition-colors"
          >
            Minseok (Denis) Kim
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-2">
            <Link
              href="/"
              className={`text-sm font-medium transition-colors px-3 py-2 rounded-md ${
                isActive('/') && pathname === '/'
                  ? 'text-[var(--color-accent)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)]'
              }`}
            >
              About
            </Link>
            <Link
              href="/papers"
              className={`text-sm font-medium transition-colors px-3 py-2 rounded-md ${
                isActive('/papers')
                  ? 'text-[var(--color-accent)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)]'
              }`}
            >
              Papers
            </Link>
            <Link
              href="/code"
              className={`text-sm font-medium transition-colors px-3 py-2 rounded-md ${
                isActive('/code')
                  ? 'text-[var(--color-accent)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)]'
              }`}
            >
              Code
            </Link>
            <Link
              href="/writing"
              className={`text-sm font-medium transition-colors px-3 py-2 rounded-md ${
                isActive('/writing')
                  ? 'text-[var(--color-accent)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)]'
              }`}
            >
              Writing
            </Link>

            {/* Theme Toggle */}
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>
  );
}
