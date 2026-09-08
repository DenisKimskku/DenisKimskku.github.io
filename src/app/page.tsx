import fs from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import Link from 'next/link';
import StructuredData from '@/components/StructuredData';
import { getLatestNewsDesk, getRecentHandwrittenArticles } from '@/lib/articles';
import { siteMetadata, buildAlternates, buildOpenGraph } from '@/lib/siteMetadata';

export const metadata: Metadata = {
  description: siteMetadata.description,
  alternates: buildAlternates('/'),
  openGraph: buildOpenGraph({
    title: siteMetadata.title,
    description: siteMetadata.description,
    url: siteMetadata.siteUrl,
    type: 'website',
    images: [siteMetadata.ogImage],
  }),
};

interface Highlight {
  when: string;
  text: string;
  href: string | null;
}

interface Award {
  title: string;
  date: string;
}

function readData<T>(fileName: string): T {
  const filePath = path.join(process.cwd(), 'src', 'data', fileName);
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

const accentLinkClass =
  'text-(--color-accent) hover:underline decoration-[color-mix(in_srgb,var(--color-accent)_30%,transparent)] underline-offset-2';

export default function Home() {
  const highlights = readData<Highlight[]>('highlights.json');
  const awards = readData<Award[]>('awards.json');
  // Newest hand-written work and news issues get a direct anchor from the
  // strongest page on the site (same exclusions as /writing/ and /news/).
  const recentWriting = getRecentHandwrittenArticles(6)
    .filter((a) => a.type !== 'Paper Review')
    .slice(0, 3);
  const newsDesk = getLatestNewsDesk(3);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${siteMetadata.siteUrl}#website`,
        url: siteMetadata.siteUrl,
        name: siteMetadata.siteName,
        description: siteMetadata.description,
        inLanguage: 'en-US',
        publisher: {
          '@id': `${siteMetadata.siteUrl}#person`,
        },
      },
      {
        '@type': 'Person',
        '@id': `${siteMetadata.siteUrl}#person`,
        name: siteMetadata.authorName,
        alternateName: ['김민석', 'Kim Minseok'],
        url: siteMetadata.siteUrl,
        sameAs: siteMetadata.profiles,
        jobTitle: 'Ph.D. Student & AI Security Researcher',
        knowsAbout: [
          'AI security',
          'RAG security',
          'LLM safety',
          'Adversarial machine learning',
        ],
        affiliation: {
          '@type': 'CollegeOrUniversity',
          name: 'Sungkyunkwan University',
        },
        alumniOf: {
          '@type': 'CollegeOrUniversity',
          name: 'Sungkyunkwan University',
        },
        // Title already carries parentheses ("… (APC’26)"), so join with a comma.
        award: awards.map((award) => `${award.title}, ${award.date}`),
      },
    ],
  };

  return (
    <div className="container-custom py-24 max-[560px]:py-16 max-[560px]:px-5">
      <StructuredData data={jsonLd} />
      <section id="about">
        <h1 className="sr-only">
          Minseok (Denis) Kim <span lang="ko">(김민석)</span>
        </h1>
        <p className="font-serif text-[26px] font-medium tracking-tight leading-[1.45] text-(--color-text) max-w-[620px] mb-[28px]">
          I am a researcher bridging computer security and machine learning — enhancing the
          safety, security, and alignment of advanced AI systems.
        </p>
        <div aria-hidden="true" className="w-10 h-px bg-(--color-text) mb-[28px]" />
        <div className="space-y-6 text-(--color-text) leading-[1.7]">
          <p>
            I develop defenses against adversarial attacks and apply large language models to
            binary analysis and reverse engineering.
          </p>
          <p>
            I am a Ph.D. student at Sungkyunkwan University, advised by{' '}
            <a
              href="https://kevinkoo001.github.io/"
              className={accentLinkClass}
              target="_blank"
              rel="noopener noreferrer"
            >
              Hyungjoon (Kevin) Koo
            </a>
            . I hold a B.A. and M.S. in software from the same institution.
          </p>
          <p>
            My main research interests include adversarial robustness in advanced AI systems
            (like RAG and A2A communication) and using LLMs for cybersecurity challenges such as
            binary analysis and reverse engineering.
          </p>
          <p>
            A complete list of my{' '}
            <Link href="/papers/" className={accentLinkClass}>
              publications
            </Link>{' '}
            are online, along with some of my{' '}
            <Link href="/code/" className={accentLinkClass}>
              code
            </Link>
            , and some extra{' '}
            <Link href="/writing/" className={accentLinkClass}>
              writings
            </Link>
            . My{' '}
            <Link href="/resume/" className={accentLinkClass}>
              résumé
            </Link>{' '}
            is online as well.
          </p>
        </div>
      </section>

      <section aria-labelledby="highlights-heading" className="mt-16">
        <h2
          id="highlights-heading"
          className="text-xs font-medium text-(--color-text-muted) uppercase tracking-wider mb-3"
        >
          Recent highlights
        </h2>
        <ul className="list-none">
          {highlights.map((highlight, index) => (
            <li
              key={`${highlight.when}-${index}`}
              className="grid grid-cols-[88px_1fr] gap-3 max-[560px]:grid-cols-1 py-3 -mx-4 px-4 rounded-lg hover:bg-(--color-bg-secondary) transition-colors"
            >
              <span className="text-[13px] text-(--color-text-muted) tabular-nums">
                {highlight.when}
              </span>
              <span className="text-(--color-text) leading-[1.6]">
                {highlight.href === null ? (
                  highlight.text
                ) : highlight.href.startsWith('/') ? (
                  <Link href={highlight.href} className={accentLinkClass}>
                    {highlight.text}
                  </Link>
                ) : (
                  <a
                    href={highlight.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={accentLinkClass}
                  >
                    {highlight.text}
                  </a>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {recentWriting.length > 0 && (
        <section aria-labelledby="recent-writing-heading" className="mt-16">
          <h2
            id="recent-writing-heading"
            className="text-xs font-medium text-(--color-text-muted) uppercase tracking-wider mb-3"
          >
            Recent writing
          </h2>
          <ul className="list-none">
            {recentWriting.map((article) => (
              <li
                key={article.slug}
                className="grid grid-cols-[88px_1fr] gap-3 max-[560px]:grid-cols-1 py-3 -mx-4 px-4 rounded-lg hover:bg-(--color-bg-secondary) transition-colors"
              >
                <time dateTime={article.date} className="text-[13px] text-(--color-text-muted) tabular-nums">
                  {article.date}
                </time>
                <span className="leading-[1.6]">
                  <Link href={`/writing/${article.slug}/`} className={accentLinkClass}>
                    {article.title}
                  </Link>
                  <span className="block text-sm text-(--color-text-secondary)">
                    {article.type} · {article.description}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm">
            <Link href="/writing/" className={accentLinkClass}>
              All writing →
            </Link>
          </p>
        </section>
      )}

      {(newsDesk.weekly || newsDesk.dailies.length > 0) && (
        <section aria-labelledby="news-desk-heading" className="mt-16">
          <h2
            id="news-desk-heading"
            className="text-xs font-medium text-(--color-text-muted) uppercase tracking-wider mb-3"
          >
            From the news desk
          </h2>
          <p className="text-sm text-(--color-text-muted) mb-3">
            Daily AI security digests and a weekly trend report, produced by an automated
            pipeline I direct and spot-check.
          </p>
          <ul className="list-none">
            {newsDesk.weekly && (
              <li className="grid grid-cols-[88px_1fr] gap-3 max-[560px]:grid-cols-1 py-3 -mx-4 px-4 rounded-lg hover:bg-(--color-bg-secondary) transition-colors">
                <time dateTime={newsDesk.weekly.date} className="text-[13px] text-(--color-text-muted) tabular-nums">
                  {newsDesk.weekly.date}
                </time>
                <span className="leading-[1.6]">
                  <Link href={`/writing/${newsDesk.weekly.slug}/`} className={accentLinkClass}>
                    {newsDesk.weekly.title}
                  </Link>
                  <span className="block text-sm text-(--color-text-secondary)">{newsDesk.weekly.description}</span>
                </span>
              </li>
            )}
            {newsDesk.dailies.map((issue) => (
              <li
                key={issue.slug}
                className="grid grid-cols-[88px_1fr] gap-3 max-[560px]:grid-cols-1 py-3 -mx-4 px-4 rounded-lg hover:bg-(--color-bg-secondary) transition-colors"
              >
                <time dateTime={issue.date} className="text-[13px] text-(--color-text-muted) tabular-nums">
                  {issue.date}
                </time>
                <span className="leading-[1.6]">
                  <Link href={`/writing/${issue.slug}/`} className={accentLinkClass}>
                    {issue.title}
                  </Link>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm">
            <Link href="/news/" className={accentLinkClass}>
              All AI security news →
            </Link>
          </p>
        </section>
      )}
    </div>
  );
}
