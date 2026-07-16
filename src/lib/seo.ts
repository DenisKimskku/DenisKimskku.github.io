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
