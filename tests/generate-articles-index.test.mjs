// Round-trip tests for scripts/generate-articles-index.mjs.
//
// The script's paths are hard-wired relative to its own file location
// (import.meta.url → ../src/content/articles, ../src/data), so we test it by
// copying the script and its lib/ dependencies into a scratch tree and running
// it there with fixture articles. The scratch tree lives UNDER the repo (not
// os.tmpdir) so the copied script still resolves `gray-matter` from the repo's
// node_modules; everything else about the run is fully isolated.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(testsDir, '..');

let scratch;
let scriptPath;
let articlesDir;
let indexPath;

const CURATED_ALPHA =
  'A curated, hand-edited summary of the alpha digest that must survive regeneration untouched.';

function writeFixtures() {
  // alpha: trivial frontmatter description (equals title) + curated index entry.
  fs.writeFileSync(
    path.join(articlesDir, 'alpha.md'),
    [
      '---',
      'title: "AI Security Digest — May 2, 2026"',
      'date: "2026-05-02"',
      'type: "News Digest"',
      'description: "AI Security Digest — May 2, 2026"',
      'tags: ["Prompt Injection"]',
      '---',
      '',
      '## Executive Summary',
      '',
      'Alpha body paragraph long enough to be extractable, describing prompt injection defenses in agentic pipelines today.',
      '',
    ].join('\n'),
    'utf8'
  );

  // beta: healthy frontmatter — should pass through verbatim.
  fs.writeFileSync(
    path.join(articlesDir, 'beta.md'),
    [
      '---',
      'title: "Beta Walkthrough"',
      'date: "2026-05-01"',
      'type: "Paper Walkthrough"',
      'description: "A complete, sentence-final description that is comfortably over sixty characters long."',
      'tags: ["RAG", "Jailbreak"]',
      '---',
      '',
      'Beta body text.',
      '',
    ].join('\n'),
    'utf8'
  );

  // delta: trivial description, NO curated entry → must fall back to body extraction.
  fs.writeFileSync(
    path.join(articlesDir, 'delta.md'),
    [
      '---',
      'title: "Delta Report"',
      'date: "2026-04-30"',
      'type: "Trend Report"',
      'description: "Delta Report"',
      'tags: []',
      '---',
      '',
      'Delta opening paragraph with enough substance and length to become the extracted description for the index entry.',
      '',
      'Prompt injection dominates this report, and indirect prompt injection through retrieved documents compounds it.',
      '',
    ].join('\n'),
    'utf8'
  );

  // Seed index: curated description for alpha only (delta intentionally absent).
  fs.writeFileSync(
    indexPath,
    JSON.stringify(
      [
        {
          slug: 'alpha',
          title: 'AI Security Digest — May 2, 2026',
          date: '2026-05-02',
          type: 'News Digest',
          description: CURATED_ALPHA,
          tags: ['Prompt Injection'],
          readingTime: 1,
        },
      ],
      null,
      2
    ) + '\n',
    'utf8'
  );
}

function runScript(args = [], env = {}) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: scratch,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

before(() => {
  scratch = fs.mkdtempSync(path.join(testsDir, '.scratch-index-'));
  const scratchScripts = path.join(scratch, 'scripts');
  const scratchLib = path.join(scratchScripts, 'lib');
  articlesDir = path.join(scratch, 'src', 'content', 'articles');
  const dataDir = path.join(scratch, 'src', 'data');
  fs.mkdirSync(scratchLib, { recursive: true });
  fs.mkdirSync(articlesDir, { recursive: true });
  fs.mkdirSync(dataDir, { recursive: true });

  scriptPath = path.join(scratchScripts, 'generate-articles-index.mjs');
  indexPath = path.join(dataDir, 'articles-index.json');
  fs.copyFileSync(path.join(repoRoot, 'scripts', 'generate-articles-index.mjs'), scriptPath);
  for (const lib of ['extract-frontmatter.mjs', 'frontmatter-escapes.mjs']) {
    fs.copyFileSync(path.join(repoRoot, 'scripts', 'lib', lib), path.join(scratchLib, lib));
  }

  writeFixtures();
});

