'use client';

import { useState, useEffect } from 'react';
import { isBookmarked, toggleBookmark } from '@/lib/bookmarks';

interface BookmarkButtonProps {
  slug: string;
  onToggle?: (slug: string, bookmarked: boolean) => void;
}

export default function BookmarkButton({ slug, onToggle }: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    setBookmarked(isBookmarked(slug));
  }, [slug]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newState = toggleBookmark(slug);
    setBookmarked(newState);
    onToggle?.(slug, newState);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark article'}
      aria-pressed={bookmarked}
      className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
    >
      <svg className="w-4 h-4" fill={bookmarked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={bookmarked ? 0 : 2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    </button>
  );
}
