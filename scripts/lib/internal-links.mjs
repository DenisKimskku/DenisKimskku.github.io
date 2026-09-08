// Canonical form for internal hrefs.
//
// The site is a static export with trailingSlash: true behind GitHub Pages, so
// the only directly-servable form of a page URL is `/path/`. Every other
// spelling costs a hop that Search Console reports as "Page with redirect":
// `/writing/<slug>` (the form docs/GENERATOR-CONTRACT.md tells the article
// generator to emit), `http://` or `www.` absolute URLs (Cloudflare 301s),
// `https://deniskimskku.github.io/...` (GitHub 301s to the apex) and
// `/index.html` suffixes. This helper rewrites all of them to the site-relative
// canonical form and leaves external, relative, anchor, and mailto links alone.
//
// Shared between the markdown renderer (src/lib/markdown.ts) and the tests.

export const SITE_HOSTS = ['deniskim1.com', 'www.deniskim1.com', 'deniskimskku.github.io'];

const FILE_EXT_RE = /\.[a-z0-9]{1,5}$/i;
const SKIP_SCHEMES_RE = /^(#|mailto:|tel:|javascript:|data:|sms:)/i;

/**
 * @param {unknown} href
 * @returns {unknown} the normalized href, or the input untouched when it is not an internal link
 */
export function normalizeInternalHref(href) {
  if (typeof href !== 'string' || href === '') return href;
  const trimmed = href.trim();
  if (trimmed === '' || SKIP_SCHEMES_RE.test(trimmed)) return href;

  let pathPart;
  let suffix;
  const absolute = trimmed.match(/^(?:https?:)?\/\/([^/?#]+)([^?#]*)(.*)$/i);
  if (absolute) {
    if (!SITE_HOSTS.includes(absolute[1].toLowerCase())) return href;
    pathPart = absolute[2] || '/';
    suffix = absolute[3];
  } else if (trimmed.startsWith('/')) {
    const match = trimmed.match(/^([^?#]*)(.*)$/);
    pathPart = match[1];
    suffix = match[2];
  } else {
    return href; // relative link: leave as authored
  }

  let normalized = pathPart.replace(/\/{2,}/g, '/').replace(/\/index\.html$/i, '/');
  const lastSegment = normalized.slice(normalized.lastIndexOf('/') + 1);
  if (lastSegment !== '' && !FILE_EXT_RE.test(lastSegment)) {
    normalized += '/';
  }
  return `${normalized}${suffix}`;
}
