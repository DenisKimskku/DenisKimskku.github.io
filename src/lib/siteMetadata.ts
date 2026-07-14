export const siteMetadata = {
  siteUrl: 'https://deniskim1.com',
  siteName: 'Minseok Kim Portfolio',
  authorName: 'Minseok (Denis) Kim',
  title: 'Minseok (Denis) Kim - AI & Security Researcher',
  description:
    'Research portfolio of Minseok (Denis) Kim, focusing on AI security, RAG systems, LLM safety, and adversarial machine learning.',
  ogImage: {
    url: '/images/260214/rag_vis_landing.png',
    width: 1600,
    height: 898,
    alt: 'Research visualization and security-focused projects by Minseok (Denis) Kim',
  },
  profiles: [
    'https://github.com/DenisKimskku',
    'https://scholar.google.com/citations?user=81uf6x0AAAAJ',
  ],
} as const;

// Next.js metadata merges `alternates` shallowly, so a page that sets only
// `canonical` would drop the layout's RSS autodiscovery link. Every page that
// sets alternates must build them through this helper to keep the RSS type.
export function buildAlternates(canonical?: string) {
  return {
    ...(canonical ? { canonical } : {}),
    types: {
      'application/rss+xml': `${siteMetadata.siteUrl}/rss.xml`,
    },
  };
}
