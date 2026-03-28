'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface Article {
  slug: string;
  title: string;
  date: string;
  type: string;
  description: string;
  tags: string[];
  readingTime: number;
}

interface NewsHubProps {
  articles: Article[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr + 'T00:00:00');
  const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  return formatDate(dateStr);
}

const TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  'News Digest': {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    label: 'Digest',
  },
  'Paper Review': {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    label: 'Paper Review',
  },
};

export default function NewsHub({ articles }: NewsHubProps) {
  const [activeType, setActiveType] = useState<string | null>(null);

  const featured = articles[0];
  const rest = useMemo(() => {
    const items = articles.slice(1);
    if (!activeType) return items;
    return items.filter((a) => a.type === activeType);
  }, [articles, activeType]);

  return (
    <div>
      {/* Featured Latest */}
      {featured && (
        <Link href={`/writing/${featured.slug}`} className="block group mb-12">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 md:p-8 hover:border-[var(--color-accent)]/40 transition-all"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${TYPE_STYLES[featured.type]?.bg || ''} ${TYPE_STYLES[featured.type]?.text || ''}`}>
                {TYPE_STYLES[featured.type]?.label || featured.type}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">
                {daysAgo(featured.date)}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">
                {featured.readingTime} min read
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-semibold font-serif text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors mb-3">
              {featured.title}
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed line-clamp-3 mb-4">
              {featured.description}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {featured.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded text-xs bg-[var(--color-bg)] text-[var(--color-text-muted)] border border-[var(--color-border)]"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="absolute top-6 right-6 md:top-8 md:right-8">
              <span className="text-xs font-medium text-[var(--color-accent)] uppercase tracking-wider">
                Latest
              </span>
            </div>
          </motion.div>
        </Link>
      )}

      {/* Type Filter */}
      <div className="flex items-center gap-3 mb-8">
        <button
          type="button"
          onClick={() => setActiveType(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            !activeType
              ? 'bg-[var(--color-text)] text-[var(--color-bg)]'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
          }`}
        >
          All
        </button>
        {Object.entries(TYPE_STYLES).map(([type, style]) => (
          <button
            type="button"
            key={type}
            onClick={() => setActiveType(activeType === type ? null : type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeType === type
                ? `${style.bg} ${style.text}`
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}
          >
            {style.label}
          </button>
        ))}
        <span className="text-xs text-[var(--color-text-muted)] ml-auto">
          {rest.length} {rest.length === 1 ? 'article' : 'articles'}
        </span>
      </div>

      {/* Article Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeType || 'all'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="grid gap-4 md:grid-cols-2"
        >
          {rest.map((article, i) => (
            <motion.div
              key={article.slug}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                href={`/writing/${article.slug}`}
                className="group block h-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-5 hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-bg-secondary)] transition-all"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${TYPE_STYLES[article.type]?.bg || ''} ${TYPE_STYLES[article.type]?.text || ''}`}>
                    {TYPE_STYLES[article.type]?.label || article.type}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {daysAgo(article.date)}
                  </span>
                </div>
                <h3 className="text-sm font-semibold font-serif text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors mb-2 line-clamp-2">
                  {article.title}
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 mb-3">
                  {article.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                  <span>{article.readingTime} min</span>
                  {article.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 rounded bg-[var(--color-bg-secondary)] text-[10px]">
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {rest.length === 0 && (
        <div className="text-center py-16">
          <p className="text-[var(--color-text-secondary)]">
            No articles yet. Check back soon.
          </p>
        </div>
      )}
    </div>
  );
}
