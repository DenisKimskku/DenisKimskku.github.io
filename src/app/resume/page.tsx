import type { Metadata } from 'next';
import fs from 'fs';
import path from 'path';
import StructuredData from '@/components/StructuredData';
import { siteMetadata, buildAlternates } from '@/lib/siteMetadata';
import { formatVenue } from '@/lib/venues';

interface Paper {
  year: string;
  title: string;
  authors: string[];
  conference: string;
  description: string;
  abstract?: string;
  pdfUrl?: string;
  codeUrl?: string;
  slideUrl?: string;
  articleSlug?: string;
  bibtex?: string;
}

const description = 'Curriculum vitae of Minseok (Denis) Kim — Ph.D. student and AI security researcher at Sungkyunkwan University.';

export const metadata: Metadata = {
  title: 'Curriculum Vitae',
  description,
  alternates: buildAlternates('/resume/'),
  openGraph: {
    title: `CV | ${siteMetadata.authorName}`,
    description,
    url: `${siteMetadata.siteUrl}/resume/`,
    type: 'profile',
    images: [siteMetadata.ogImage],
  },
};

async function getPapers(): Promise<Paper[]> {
  const filePath = path.join(process.cwd(), 'src', 'data', 'papers.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const EMAIL = 'for8821@g.skku.edu';
const INSTITUTION = 'Sungkyunkwan University';
const DEPARTMENT = 'Department of Computer Science and Engineering';
const PHD_ADVISOR = 'Hyungjoon (Kevin) Koo';
const PHD_ADVISOR_URL = 'https://kevinkoo001.github.io/';
const MS_COADVISOR = 'Jinyeong Bak';

interface EducationEntry {
  degree: string;
  field?: string;
  institution: string;
  period: string;
  detail?: React.ReactNode;
}

const EDUCATION: EducationEntry[] = [
  {
    degree: 'Ph.D.',
    field: 'Software',
    institution: INSTITUTION,
    period: 'In progress',
    detail: (
      <>
        Advisor:{' '}
        <a href={PHD_ADVISOR_URL} target="_blank" rel="noopener noreferrer" className="cv-link">
          {PHD_ADVISOR}
        </a>
      </>
    ),
  },
  {
    degree: 'M.S.',
    field: 'AI Systems Engineering',
    institution: INSTITUTION,
    period: '',
    detail: (
      <>
        Co-advisors:{' '}
        <a href={PHD_ADVISOR_URL} target="_blank" rel="noopener noreferrer" className="cv-link">
          {PHD_ADVISOR}
        </a>
        {' '}and {MS_COADVISOR}. GPA 4.5 / 4.5.
      </>
    ),
  },
  {
    degree: 'B.A.',
    field: 'Software',
    institution: INSTITUTION,
    period: '',
  },
];

const RESEARCH_INTERESTS = [
  'Adversarial robustness of advanced AI systems — Retrieval-Augmented Generation, agent communication protocols (MCP, A2A), and autonomous-agent trust boundaries.',
  'Trust-boundary security analysis for autonomous AI agents, with emphasis on the shift from output safety to behavioral safety.',
  'Large language models for cybersecurity — binary analysis, reverse engineering, and code similarity detection.',
  'Agent-driven C-to-Rust transpilation: autonomous coding agents that translate legacy C into idiomatic, memory-safe Rust while preserving behavior.',
  'Defenses against data poisoning and prompt injection: lightweight post-retrieval filtering for RAG and runtime guards for tool-calling agents.',
];

const AWARDS: { title: string; date: string }[] = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'src', 'data', 'awards.json'), 'utf8')
);

function formatAuthors(authors: string[]): React.ReactNode {
  return authors.map((a, i) => (
    <span key={a}>
      {a === 'Minseok Kim' ? <span className="cv-author-self">{a}</span> : a}
      {i < authors.length - 1 ? ', ' : ''}
    </span>
  ));
}

