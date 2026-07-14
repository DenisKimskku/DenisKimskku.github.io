import type { Metadata } from 'next';
import Link from 'next/link';
import StructuredData from '@/components/StructuredData';
import { siteMetadata, buildAlternates } from '@/lib/siteMetadata';

export const metadata: Metadata = {
  description: siteMetadata.description,
  alternates: buildAlternates('/'),
  openGraph: {
    title: siteMetadata.title,
    description: siteMetadata.description,
    url: siteMetadata.siteUrl,
    type: 'website',
    images: [siteMetadata.ogImage],
  },
};

export default function Home() {
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
        url: siteMetadata.siteUrl,
        sameAs: siteMetadata.profiles,
        jobTitle: 'Ph.D. Student & AI Security Researcher',
        knowsAbout: [
          'AI security',
          'RAG security',
          'LLM safety',
          'Adversarial machine learning',
        ],
      },
    ],
  };

  return (
    <div className="container-custom py-24 max-[560px]:py-16 max-[560px]:px-5">
      <StructuredData data={jsonLd} />
      <section id="about">
        <h1 className="sr-only">Minseok (Denis) Kim</h1>
        <p className="font-serif text-[26px] font-medium tracking-[-0.025em] leading-[1.45] text-[var(--color-text)] max-w-[620px] mb-[28px]">
          I am a researcher bridging computer security and machine learning — enhancing the
          safety, security, and alignment of advanced AI systems.
        </p>
        <div aria-hidden="true" className="w-10 h-px bg-[var(--color-text)] mb-[28px]" />
        <div className="space-y-6 text-[var(--color-text)] leading-[1.7]">
          <p>
            I develop defenses against adversarial attacks and apply large language models to
            binary analysis and reverse engineering.
          </p>
          <p>
            I am a Ph.D. student at Sungkyunkwan University, advised by{' '}
            <a
              href="https://kevinkoo001.github.io/"
              className="text-[var(--color-accent)] hover:underline decoration-[color:color-mix(in_srgb,var(--color-accent)_30%,transparent)] underline-offset-2"
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
            <Link href="/papers/" className="text-[var(--color-accent)] hover:underline decoration-[color:color-mix(in_srgb,var(--color-accent)_30%,transparent)] underline-offset-2">
              publications
            </Link>{' '}
            are online, along with some of my{' '}
            <Link href="/code/" className="text-[var(--color-accent)] hover:underline decoration-[color:color-mix(in_srgb,var(--color-accent)_30%,transparent)] underline-offset-2">
              code
            </Link>
            , and some extra{' '}
            <Link href="/writing/" className="text-[var(--color-accent)] hover:underline decoration-[color:color-mix(in_srgb,var(--color-accent)_30%,transparent)] underline-offset-2">
              writings
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
