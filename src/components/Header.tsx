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
          <nav className="flex items-center gap-6">
            <Link
              href="/"
              className={`text-sm font-medium transition-colors ${
                isActive('/') && pathname === '/'
                  ? 'text-[var(--color-accent)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
            >
              About
            </Link>
            <Link
              href="/papers"
              className={`text-sm font-medium transition-colors ${
                isActive('/papers')
                  ? 'text-[var(--color-accent)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
            >
              Papers
            </Link>
            <Link
              href="/code"
              className={`text-sm font-medium transition-colors ${
                isActive('/code')
                  ? 'text-[var(--color-accent)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
            >
              Code
            </Link>
            <Link
              href="/writing"
              className={`text-sm font-medium transition-colors ${
                isActive('/writing')
                  ? 'text-[var(--color-accent)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
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
