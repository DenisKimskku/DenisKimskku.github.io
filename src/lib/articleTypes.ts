// Reader-facing category taxonomy for the Writing section.
//
// This is a PURE display layer with no Node imports, so it is safe to import
// from both server components and the client-side WritingHub. The underlying
// frontmatter `type` strings — and everything that keys off them (the article
// index, scripts/lib/provenance.mjs, RSS/OG generation) — are deliberately left
// untouched; this module only groups and relabels types for the reader. That
// separation is what lets the daily automation keep writing "News Digest" /
// "Trend Report" while the site presents them as one category.

// Daily "News Digest" and weekly "Trend Report" articles are surfaced under a
// single reader-facing category. Their raw types stay distinct in the files and
// the index (the automation writes them; provenance depends on them).
export const NEWS_AND_TRENDS = 'News & Trends';

const NEWS_TREND_TYPES = new Set(['News Digest', 'Trend Report']);

// Collapse a raw article `type` into its display-category key.
export function getCategory(type: string): string {
  return NEWS_TREND_TYPES.has(type) ? NEWS_AND_TRENDS : type;
}

// Per-category chip config: `label` is shown on the filter button; `color` is
// reserved for accents. Keyed by the value returned from getCategory().
export const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  [NEWS_AND_TRENDS]: { label: 'News & Trends', color: 'text-blue-500' },
  'Paper Walkthrough': { label: 'Walkthroughs', color: 'text-teal-500' },
  'Research Paper': { label: 'Research', color: 'text-emerald-500' },
  'Paper Review': { label: 'Reviews', color: 'text-amber-500' },
  'Tutorial': { label: 'Tutorials', color: 'text-rose-500' },
  'Project': { label: 'Projects', color: 'text-cyan-500' },
};

// Label for a category filter chip (falls back to the category key itself).
export function getCategoryLabel(category: string): string {
  return CATEGORY_CONFIG[category]?.label ?? category;
}

// Label for the per-article meta line. News/Trend articles read as the merged
// category; every other type shows its raw label unchanged (e.g. "Paper
// Walkthrough", "Research Paper", "Paper Review").
export function getTypeMetaLabel(type: string): string {
  return NEWS_TREND_TYPES.has(type) ? NEWS_AND_TRENDS : type;
}

// Distinct categories present across a set of article types, sorted for stable
// display order.
export function getCategories(types: string[]): string[] {
  return Array.from(new Set(types.map(getCategory))).sort();
}
