'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface Article {
  slug: string;
  title: string;
  date: string;
  type: string;
  description: string;
  tags: string[];
}

interface WritingHubProps {
  articles: Article[];
}

// Levenshtein distance for fuzzy search
function levenshteinDistance(a: string, b: string): number {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function highlightText(text: string, searchTerms: string[]): React.ReactElement {
  if (searchTerms.length === 0) {
    return <>{text}</>;
  }

  const regex = new RegExp(`(${searchTerms.join('|')})`, 'gi');
  const matches = text.split(regex);

  return (
    <>
      {matches.map((part, index) => {
        const isHighlight = searchTerms.some(
          term => part.toLowerCase() === term.toLowerCase()
        );
        return isHighlight ? (
          <span key={index} className="highlight">
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        );
      })}
    </>
  );
}

function useDebounce(value: string, delay: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function WritingHub({ articles }: WritingHubProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 200);
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    articles.forEach(article => {
      article.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [articles]);

  // Filter and search articles
  const filteredArticles = useMemo(() => {
    let filtered = articles;

    // Filter by tags
    if (activeTags.size > 0) {
      filtered = filtered.filter(article =>
        article.tags.some(tag => activeTags.has(tag))
      );
    }

    // Search
    if (debouncedSearch) {
      const searchTermsArray = debouncedSearch.toLowerCase().split(/\s+/).filter(Boolean);
      filtered = filtered.filter(article => {
        const searchableText = [
          article.title,
          article.description,
          article.type,
          ...article.tags,
        ]
          .join(' ')
          .toLowerCase();

        return searchTermsArray.every(term => {
          // Exact match
          if (searchableText.includes(term)) {
            return true;
          }

          // Fuzzy match
          const words = searchableText.split(/\s+/);
          return words.some(word => {
            const distance = levenshteinDistance(term, word);
            return distance <= 2 && term.length > 3; // Allow small typos
          });
        });
      });
    }

    return filtered;
  }, [articles, debouncedSearch, activeTags]);

  const toggleTag = (tag: string) => {
    const newTags = new Set(activeTags);
    if (newTags.has(tag)) {
      newTags.delete(tag);
    } else {
      newTags.add(tag);
    }
    setActiveTags(newTags);
  };

  const clearAllFilters = () => {
    setActiveTags(new Set());
    setSearchTerm('');
  };

  const searchTermsArray = debouncedSearch
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <div>
      {/* Search and Filter Controls */}
      <div className="mb-10 space-y-6">
        {/* Search Input */}
        <div className="relative">
          <label htmlFor="writing-search" className="sr-only">
            Search articles
          </label>
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="writing-search"
            type="text"
            placeholder="Search articles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-10 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors text-sm"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              aria-label="Clear search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                Filter by topic
              </span>
              {activeTags.size > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs text-[var(--color-accent)] hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Article topic filters">
              {allTags.map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  aria-label={`Filter by ${tag}`}
                  aria-pressed={activeTags.has(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    activeTags.has(tag)
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] border border-[var(--color-border)]'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <p className="text-xs text-[var(--color-text-muted)] mb-6 uppercase tracking-wider">
        {filteredArticles.length} {filteredArticles.length === 1 ? 'article' : 'articles'}
      </p>

      {/* Articles List */}
      <AnimatePresence>
        {filteredArticles.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-20"
          >
            <p className="text-[var(--color-text-secondary)] mb-4">
              No articles found matching your criteria.
            </p>
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-sm text-[var(--color-accent)] hover:underline"
            >
              Clear filters
            </button>
          </motion.div>
        ) : (
          <motion.div
            className="space-y-1"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {filteredArticles.map((article) => (
              <motion.article
                key={article.slug}
                variants={itemVariants}
                className="group"
              >
                <Link
                  href={`/writing/${article.slug}`}
                  className="block py-5 -mx-4 px-4 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-semibold font-serif text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors mb-1.5">
                        {highlightText(article.title, searchTermsArray)}
                      </h2>
                      <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-3">
                        {highlightText(article.description, searchTermsArray)}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-[var(--color-text-muted)]">{article.date}</span>
                        <span className="text-[var(--color-border)]">·</span>
                        <span className="text-xs text-[var(--color-text-muted)]">{article.type}</span>
                        {article.tags.slice(0, 2).map((tag, tagIndex) => (
                          <span
                            key={tagIndex}
                            className={`px-2 py-0.5 rounded text-xs ${
                              activeTags.has(tag)
                                ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                                : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]'
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                        {article.tags.length > 2 && (
                          <span className="text-xs text-[var(--color-text-muted)]">
                            +{article.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </div>
                    <svg
                      className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors flex-shrink-0 mt-1.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              </motion.article>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
