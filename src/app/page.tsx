import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About',
  description: 'I am a researcher bridging computer security and machine learning, focusing on AI safety, security, and alignment.',
};

export default function Home() {
  return (
    <div className="container-custom py-12 md:py-20">
      <section id="about">
        <h2 className="text-4xl md:text-5xl font-bold mb-8 text-[var(--color-text)]">
          About Me
        </h2>
        <div className="prose prose-lg max-w-none">
          <div className="space-y-6 text-lg leading-relaxed text-[var(--color-text)]">
            <p>
              I am a researcher bridging computer security and machine learning. My work focuses on
              enhancing the safety, security, and alignment of advanced AI systems. I develop defenses
              against adversarial attacks and apply large language models to binary analysis and reverse engineering.
            </p>
            <p>
              I am an M.S. candidate at Sungkyunkwan University, advised by{' '}
              <a
                href="https://kevinkoo001.github.io/"
                className="text-[var(--color-accent)] hover:underline"
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
              <Link href="/papers" className="text-[var(--color-accent)] hover:underline">
                publications
              </Link>{' '}
              are online, along with some of my{' '}
              <Link href="/code" className="text-[var(--color-accent)] hover:underline">
                code
              </Link>
              , and some extra{' '}
              <Link href="/writing" className="text-[var(--color-accent)] hover:underline">
                writings
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      <section id="projects" className="mt-16 pt-16 border-t border-[var(--color-border)]">
        <h2 className="text-4xl md:text-5xl font-bold mb-8 text-[var(--color-text)]">
          Projects
        </h2>
        <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-2 text-[var(--color-text)]">
                <Link href="/calendar-plus-plus" className="hover:text-[var(--color-accent)] transition-colors">
                  calendar++
                </Link>
              </h3>
              <p className="text-[var(--color-text-secondary)] mb-4">
                Smart menu bar calendar for macOS with Google Calendar integration, event management, and beautiful liquid glass design.
              </p>
              <div className="flex gap-4">
                <Link
                  href="/calendar-plus-plus"
                  className="text-sm text-[var(--color-accent)] hover:underline"
                >
                  Learn more →
                </Link>
                <a
                  href="https://github.com/DenisKimskku/Calendarpp"
                  className="text-sm text-[var(--color-accent)] hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on GitHub →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
