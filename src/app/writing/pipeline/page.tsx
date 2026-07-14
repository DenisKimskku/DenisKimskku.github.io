import type { Metadata } from 'next';
import Link from 'next/link';
import { siteMetadata, buildAlternates } from '@/lib/siteMetadata';

const description =
  'How the automated review pipeline behind the daily paper reviews, digests, and trend reports on this site works.';

export const metadata: Metadata = {
  title: 'How the Review Pipeline Works',
  description,
  alternates: buildAlternates('/writing/pipeline/'),
  openGraph: {
    title: `How the Review Pipeline Works | ${siteMetadata.authorName}`,
    description,
    url: `${siteMetadata.siteUrl}/writing/pipeline/`,
    type: 'website',
    images: [siteMetadata.ogImage],
  },
};

export default function PipelinePage() {
  return (
    <div className="mx-auto px-6 max-[560px]:px-5 max-w-[720px] py-16 md:py-24">
      <Link
        href="/writing/"
        className="inline-flex items-center gap-1.5 mb-8 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Writing
      </Link>

      <header className="mb-10">
        <h1 className="font-serif text-[34px] font-semibold tracking-[-0.03em] leading-[1.25] mb-4 text-[var(--color-text)]">
          How the Review Pipeline Works
        </h1>
        <p className="text-lg text-[var(--color-text-secondary)]">
          The paper reviews, daily digests, and weekly trend reports on this site are
          produced by an automated pipeline. Here is what that actually means.
        </p>
      </header>

      <div className="space-y-6 text-[var(--color-text-secondary)] leading-relaxed">
        <p>
          Every day the pipeline scans new arXiv submissions in AI security and adjacent
          areas and selects the papers that look most relevant to this site&apos;s focus:
          LLM safety, RAG security, agent security, and adversarial machine learning.
        </p>
        <p>
          Reviews are then drafted by an LLM pipeline that I built and direct. It reads
          each selected paper and produces a structured write-up — threat model, approach,
          results, and takeaways — following a format and editorial guidelines I defined.
          Daily digests and weekly trend reports are assembled the same way from the
          individual reviews. Header images on these posts are AI-generated.
        </p>
        <p>
          I spot-check output before publication rather than line-editing every post, so
          mistakes can slip through: a misread table, an overstated claim, an imprecise
          summary. When I find an error — or someone points one out — I correct the
          article and note the fix in the commit history. Machine-generated posts carry a
          disclosure line linking here, and standalone paper reviews are kept out of
          search indexing so the original papers rank instead.
        </p>
        <p>
          If something looks wrong, I want to know. Ask the AskAI widget on any article,
          or open an issue on{' '}
          <a
            href="https://github.com/DenisKimskku/DenisKimskku.github.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-accent)] hover:underline"
          >
            GitHub
          </a>
          . Human-written work — research papers, projects, and tutorials — is labeled by
          its type and does not go through this pipeline.
        </p>
      </div>

      <footer className="mt-12 pt-8 border-t border-[var(--color-border)]">
        <Link href="/writing/" className="text-sm text-[var(--color-accent)] hover:underline">
          Back to all writing
        </Link>
      </footer>
    </div>
  );
}
