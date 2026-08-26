import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkGeneratedArticle, formatFinding } from '../scripts/check-generated-article.mjs';

const SCRIPT = fileURLToPath(new URL('../scripts/check-generated-article.mjs', import.meta.url));
const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

// ---------------------------------------------------------------------------
// Fixtures built from the evidence's real examples
// ---------------------------------------------------------------------------

const REVIEW_SLUG = 'optimizing_noise_distributions_for_differential_privacy';
const REVIEW_PATH = `src/content/articles/${REVIEW_SLUG}.md`;
const REVIEW_TITLE = 'Optimizing Noise Distributions for Differential Privacy';
const GOOD_DESCRIPTION =
  'A convex-optimization recipe for designing additive noise distributions that meet a Rényi differential privacy target with less utility loss than Laplace or Gaussian noise.';

const REVIEW_FM = [
  '---',
  `title: "${REVIEW_TITLE}"`,
  'date: "2026-08-25"',
  'type: "Paper Review"',
  `description: "${GOOD_DESCRIPTION}"`,
  'tags: ["Privacy", "Differential Privacy"]',
  'readingTime: 5',
  `headerImage: "/images/news/${REVIEW_SLUG}.jpg"`,
  'paperUrl: "https://arxiv.org/abs/2508.12345"',
  'paperAuthors: "Ada Lovelace, Alan Turing"',
  '---',
];

const REVIEW_BODY = [
  '',
  '## TLDR',
  '*   **What**: The paper optimizes noise distributions under Rényi DP.',
  '*   **Key number**: At the target $\\delta = 10^{-6}$, the optimized noise achieves an $\\epsilon$ of 1.62.',
  '',
  '## Method',
  '',
  'The objective is convex:',
  '',
  '$$',
  '\\min_p E_1(p) + \\max_p \\min_n E_2(n, p)',
  '$$',
  '',
  '| Mechanism | $\\epsilon$ | Cost |',
  '|---|---|---|',
  '| Laplace | $1.76$ | USD 5 |',
  '',
  "## Den's Take",
  '',
  'The result matters for anyone tuning DP budgets in production.',
];

const DIGEST_SLUG = 'ai_security_digest__august_25_2026_adversarial_attacks__malw';
const DIGEST_PATH = `src/content/articles/${DIGEST_SLUG}.md`;
const DIGEST_TITLE = 'AI Security Digest — August 25, 2026: Adversarial Attacks & Malware';

// Full-length redirector payload (real ones are 100-200 chars) and the exact
// production cut-off from line 26 of the 2026-08-18 digest (commit e58f227).
const FULL_REDIRECTOR =
  'https://news.google.com/rss/articles/CBMikwFBVV95cUxQZmZ3ZUdlYnMyZFZCVEw4cXJNSFRwYVl2MlRxeFRoZmJ1eGRiSW5JcVRLOUZPN2ttUWlZTHU2djJiSjRRSE1hQjY3d0ZTTTFlYlVvelEwU2ZSZFFSdDgwUjFk?oc=5&hl=en-US&gl=US&ceid=US:en';
const TRUNCATED_NEWS_LINE =
  '**Anthropic adds invisible watermarks to Claude using Google tech** ([https://news.google.com/rss/articles/CBMinAFBVV95cUxOQ';
const CANONICAL_NEWS_LINE = `- **[CrowdStrike launches the Charlotte AI AgentWorks Ecosystem](${FULL_REDIRECTOR})** (CrowdStrike) — CrowdStrike is codifying the agent-as-a-service model.`;

const DIGEST_FM = [
  '---',
  `title: "${DIGEST_TITLE}"`,
  'date: "2026-08-25"',
  'type: "News Digest"',
  'description: "This digest covers advanced adversarial attacks on ML models and new trends in sophisticated malware, including Android and miniapp threats."',
  'tags: ["Adversarial Attacks", "Malware Analysis"]',
  'readingTime: 5',
  `headerImage: "/images/news/${DIGEST_SLUG}.jpg"`,
  '---',
];

const DIGEST_BODY = [
  '',
  '## Paper Highlights',
  '- **[Optimizing Noise Distributions for Differential Privacy](https://arxiv.org/abs/2508.12345)** — Ada Lovelace. Convex noise design for DP.',
  '',
  '## Industry & News',
  CANONICAL_NEWS_LINE,
  '',
  "## Den's Take",
  '',
  'Graph-based threat hunting is replacing signature matching for app-store malware.',
];

const build = (fm, body) => [...fm, ...body].join('\n') + '\n';
const review = ({ fm = REVIEW_FM, body = REVIEW_BODY } = {}) => build(fm, body);
const digest = ({ fm = DIGEST_FM, body = DIGEST_BODY } = {}) => build(fm, body);

// Replace one raw frontmatter line (by key) — or drop it when `line` is null.
function withFm(fm, key, line) {
  const out = fm.filter((l) => !l.startsWith(`${key}:`));
  if (line !== null) out.splice(fm.findIndex((l) => l.startsWith(`${key}:`)), 0, line);
  return out;
}

