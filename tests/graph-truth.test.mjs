// Truth guard for /graph, the Research Atlas (SPEC §14.1).
//
// The page once told readers that a second model verified every review. The
// payload says otherwise: each review was written by a Claude model from the
// paper's full text and then checked against that text, in a separate pass, by
// the SAME model. This file keeps every reader-visible statement literally true:
//
//   1. It scans every string literal, template and JSX text under src/app/graph
//      through the TypeScript AST (comments are never scanned) for claims of an
//      independent or human checker, unnegated "peer review", retired copy, and
//      corpus counts that disagree with public/atlas/meta.json.
//   2. It runs reviewProvenance() over fixtures for every provenance shape, and,
//      when the atlas data is present, over every published review.
//   3. It checks landingUrl() (never link a raw file) and stripPipelineNoise().
//
// CI HAS NO ATLAS DATA: public/atlas/ is gitignored and prod serves it from R2.
// Every data-dependent check resolves ATLAS_DIR (default public/atlas) and, when
// the files are absent, takes the absent branch or skips WITH a reason. Verify
// with: ATLAS_DIR=/nonexistent npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

// Graph modules import each other without extensions (the Next bundler resolves
// them); map those specifiers onto the .ts file before Node strips the types.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !path.extname(specifier) && context.parentURL) {
      const base = fileURLToPath(new URL(specifier, context.parentURL));
      for (const ext of ['.ts', '.tsx', '.mjs', '.js']) {
        if (fs.existsSync(base + ext)) return nextResolve(pathToFileURL(base + ext).href, context);
      }
    }
    return nextResolve(specifier, context);
  },
});

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const GRAPH_DIR = path.join(root, 'src', 'app', 'graph');
const ATLAS_DIR = path.resolve(root, process.env.ATLAS_DIR || 'public/atlas');

const copy = await import('../src/app/graph/atlasCopy.ts');
const { reviewProvenance, formatCheckDate, landingUrl, stripPipelineNoise, tierOf, TIER_LABEL, bareNote, formatCount, SOURCE_FIRST_22, SOURCE_ABSTRACT } =
  copy;

/* --- detectors (SPEC §14.1) ------------------------------------------------- */

const CLAIMS = [
  ['second-model', /\bsecond[\s,-]+(?:(?:and|or)\s+)?(?:independent[\s,-]+)?(?:model|reviewer|checker|verifier|opinion|pass)\b/i],
  ['independent', /\bindependent(?:ly)?\b/i],
  ['other-model', /\b(?:another|separate|different|other)\s+(?:model|llm|ai|system|reviewer)\b/i],
  ['verif', /\bverif(?:y|ied|ier|iers|ies|ying|ication|ications)\b/i],
  ['human-review', /\b(?:human|expert|manual(?:ly)?)[\s-]+(?:review(?:ed)?|check(?:ed)?|edit(?:ed)?|curat(?:ed|ion))\b/i],
  ['reviewed-by-person', /\breviewed\s+by\s+(?:a\s+|an\s+)?(?:human|person|people|expert|researcher|editor)s?\b/i],
  ['fact-checked', /\bfact[\s-]?check(?:ed|ing)?\b/i],
  ['read-end-to-end', /\bread\s+(?:it\s+)?end\s+to\s+end\b/i],
];
// "peer review" is allowed ONLY when negated within its clause.
const PEER = /\bpeer[\s-]+review(?:ed|ers?)?\b/gi;
const PEER_NEGATION = /\b(?:not|never|no|isn['’]t|aren['’]t)\b[^.;:]{0,24}$/i;
// Copy retired by SPEC §11.8 that the claim rules above do not already catch.
const RETIRED = [
  ['check-glyph', /[✓✔☑]/],
  ['metadata-only', /\bmetadata[\s-]+only\b/i],
  ['newest-cited', /\bnewest[\s-]+cited\b/i],
  ['backfill', /\bbackfill/i],
  ['verbatim', /\bverbatim\b/i],
  ['authors-wrote-it', /\bas the authors wrote it\b/i],
];
const COUNT =
  /\b(\d{1,3}(?:[,   ]\d{3})+|\d{4,})\s+(?:[A-Za-z-]+\s+){0,3}?(papers?|nodes?|reviews?|abstracts?|regions?)\b/gi;

/** Every rule a string trips; empty means the string is safe to show. */
function claimHits(str) {
  const hits = [];
  for (const [rule, re] of CLAIMS) if (re.test(str)) hits.push(rule);
  for (const m of str.matchAll(PEER)) if (!PEER_NEGATION.test(str.slice(0, m.index))) hits.push('peer-review');
  for (const [rule, re] of RETIRED) if (re.test(str)) hits.push(rule);
  return hits;
}

/** Corpus counts in `str` that are wrong for `meta` (or, with no meta, any count at all). */
function countProblems(str, meta) {
  const problems = [];
  for (const m of str.matchAll(COUNT)) {
    const n = Number(m[1].replace(/\D/g, ''));
    const noun = m[2].toLowerCase().replace(/s$/, '');
    if (!meta) problems.push(`"${m[0]}": no meta.json, so no corpus count may appear`);
    else if (noun === 'paper' || noun === 'node') {
      if (n !== meta.nodes) problems.push(`"${m[0]}": meta.json says ${meta.nodes} nodes`);
    } else if (noun === 'review') {
      if (n !== meta.reviews) problems.push(`"${m[0]}": meta.json says ${meta.reviews} reviews`);
    } else problems.push(`"${m[0]}": meta.json has no ${noun} count to check this against`);
  }
  return problems;
}

