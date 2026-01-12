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
  stargazers_count?: number; // Allow undefined
  language: string | null;
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
    <div className="container-custom py-12 md:py-20">
      <h1 className="text-4xl md:text-5xl font-bold mb-8 text-[var(--color-text)] font-serif">
        Code
      </h1>
      <p className="text-lg text-[var(--color-text-secondary)] mb-12">
        A selection of my open-source projects and research implementations. More can be found on my{' '}
        <a
          href="https://github.com/DenisKimskku"
          className="text-[var(--color-accent)] hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub profile
        </a>
        .
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Featured Project */}
        <article className="border border-[var(--color-border)] rounded-lg p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl bg-[var(--color-bg-secondary)] flex flex-col">
          <h2 className="text-2xl font-bold font-serif mb-3 text-[var(--color-text)]">
            Calendar++
          </h2>

          <p className="text-[var(--color-text)] mb-6 leading-relaxed flex-grow">
            Smart menu bar calendar for macOS with Google Calendar integration, event management, and beautiful liquid glass design.
          </p>
          
          <div className="flex items-center justify-between mt-auto">
            <div className="flex gap-3">
                <Link
                href="/calendar-plus-plus"
                className="inline-flex items-center gap-2 bg-[var(--color-accent)] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                >
                Learn More →
                </Link>
                <a
                href="https://github.com/DenisKimskku/Calendarpp"
                className="inline-flex items-center gap-2 border border-[var(--color-border)] px-4 py-2 rounded-lg hover:bg-[var(--color-bg)] transition-colors"
                target="_blank"
                rel="noopener noreferrer"
                >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                GitHub
                </a>
            </div>
          </div>
        </article>

        {/* Other Projects */}
        {projects.map((project) => (
          <article
            key={project.name}
            className="border border-[var(--color-border)] rounded-lg p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl bg-[var(--color-bg-secondary)] flex flex-col"
          >
            <h2 className="text-2xl font-bold font-serif mb-3 text-[var(--color-text)]">
              {project.name}
            </h2>

            <p className="text-[var(--color-text-secondary)] mb-6 leading-relaxed flex-grow">
              {project.name === 'iChat'
                ? 'An intelligent RAG-based chatbot leveraging advanced natural language processing and retrieval-augmented generation techniques for enhanced conversational AI.'
                : project.description || 'No description available.'}
            </p>

            <div className="flex items-center justify-between mt-auto">
              <div className="flex items-center gap-4 text-sm text-[var(--color-text-secondary)]">
                {project.language && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--color-accent)' }}></span>
                    {project.language}
                  </span>
                )}
              </div>
              <a
                href={project.html_url}
                className="inline-flex items-center gap-2 text-sm text-[var(--color-accent)] hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                View on GitHub
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
