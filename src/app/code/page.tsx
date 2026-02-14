import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Code',
  description: 'Open-source projects and code contributions by Minseok (Denis) Kim.',
};

interface Project {
  name: string;
  description: string;
  html_url: string;
  language: string;
}

// Static project data - no API calls needed
const projects: Project[] = [
  {
    name: 'RAG-Vis Playground',
    description: 'Interactive visualizer for RAG security, covering fundamentals, adversarial attacks (poisoning, injection), and multi-stage defense mechanisms.',
    html_url: 'https://github.com/DenisKimskku/RAG-Vis-Playground',
    language: 'TypeScript',
  },
  {
    name: 'RAGDefender',
    description: 'A resource-efficient defense mechanism against knowledge corruption attacks in practical RAG deployments.',
    html_url: 'https://github.com/SecAI-Lab/RAGDefender',
    language: 'Python',
  },
  {
    name: 'pickleguard',
    description: 'A defense tool that detects and prevents malicious pickle payloads through static analysis and opcode inspection.',
    html_url: 'https://github.com/DenisKimskku/pickleguard',
    language: 'Python',
  },
  {
    name: 'iChat',
    description: 'An intelligent RAG-based chatbot leveraging retrieval-augmented generation for enhanced conversational AI.',
    html_url: 'https://github.com/DenisKimskku/iChat',
    language: 'Python',
  },
  {
    name: 'korean_slang_detector',
    description: 'LLM-based Korean drug slang detection system using TF-IDF augmentation and context-aware attention model.',
    html_url: 'https://github.com/DenisKimskku/korean_slang_detector',
    language: 'Python',
  },
];

export default function Code() {

  return (
    <div className="container-custom py-16 md:py-24">
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
                <Link href="/calendar-plus-plus">
                  Calendar++
                </Link>
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                Smart menu bar calendar for macOS with Google Calendar integration and liquid glass design.
              </p>
              <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#F05138]"></span>
                  Swift
                </span>
                <Link
                  href="/calendar-plus-plus"
                  className="text-[var(--color-accent)] hover:underline"
                >
                  Learn more
                </Link>
                <a
                  href="https://github.com/DenisKimskku/Calendarpp"
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
                    href={project.html_url}
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
                    href={project.html_url}
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