/* --- visible-string extraction (TypeScript AST; comments are never nodes) ----- */

const ENTITIES = {
  rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', mdash: '—', ndash: '–', amp: '&', nbsp: ' ',
  hellip: '…', middot: '·', times: '×', apos: "'", quot: '"', lt: '<', gt: '>',
};
function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, e) => {
    if (e[0] !== '#') return ENTITIES[e.toLowerCase()] ?? whole;
    const cp = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1));
    return Number.isInteger(cp) && cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : whole;
  });
}
const normalise = (s) => decodeEntities(s).replace(/\s+/g, ' ').trim();

function visibleStrings(file) {
  const source = fs.readFileSync(file, 'utf8');
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
  const out = [];
  const push = (s) => {
    const v = normalise(s);
    if (v) out.push(v);
  };
  // All descendant JSX text plus string-literal expressions; any other
  // expression becomes a space. Catches "<em>second</em> model".
  const flatten = (el) => {
    let acc = '';
    const walk = (n) => {
      if (ts.isJsxText(n)) acc += n.text;
      else if (ts.isJsxExpression(n)) {
        const e = n.expression;
        acc += e && (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) ? e.text : ' ';
      } else if (ts.isJsxElement(n) || ts.isJsxFragment(n)) n.children.forEach(walk);
      else acc += ' ';
    };
    el.children.forEach(walk);
    return acc;
  };
  const visit = (node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) push(node.text);
    else if (ts.isTemplateExpression(node)) {
      push([node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(' … '));
    } else if (ts.isJsxText(node)) push(node.text);
    if (ts.isJsxElement(node) || ts.isJsxFragment(node)) push(flatten(node));
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

/** Payload fields the UI must never read: `tip` (an unlabelled model takeaway),
    `date_note` (pipeline plumbing) and `source_url` (never rendered). */
const FORBIDDEN_FIELDS = new Set(['tip', 'date_note', 'source_url']);
function forbiddenFieldReads(file) {
  const source = fs.readFileSync(file, 'utf8');
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
  const found = [];
  const visit = (node) => {
    let name = null;
    if (ts.isPropertyAccessExpression(node)) name = node.name.text;
    else if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression)) {
      name = node.argumentExpression.text;
    } else if (ts.isBindingElement(node)) {
      const key = node.propertyName ?? node.name;
      if (ts.isIdentifier(key) || ts.isStringLiteralLike(key)) name = key.text;
    }
    if (name && FORBIDDEN_FIELDS.has(name)) {
      const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
      found.push(`${path.relative(root, file)}:${line + 1} reads .${name}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

function sourceFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry.name)) files.push(full);
  }
  return files.sort();
}

/* --- copy deck (SPEC §11), verbatim ------------------------------------------- */

const DECK = {
  M2: 'Preview: an interactive map of papers in AI security and neighbouring fields, grouped into named topic regions. Some papers carry a review written by a Claude model from the paper’s text and checked against it by the same model; it is a reading aid, not peer review.',
  H3: 'A map of AI-security research',
  H4: 'Each dot is a paper on AI security or a neighbouring field, placed near papers on similar topics. Search for one you know, or click a region name to explore.',
  H5i: 'Papers on AI security and neighbouring fields, as a list you can search. On a wider screen this is an interactive map.',
  // Package 6 ships the final dek (H5): the list gained its filter and sort.
  H5: 'Papers on AI security and neighbouring fields, as a list you can search, filter and sort. On a wider screen this is an interactive map.',
  A0: 'About the reviews',
  A1: 'Each review was written by a Claude model from the paper’s text, then checked against that same text in a separate pass by the same model. Reviews made before October 2026 read at most the first 22 pages of each paper; each review says which text it used. It is a reading aid, not peer review: confirm anything important in the paper itself.',
  A2: 'Abstracts are shown as recorded in each paper’s bibliographic metadata; no model wrote or edited them.',
  // A3 as revised in the final review: the original ("Links point to a public
  // landing page (publisher, DOI or arXiv).") named a closed set of hosts and
  // called every page public, but many kept links are repository pages, and
  // 41 are EBSCO record pages behind a sign-in (measured 2026-10-04).
  A3: 'Links go to the paper’s landing page on another site, such as its publisher’s page, its DOI link or its arXiv entry. Links that look like direct file downloads are left out.',
  P8: 'No public landing page is recorded for this paper.',
  P9: 'Model-written review',
  P10a: 'Written by Claude from the paper’s full text, then checked against that text by the same model; the check was recorded on 21 Jul 2026.',
  P10b: 'Written by Claude from the paper’s full text, then checked against that text by the same model. The check date was not recorded.',
  // The July 2026 batch read only list(d)[:22] (measured 2026-10-05); the exporter says so.
  P10f22a: 'Written by Claude from the first 22 pages of the paper’s PDF (the whole paper, if shorter), then checked against that text by the same model; the check was recorded on 21 Jul 2026.',
  P10f22b: 'Written by Claude from the first 22 pages of the paper’s PDF (the whole paper, if shorter), then checked against that text by the same model. The check date was not recorded.',
  P10abs: 'Written by Claude from the paper’s abstract (its PDF could not be fetched), then checked against that text by the same model. The check date was not recorded.',
  P11: 'The check flagged minor issues with this review.',
  P12: 'How this review was made',
  P14: 'A reading aid, not peer review. Confirm important details in the paper itself.',
  P19: 'Abstract',
  P20: 'As recorded in the paper’s bibliographic metadata. No model wrote, edited or checked this text.',
  P22: 'No review or abstract',
  P23: 'The atlas has this paper’s title, venue and place on the map, but no review or abstract. Read the paper itself at the link above.',
  P23b: 'The atlas has this paper’s title, venue and place on the map, but no review, abstract or public landing page.',
  P28: 'Similar papers',
  I1: 'Only papers with a review',
  I4: '· loading links between similar papers…',
  I5: 'This paper has no review, so the map now shows all papers.',
  I6: 'Papers with a review come first, then the most-cited.',
  I7: 'Review',
};

/* --- data (absent in CI) --------------------------------------------------------- */

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const metaPath = path.join(ATLAS_DIR, 'meta.json');
const meta = fs.existsSync(metaPath) ? readJson(metaPath) : null;
const reviewsDir = path.join(ATLAS_DIR, 'reviews');
const nodesPath = path.join(ATLAS_DIR, 'nodes.json');
const ABSENT = 'CI has no atlas data: public/atlas/ is gitignored and prod serves it from R2';

/** Every string a ProvenanceCopy can put in front of a reader. */
function provenanceStrings(prov) {
  const out = [prov.badge, prov.summary, prov.closing];
  if (prov.minorIssues) out.push(prov.minorIssues);
  for (const row of prov.details) out.push(row.term, row.value, ...(row.note ? [row.note] : []));
  return out;
}

const files = sourceFiles(GRAPH_DIR);
const rel = (f) => path.relative(GRAPH_DIR, f);

/* --- 1. the source scan ----------------------------------------------------------- */

test('the scan covers the graph sources (so a rename cannot make it vacuous)', () => {
  const names = files.map(rel);
  for (const required of ['page.tsx', 'PaperPanel.tsx', 'GraphClient.tsx', 'atlasCopy.ts']) {
    assert.ok(names.includes(required), `${required} missing from the scan: ${names.join(', ')}`);
  }
  const total = files.reduce((n, f) => n + visibleStrings(f).length, 0);
  assert.ok(total > 100, `only ${total} strings extracted: the AST walk is broken`);
});

test('no visible string under src/app/graph claims an independent, human or peer check', () => {
  const problems = [];
  for (const file of files) {
    for (const s of visibleStrings(file)) {
      for (const rule of claimHits(s)) problems.push(`${rel(file)} [${rule}] ${JSON.stringify(s)}`);
    }
  }
  assert.deepEqual(problems, [], `\n${problems.join('\n')}`);
});

test(`visible corpus counts agree with the data (${meta ? 'meta.json branch' : 'no-meta branch'})`, (t) => {
  t.diagnostic(
    meta
      ? `count check: meta.json branch (${metaPath}): papers must equal ${formatCount(meta.nodes)}, reviews ${formatCount(meta.reviews)}; abstract and region counts may not appear`
      : `count check: no-meta branch (${metaPath} absent; ${ABSENT}): no corpus count may appear at all`,
  );
  const problems = [];
  for (const file of files) {
    for (const s of visibleStrings(file)) for (const p of countProblems(s, meta)) problems.push(`${rel(file)} ${p}`);
  }
  assert.deepEqual(problems, [], `\n${problems.join('\n')}`);
});

test('the UI never reads tip, date_note or source_url from the payload', () => {
  const found = files.filter((f) => rel(f) !== 'atlasTypes.ts').flatMap(forbiddenFieldReads);
  assert.deepEqual(found, [], `\n${found.join('\n')}`);
});

/* --- detector self-tests (always run) ---------------------------------------------- */

test('self-test: the detectors flag the retired copy', () => {
  const oldFooter =
    'Reviews are machine-generated from the paper’s full text and verified against it by a second model; the badge on each panel names the verifier';
  assert.ok(claimHits(oldFooter).includes('verif'), 'old footer: verif');
  assert.ok(claimHits(oldFooter).includes('second-model'), 'old footer: second-model');
  assert.ok(claimHits('checked by a second pass').includes('second-model'));
  assert.ok(claimHits('Not yet verified — metadata only').includes('verif'));
  assert.ok(claimHits('Not yet verified — metadata only').includes('metadata-only'));
  for (const old of [
    'PDF-verified',
    'Verified reviews only',
    'with PDF-verified reviews on the papers that have been read end to end',
    'verifier: minor issues',
    'The verifier passed this review, but flagged minor issues with it.',
    'it has not been through the read-the-PDF-and-verify pass',
    'Abstract, as the authors wrote it',
    'Reproduced verbatim from the paper.',
    'as a list, newest-cited first.',
    'Verification date not recorded for this batch; provenance metadata backfilled 2026-07-19.',
    'Checked by an independent model',
    'Reviewed by a human expert',
    'Each summary was fact-checked.',
    '✓',
  ]) {
    assert.ok(claimHits(old).length > 0, `not flagged: ${old}`);
  }
});

test('self-test: the count detector catches a stale corpus count in either branch', () => {
  const stale = '12,430 papers placed by embedding similarity';
  const found = [...stale.matchAll(COUNT)].map((m) => m[0]);
  assert.deepEqual(found, ['12,430 papers']);
  assert.equal(countProblems(stale, { nodes: 35903, reviews: 2532 }).length, 1, 'meta branch');
  assert.equal(countProblems(stale, null).length, 1, 'no-meta branch');
  assert.equal(countProblems('35,903 papers', { nodes: 35903, reviews: 2532 }).length, 0);
  assert.equal(countProblems('2532 reviews', { nodes: 35903, reviews: 2532 }).length, 0);
  assert.equal(countProblems('150 named regions', { nodes: 35903, reviews: 2532 }).length, 0, 'under 1,000: not a corpus count');
  assert.equal(countProblems('1,000 regions', { nodes: 35903, reviews: 2532 }).length, 1, 'no meta field for regions');
  assert.equal(countProblems('13 723 abstracts', { nodes: 35903, reviews: 2532 }).length, 1, 'no meta field for abstracts');
});

test('self-test: copy-deck strings A1, M2, P10a and P14 pass, and peer review only passes negated', () => {
  for (const id of ['A1', 'M2', 'P10a', 'P14']) {
    assert.deepEqual(claimHits(DECK[id]), [], id);
    assert.deepEqual(countProblems(DECK[id], { nodes: 35903, reviews: 2532 }), [], `${id} (meta)`);
    assert.deepEqual(countProblems(DECK[id], null), [], `${id} (no meta)`);
  }
  assert.deepEqual(claimHits('It is a reading aid, not peer review.'), []);
  assert.deepEqual(claimHits('These are peer-reviewed summaries.'), ['peer-review']);
  assert.deepEqual(claimHits('This summary isn’t peer reviewed.'), []);
});

test('every copy-deck string used in package 1 passes the detectors', () => {
  for (const [id, s] of Object.entries(DECK)) {
    assert.deepEqual(claimHits(s), [], id);
    assert.deepEqual(countProblems(s, null), [], id);
  }
  for (const label of Object.values(TIER_LABEL)) assert.deepEqual(claimHits(label), [], label);
});

test('the shipped copy constants are the copy deck, verbatim', () => {
  assert.equal(copy.ATLAS_DESCRIPTION, DECK.M2);
  assert.equal(copy.ATLAS_HEADLINE, DECK.H3);
  assert.equal(copy.ATLAS_DEK_WIDE, DECK.H4);
  assert.equal(copy.ATLAS_DEK_NARROW, DECK.H5);
  assert.equal(copy.ABOUT_HEADING, DECK.A0);
  assert.equal(copy.ABOUT_REVIEWS, DECK.A1);
  assert.equal(copy.ABOUT_ABSTRACTS, DECK.A2);
  assert.equal(copy.ABOUT_LINKS, DECK.A3);
  assert.equal(copy.NO_LANDING_PAGE, DECK.P8);
  assert.equal(copy.REVIEW_BADGE, DECK.P9);
  assert.equal(copy.MINOR_ISSUES, DECK.P11);
  assert.equal(copy.REVIEW_DISCLOSURE, DECK.P12);
  assert.equal(copy.REVIEW_CLOSING, DECK.P14);
  assert.equal(copy.ABSTRACT_HEADING, DECK.P19);
  assert.equal(copy.ABSTRACT_NOTE, DECK.P20);
  assert.equal(copy.BARE_HEADING, DECK.P22);
  assert.equal(copy.SIMILAR_HEADING, DECK.P28);
  assert.deepEqual(TIER_LABEL, { review: 'Review', abstract: 'Abstract', none: 'No summary' }, 'T1');
});

test('tierOf and the count format', () => {
  assert.equal(tierOf({ r: 1, a: 1 }), 'review');
  assert.equal(tierOf({ r: 1, a: 0 }), 'review');
  assert.equal(tierOf({ r: 0, a: 1 }), 'abstract');
  assert.equal(tierOf({ r: 0, a: 0 }), 'none');
  assert.equal(formatCount(35903), '35,903');
  assert.equal(formatCount(63), '63');
});

test('bareNote names only what the record holds', () => {
  assert.equal(bareNote(true, false), DECK.P23b);
  // Package 6 moved the link into the action row under the title, so the deck's "above" is true again.
  assert.equal(bareNote(true, true), DECK.P23);
  assert.ok(!/venue/.test(bareNote(false, true)) && !/venue/.test(bareNote(false, false)));
  for (const v of [true, false]) for (const l of [true, false]) assert.deepEqual(claimHits(bareNote(v, l)), []);
});

/* --- 2. provenance helper ------------------------------------------------------------ */

test('formatCheckDate prints D Mon YYYY and never guesses', () => {
  assert.equal(formatCheckDate('2026-07-21T11:43:52Z'), '21 Jul 2026');
  assert.equal(formatCheckDate('2026-07-20T00:23:15Z'), '20 Jul 2026');
  assert.equal(formatCheckDate('2026-09-05'), '5 Sep 2026');
  assert.equal(formatCheckDate('2026-01-31T23:59:59+09:00'), '31 Jan 2026');
  assert.equal(formatCheckDate('not a date'), 'not a date');
  assert.equal(formatCheckDate('2026-13-01'), '2026-13-01');
  assert.equal(formatCheckDate('21/07/2026'), '21/07/2026');
});

const BUCKET_A = {
  source: 'PDF full text',
  generator_model: 'claude-sonnet-5',
  verifier_model: 'claude-sonnet-5',
  verifier_verdict: 'clean',
  verified_at: '2026-07-21T11:43:52Z',
  source_url: 'https://arxiv.org/abs/2401.00001',
};
const DATE_NOTE = 'Verification date not recorded for this batch; provenance metadata backfilled 2026-07-19.';
const BUCKET_B = {
  source: 'PDF full text',
  generator_model: 'claude-opus-4-8[1m]',
  verifier_model: 'claude-opus-4-8[1m]',
  verifier_verdict: 'clean',
  date_note: DATE_NOTE,
};
const BUCKET_C = { ...BUCKET_B, verifier_verdict: 'minor_issues' };

test('provenance fixture A (dated, clean): P10a with the recorded date, no minor line', () => {
  const prov = reviewProvenance(BUCKET_A);
  assert.equal(prov.badge, DECK.P9);
  assert.equal(prov.summary, DECK.P10a);
  assert.ok(prov.summary.includes('the check was recorded on'));
  assert.equal(prov.minorIssues, null);
  assert.equal(prov.closing, DECK.P14);
  assert.deepEqual(
    prov.details.map((r) => [r.term, r.value]),
    [
      ['Model', 'claude-sonnet-5'],
      ['Source', 'The paper’s full text'],
      ['Check', 'A separate pass in which the same model compared the review with the paper’s text.'],
      ['Check result', 'Nothing flagged'],
      ['Check recorded', '21 Jul 2026'],
    ],
  );
  assert.equal(prov.details[0].mono, true);
  assert.equal(
    prov.details[0].note,
    'The exact identifier recorded for the model that wrote this review and then checked it.',
  );
  const all = provenanceStrings(prov).join('\n');
  assert.ok(!prov.summary.includes('claude-sonnet-5'), 'the raw id stays inside the disclosure');
  assert.ok(!all.includes(BUCKET_A.source_url), 'source_url is never shown');});

test('provenance fixture B (undated, clean): P10b, and the date note never leaks', () => {
  const prov = reviewProvenance(BUCKET_B);
  assert.equal(prov.summary, DECK.P10b);
  assert.equal(prov.minorIssues, null);
  const all = provenanceStrings(prov).join('\n');
  assert.ok(!/backfill/i.test(all), 'no backfill wording');
  assert.ok(!all.includes(DATE_NOTE) && !all.includes('2026-07-19') && !all.includes('19 Jul 2026'), 'no date_note text');
  assert.ok(!prov.summary.includes('claude-opus-4-8[1m]'));
  assert.ok(prov.details.some((r) => r.value === 'claude-opus-4-8[1m]'));
  assert.equal(prov.details.find((r) => r.term === 'Check recorded').value, 'Not recorded');
});

test('provenance fixture C (undated, minor issues): P10b plus the P11 line', () => {
  const prov = reviewProvenance(BUCKET_C);
  assert.equal(prov.summary, DECK.P10b);
  assert.equal(prov.minorIssues, DECK.P11);
  assert.equal(prov.details.find((r) => r.term === 'Check result').value, 'Minor issues flagged');
});

// The July 2026 batch as the exporter now ships it: the text it read, stated exactly.
const BUCKET_F22 = { ...BUCKET_A, source: SOURCE_FIRST_22 };
const BUCKET_F22B = { ...BUCKET_B, source: SOURCE_FIRST_22 };
const BUCKET_ABS = { ...BUCKET_B, source: SOURCE_ABSTRACT };

test('provenance for the 22-page batch: says the first 22 pages, never "full text"', () => {
  for (const [shape, sentence] of [[BUCKET_F22, DECK.P10f22a], [BUCKET_F22B, DECK.P10f22b], [BUCKET_ABS, DECK.P10abs]]) {
    const prov = reviewProvenance(shape);
    assert.equal(prov.summary, sentence);
    const all = provenanceStrings(prov).join('\n');
    assert.ok(!/full text/i.test(all), `no "full text" claim: ${all}`);
    assert.equal(prov.details.find((r) => r.term === 'Check').value, 'A separate pass in which the same model compared the review with that same text.');
  }
  assert.equal(
    reviewProvenance(BUCKET_F22).details.find((r) => r.term === 'Source').value,
    'The first 22 pages of the paper’s PDF (the whole paper, if shorter)',
  );
  assert.equal(reviewProvenance(BUCKET_ABS).details.find((r) => r.term === 'Source').value, 'The paper’s abstract (its PDF could not be fetched)');
});

test('provenance when writer and checker differ: names the checking model by its raw id', () => {
  const prov = reviewProvenance({ ...BUCKET_B, verifier_model: 'claude-sonnet-5', date_note: undefined });
  assert.equal(
    prov.summary,
    'Written by Claude from the paper’s full text, then checked against that text by claude-sonnet-5. The check date was not recorded.',
  );
  assert.ok(!prov.summary.includes('same model'));
  assert.deepEqual(
    prov.details.map((r) => r.term),
    ['Written by', 'Checked by', 'Source', 'Check', 'Check result', 'Check recorded'],
  );
  assert.equal(
    prov.details.find((r) => r.term === 'Check').value,
    'A separate pass in which claude-sonnet-5 compared the review with the paper’s text.',
  );
  for (const s of provenanceStrings(prov)) assert.deepEqual(claimHits(s), [], s);
});

test('provenance with nothing recorded: no check clause, no date, no throw', () => {
  for (const empty of [{}, undefined, null]) {
    const prov = reviewProvenance(empty);
    assert.equal(prov.summary, 'Written by a language model.');
    assert.ok(!/check/i.test(prov.summary) && !/recorded/i.test(prov.summary));
    assert.equal(prov.minorIssues, null);
    assert.deepEqual(prov.details, []);
    assert.equal(prov.badge, DECK.P9);
  }
});

test('provenance never invents: other ids, other sources, a stamp without a checker', () => {
  const other = reviewProvenance({ generator_model: 'gpt-x', verifier_model: 'gpt-x', source: 'PDF full text' });
  assert.ok(other.summary.startsWith('Written by a language model from the paper’s full text'), 'only claude-* is "Claude"');
  const noSource = reviewProvenance({ generator_model: 'claude-x', verifier_model: 'claude-x' });
  assert.equal(noSource.summary, 'Written by Claude, then checked by the same model. The check date was not recorded.');
  assert.equal(noSource.details.find((r) => r.term === 'Check').value, 'A separate pass in which the same model checked the review.');
  const stampOnly = reviewProvenance({ generator_model: 'claude-x', source: 'PDF full text', verified_at: '2026-07-21T11:43:52Z' });
  assert.equal(stampOnly.summary, 'Written by Claude from the paper’s full text.', 'no check is claimed without a checking model');
  const oddVerdict = reviewProvenance({ ...BUCKET_A, verifier_verdict: 'needs_work' });
  assert.equal(oddVerdict.details.find((r) => r.term === 'Check result').value, 'needs_work');
  assert.equal(oddVerdict.minorIssues, null);
});

test('every string the provenance helper produces passes the detectors', () => {
  const shapes = [
    BUCKET_A, BUCKET_B, BUCKET_C, BUCKET_F22, BUCKET_F22B, BUCKET_ABS, {}, undefined,
    { ...BUCKET_B, verifier_model: 'claude-sonnet-5' },
    { generator_model: 'gpt-x', verifier_model: 'gpt-x', source: 'PDF full text', verifier_verdict: 'minor_issues' },
  ];
  for (const shape of shapes) {
    for (const s of provenanceStrings(reviewProvenance(shape))) {
      assert.deepEqual(claimHits(s), [], s);
      assert.deepEqual(countProblems(s, null), [], s);
    }
  }
});

test('census: reviewProvenance over every published review', (t) => {
  if (!fs.existsSync(reviewsDir)) {
    t.skip(`atlas data absent (${reviewsDir} not found); ${ABSENT}`);
    return;
  }
  const shards = fs.readdirSync(reviewsDir).filter((f) => f.endsWith('.json')).sort();
  const TEXT_FIELDS = ['one_line_takeaway', 'key_finding', 'core_contribution', 'threat_model', 'limitations'];
  const tally = { rows: 0, dated: 0, undated: 0, minor: 0, exact: 0 };
  const problems = [];
  const noisy = [];
  for (const shard of shards) {
    for (const [id, review] of Object.entries(readJson(path.join(reviewsDir, shard)))) {
      tally.rows += 1;
      const p = review?.provenance ?? {};
      const prov = reviewProvenance(p);
      const strings = provenanceStrings(prov);
      const flag = (why) => problems.push(`${id}: ${why}`);
      for (const s of strings) for (const rule of claimHits(s)) flag(`[${rule}] ${s}`);
      if (prov.badge !== DECK.P9) flag(`badge "${prov.badge}"`);
      if (p.verified_at) {
        tally.dated += 1;
        if (!prov.summary.includes(formatCheckDate(p.verified_at))) flag('dated summary lacks its date');
        if (!prov.summary.includes('the check was recorded on')) flag('dated summary is not worded as recorded');
      } else {
        tally.undated += 1;
        if (!prov.summary.includes('The check date was not recorded.')) flag('undated summary does not say so');
      }
      if (strings.some((s) => /backfill/i.test(s))) flag('backfill wording');
      if (p.date_note && strings.some((s) => s.includes(p.date_note))) flag('date_note text shown');
      if ((prov.minorIssues !== null) !== (p.verifier_verdict === 'minor_issues')) flag('minor line disagrees with verdict');
      if (p.verifier_verdict === 'minor_issues') tally.minor += 1;
      if (p.generator_model && !prov.details.some((r) => r.value === p.generator_model)) flag('details lack the generator id');
      if (p.generator_model && p.generator_model === p.verifier_model && prov.summary.includes(p.generator_model)) {
        flag('raw model id in the summary line');
      }
      // The July 2026 models read at most 22 pages: none of their reviews may claim the full text.
      if (/^(claude-sonnet-5|claude-opus-4-8\[1m\])$/.test(p.generator_model ?? '') && p.source === 'PDF full text') {
        flag('July-batch review claims the full text (that pipeline read only the first 22 pages)');
      }
      // Today's shapes (claude-*, one model, a stated text) must give the deck sentence exactly.
      if (
        /^claude-/i.test(p.generator_model ?? '') &&
        p.generator_model === p.verifier_model &&
        (p.source === 'PDF full text' || p.source === SOURCE_FIRST_22)
      ) {
        const from = p.source === SOURCE_FIRST_22 ? SOURCE_FIRST_22 : 'the paper’s full text';
        const expected = p.verified_at
          ? `Written by Claude from ${from}, then checked against that text by the same model; the check was recorded on ${formatCheckDate(p.verified_at)}.`
          : `Written by Claude from ${from}, then checked against that text by the same model. The check date was not recorded.`;
        if (prov.summary === expected) tally.exact += 1;
        else flag(`summary "${prov.summary}"`);
      }
      for (const field of TEXT_FIELDS) {
        const value = review?.[field];
        if (typeof value === 'string' && stripPipelineNoise(value) !== value.trim()) noisy.push(`${id}.${field}`);
      }
    }
  }
  t.diagnostic(
    `census: reviewProvenance ran over ${formatCount(tally.rows)} published reviews in ${shards.length} shards: ` +
      `${formatCount(tally.dated)} dated, ${formatCount(tally.undated)} undated, ${tally.minor} with minor issues; ` +
      `${formatCount(tally.exact)} summaries equal the deck sentence exactly`,
  );
  t.diagnostic(`census: stripPipelineNoise changed ${noisy.length} review text fields`);
  assert.deepEqual(problems.slice(0, 25), [], `${problems.length} problems:\n${problems.slice(0, 25).join('\n')}`);
  assert.deepEqual(noisy, [], 'stripPipelineNoise removed text from published reviews');
  if (meta) assert.equal(tally.rows, meta.reviews, 'review rows vs meta.json reviews');
  else t.diagnostic('census: meta.json absent, row total not compared');
});

/* --- 3. links and review text ---------------------------------------------------------- */

// Independent copies of the patterns, so a weakened implementation still fails here.
const RAW_FILE = /\.pdf(?:$|[?#&])|\/download\b|viewcontent\.cgi|[?&]type=chapterpdf|\/pdf(?:\/|\?|$)|stamp\.jsp/i;
const RAW_FILE_EXTRA =
  /files\.osf\.io\/v\d+\/resources\/|\/bitstreams\/[^/?#]+\/content(?:$|[/?#])|\/ndownloader\/|\/download_pub(?:$|[/?#])|[?&]pdf=render(?:$|[&#])|get_pdf\.cgi|repository\.tudelft\.nl\/file\/|edepot\.wur\.nl\/\d+(?:$|[/?#])|\/servlets\/purl\//i;
const STUB_DOI = /^https?:\/\/(?:dx\.)?doi\.org\/10\.\d{4,9}\/[a-z]+\/?$/i;

test('landingUrl: the SPEC §14.1 fixtures', () => {
  const cases = [
    ['https://ijadsms.com/index.php/ijadsms/article/download/28/24', null],
    ['https://osf.io/download/fd3kn/', null],
    ['https://ink.library.smu.edu.sg/cgi/viewcontent.cgi?params=/context/sis_research/article/11279/&path_info=2503.18666v3.pdf', null],
    [
      'https://api.taylorfrancis.com/content/chapters/edit/download?identifierName=doi&identifierValue=10.1201%2F9781003743774-70&type=chapterpdf',
      'https://doi.org/10.1201/9781003743774-70',
    ],
    ['https://www.spiedigitallibrary.org/proceedings/Download?urlId=10.1117%2F12.3000000', 'https://doi.org/10.1117/12.3000000'],
    ['https://elib.spbstu.ru/dl/3/2026/vr/vr26-1746.pdf/info', 'https://elib.spbstu.ru/dl/3/2026/vr/vr26-1746.pdf/info'],
    ['https://arxiv.org/abs/2310.08419', 'https://arxiv.org/abs/2310.08419'],
    ['https://arxiv.org/pdf/2310.08419', null],
    ['https://doi.org/10.5281/zenodo', null],
    ['https://doi.org/10.31219/osf.io/szjkw', 'https://doi.org/10.31219/osf.io/szjkw'],
    [null, null],
  ];
  for (const [input, expected] of cases) assert.equal(landingUrl(input), expected, String(input));
});

test('landingUrl: file endpoints beyond the SPEC pattern, and pages that must stay', () => {
  const dropped = [
    'https://files.osf.io/v1/resources/39yw7/providers/osfstorage/69b8871fbeb3aa17caa7305e',
    'https://krex.k-state.edu/server/api/core/bitstreams/78974d06-5436-4eae-81ce-d425a0c3d0e2/content',
    'https://dr.lib.iastate.edu/server/api/core/bitstreams/a2266e3e-98bd-4998-8f23-4aef74b0d5d8/content#page=42',
    'https://figshare.mq.edu.au/ndownloader/files/66422663',
    'https://www.preprints.org/frontend/manuscript/0a3f0412bbef2d46e933db401ea449b6/download_pub',
    'https://europepmc.org/articles/pmc13299584?pdf=render',
    'https://access.heinonline.com/hol-cgi-bin/get_pdf.cgi?handle=hein.journals/arzjl58&section=10',
    'https://api.taylorfrancis.com/x/download?identifierValue=10.5281%2Fzenodo&type=chapterpdf',
    // Served application/pdf with %PDF- bytes when probed on 2026-10-04 (final review).
    'https://repository.tudelft.nl/file/File_2069fa55-2800-4268-9ede-0a2ca9b1c25f',
    'https://repository.tudelft.nl/file/File_a8c89a6c-84a6-4302-8fcb-615d19214437?preview=1',
    'https://edepot.wur.nl/721092',
    // NSF PAR's (and OSTI's) full-text file route.
    'https://par.nsf.gov/servlets/purl/10683896',
    'https://www.osti.gov/servlets/purl/1234567',
    'javascript:alert(1)',
    'ftp://example.org/paper',
    '',
    undefined,
  ];
  for (const u of dropped) assert.equal(landingUrl(u), null, String(u));
  const kept = [
    'https://elib.spbstu.ru/dl/3/2026/vr/vr26-4928.pdf/en/info',
    'https://doi.org/10.31235/osf.io/ph24v',
    'https://www.ndss-symposium.org/ndss-paper/shadow-attacks-hiding-and-replacing-content-in-signed-pdfs/',
    'https://openreview.net/forum?id=hTEGyKf0dZ',
    'https://dl.acm.org/doi/10.1145/3576915.3623106',
    'http://example.org/landing',
  ];
  for (const u of kept) assert.equal(landingUrl(u), u, u);
});

test('landingUrl over every node: no output is a file download or a stub DOI', (t) => {
  if (!fs.existsSync(nodesPath)) {
    t.skip(`atlas data absent (${nodesPath} not found); ${ABSENT}`);
    return;
  }
  const tally = { links: 0, kept: 0, rescued: 0, dropped: 0 };
  const bad = [];
  for (const node of readJson(nodesPath)) {
    if (!node.u) continue;
    tally.links += 1;
    const out = landingUrl(node.u);
    if (out === null) tally.dropped += 1;
    else if (out === node.u) tally.kept += 1;
    else tally.rescued += 1;
    if (out && (RAW_FILE.test(out) || RAW_FILE_EXTRA.test(out) || STUB_DOI.test(out) || !/^https?:\/\//i.test(out))) {
      bad.push(`${node.id}: ${out}`);
    }
  }
  t.diagnostic(
    `landingUrl over ${formatCount(tally.links)} recorded links: ${formatCount(tally.kept)} kept, ${tally.rescued} rescued to doi.org, ${tally.dropped} dropped`,
  );
  assert.deepEqual(bad, []);
});

test('stripPipelineNoise keeps genuine review sentences and drops pipeline plumbing', () => {
  const keep = [
    'Due to resource constraints, only a portion of the full Draper VDISC dataset was used for training.',
    'The attack is evaluated in a camera setting (where only a portion of the displayed image is photographed) with high success.',
    'We assume the attacker controls only a portion of the untrusted target data used for fine-tuning.',
    'Accuracy rose from 3.5 to 4.1 points on arXiv:2310.08419, e.g. on the hardest split.',
  ];
  for (const s of keep) assert.equal(stripPipelineNoise(s), s);
  assert.equal(stripPipelineNoise('Based on the provided excerpt, the method improves recall.'), '');
  assert.equal(stripPipelineNoise('I only had a portion of the paper, so results may be incomplete.'), '');
  assert.equal(
    stripPipelineNoise('The method improves recall. Based on the provided excerpt, the method improves recall. It is fast.'),
    'The method improves recall. It is fast.',
  );
  assert.equal(stripPipelineNoise('  Plain text.  '), 'Plain text.');
  assert.equal(stripPipelineNoise(''), '');
  assert.equal(stripPipelineNoise(undefined), '');
});

// Copy A1 says every review was "checked against that same text in a separate pass by the same model", and
// the per-review line says "Claude" only for ids starting with "claude-". Both are claims about the WHOLE
// payload, so a batch written by one model and checked by another (or by a non-Claude model) must fail here
// before it can publish. New batches are stamped from each agent's own transcript, never from a script map.
test('every published review was written and checked by the same Claude model (copy A1 depends on it)', (t) => {
  if (!fs.existsSync(reviewsDir)) {
    t.skip(`atlas data absent (${reviewsDir} not found); ${ABSENT}`);
    return;
  }
  const bad = [];
  const models = new Map();
  let rows = 0;
  for (const shard of fs.readdirSync(reviewsDir).filter((f) => f.endsWith('.json'))) {
    for (const [id, review] of Object.entries(readJson(path.join(reviewsDir, shard)))) {
      rows += 1;
      const p = review?.provenance ?? {};
      const g = p.generator_model;
      const v = p.verifier_model;
      models.set(g, (models.get(g) || 0) + 1);
      if (!g || !v) bad.push(`${id}: missing model id`);
      else if (g !== v) bad.push(`${id}: writer ${g} != checker ${v}`);
      else if (!/^claude-/.test(g)) bad.push(`${id}: ${g} is not a Claude model id`);
    }
  }
  t.diagnostic(`same-model check over ${formatCount(rows)} reviews; ${[...models].map(([m, n]) => `${m} x${n}`).join(', ')}`);
  assert.deepEqual(bad.slice(0, 10), [], `${bad.length} reviews break the same-model claim in copy A1`);
});
