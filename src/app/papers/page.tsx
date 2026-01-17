import type { Metadata } from 'next';
import fs from 'fs';
import path from 'path';

export const metadata: Metadata = {
  title: 'Papers',
  description: 'Academic publications by Minseok (Denis) Kim on AI security, RAG systems, and LLM safety.',
};

interface Paper {
  year: string;
  title: string;
  authors: string[];
  conference: string;
  description: string;
  pdfUrl?: string;
  codeUrl?: string;
  slideUrl?: string;
}

async function getPapers(): Promise<Paper[]> {
  const filePath = path.join(process.cwd(), 'src', 'data', 'papers.json');
  const fileContents = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(fileContents);
}

export default async function Papers() {
  const papers = await getPapers();

  return (
    <div className="container-custom py-16 md:py-24">
      <header className="mb-12">
        <h1 className="text-3xl md:text-4xl font-semibold mb-4 text-[var(--color-text)] font-serif">
          Papers
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Academic publications and research work.
        </p>
      </header>

      <div className="space-y-6">
        {papers.map((paper, index) => (
          <article
            key={index}
            className="group py-6 border-b border-[var(--color-border)] last:border-0"
          >
            <div className="flex items-center gap-3 mb-3 text-sm text-[var(--color-text-muted)]">
              <span>{paper.year}</span>
              <span>·</span>
              <span>{paper.conference}</span>
            </div>

            <h2 className="text-xl font-semibold mb-2 text-[var(--color-text)] font-serif">
              {paper.pdfUrl ? (
                <a
                  href={paper.pdfUrl}
                  className="hover:text-[var(--color-accent)] transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {paper.title}
                </a>
              ) : (
                paper.title
              )}
            </h2>

            <p className="text-sm text-[var(--color-text-secondary)] mb-3">
              {paper.authors.join(', ')}
            </p>

            <p className="text-[var(--color-text-secondary)] mb-4 text-sm leading-relaxed">
              {paper.description}
            </p>

            <div className="flex flex-wrap gap-2">
              {paper.pdfUrl && (
                <a
                  href={paper.pdfUrl}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-accent)] hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  PDF
                </a>
              )}
              {paper.codeUrl && (
                <a
                  href={paper.codeUrl}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  Code
                </a>
              )}
              {paper.slideUrl && (
                <a
                  href={paper.slideUrl}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Slides
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
