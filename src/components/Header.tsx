'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

const navItems = [
  { href: '/', label: 'About', exact: true },
  { href: '/papers', label: 'Papers' },
  { href: '/code', label: 'Code' },
  { href: '/writing', label: 'Writing' },
];

export default function Header() {
  const pathname = usePathname();

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return pathname === path;
    }
    return pathname?.startsWith(path);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-bg)]/90 backdrop-blur-sm border-b border-[var(--color-border)] no-print">
      <div className="container-custom">
        <div className="flex items-center justify-between h-[var(--header-height)]">
          {/* Logo/Name */}
          <Link
            href="/"
            className="text-base font-medium text-[var(--color-text)] hover:text-[var(--color-accent)] transition-colors tracking-tight"
          >
            Minseok Kim
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1" aria-label="Primary navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href, item.exact) ? 'page' : undefined}
                className={`text-sm transition-colors px-3 py-1.5 rounded-md ${
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
        </div>
      </div>
    </header>
  );
}
