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
    <div className="container-custom py-12 md:py-20">
      <h1 className="text-4xl md:text-5xl font-bold mb-8 text-[var(--color-text)]">
        Writing
      </h1>
      <p className="text-lg text-[var(--color-text-secondary)] mb-12">
        Research articles, technical blog posts, and detailed writeups.
      </p>

      <WritingHub articles={articles} />
    </div>
  );
}
