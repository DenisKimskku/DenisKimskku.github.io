import type { Metadata } from 'next';
import Link from 'next/link';
import StructuredData from '@/components/StructuredData';
import { siteMetadata } from '@/lib/siteMetadata';
import projectData from '@/data/projects.json';

const description = 'Open-source projects and code contributions by Minseok (Denis) Kim.';
export const metadata: Metadata = {
  title: 'Code',
  description,
  alternates: {
    canonical: '/code',
  },
  openGraph: {
    title: `Code | ${siteMetadata.authorName}`,
    description,
    url: `${siteMetadata.siteUrl}/code`,
    type: 'website',
    images: [siteMetadata.ogImage],
  },
};

const { featured, projects } = projectData;

export default function Code() {
  const pageUrl = `${siteMetadata.siteUrl}/code`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${pageUrl}#collection`,
        url: pageUrl,
        name: 'Code',
        description,
        isPartOf: siteMetadata.siteUrl,
      },
      {
        '@type': 'ItemList',
        '@id': `${pageUrl}#items`,
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        numberOfItems: projects.length + 1,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            item: {
              '@type': 'SoftwareSourceCode',
              name: featured.name,
              description: featured.description,
              codeRepository: featured.githubUrl,
              programmingLanguage: featured.language,
              url: `${siteMetadata.siteUrl}${featured.demoUrl}`,
            },
          },
          ...projects.map((project, index) => ({
            '@type': 'ListItem',
            position: index + 2,
            item: {
              '@type': 'SoftwareSourceCode',
              name: project.name,
              description: project.description,
              codeRepository: project.githubUrl,
              programmingLanguage: project.language,
              url: project.githubUrl,
            },
          })),
        ],
      },
    ],
  };

  return (
    <div className="container-custom py-16 md:py-24">
      <StructuredData data={jsonLd} />
      <header className="mb-12">
        <h1 className="text-3xl md:text-4xl font-semibold mb-4 text-[var(--color-text)] font-serif">
          Code
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Open-source projects and research implementations.{' '}
          <a
            href="https://github.com/DenisKimskku"
            className="text-[var(--color-accent)] hover:underline decoration-[var(--color-accent)]/30 underline-offset-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            View GitHub
          </a>
        </p>
      </header>

      <div className="space-y-4">
        {/* Featured Project */}
        <article className="group py-5 -mx-4 px-4 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold font-serif text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors mb-1.5">
                <Link href={featured.demoUrl}>
                  {featured.name}
                </Link>
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                {featured.description}
              </p>
              <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#F05138]"></span>
                  {featured.language}
                </span>
                <Link
                  href={featured.demoUrl}
                  className="text-[var(--color-accent)] hover:underline"
                >
                  Learn more
                </Link>
                <a
                  href={featured.githubUrl}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
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
        </article>

        {/* Other Projects */}
        {projects.map((project) => (
          <article
            key={project.name}
            className="group py-5 -mx-4 px-4 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold font-serif text-[var(--color-text)] group-hover:text-[var(--color-accent)] transition-colors mb-1.5">
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {project.name}
                  </a>
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                  {project.description}
                </p>
                <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                  {project.language && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]"></span>
                      {project.language}
                    </span>
                  )}
                  <a
                    href={project.githubUrl}
                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View on GitHub
                  </a>
                </div>
              </div>
              <svg
                className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors flex-shrink-0 mt-1.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
