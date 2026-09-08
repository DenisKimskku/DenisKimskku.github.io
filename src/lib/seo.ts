// Search snippets are cut around ~158 characters; trim meta descriptions at a
// word boundary so they never end mid-word. OG and JSON-LD keep the full text.
// Shared by the article page and tag landing pages.
export function truncateForMeta(text: string, maxLength = 158): string {
  if (text.length <= maxLength) {
    return text;
  }

  const truncated = text.slice(0, maxLength - 1);
  const lastSpace = truncated.lastIndexOf(' ');
  const safeSlice = lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
  return `${safeSlice.trim()}…`;
}

const MONTH_ABBREVIATIONS: Record<string, string> = {
  January: 'Jan',
  February: 'Feb',
  March: 'Mar',
  April: 'Apr',
  May: 'May',
  June: 'Jun',
  July: 'Jul',
  August: 'Aug',
  September: 'Sep',
  October: 'Oct',
  November: 'Nov',
  December: 'Dec',
};

// Tags too broad to distinguish one issue from the next; they only get used
// as a topic when nothing more specific is available.
const GENERIC_TOPIC_TAGS = new Set(['AI Security', 'LLM Security', 'ML Security', 'AI Safety', 'Security', 'LLM', 'AI']);

// The automation titles every issue "<Series> — <Month DD, YYYY>[: <Topics>]".
const SERIES_TITLE = /^(AI Security Digest|This Week in AI Security)\s+[—–-]\s+([A-Z][a-z]+)\s+(\d{1,2}),\s+(\d{4})(?::\s*(.+))?$/;

function topicsFromTags(tags: string[]): string {
  const specific = tags.filter((tag) => !GENERIC_TOPIC_TAGS.has(tag));
  const generic = tags.filter((tag) => GENERIC_TOPIC_TAGS.has(tag));
  return [...specific, ...generic].slice(0, 2).join(' & ');
}

// <title> for the search result, not the visible headline. Every digest and
// trend report shares a ~40-character series prefix, so in a ~60-character
// SERP title the part that actually distinguishes issues ("Backdoors & AI
// Agents") is what gets truncated. Front-load the topics and shorten the date;
// the H1, og:title and feeds keep the authored title. Topic-less issues (the
// automation omitted the suffix for a stretch of July/August 2026) fall back
// to their two most specific tags. Anything outside the two series is
// returned unchanged.
export function getSeoTitle(article: { title: string; tags?: string[] }): string {
  const match = article.title.trim().match(SERIES_TITLE);
  if (!match) {
    return article.title;
  }
  const [, series, month, day, year, suffix] = match;
  const monthAbbreviation = MONTH_ABBREVIATIONS[month];
  if (!monthAbbreviation) {
    return article.title;
  }
  const topics = suffix?.trim() || topicsFromTags(article.tags ?? []);
  const date = `${series}, ${monthAbbreviation} ${Number(day)}, ${year}`;
  return topics ? `${topics} — ${date}` : date;
}

// Short label for an issue in dense same-week lists that already show the
// date: the topics alone for a series issue, the full title for anything else.
// Doubles as anchor-text variety — /news/ links every issue by its full title.
export function getIssueTopics(article: { title: string; tags?: string[] }): string {
  const match = article.title.trim().match(SERIES_TITLE);
  if (!match) {
    return article.title;
  }
  return match[5]?.trim() || topicsFromTags(article.tags ?? []) || article.title;
}
