import type { Metadata } from 'next';
import Link from 'next/link';
import StructuredData from '@/components/StructuredData';
import { siteMetadata } from '@/lib/siteMetadata';

export const metadata: Metadata = {
  title: 'About',
  description: siteMetadata.description,
  alternates: {
    canonical: '/',
  },
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
        jobTitle: 'AI & Security Researcher',
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
    <div className="container-custom py-16 md:py-24">
      <StructuredData data={jsonLd} />
      <section id="about">
        <h1 className="text-3xl md:text-4xl font-semibold mb-10 text-[var(--color-text)] font-serif">
          About
        </h1>
        <div className="space-y-6 text-[var(--color-text)] leading-relaxed">
          <p>
            I am a researcher bridging computer security and machine learning. My work focuses on
            enhancing the safety, security, and alignment of advanced AI systems. I develop defenses
            against adversarial attacks and apply large language models to binary analysis and reverse engineering.
          </p>
          <p>
            I am an M.S. candidate at Sungkyunkwan University, advised by{' '}
            <a
              href="https://kevinkoo001.github.io/"
              className="text-[var(--color-accent)] hover:underline decoration-[var(--color-accent)]/30 underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              Hyungjoon (Kevin) Koo
            </a>
            . I hold a B.A. in software from the same institution.
          </p>
          <p>
            My main research interests include adversarial robustness in advanced AI systems
            (like RAG and A2A communication) and using LLMs for cybersecurity challenges such as
            binary analysis and reverse engineering.
          </p>
          <p>
            A complete list of my{' '}
            <Link href="/papers" className="text-[var(--color-accent)] hover:underline decoration-[var(--color-accent)]/30 underline-offset-2">
              publications
            </Link>{' '}
            are online, along with some of my{' '}
            <Link href="/code" className="text-[var(--color-accent)] hover:underline decoration-[var(--color-accent)]/30 underline-offset-2">
              code
            </Link>
            , and some extra{' '}
            <Link href="/writing" className="text-[var(--color-accent)] hover:underline decoration-[var(--color-accent)]/30 underline-offset-2">
              writings
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