// 1-based line of the line appended as [...REVIEW_BODY, '', <line>].
const APPENDED_LINE = REVIEW_FM.length + REVIEW_BODY.length + 2;

const check = (text, opts = {}) => checkGeneratedArticle(text, { path: REVIEW_PATH, ...opts });
const rules = (findings) => findings.map((f) => f.rule);
const ofRule = (findings, rule) => findings.filter((f) => f.rule === rule);

function tmpRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-article-'));
  fs.mkdirSync(path.join(root, 'public', 'images', 'news'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src', 'content', 'articles'), { recursive: true });
  return root;
}

// ---------------------------------------------------------------------------
// Baselines
// ---------------------------------------------------------------------------

test('a clean Paper Review yields zero findings', () => {
  assert.deepEqual(check(review()), []);
});

test('a clean News Digest yields zero findings', () => {
  assert.deepEqual(check(digest(), { path: DIGEST_PATH }), []);
});

// ---------------------------------------------------------------------------
// FILE
// ---------------------------------------------------------------------------

test('file.eol: BOM and CR bytes are errors; the rest of the file is still checked', () => {
  const bom = check('﻿' + review());
  assert.deepEqual(rules(bom), ['file.eol']);
  assert.match(bom[0].message, /BOM/);
  const crlf = check(review().replace(/\n/g, '\r\n'));
  assert.deepEqual(rules(crlf), ['file.eol']);
  assert.match(crlf[0].message, /CR byte/);
  assert.equal(check(review()).some((f) => f.rule === 'file.eol'), false);
});

test('file.trailing-newline: exactly one "\\n" — none (all 322 originals) or two are errors', () => {
  const none = check(review().replace(/\n$/, ''));
  assert.deepEqual(rules(none), ['file.trailing-newline']);
  assert.match(none[0].message, /none found/);
  const two = check(review() + '\n');
  assert.deepEqual(rules(two), ['file.trailing-newline']);
  assert.match(two[0].message, /more than one/);
});

test('file.slug: basename must match ^[a-z0-9_]{1,60}\\.md$', () => {
  const hyphen = check(review(), { path: 'src/content/articles/Multi-Agent-Jailbreaks.md' });
  assert.ok(rules(hyphen).includes('file.slug'));
  const long = check(review(), { path: `src/content/articles/${'a'.repeat(61)}.md` });
  assert.ok(rules(long).includes('file.slug'));
  const sixty = check(review(), { path: `src/content/articles/${'a'.repeat(60)}.md` });
  assert.equal(rules(sixty).includes('file.slug'), false);
});

// ---------------------------------------------------------------------------
// FRONTMATTER
// ---------------------------------------------------------------------------

test('fm.parse: a raw LaTeX escape in a quoted scalar (e00dbce) is a parse error and stops further checks', () => {
  const fm = withFm(REVIEW_FM, 'description', 'description: "The paper bounds $\\mathbf{z}$ under a fixed budget and shows the bound is tight."');
  const out = check(review({ fm }));
  assert.deepEqual(rules(out), ['fm.parse']);
  assert.equal(out[0].line, null);
  assert.equal(formatFinding('x.md', out[0]).startsWith('x.md:fm: error fm.parse:'), true);
});

test('fm.parse: a file without a frontmatter block is an error', () => {
  const out = check(REVIEW_BODY.join('\n') + '\n');
  assert.deepEqual(rules(out), ['fm.parse']);
});

test('fm.quoted: title/date/description must be double-quoted raw values', () => {
  const out = check(review({ fm: withFm(REVIEW_FM, 'date', 'date: 2026-08-25') }));
  const q = ofRule(out, 'fm.quoted');
  assert.equal(q.length, 1);
  assert.equal(q[0].line, 3);
  assert.match(q[0].message, /^date must be a double-quoted string/);
  const single = check(review({ fm: withFm(REVIEW_FM, 'title', `title: '${REVIEW_TITLE}'`) }));
  assert.equal(ofRule(single, 'fm.quoted').length, 1);
});

test('fm.date: quoted real YYYY-MM-DD only', () => {
  assert.match(ofRule(check(review({ fm: withFm(REVIEW_FM, 'date', 'date: "2026-02-30"') })), 'fm.date')[0].message, /not a real calendar date/);
  assert.match(ofRule(check(review({ fm: withFm(REVIEW_FM, 'date', 'date: "2026/08/25"') })), 'fm.date')[0].message, /YYYY-MM-DD/);
  assert.match(ofRule(check(review({ fm: withFm(REVIEW_FM, 'date', null) })), 'fm.date')[0].message, /missing/);
  assert.equal(ofRule(check(review()), 'fm.date').length, 0);
});

test('fm.type: must be in KNOWN_ARTICLE_TYPES exactly (case-sensitive)', () => {
  const out = ofRule(check(review({ fm: withFm(REVIEW_FM, 'type', 'type: "Paper review"') })), 'fm.type');
  assert.equal(out.length, 1);
  assert.match(out[0].message, /unknown type "Paper review"/);
  assert.equal(ofRule(check(review({ fm: withFm(REVIEW_FM, 'type', 'type: "Trend Report"') })), 'fm.type').length, 0);
});

test('fm.title: non-empty, no "<", no backslash', () => {
  assert.match(ofRule(check(review({ fm: withFm(REVIEW_FM, 'title', 'title: ""') })), 'fm.title')[0].message, /non-empty/);
  assert.match(ofRule(check(review({ fm: withFm(REVIEW_FM, 'title', 'title: "Attacks on <b>LLMs</b>"') })), 'fm.title')[0].message, /'<'/);
  assert.match(ofRule(check(review({ fm: withFm(REVIEW_FM, 'title', 'title: "Bounding \\\\theta in DP"') })), 'fm.title')[0].message, /backslash/);
  // A "valid" YAML escape that silently mangles ($\theta$ -> "$<TAB>heta$"): raw `\t` is not a tolerated escape.
  assert.match(ofRule(check(review({ fm: withFm(REVIEW_FM, 'title', 'title: "Bounding $\\theta$ in DP"') })), 'fm.title')[0].message, /backslash/);
  // The JSON-encoder escape `\"` (27 committed files, e.g. the "Do Anything Now" paper) is tolerated.
  assert.equal(ofRule(check(review({ fm: withFm(REVIEW_FM, 'title', 'title: "The \\"Do Anything Now\\" Attack"') })), 'fm.title').length, 0);
  assert.equal(ofRule(check(review()), 'fm.title').length, 0);
});

test('fm.description: the real August 47-char fragment, a title copy, a 200-char slice, an ellipsis, >= 400 chars, "<" and "\\\\"', () => {
  const desc = (d) => ofRule(check(review({ fm: withFm(REVIEW_FM, 'description', `description: "${d}"`) })), 'fm.description');
  // understanding_miniapp_malware_… as committed in 6693f04 (47 chars, no period)
  const aug = desc('Dataset creation for malicious miniapp analysis');
  assert.equal(aug.length, 1);
  assert.match(aug[0].message, /is 47 chars \(minimum 60\)/);
  assert.match(aug[0].message, /does not end with/);
  assert.equal(aug[0].line, 5);
  assert.match(desc(REVIEW_TITLE)[0].message, /equals the title/);
  // a_bayesian_approach_… (8d89fc4): 200-char slice cut mid-word ("via proba")
  const slice = 'This paper introduces a Bayesian framework for membership inference that models the posterior over training-set membership and reports the probability of membership via proba';
  assert.match(desc(slice)[0].message, /does not end with \. ! or \?/);
  assert.match(desc('The paper introduces a Bayesian framework for membership inference against statistical models…')[0].message, /ellipsis/);
  assert.match(desc('The paper shows that '.repeat(20) + 'it works.')[0].message, /must be under 400/);
  assert.match(desc('The paper shows that <b>bold</b> claims about membership inference do not survive a careful Bayesian re-analysis.')[0].message, /'<'/);
  assert.match(desc('The paper bounds the privacy loss under a fixed budget and shows that the \\\\epsilon bound is tight.')[0].message, /backslash/);
  assert.match(desc('The paper bounds the privacy loss under a fixed budget and shows that the $\\epsilon$ bound is tight.')[0].message, /backslash/);
  // `\"` is the one escape a JSON encoder emits for quoted terms — real committed description (BADBONE / Prefill Jailbreak style).
  assert.equal(desc('The \\"Prefill Jailbreak\\" (forcing the assistant to start with \\"Sure, here is\\") bypasses safety refusal on most open models.').length, 0);
  assert.equal(desc(GOOD_DESCRIPTION).length, 0);
  assert.equal(desc('Is a 60-character question mark description actually accepted here?').length, 0);
});

test('fm.tags: 1..6 non-empty strings in flow-sequence form; `tags: []` (15 originals) is an error', () => {
  assert.match(ofRule(check(review({ fm: withFm(REVIEW_FM, 'tags', 'tags: []') })), 'fm.tags')[0].message, /empty/);
  assert.match(ofRule(check(review({ fm: withFm(REVIEW_FM, 'tags', 'tags: ["A", "B", "C", "D", "E", "F", "G"]') })), 'fm.tags')[0].message, /7 entries/);
  assert.match(ofRule(check(review({ fm: withFm(REVIEW_FM, 'tags', 'tags: ["A", ""]') })), 'fm.tags')[0].message, /non-empty/);
  assert.match(ofRule(check(review({ fm: withFm(REVIEW_FM, 'tags', null) })), 'fm.tags')[0].message, /missing/);
  const block = ofRule(check(review({ fm: withFm(REVIEW_FM, 'tags', 'tags:\n  - Privacy') })), 'fm.tags');
  assert.match(block[0].message, /flow sequence/);
  assert.equal(ofRule(check(review()), 'fm.tags').length, 0);
});

test('fm.readingTime: positive integer when present', () => {
  assert.equal(ofRule(check(review({ fm: withFm(REVIEW_FM, 'readingTime', 'readingTime: "5"') })), 'fm.readingTime').length, 1);
  assert.equal(ofRule(check(review({ fm: withFm(REVIEW_FM, 'readingTime', 'readingTime: 0') })), 'fm.readingTime').length, 1);
  assert.equal(ofRule(check(review({ fm: withFm(REVIEW_FM, 'readingTime', 'readingTime: 4.5') })), 'fm.readingTime').length, 1);
  assert.equal(ofRule(check(review({ fm: withFm(REVIEW_FM, 'readingTime', null) })), 'fm.readingTime').length, 0);
});

test('fm.headerImage: required for automation types, path pinned to the slug', () => {
  assert.match(ofRule(check(review({ fm: withFm(REVIEW_FM, 'headerImage', null) })), 'fm.headerImage')[0].message, /required for type "Paper Review"/);
  assert.match(ofRule(check(review({ fm: withFm(REVIEW_FM, 'headerImage', 'headerImage: "/images/news/other_slug.jpg"') })), 'fm.headerImage')[0].message, /must be "\/images\/news\/optimizing_noise/);
  assert.equal(ofRule(check(review({ fm: withFm(REVIEW_FM, 'headerImage', `headerImage: "/images/news/${REVIEW_SLUG}.png"`) })), 'fm.headerImage').length, 0);
  // A hand-written type does not need one.
  const tutorial = withFm(withFm(withFm(withFm(REVIEW_FM, 'type', 'type: "Tutorial"'), 'headerImage', null), 'paperUrl', null), 'paperAuthors', null);
  assert.equal(ofRule(check(review({ fm: tutorial })), 'fm.headerImage').length, 0);
});

test('fm.headerImage: with repoRoot the file must exist and be <= 300KB unless a light .webp sibling exists', () => {
  const root = tmpRepo();
  const img = path.join(root, 'public', 'images', 'news', `${REVIEW_SLUG}.jpg`);
  assert.match(ofRule(check(review(), { repoRoot: root }), 'fm.headerImage')[0].message, /not found/);
  fs.writeFileSync(img, Buffer.alloc(400 * 1024));
  assert.match(ofRule(check(review(), { repoRoot: root }), 'fm.headerImage')[0].message, /400KB \(limit 300KB\)/);
  fs.writeFileSync(img.replace(/\.jpg$/, '.webp'), Buffer.alloc(40 * 1024));
  assert.equal(ofRule(check(review(), { repoRoot: root }), 'fm.headerImage').length, 0);
  fs.writeFileSync(img, Buffer.alloc(300 * 1024));
  fs.rmSync(img.replace(/\.jpg$/, '.webp'));
  assert.equal(ofRule(check(review(), { repoRoot: root }), 'fm.headerImage').length, 0);
  fs.rmSync(root, { recursive: true, force: true });
});

test('fm.attribution: Paper Review needs an https paperUrl and non-empty paperAuthors (233/233 shipped without)', () => {
  const noUrl = ofRule(check(review({ fm: withFm(REVIEW_FM, 'paperUrl', null) })), 'fm.attribution');
  assert.equal(noUrl.length, 1);
  assert.match(noUrl[0].message, /paperUrl is missing/);
  assert.match(ofRule(check(review({ fm: withFm(REVIEW_FM, 'paperUrl', 'paperUrl: "http://arxiv.org/abs/2508.12345"') })), 'fm.attribution')[0].message, /https:\/\//);
  assert.match(ofRule(check(review({ fm: withFm(REVIEW_FM, 'paperAuthors', 'paperAuthors: ""') })), 'fm.attribution')[0].message, /paperAuthors/);
  assert.equal(ofRule(check(review({ fm: withFm(REVIEW_FM, 'paperAuthors', 'paperAuthors: ["Ada Lovelace", "Alan Turing"]') })), 'fm.attribution').length, 0);
  // Digests review nothing, so the rule does not apply to them.
  assert.equal(ofRule(check(digest(), { path: DIGEST_PATH }), 'fm.attribution').length, 0);
});

test('fm.keys: an unknown key is a warning, not an error', () => {
  const out = ofRule(check(review({ fm: [...REVIEW_FM.slice(0, -1), 'author: "Den"', '---'] })), 'fm.keys');
  assert.equal(out.length, 1);
  assert.equal(out[0].severity, 'warn');
  assert.match(out[0].message, /"author"/);
  assert.equal(ofRule(check(review()), 'fm.keys').length, 0);
});

// ---------------------------------------------------------------------------
// BODY
// ---------------------------------------------------------------------------

test('body.h1: a reworded H1 (211/322 originals) is an error; a byte-equal or absent H1 passes', () => {
  const reworded = check(review({ body: ['', '# Convex Optimization for Noise Distribution Design under Rényi DP', ...REVIEW_BODY] }));
  const h1 = ofRule(reworded, 'body.h1');
  assert.equal(h1.length, 1);
  assert.equal(h1[0].line, 13);
  assert.match(h1[0].message, /Convex Optimization/);
  assert.equal(ofRule(check(review({ body: ['', `# ${REVIEW_TITLE}`, ...REVIEW_BODY] })), 'body.h1').length, 0);
  assert.equal(ofRule(check(review({ body: ['', '```', '# not a heading', '```', ...REVIEW_BODY] })), 'body.h1').length, 0);
});

test('body.header-image: re-embedding headerImage as the first body element (309/322) warns', () => {
  const out = ofRule(check(review({ body: ['', `![${REVIEW_TITLE}](/images/news/${REVIEW_SLUG}.jpg)`, '*Figure from the paper*', ...REVIEW_BODY] })), 'body.header-image');
  assert.equal(out.length, 1);
  assert.equal(out[0].severity, 'warn');
  assert.equal(out[0].line, 13);
  assert.equal(ofRule(check(review({ body: ['', '![A different figure](/images/news/figure_1.jpg)', ...REVIEW_BODY] })), 'body.header-image').length, 0);
});

test('body.math: the 08-20 `\\$10.34 \\text{ ms}$` line and a fully-escaped span are errors, located by line', () => {
  const line = '*   Be mindful of the computational cost, which is low (under \\$0.5\\text{K}$ parameters, \\$10.34 \\text{ ms}$ latency) but still requires modifying the inference pipeline.';
  const out = ofRule(check(review({ body: [...REVIEW_BODY, '', line] })), 'body.math');
  assert.equal(out.length, 1);
  assert.match(out[0].message, /^mixed-escaping/);
  assert.equal(out[0].line, APPENDED_LINE);
  const fully = ofRule(check(review({ body: [...REVIEW_BODY, '', 'as a function \\$Y = F(X; \\theta)\\$, where \\$X\\$ represents inputs'] })), 'body.math');
  assert.match(fully[0].message, /^fully-escaped-span/);
  assert.equal(ofRule(check(review()), 'body.math').length, 0);
});

test('body.display-math: single-line $$…$$ (419 lines in 123 originals), indented, in lists and in table cells', () => {
  const at = (lines) => ofRule(check(review({ body: [...REVIEW_BODY, '', ...lines] })), 'body.display-math');
  // automated_mass_malware_factory_… line 26 as committed in 6693f04
  const single = at(['$$ \\text{Objective} = \\min_p E_1(p) + \\max_p \\min_n E_2(n, p) $$']);
  assert.equal(single.length, 1);
  assert.match(single[0].message, /single-line/);
  assert.match(at(['   $$\\mathcal{G} = x$$'])[0].message, /single-line/);
  assert.match(at(['- item', '   $$', '   x = 1', '   $$'])[0].message, /column 0/);
  assert.match(at(['- item', '$$', 'x = 1', '$$'])[0].message, /continues a list item/);
  assert.match(at(['| a | b |', '|---|---|', '| $$x$$ | 1 |'])[0].message, /table cell/);
  assert.match(at(['- the score $$s = 1$$ is fixed'])[0].message, /list item/);
  assert.match(at(['$$\\ z = m \\times z \\$$'])[0].message, /single-line|fence/);
  assert.match(at(['$$', 'x = 1 \\$$'])[0].message, /content on the same line/);
  assert.equal(at(['- item', '', '$$', 'x = 1', '$$']).length, 0);
  assert.equal(at(['```', '$$ x $$', '```']).length, 0);
});

test('body.table-pipe: an unescaped "|" inside $…$ in a table row is an error; "\\|" passes', () => {
  const row = ['| Rule | Attack | Pattern | Relation |', '|---|---|---|---|', "| **MR1** | 89 (SQLi) | Tautology inject. | $|f(x')| \\le |f(x)|$ |"];
  const out = ofRule(check(review({ body: [...REVIEW_BODY, '', ...row] })), 'body.table-pipe');
  assert.equal(out.length, 1);
  assert.equal(out[0].line, APPENDED_LINE + 2);
  const escaped = ['| Rule | Relation |', '|---|---|', "| **MR1** | $\\|f(x')\\| \\le \\|f(x)\\|$ |"];
  assert.equal(ofRule(check(review({ body: [...REVIEW_BODY, '', ...escaped] })), 'body.table-pipe').length, 0);
});

test('body.html: `| AUROC <br> TPR |` (57 lines in 16 originals) is an error; tags in code are fine', () => {
  const out = ofRule(check(review({ body: [...REVIEW_BODY, '', '| Attack | Metric | Value |', '|---|---|---|', '| **No Attack** | AUROC <br> TPR@5% | 100.0% <br> 100.0% |'] })), 'body.html');
  assert.equal(out.length, 1);
  assert.match(out[0].message, /<br>/);
  assert.equal(ofRule(check(review({ body: [...REVIEW_BODY, '', 'The page injects a `<div class="review-card">` wrapper.'] })), 'body.html').length, 0);
  assert.equal(ofRule(check(review({ body: [...REVIEW_BODY, '', '```html', '<div><span>x</span></div>', '```'] })), 'body.html').length, 0);
  assert.equal(ofRule(check(review({ body: [...REVIEW_BODY, '', 'The bound $p<a$ holds for $x <a b$.'] })), 'body.html').length, 0);
});

test('body.internal-links: the May 31 hyphenated dead slugs are errors when repoRoot is given', () => {
  const root = tmpRepo();
  fs.writeFileSync(path.join(root, 'public', 'images', 'news', `${REVIEW_SLUG}.jpg`), Buffer.alloc(10));
  fs.writeFileSync(path.join(root, 'src', 'content', 'articles', 'neurostrike_neuronlevel_attacks_on_aligned_llms.md'), '---\n---\n');
  const lines = [
    '*   **[Hijacking Autonomous LLM Agents](/writing/indirect-prompt-injection-runtimes)** — by Dr. Elena Rostova',
    '*   **[Adversarial Jailbreaks in Multi-Agent Collaborative Systems](/writing/multi-agent-jailbreaks)** — by Zhao et al.',
    '*   See also [NeuroStrike](/writing/neurostrike_neuronlevel_attacks_on_aligned_llms) and the [archive](/writing/archive).',
  ];
  const out = ofRule(check(review({ body: [...REVIEW_BODY, '', ...lines] }), { repoRoot: root }), 'body.internal-links');
  assert.deepEqual(out.map((f) => f.message.match(/\/writing\/([a-z0-9_-]+)/)[1]), ['indirect-prompt-injection-runtimes', 'multi-agent-jailbreaks']);
  assert.equal(ofRule(check(review({ body: [...REVIEW_BODY, '', ...lines] })), 'body.internal-links').length, 0, 'skipped without repoRoot');
  fs.rmSync(root, { recursive: true, force: true });
});

test('body.persona: AUTHORSHIP, EXPERIENTIAL_PERSONA and FAKE_STATS phrases are errors', () => {
  const hits = [
    ['As a practitioner, this matters.', 'faked experiential persona'],
    ['What excites me here is the graph model.', 'faked experiential persona'],
    ['In my experience the defence holds.', 'faked experiential persona'],
    ['I previously proposed a similar guard.', 'first-person authorship claim'],
    ['My work on watermarking predates this.', 'first-person authorship claim'],
    ['Across a knowledge base of 1,204 papers, this is rare.', 'fabricated corpus statistic'],
  ];
  for (const [line, group] of hits) {
    const out = ofRule(check(review({ body: [...REVIEW_BODY, '', line] })), 'body.persona');
    assert.equal(out.length, 1, line);
    assert.equal(out[0].severity, 'error');
    assert.match(out[0].message, new RegExp(`^${group}`));
    assert.equal(out[0].line, APPENDED_LINE);
  }
  assert.equal(ofRule(check(review({ body: [...REVIEW_BODY, '', 'The authors propose a neutral third-person guard.'] })), 'body.persona').length, 0);
});

test('body.cve: placeholder ids are errors; real-looking ids pass', () => {
  const out = ofRule(check(review({ body: [...REVIEW_BODY, '', 'Tracked as CVE-2024-1234 and CVE-2025-0000.'] })), 'body.cve');
  assert.deepEqual(out.map((f) => f.message.match(/CVE-\d{4}-\d+/)[0]), ['CVE-2024-1234', 'CVE-2025-0000']);
  assert.equal(ofRule(check(review({ body: [...REVIEW_BODY, '', 'Tracked as CVE-2024-3094.'] })), 'body.cve').length, 0);
});

test('body.pct-escape: `90\\% Attack Success Rate` in prose warns; `\\%` inside math does not', () => {
  const out = ofRule(check(review({ body: [...REVIEW_BODY, '', 'They achieve a 90\\% Attack Success Rate.'] })), 'body.pct-escape');
  assert.equal(out.length, 1);
  assert.equal(out[0].severity, 'warn');
  assert.equal(ofRule(check(review({ body: [...REVIEW_BODY, '', 'They achieve $95.5\\%$ on the benchmark.'] })), 'body.pct-escape').length, 0);
});

test('body.truncation: the 08-18 cut-off line is caught MID-BODY (it is the final news item, not the final line), on any type', () => {
  // Exactly the shape of e58f227: the cut line, then `---`, `## Den's Take` and prose.
  const tail = ['', '---', '', "## Den's Take", '', 'The focus on Topic-FlipRAG misses the more fundamental, structural risk.'];
  const cut = ofRule(check(review({ body: [...REVIEW_BODY, '', TRUNCATED_NEWS_LINE, ...tail] })), 'body.truncation');
  assert.equal(cut.length, 1);
  assert.match(cut[0].message, /^line ends mid-markdown/);
  assert.match(cut[0].message, /"\[" without a closing/);
  assert.equal(cut[0].line, APPENDED_LINE);
  // The 08-19 form (HEAD line 27): a `](https://…` whose URL never closes.
  const aug19 = '[AI Agent Introduced A Flaw in Snowflake’s Code—Then Another AI Agent Exploited It](https://news.google.com/rss/articles/CBMikwFBVV95cUxQZmZ3ZUdlYnMyZFZCVEw4cXJNSFRwYVl2MlRxeFRoZmJ1eGRiSW5JcVRLOUZPN2ttUWlZTHU2djJiSjRRSE1hQjY3d0ZTTTFlYlVvelEwU2ZSZFFSdDgwUjFk';
  const open = ofRule(check(review({ body: [...REVIEW_BODY, '', aug19, ...tail] })), 'body.truncation');
  assert.equal(open.length, 1);
  assert.match(open[0].message, /not closed by "\)" on the same line/);
  assert.equal(open[0].line, APPENDED_LINE);
});

test('body.truncation: end-of-file signs — an unbalanced "**" or "(" on the last line, and an open fence', () => {
  assert.match(ofRule(check(review({ body: [...REVIEW_BODY, '', '**Unfinished emphasis'] })), 'body.truncation')[0].message, /unbalanced "\*\*"/);
  assert.match(ofRule(check(review({ body: [...REVIEW_BODY, '', 'The bound holds (see Appendix B'] })), 'body.truncation')[0].message, /"\(" without "\)"/);
  assert.match(ofRule(check(review({ body: [...REVIEW_BODY, '', '```python', 'x = 1'] })), 'body.truncation')[0].message, /code fence is still open/);
  // A "(" left open above the last line is prose, not a cutoff sign.
  assert.equal(ofRule(check(review({ body: [...REVIEW_BODY, '', 'They note (in passing', '', 'that it works.'] })), 'body.truncation').length, 0);
});

test('body.truncation: closed links, a lone "]" table cell (passbert), brackets in math/code and a bare URL all pass', () => {
  const clean = [
    'Source: [the paper](https://arxiv.org/abs/2508.12345).',
    '| ] | Delete last character | ] | passwor |',
    'The interval $[0, 1)$ and the code `a[0` are fine.',
    'See https://arxiv.org/abs/2508.12345 for details.',
    '- **[CrowdStrike launches AgentWorks](https://news.google.com/rss/articles/CBMikwFBVV95cUxQZmZ3ZUdlYnMyZFZCVEw4cXJNSFRwYVl2MlRxeFRoZmJ1?oc=5)** (CrowdStrike) — closed.',
  ];
  assert.deepEqual(ofRule(check(review({ body: [...REVIEW_BODY, '', ...clean] })), 'body.truncation'), []);
});

// ---------------------------------------------------------------------------
// DIGEST-SPECIFIC
// ---------------------------------------------------------------------------

test('digest.news-link-form: every news.google.com line must be canonical with a >= 40-char payload', () => {
  const at = (line) => ofRule(check(digest({ body: DIGEST_BODY.map((l) => (l === CANONICAL_NEWS_LINE ? line : l)) }), { path: DIGEST_PATH }), 'digest.news-link-form');
  const cut = at(TRUNCATED_NEWS_LINE);
  assert.equal(cut.length, 1);
  assert.match(cut[0].message, /payload is 17 chars \(minimum 40/);
  assert.match(cut[0].message, /does not match/);
  const urlText = at(`**OpenAI Reaches \\$40B Revenue** ([${FULL_REDIRECTOR}](${FULL_REDIRECTOR}))`);
  assert.match(urlText[0].message, /link text is a URL/);
  const noPublisher = at(`- **[CrowdStrike launches the Charlotte AI AgentWorks Ecosystem](${FULL_REDIRECTOR})**: CrowdStrike is codifying the model.`);
  assert.equal(noPublisher.length, 1);
  assert.match(noPublisher[0].message, /does not match/);
  assert.equal(at(CANONICAL_NEWS_LINE).length, 0);
  // Not a digest rule for Paper Reviews.
  assert.equal(ofRule(check(review({ body: [...REVIEW_BODY, '', TRUNCATED_NEWS_LINE] })), 'digest.news-link-form').length, 0);
});

test('digest.paper-links: a Paper/Research Highlights section with zero arxiv.org/abs/ links warns', () => {
  const plain = DIGEST_BODY.map((l) => (l.includes('arxiv.org') ? '**Optimizing Noise Distributions for Differential Privacy** — Ada Lovelace. Convex noise design for DP.' : l));
  const out = ofRule(check(digest({ body: plain }), { path: DIGEST_PATH }), 'digest.paper-links');
  assert.equal(out.length, 1);
  assert.equal(out[0].severity, 'warn');
  assert.equal(out[0].line, 11);
  const research = plain.map((l) => (l === '## Paper Highlights' ? '## Research Highlights' : l));
  assert.equal(ofRule(check(digest({ body: research }), { path: DIGEST_PATH }), 'digest.paper-links').length, 1);
  assert.equal(ofRule(check(digest(), { path: DIGEST_PATH }), 'digest.paper-links').length, 0);
});

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd: REPO_ROOT, encoding: 'utf8' });
}

test('CLI: no files prints usage and exits 2', () => {
  const r = run([]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /^Usage:/);
});

test('CLI: a clean article prints OK and exits 0; warnings exit 1 only with --warnings-as-errors; --json is an array', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-article-cli-'));
  const file = path.join(dir, `${REVIEW_SLUG}.md`);
  fs.writeFileSync(file, review());
  const ok = run([file]);
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.equal(ok.stdout.trim(), 'OK (1 file(s), 0 findings)');

  fs.writeFileSync(file, review({ fm: [...REVIEW_FM.slice(0, -1), 'author: "Den"', '---'] }));
  const warnOnly = run([file]);
  assert.equal(warnOnly.status, 0);
  assert.match(warnOnly.stdout, /^.*:11: warn fm\.keys: unknown frontmatter key "author"/m);
  assert.match(warnOnly.stdout, /0 error\(s\), 1 warning\(s\) in 1 file\(s\)/);
  assert.equal(run([file, '--warnings-as-errors']).status, 1);

  fs.writeFileSync(file, review().replace(/\n$/, ''));
  const bad = run([file, '--json']);
  assert.equal(bad.status, 1);
  const parsed = JSON.parse(bad.stdout);
  assert.deepEqual(parsed.map((f) => [f.rule, f.severity]), [['file.trailing-newline', 'error']]);
  assert.equal(parsed[0].file, file);
  fs.rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Integration: the 5 articles as committed in 6693f04 (2026-08-25)
// ---------------------------------------------------------------------------

test('integration: the 5 articles of commit 6693f04 report their known defects', (t) => {
  const ls = spawnSync('git', ['show', '--name-only', '--format=', '6693f04', '--', 'src/content/articles'], { cwd: REPO_ROOT, encoding: 'utf8' });
  if (ls.status !== 0 || !ls.stdout.trim()) {
    t.skip('commit 6693f04 not available in this checkout');
    return;
  }
  const files = ls.stdout.trim().split(/\r?\n/);
  assert.equal(files.length, 5);
  const report = [];
  for (const rel of files) {
    const show = spawnSync('git', ['show', `6693f04:${rel}`], { cwd: REPO_ROOT, encoding: 'utf8' });
    assert.equal(show.status, 0, show.stderr);
    const findings = checkGeneratedArticle(show.stdout, { path: rel, repoRoot: REPO_ROOT });
    const byRule = {};
    for (const f of findings) byRule[f.rule] = (byRule[f.rule] ?? 0) + 1;
    report.push(`${path.basename(rel)}: ${Object.entries(byRule).map(([k, v]) => `${k}x${v}`).join(', ')}`);

    // Every file: no trailing newline, header image re-embedded as the first body line.
    assert.equal(ofRule(findings, 'file.trailing-newline').length, 1, rel);
    assert.equal(ofRule(findings, 'body.header-image').length, 1, rel);
    // Nothing that is NOT a defect of these files.
    for (const clean of ['file.eol', 'file.slug', 'fm.parse', 'fm.quoted', 'fm.date', 'fm.type', 'fm.tags', 'fm.readingTime', 'fm.headerImage', 'fm.keys', 'body.math', 'body.internal-links', 'body.persona', 'body.cve', 'body.truncation', 'digest.news-link-form']) {
      assert.equal(ofRule(findings, clean).length, 0, `${rel}: unexpected ${clean}`);
    }

    if (rel.includes('ai_security_digest')) {
      assert.equal(ofRule(findings, 'body.h1').length, 0, 'digest H1 equals its title');
      assert.equal(ofRule(findings, 'fm.attribution').length, 0);
      assert.equal(ofRule(findings, 'fm.description').length, 0);
      assert.equal(ofRule(findings, 'digest.paper-links').length, 1, 'Paper Highlights without arXiv links');
    } else {
      const attribution = ofRule(findings, 'fm.attribution');
      assert.equal(attribution.length, 2, rel);
      assert.match(attribution[0].message, /paperUrl is missing/);
      assert.equal(ofRule(findings, 'fm.description').length, 1, `${rel}: trivial description`);
      assert.equal(ofRule(findings, 'body.h1').length, 1, `${rel}: H1 != title`);
    }
    if (rel.includes('automated_mass_malware_factory')) {
      const dm = ofRule(findings, 'body.display-math');
      assert.equal(dm.length, 1);
      assert.equal(dm[0].line, 26);
      assert.match(dm[0].message, /single-line/);
    } else {
      assert.equal(ofRule(findings, 'body.display-math').length, 0, rel);
    }
  }
  for (const line of report) t.diagnostic(line);
});

test('integration: the 2026-08-18 digest as committed in e58f227 reports its truncated final news item', (t) => {
  const rel = 'src/content/articles/ai_security_digest__august_18_2026_rag__adversarial_attacks.md';
  const show = spawnSync('git', ['show', `e58f227:${rel}`], { cwd: REPO_ROOT, encoding: 'utf8' });
  if (show.status !== 0) {
    t.skip('commit e58f227 not available in this checkout');
    return;
  }
  const findings = checkGeneratedArticle(show.stdout, { path: rel, repoRoot: REPO_ROOT });
  const cut = ofRule(findings, 'body.truncation');
  assert.equal(cut.length, 1, JSON.stringify(cut));
  assert.equal(cut[0].line, 26);
  assert.match(cut[0].message, /"\[" without a closing/);
  assert.match(cut[0].message, /CBMinAFBVV95cUxOQ"$/);
  // Lines 23-25 use the URL as link text; line 26 is the 17-char payload.
  assert.deepEqual(ofRule(findings, 'digest.news-link-form').map((f) => f.line), [23, 24, 25, 26]);
  assert.match(ofRule(findings, 'digest.news-link-form')[3].message, /payload is 17 chars/);
  t.diagnostic(`08-18 digest (e58f227): ${findings.map((f) => `${f.line}:${f.rule}`).join(', ')}`);
});