export default async function Resume() {
  const papers = await getPapers();
  const groupedByYear = papers.reduce<Record<string, Paper[]>>((acc, p) => {
    (acc[p.year] ??= []).push(p);
    return acc;
  }, {});
  const years = Object.keys(groupedByYear).sort((a, b) => Number(b) - Number(a));

  const lastUpdated = new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const pageUrl = `${siteMetadata.siteUrl}/resume/`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `${pageUrl}#profile`,
    url: pageUrl,
    name: 'Curriculum Vitae',
    description,
    mainEntity: {
      '@type': 'Person',
      // Same @id as the homepage Person node so the graphs merge.
      '@id': `${siteMetadata.siteUrl}#person`,
      name: siteMetadata.authorName,
      url: siteMetadata.siteUrl,
      sameAs: siteMetadata.profiles,
      jobTitle: 'Ph.D. Student & AI Security Researcher',
      affiliation: {
        '@type': 'CollegeOrUniversity',
        name: INSTITUTION,
      },
      // Title already carries parentheses ("… (APC’26)"), so join with a comma.
      award: AWARDS.map((a) => `${a.title}, ${a.date}`),
    },
  };

  // BreadcrumbList structured data (same shape as writing/[slug]/page.tsx).
  const breadcrumbItems: { name: string; href?: string }[] = [
    { name: 'Home', href: '/' },
    { name: 'Resume' },
  ];

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.href ? `${siteMetadata.siteUrl}${item.href}` : undefined,
    })),
  };

  return (
    <div className="resume-root cv-root mx-auto px-8 md:px-12 max-w-[760px] py-10 md:py-16 max-[560px]:px-5 max-[560px]:py-12">
      <StructuredData data={jsonLd} />
      <StructuredData data={breadcrumbJsonLd} />
      {/* ───────── Header ───────── */}
      <header className="cv-header">
        {/* Below 560px the absolute top-right placement (globals.css .cv-header-top)
            collides with the centered h1, so drop to a static right-aligned row
            above the name. `!` is needed to out-cascade the non-layered CSS rule. */}
        <div className="cv-header-top max-[560px]:!static max-[560px]:mb-4 max-[560px]:text-right">
          <a href="/resume.pdf" className="no-print cv-download" download>
            Download PDF ↓
          </a>
        </div>
        <h1 className="cv-name">{siteMetadata.authorName}</h1>
        <p className="cv-affiliation">
          {DEPARTMENT}
          <br />
          {INSTITUTION}
        </p>
        <p className="cv-contact">
          <a href={`mailto:${EMAIL}`} className="cv-link">{EMAIL}</a>
          <span className="cv-sep">·</span>
          <a href={siteMetadata.siteUrl} target="_blank" rel="noopener noreferrer" className="cv-link">
            {siteMetadata.siteUrl.replace(/^https?:\/\//, '')}
          </a>
          {siteMetadata.profiles.map((url) => {
            // Match on the parsed hostname, not a substring of the whole URL:
            // a substring check (e.g. url.includes('github.com')) can be fooled
            // by hosts like evil.com/github.com or github.com.evil.com.
            let host = '';
            try {
              host = new URL(url).hostname;
            } catch {
              host = '';
            }
            const label = host === 'github.com' || host.endsWith('.github.com')
              ? 'GitHub'
              : host === 'scholar.google.com'
                ? 'Google Scholar'
                : url;
            return (
              <span key={url}>
                <span className="cv-sep">·</span>
                <a href={url} target="_blank" rel="noopener noreferrer" className="cv-link">{label}</a>
              </span>
            );
          })}
        </p>
      </header>

      {/* ───────── Education ───────── */}
      <section className="cv-section">
        <h2 className="cv-section-heading">Education</h2>
        <dl className="cv-edu">
          {EDUCATION.map((e) => (
            <div key={`${e.degree}-${e.field ?? ''}`} className="cv-edu-entry">
              <dt className="cv-edu-degree">
                <span className="cv-edu-degree-label">{e.degree}</span>
                {e.field ? <span className="cv-edu-field">{`, ${e.field}`}</span> : null}
              </dt>
              <dd className="cv-edu-detail">
                <div className="cv-edu-line">
                  <span className="cv-edu-inst">{e.institution}</span>
                  {e.period ? <span className="cv-edu-period">{e.period}</span> : null}
                </div>
                {e.detail ? <div className="cv-edu-meta">{e.detail}</div> : null}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ───────── Honors & Awards ───────── */}
      <section className="cv-section">
        <h2 className="cv-section-heading">Honors &amp; Awards</h2>
        <ul className="cv-interests">
          {AWARDS.map((a, i) => (
            <li key={i} className="cv-interest-item">{a.title} — {a.date}</li>
          ))}
        </ul>
      </section>

      {/* ───────── Research Interests ───────── */}
      <section className="cv-section">
        <h2 className="cv-section-heading">Research Interests</h2>
        <ul className="cv-interests">
          {RESEARCH_INTERESTS.map((it, i) => (
            <li key={i} className="cv-interest-item">{it}</li>
          ))}
        </ul>
      </section>

      {/* ───────── Publications ───────── */}
      <section className="cv-section">
        <h2 className="cv-section-heading">Publications</h2>
        {years.map((year) => (
          <div key={year} className="cv-pub-year grid grid-cols-[72px_1fr] gap-4 max-[560px]:grid-cols-1">
            <h3 className="cv-pub-year-label pt-[3px] !mb-0">{year}</h3>
            <ol className="cv-pub-list">
              {groupedByYear[year].map((p, idx) => (
                <li key={`${year}-${idx}`} className="cv-pub-item">
                  <div className="cv-pub-citation">
                    {formatAuthors(p.authors)}. {' '}
                    {p.pdfUrl ? (
                      <a href={p.pdfUrl} target="_blank" rel="noopener noreferrer" className="cv-link cv-pub-title">
                        “{p.title}.”
                      </a>
                    ) : (
                      <span className="cv-pub-title">“{p.title}.”</span>
                    )}
                    <span className="cv-pub-venue"> {formatVenue(p.conference)}</span>
                    , {year}.
                  </div>
                  {(p.codeUrl || p.slideUrl) && (
                    <div className="cv-pub-extras no-print">
                      {p.pdfUrl && (
                        <a href={p.pdfUrl} target="_blank" rel="noopener noreferrer" className="cv-pub-extra">[PDF]</a>
                      )}
                      {p.codeUrl && (
                        <a href={p.codeUrl} target="_blank" rel="noopener noreferrer" className="cv-pub-extra">[Code]</a>
                      )}
                      {p.slideUrl && (
                        <a href={p.slideUrl} target="_blank" rel="noopener noreferrer" className="cv-pub-extra">[Slides]</a>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </section>

      <footer className="cv-footer">
        Last updated: {lastUpdated}.
      </footer>
    </div>
  );
}