after(() => {
  fs.rmSync(scratch, { recursive: true, force: true });
});

test('first run: preserves curated description, extracts for trivial-only, passes healthy through', () => {
  const run = runScript();
  assert.equal(run.status, 0, `script failed:\n${run.stderr}`);

  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  assert.deepEqual(index.map((a) => a.slug), ['alpha', 'beta', 'delta'], 'sorted by date desc');

  const bySlug = Object.fromEntries(index.map((a) => [a.slug, a]));
  assert.equal(bySlug.alpha.description, CURATED_ALPHA, 'curated description preserved over trivial frontmatter');
  assert.equal(
    bySlug.beta.description,
    'A complete, sentence-final description that is comfortably over sixty characters long.'
  );
  assert.equal(
    bySlug.delta.description,
    'Delta opening paragraph with enough substance and length to become the extracted description for the index entry.',
    'no curated entry → falls back to body extraction'
  );
  assert.ok(bySlug.delta.tags.length > 0, 'empty tags inferred from body');
});

test('second run is idempotent: byte-identical index, untouched articles', () => {
  const firstBytes = fs.readFileSync(indexPath);
  const articleBytesBefore = fs.readFileSync(path.join(articlesDir, 'alpha.md'));

  const run = runScript();
  assert.equal(run.status, 0, `script failed:\n${run.stderr}`);

  assert.deepEqual(fs.readFileSync(indexPath), firstBytes, 'index must be byte-identical on re-run');
  assert.deepEqual(
    fs.readFileSync(path.join(articlesDir, 'alpha.md')),
    articleBytesBefore,
    'healthy article files must not be rewritten'
  );
});

test('--strict exits 1 when frontmatter repair fires, without mutating the checkout', () => {
  const gammaPath = path.join(articlesDir, 'gamma.md');
  // \t inside a double-quoted scalar is a VALID YAML escape that silently
  // mangles $\theta$ — exactly the case the repair path exists for.
  const gammaRaw = [
    '---',
    'title: "Gamma Estimation"',
    'date: "2026-05-03"',
    'type: "News Digest"',
    'description: "A study of $\\theta$ estimation and why measurement noise dominates the loss landscape."',
    '---',
    '',
    'Gamma body text.',
    '',
  ].join('\n');
  fs.writeFileSync(gammaPath, gammaRaw, 'utf8');
  const indexBefore = fs.readFileSync(indexPath);

  try {
    const strictRun = runScript(['--strict']);
    assert.equal(strictRun.status, 1, 'strict run must exit 1 when repair fires');
    assert.equal(fs.readFileSync(gammaPath, 'utf8'), gammaRaw, 'strict must NOT rewrite the .md file');
    assert.deepEqual(fs.readFileSync(indexPath), indexBefore, 'strict must NOT write the index');

    const envRun = runScript([], { STRICT_INDEX: '1' });
    assert.equal(envRun.status, 1, 'STRICT_INDEX=1 must behave like --strict');

    // Lenient (deploy) mode still repairs and succeeds.
    const lenientRun = runScript();
    assert.equal(lenientRun.status, 0, `lenient run failed:\n${lenientRun.stderr}`);
    assert.notEqual(fs.readFileSync(gammaPath, 'utf8'), gammaRaw, 'lenient mode repairs the file in place');
    const gamma = JSON.parse(fs.readFileSync(indexPath, 'utf8')).find((a) => a.slug === 'gamma');
    assert.match(gamma.description, /\$\\theta\$/, 'repaired description keeps the literal LaTeX');
  } finally {
    fs.rmSync(gammaPath, { force: true });
  }
});

test('after repair, a strict re-run passes (converged state)', () => {
  const run = runScript(['--strict']);
  assert.equal(run.status, 0, `strict run on converged tree failed:\n${run.stderr}`);
});
