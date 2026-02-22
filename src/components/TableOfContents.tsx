'use client';

import { useEffect, useState } from 'react';

interface TocItem {
  level: number;
  text: string;
  id: string;
}

export default function TableOfContents({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter(Boolean) as HTMLElement[];

    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav aria-label="Table of contents">
      <h2 className="text-xs font-semibold mb-3 text-[var(--color-text-muted)] uppercase tracking-wider">
        Contents
      </h2>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={`block text-sm transition-colors py-0.5 ${
                item.level === 3 ? 'pl-4' : ''
              } ${
                activeId === item.id
                  ? 'text-[var(--color-accent)] border-l-2 border-[var(--color-accent)] pl-3'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]'
              }`}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
