import { MetadataRoute } from 'next';
import { siteMetadata } from '@/lib/siteMetadata';

export const dynamic = 'force-static';

// Why the RSC payload files are disallowed
// ---------------------------------------
// The static export (output: 'export') writes, next to every page's
// index.html, the React Server Components payloads that the client router
// prefetches on <Link> hover/viewport: /<route>/index.txt plus the Next 16
// per-segment files /<route>/__next._tree.txt, __next._full.txt,
// __next._index.txt and __next.<segment>.__PAGE__.txt (2,227 .txt files for
// 449 pages in the 2026-09-08 build). GitHub Pages serves them as text/plain,
// they contain the full article text, and Googlebot's renderer executes the
// prefetch fetches, so they are crawlable URLs that duplicate every page as a
// plain-text document. That is exactly the class of URL that shows up in
// Search Console as "Crawled - currently not indexed" (the static-export
// counterpart of the well-known `?_rsc=` reports on server deployments,
// vercel/next.js discussion #61850). They are not needed to render a page:
// the HTML is fully pre-rendered and the payloads only serve client-side
// navigation, so blocking them cannot affect what Google renders or indexes.
// /_next/static/ (the CSS/JS chunks) must stay crawlable, otherwise Google
// cannot render the pages at all - it is allowed explicitly below.
//
// Matching semantics come from Google's robots.txt specification
// (https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt):
// `*` matches any sequence of characters, `$` anchors the end of the URL, and
// when several rules match, the most specific (longest path) rule wins, so the
// Disallow lines below beat `Allow: /` for the payload URLs and nothing else.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/_next/static/'],
        disallow: [
          '/api/',
          // RSC payload of the home page and of every nested route.
          '/index.txt$',
          '/*/index.txt$',
          // Next 16 per-segment prefetch payloads, root and nested.
          '/__next.',
          '/*/__next.',
          // Not emitted by the static export; kept so a future server
          // deployment (where Next appends ?_rsc=<hash>) does not regress.
          '/*?_rsc=',
        ],
      },
    ],
    sitemap: `${siteMetadata.siteUrl}/sitemap.xml`,
  };
}
