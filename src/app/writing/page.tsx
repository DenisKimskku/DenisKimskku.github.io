import type { Metadata } from 'next';
import fs from 'fs';
import path from 'path';
import WritingHub from '@/components/WritingHub';

export const metadata: Metadata = {
  title: 'Writing',
  description: 'Research articles and technical writings by Minseok (Denis) Kim.',
};

interface Article {
  slug: string;
  title: string;
  date: string;
  type: string;
  description: string;
  tags: string[];
}

async function getArticles(): Promise<Article[]> {
  const filePath = path.join(process.cwd(), 'src', 'data', 'articles-index.json');
  const fileContents = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(fileContents);
}

export default async function Writing() {
  const articles = await getArticles();

  return (
    <div className="container-custom py-16 md:py-24">
      <header className="mb-12">
        <h1 className="text-3xl md:text-4xl font-semibold mb-4 text-[var(--color-text)] font-serif">
          Writing
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Research articles, paper reviews, and technical writeups.
        </p>
      </header>

      <WritingHub articles={articles} />
    </div>
  );
}
