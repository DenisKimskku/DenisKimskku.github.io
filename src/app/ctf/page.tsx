import type { Metadata } from 'next';
import CTFTerminal from '@/components/ctf/CTFTerminal';
import StructuredData from '@/components/StructuredData';
import { siteMetadata, buildAlternates } from '@/lib/siteMetadata';

export const metadata: Metadata = {
  title: `LLM Red-Teaming CTF | ${siteMetadata.title}`,
  description: 'Interactive 20-level LLM Capture The Flag (CTF) security arena testing prompt injection, guardrail evasion, and LLM-as-a-Judge jailbreaking.',
  alternates: buildAlternates('/ctf/'),
  openGraph: {
    title: `LLM Red-Teaming CTF | ${siteMetadata.title}`,
    description: 'Interactive 20-level LLM Capture The Flag (CTF) security arena.',
    url: `${siteMetadata.siteUrl}/ctf/`,
    type: 'website',
  },
};

export default function CTFPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'LLM Red-Teaming CTF',
    description: 'Interactive 20-level LLM Capture The Flag (CTF) security arena.',
    url: `${siteMetadata.siteUrl}/ctf/`,
  };

  return (
    <div className="container-custom py-16 max-[560px]:py-10">
      <StructuredData data={jsonLd} />
      <CTFTerminal />
    </div>
  );
}
