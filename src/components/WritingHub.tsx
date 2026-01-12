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

export default function WritingHub({ articles }: WritingHubProps) {
  const [searchTerm, setSearchTerm] = useState('');
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
    if (searchTerm) {
      const searchTermsArray = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
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
  }, [articles, searchTerm, activeTags]);

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

  const searchTermsArray = searchTerm
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
      <div className="mb-8 space-y-6">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search articles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
              aria-label="Clear search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">
                Filter by tags:
              </h3>
              {activeTags.size > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-[var(--color-accent)] hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    activeTags.has(tag)
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-[var(--color-bg-secondary)] text-[var(--color-text)] border border-[var(--color-border)] hover:border-[var(--color-accent)]'
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
      <p className="text-sm text-[var(--color-text-secondary)] mb-6">
        Showing {filteredArticles.length} of {articles.length} articles
      </p>

      {/* Articles List */}
      <AnimatePresence>
        {filteredArticles.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-16"
          >
            <p className="text-lg text-[var(--color-text-secondary)]">
              No articles found matching your criteria.
            </p>
            <button
              onClick={clearAllFilters}
              className="mt-4 text-[var(--color-accent)] hover:underline"
            >
              Clear filters
            </button>
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {filteredArticles.map((article) => (
              <motion.article
                key={article.slug}
                variants={itemVariants}
                className="border border-[var(--color-border)] rounded-lg p-6 hover:border-[var(--color-accent)] transition-all duration-300 transform hover:scale-105 hover:shadow-lg bg-[var(--color-bg-secondary)]"
              >
                <div className="flex flex-wrap gap-2 mb-3 text-sm text-[var(--color-text-secondary)]">
                  <span>{article.date}</span>
                  <span>•</span>
                  <span>{article.type}</span>
                </div>

                <h2 className="text-2xl font-bold font-serif mb-3">
                  <Link
                    href={`/writing/${article.slug}`}
                    className="text-[var(--color-text)] hover:text-[var(--color-accent)] transition-colors"
                  >
                    {highlightText(article.title, searchTermsArray)}
                  </Link>
                </h2>

                <div className="flex flex-wrap gap-2 mb-4">
                  {article.tags.map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        activeTags.has(tag)
                          ? 'bg-[var(--color-accent)] text-white'
                          : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
                      }`}
                    >
                      {highlightText(tag, searchTermsArray)}
                    </span>
                  ))}
                </div>

                <p className="text-[var(--color-text)] leading-relaxed">
                  {highlightText(article.description, searchTermsArray)}
                </p>
              </motion.article>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
