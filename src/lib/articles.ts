import fs from 'node:fs';
import path from 'node:path';

export interface ArticleSummary {
  slug: string;
  title: string;
  date: string;
  type: string;
  description: string;
  tags: string[];
}

export interface TagEntry {
  name: string;
  slug: string;
  count: number;
}

export interface TagLandingContent {
  lead: string;
  body: string;
  learnings: string[];
  relatedTags: string[];
}

const articlesIndexPath = path.join(process.cwd(), 'src', 'data', 'articles-index.json');

export function getAllArticles(): ArticleSummary[] {
  const fileContents = fs.readFileSync(articlesIndexPath, 'utf8');
  const articles = JSON.parse(fileContents) as ArticleSummary[];
  return articles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function slugifyTag(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function getTagEntries(articles: ArticleSummary[] = getAllArticles()): TagEntry[] {
  const counts = new Map<string, number>();
  for (const article of articles) {
    for (const tag of article.tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }

  const usedSlugs = new Set<string>();
  const tags = Array.from(counts.keys()).sort((a, b) => a.localeCompare(b));

  return tags.map((tag) => {
    const base = slugifyTag(tag) || 'tag';
    let slug = base;
    let suffix = 2;
    while (usedSlugs.has(slug)) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }
    usedSlugs.add(slug);
    return { name: tag, slug, count: counts.get(tag) || 0 };
  });
}

export function getTagBySlug(tagSlug: string): string | null {
  const match = getTagEntries().find((entry) => entry.slug === tagSlug);
  return match?.name || null;
}

export function getTagSlugByName(tagName: string): string {
  const match = getTagEntries().find((entry) => entry.name === tagName);
  return match?.slug || slugifyTag(tagName) || 'tag';
}

export function getArticlesByTag(tagName: string): ArticleSummary[] {
  return getAllArticles().filter((article) => article.tags.includes(tagName));
}

export function getRelatedArticles(
  currentSlug: string,
  currentTags: string[],
  limit = 3,
  articles: ArticleSummary[] = getAllArticles(),
): ArticleSummary[] {
  const currentTagSet = new Set(currentTags);

  return articles
    .filter((article) => article.slug !== currentSlug)
    .map((article) => {
      const sharedTagCount = article.tags.filter((tag) => currentTagSet.has(tag)).length;
      return { article, sharedTagCount };
    })
    .filter((entry) => entry.sharedTagCount > 0)
    .sort((a, b) => {
      if (b.sharedTagCount !== a.sharedTagCount) {
        return b.sharedTagCount - a.sharedTagCount;
      }
      return new Date(b.article.date).getTime() - new Date(a.article.date).getTime();
    })
    .slice(0, limit)
    .map((entry) => entry.article);
}

const tagLandingOverrides: Record<string, { lead: string; body: string }> = {
  RAG: {
    lead:
      'RAG security sits at the intersection of retrieval quality, prompt safety, and model reliability. A secure RAG pipeline is not just about better answers: it is about ensuring that retrieved context cannot quietly steer generation toward harmful, incorrect, or attacker-controlled behavior.',
    body:
      'The articles in this topic focus on practical failure modes such as corpus poisoning, retrieval manipulation, and privacy leakage. They also cover defenses that can be adopted in production systems without heavy overhead, including robust filtering, retrieval-time verification, and safer prompt orchestration.',
  },
  'LLM Security': {
    lead:
      'LLM security is a systems problem that spans model behavior, agent tooling, and data pipelines. Effective hardening requires understanding how attacks emerge across prompt inputs, external tools, retrieval connectors, and post-processing layers.',
    body:
      'This topic tracks jailbreak strategies, poisoning methods, alignment bypass techniques, and concrete mitigation patterns. The goal is to separate research hype from operational reality by summarizing what attacks actually transfer, what defenses degrade gracefully, and where high-risk blind spots remain.',
  },
  Privacy: {
    lead:
      'Privacy risks in modern AI systems are not limited to obvious data leaks. They also appear through indirect channels such as membership inference, memorization extraction, and retrieval traces that expose sensitive context.',
    body:
      'These articles analyze how privacy leakage happens in practice and what engineering controls reduce exposure. You will find discussions on threat modeling, evaluation methods, and lightweight safeguards that can be integrated into existing model and RAG deployments.',
  },
};

export function getTagLandingContent(tagName: string, articles: ArticleSummary[]): TagLandingContent {
  const relatedTagCounts = new Map<string, number>();
  const types = new Set<string>();

  for (const article of articles) {
    types.add(article.type);
    for (const tag of article.tags) {
      if (tag === tagName) {
        continue;
      }
      relatedTagCounts.set(tag, (relatedTagCounts.get(tag) || 0) + 1);
    }
  }

  const topRelatedTags = Array.from(relatedTagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);

  const recentTitles = [...articles]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 2)
    .map((article) => article.title);

  const typeList = Array.from(types);
  const override = tagLandingOverrides[tagName];

  const lead = override?.lead
    || `This topic page curates research-focused writing on ${tagName}, with an emphasis on practical security implications, reproducible observations, and implementation-aware takeaways. Instead of isolated summaries, the collection is organized to help you connect attack techniques, defensive controls, and evaluation criteria across multiple papers and project write-ups.`;

  const body = override?.body
    || `Across ${articles.length} ${articles.length === 1 ? 'article' : 'articles'}, this cluster highlights how ${tagName} appears in real workflows and where teams commonly miss risk boundaries. The coverage includes ${typeList.join(', ').toLowerCase()} and connects this theme with adjacent areas such as ${topRelatedTags.join(', ') || 'model security and system robustness'}, so you can move from conceptual understanding to deployable engineering decisions.`;

  const learnings = [
    topRelatedTags.length > 0
      ? `Related directions: ${topRelatedTags.join(', ')}.`
      : 'Related directions: secure evaluation, validation, and operational hardening.',
    recentTitles.length > 0
      ? `Start with: ${recentTitles.join(' and ')}.`
      : 'Start with the most recent write-up to understand current assumptions.',
    'Use this page as a hub for internal links when publishing future posts in the same area.',
  ];

  return { lead, body, learnings, relatedTags: topRelatedTags };
}
