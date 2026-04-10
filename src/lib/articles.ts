import fs from 'node:fs';
import path from 'node:path';

export interface ArticleSummary {
  slug: string;
  title: string;
  date: string;
  type: string;
  description: string;
  tags: string[];
  readingTime: number;
}

// Canonical topics shown on the site. Every raw tag is mapped to one of
// these via TAG_ALIASES below. Tags without an alias entry are dropped
// from display (keeping the topic list tight).
const CANONICAL_TOPICS = [
  'LLM Security',
  'RAG Security',
  'Agent Security',
  'Data Poisoning',
  'AI Safety',
  'Privacy',
  'Adversarial ML',
  'Binary Analysis',
  'Code Security',
  'Watermarking',
  'Deepfakes & Biometrics',
  'Infrastructure Security',
  'Tools & Visualization',
] as const;

const TAG_ALIASES: Record<string, string> = {
  // LLM Security
  'LLM Security': 'LLM Security',
  'LLM': 'LLM Security',
  'Jailbreaking': 'LLM Security',
  'Prompt Injection': 'LLM Security',
  'Red Teaming': 'LLM Security',
  'LLM Red Teaming': 'LLM Security',
  'Model Abuse': 'LLM Security',
  'Safety Alignment': 'LLM Security',
  'Multimodal Large Language Models': 'LLM Security',
  'Mixture-of-Experts': 'LLM Security',
  // RAG
  'RAG': 'RAG Security',
  'RAG Security': 'RAG Security',
  'RAGDefender': 'RAG Security',
  // Agents
  'Agent Security': 'Agent Security',
  'Agentic AI': 'Agent Security',
  'Agentic Security': 'Agent Security',
  'Agentic Risk': 'Agent Security',
  'Agentic Misalignment': 'Agent Security',
  'Agent-Centric Security': 'Agent Security',
  'Agent Identity Protocol': 'Agent Security',
  'AI Agents': 'Agent Security',
  'LLM Agents': 'Agent Security',
  'Autonomous Agents': 'Agent Security',
  'Autonomous AI': 'Agent Security',
  'Autonomous Systems': 'Agent Security',
  'Multi-Agent Systems': 'Agent Security',
  'MCP': 'Agent Security',
  'A2A': 'Agent Security',
  'Protocol Security': 'Agent Security',
  'Tool-Calling': 'Agent Security',
  // Data Poisoning
  'Data Poisoning': 'Data Poisoning',
  'Backdoor Attacks': 'Data Poisoning',
  'Model Poisoning': 'Data Poisoning',
  'Supply-Chain Attack': 'Data Poisoning',
  'Software Supply Chain': 'Data Poisoning',
  'Geopolitical Supply Chain': 'Data Poisoning',
  // AI Safety
  'AI Safety': 'AI Safety',
  'Safety Policy': 'AI Safety',
  'Safety Certification': 'AI Safety',
  'AI Alignment': 'AI Safety',
  'Inference-Time Safety': 'AI Safety',
  'Reasoning Safety': 'AI Safety',
  'Mechanistic Interpretability': 'AI Safety',
  'Defense Trilemma': 'AI Safety',
  'Dual-Use Oversight': 'AI Safety',
  'Machine Unlearning': 'AI Safety',
  'Reinforcement Learning from Human Feedback': 'AI Safety',
  'Trust and Governance': 'AI Safety',
  'Governance': 'AI Safety',
  'Compositional Security': 'AI Safety',
  'Formal Defensive Architectures': 'AI Safety',
  'Cognitive State Planes': 'AI Safety',
  'Defense': 'AI Safety',
  'Defensive AI': 'AI Safety',
  // Privacy
  'Privacy': 'Privacy',
  'Data Privacy': 'Privacy',
  'Membership Inference': 'Privacy',
  'Differential Privacy': 'Privacy',
  // Adversarial ML
  'Adversarial Attacks': 'Adversarial ML',
  'Adversarial Testing': 'Adversarial ML',
  'Adversarial ML': 'Adversarial ML',
  'Contextual Attacks': 'Adversarial ML',
  'Injection Attacks': 'Adversarial ML',
  // Binary Analysis
  'Binary Analysis': 'Binary Analysis',
  'Reverse Engineering': 'Binary Analysis',
  'Neural Decompilation': 'Binary Analysis',
  'Code Similarity': 'Binary Analysis',
  'Program Analysis': 'Binary Analysis',
  // Code Security
  'Code Security': 'Code Security',
  'Vulnerabilities': 'Code Security',
  'Vulnerability Detection': 'Code Security',
  'Exploits': 'Code Security',
  'Fuzzing': 'Code Security',
  'RCE': 'Code Security',
  'Python Security': 'Code Security',
  'Deserialization': 'Code Security',
  'Automated Vulnerability Discovery': 'Code Security',
  'Bug Bounty Programs': 'Code Security',
  'Security Tools': 'Code Security',
  'EnsembleSHAP': 'Code Security',
  'SABLE': 'Code Security',
  // Watermarking
  'Watermarking': 'Watermarking',
  'AI-Generated Text': 'Watermarking',
  'Text Detection': 'Watermarking',
  'Text Classification': 'Watermarking',
  // Deepfakes & Biometrics
  'Deepfake': 'Deepfakes & Biometrics',
  'Biometrics': 'Deepfakes & Biometrics',
  // Infrastructure Security
  'Authentication Security': 'Infrastructure Security',
  'Credential Exposure': 'Infrastructure Security',
  'Authorization Boundaries': 'Infrastructure Security',
  'Privilege Escalation': 'Infrastructure Security',
  'System Compromise': 'Infrastructure Security',
  'System-Level Vulnerabilities': 'Infrastructure Security',
  'Intrusion Detection': 'Infrastructure Security',
  'Attack Detection': 'Infrastructure Security',
  'Evasion Techniques': 'Infrastructure Security',
  'Hardware Security': 'Infrastructure Security',
  'Nvidia Security': 'Infrastructure Security',
  'Prisma SASE': 'Infrastructure Security',
  'Advanced Persistent Threats': 'Infrastructure Security',
  'Cybercrime': 'Infrastructure Security',
  'Kinetic Risk': 'Infrastructure Security',
  'Operational Risks': 'Infrastructure Security',
  // Tools & Visualization
  'Data Visualization': 'Tools & Visualization',
  'Visualization': 'Tools & Visualization',
  'Best Practices': 'Tools & Visualization',
  'Dezoomify': 'Tools & Visualization',
  'Web Tooling': 'Tools & Visualization',
  'UX Design': 'Tools & Visualization',
  'Open Source': 'Tools & Visualization',
  'Vercel': 'Tools & Visualization',
  'Dart': 'Tools & Visualization',
  'Swift': 'Tools & Visualization',
  // AI Security catch-all
  'AI Security': 'LLM Security',
  'ML Security': 'LLM Security',
  'Deep Learning': 'LLM Security',
  'Neural Networks': 'LLM Security',
  'Generative AI': 'LLM Security',
  'NLP': 'LLM Security',
  'Survey': 'LLM Security',
  'Drug Detection': 'LLM Security',
  'Korean Language': 'LLM Security',
};

function normalizeTags(rawTags: string[]): string[] {
  const canonical = new Set<string>();
  for (const tag of rawTags) {
    const mapped = TAG_ALIASES[tag];
    if (mapped) {
      canonical.add(mapped);
    }
  }
  // Preserve a stable order matching CANONICAL_TOPICS
  return CANONICAL_TOPICS.filter((t) => canonical.has(t));
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
  return articles
    .map((a) => ({ ...a, tags: normalizeTags(a.tags || []) }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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

export function getAdjacentArticles(slug: string): { prev: ArticleSummary | null; next: ArticleSummary | null } {
  const articles = getAllArticles();
  const index = articles.findIndex((a) => a.slug === slug);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index < articles.length - 1 ? articles[index + 1] : null,
    next: index > 0 ? articles[index - 1] : null,
  };
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
