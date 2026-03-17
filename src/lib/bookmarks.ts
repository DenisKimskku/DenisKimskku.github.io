const STORAGE_KEY = 'bookmarked-articles';

export function getBookmarks(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function isBookmarked(slug: string): boolean {
  return getBookmarks().includes(slug);
}

export function toggleBookmark(slug: string): boolean {
  const bookmarks = getBookmarks();
  const index = bookmarks.indexOf(slug);
  if (index === -1) {
    bookmarks.push(slug);
  } else {
    bookmarks.splice(index, 1);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  return index === -1;
}
