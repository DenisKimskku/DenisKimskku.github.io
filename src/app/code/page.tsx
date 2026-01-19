import type { Metadata } from 'next';
import Link from 'next/link';
import { Octokit } from '@octokit/rest';

export const metadata: Metadata = {
  title: 'Code',
  description: 'Open-source projects and code contributions by Minseok (Denis) Kim.',
};

interface Project {
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count?: number; // Make it optional
  language: string | null | undefined; // Make it optional
  fork: boolean;
}

async function getGithubProjects(): Promise<Project[]> {
  const octokit = new Octokit({
    // For local development, you can add a personal access token here
    // to avoid rate-limiting issues.
    // auth: process.env.GITHUB_TOKEN,
  });

  try {
    const userRepos = await octokit.repos.listForUser({
      username: 'DenisKimskku',
      type: 'owner',
      sort: 'updated',
      direction: 'desc',
    });
    
    const orgRepo = await octokit.repos.get({
        owner: 'SecAI-Lab',
        repo: 'RAGDefender',
    });

    const allowedUserRepos = ['iChat', 'korean_slang_detector'];
    const userProjects = userRepos.data
      .filter(repo => !repo.fork && allowedUserRepos.includes(repo.name));

    const allRepos = [...userProjects, orgRepo.data];
    
    // Explicitly cast to the Project interface to ensure type compatibility
    const projects: Project[] = allRepos.map(repo => ({
      name: repo.name,
      description: repo.description,
      html_url: repo.html_url,
      stargazers_count: repo.stargazers_count,
      language: repo.language,
      fork: repo.fork,
    }));

    const projectOrder = ['RAGDefender', 'iChat', 'korean_slang_detector'];
    
    const sortedProjects = projects
      .sort((a, b) => {
        const indexA = projectOrder.indexOf(a.name);
        const indexB = projectOrder.indexOf(b.name);
        // Handle cases where a repo might not be in the order list
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

    return sortedProjects;
  } catch (error) {
    console.error('Error fetching GitHub projects:', error);
    // Return a default or empty array in case of an error
    return [];
  }
}

export default async function Code() {
  const projects = await getGithubProjects();

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
                  {project.name === 'iChat'
                    ? 'An intelligent RAG-based chatbot leveraging retrieval-augmented generation for enhanced conversational AI.'
                    : project.description || 'No description available.'}
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