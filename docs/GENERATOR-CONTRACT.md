# Generator contract for auto-generated articles

Audience: the author of the external daily pipeline (LLM draft + post-processing + commit) that pushes `Add N auto-generated article(s): …` commits to `main`.

Evidence base: 322 auto-generated articles (233 Paper Review, 75 News Digest, 14 Trend Report) added by 79 commits between 2026-03-28 (f81b2b9) and 2026-08-25 (6693f04), analysed **as first committed** (`git show <adding-sha>:<path>`), i.e. the generator's own output before any repo-side repair. Counts below are from those originals unless marked "at HEAD". "Observed" means measured in the output; "inferred" means the root cause is deduced from the output shape, not from the pipeline's code, which this repo does not have.

Status legend used throughout: **DONE** = not seen in generator output since the stated date; **OPEN** = still present in the most recent commits; **REPAIRED-RECURRING** = the repo rewrites it after the fact, but every new batch ships it again.

---

## 1. The one structural change

Two post-processing habits produce most of the damage, and both have the same fix. First, a regex runs over the finished markdown and escapes `$` when the next character is a digit. The corpus proves that is exactly the rule: 544 escaped `\$` are followed by a digit, 0 escaped openers precede a letter- or backslash-led LaTeX payload outside the separate whole-span regime (S8), while live openers are 3,444 letter/backslash-led vs 118 digit-led. That guard gets currency right (318 correct `\$25M`-style amounts in 93 files) and breaks every math span that starts with a number: 178 S1 spans in 36 files (May 34, Jun 1, Jul 125, Aug 18; last seen 2026-08-20, `\$10.34 \text{ ms}$`), 9 S2 spans where it hit a **closing** delimiter (`$\sim\$139ms`), plus 49 S1b `\$NN$` spans in 11 files through June. Stop escaping finished text with a regex. Tokenise the body first (fenced code, inline code, `$$` blocks, `$…$` spans, table cells), never touch a delimiter, and escape a literal dollar only outside math — or write `USD 25M` and never emit a literal dollar at all. Second, the model is allowed to transcribe structured data it was handed: Google News redirector URLs (2 truncated mid-token, Aug 18–19; 3 August digests use the raw URL as link text), arXiv identifiers (0 of 96 Paper Highlights items link arXiv since July, vs 129 links on 78 items in April), author lists (`Heng Li 0008` DBLP suffixes in `ai_security_digest__august_25_2026_adversarial_attacks__malw.md`), `/writing/<slug>` links (3 hallucinated, hyphenated slugs), and `src/data/articles-index.json` (75 of 79 commits wrote it in a foreign format). Render every one of those from the record you already hold — title, arXiv id, author list, publisher URL, slug — in code, and let the model write prose only.

Then run the repo's gate (section 2) before `git push`. Nothing in the repo blocks a bad push today by design ("content must never block a deploy", deploy.yml), so the only place a defect can be stopped is your side of the push.

---

## 2. Pre-push gate (run this, in this order)

Run from the repo root, on the checkout you are about to push, after the new `.md` and `.jpg` files are written and before `git commit`. Every command must exit 0.

```
npm ci                                                        # 0
npm run check:article -- <new .md files>                      # 0   per-article contract (scripts/check-generated-article.mjs)
npm run gate:content                                          # 0   = the next four lines
  npm run generate:index -- --strict                          # 0
  node scripts/lint-content.mjs --strict                      # 0
  node scripts/repair-math-delimiters.mjs --check             # 0   prints "No math delimiter repair needed."
  node scripts/repair-dead-links.mjs --check                  # 0   prints "No dead link repair needed."
npm test                                                      # 0
npm run build                                                 # 0
```

`check:article` takes the files you are about to commit and prints one `file:line: error|warn rule-id: message` per finding (`--json` for machine output, `--warnings-as-errors` to fail on warnings too). `gate:content` is corpus-wide and exits 0 on `main` today; your contract is that it still exits 0 with your files added.

What each command would have caught this month, and what it does not see:

- **`npm run check:article -- <files>`** — the per-article contract for exactly the rules the repo has no gate for today. Rule ids, with the count that put each one here: `fm.description` non-trivial and 60–399 chars (248/322 originals failed); `fm.tags` 1–6 (15 empty); `fm.attribution` — `paperUrl`/`paperAuthors` on Paper Review (233/233 missing); `body.h1` absent or byte-equal to `title` (211/322 lost their headline); `body.header-image` not re-embedded in the body (309/322, warn); `body.display-math` no single-line `$$…$$` (419 lines in 123 files); `body.html` no raw HTML (57 `<br>` lines in 16 files); `file.eol` + `file.trailing-newline` (322/322 missing); `file.slug`; `fm.headerImage` file exists and ≤300KB; `body.truncation` no line cut mid-markdown; `digest.news-link-form` no `[url](url)` link text and payload ≥40 chars; `digest.paper-links` every Paper Highlights section links arXiv (warn); `body.math` delegates to the repo's detector; `body.persona`, `body.cve`, `body.internal-links` mirror the lint rules so you see them before the push. On the five articles committed 2026-08-25 it reports 22 errors and 6 warnings. Everything in sections 3–6 that says "no repo gate" is this script's job.
- **`npm run generate:index -- --strict`** — exit 1 when the frontmatter-escape repair path fires or YAML fails to parse. Would have caught the 4 files (2026-07-14..07-18) with raw LaTeX backslashes in a quoted `description`, one of which (`statistically_undetectable_backdoors_in_deep_neural_networks.md`, e00dbce) killed the deploy (fixed by 417aef7). Zero since 2026-07-18. Note it rewrites `src/data/articles-index.json` — see section 3 for what to do with that file.
- **`node scripts/lint-content.mjs --strict`** — hard-fail in every mode: placeholder CVE ids (0 from the generator so far), dead `/writing/<slug>` links (3 in 2 digests, 2026-05-31 and 07-12), `<` in title/description, images >300KB without a ≤300KB `.webp` sibling (151 of 307 header images through 2026-07-21), AUTHORSHIP claims (`I previously proposed`, `My work on` — 3 files, all July), FAKE_STATS (`knowledge base of N papers` — 2 files). Fails only under `--strict`: frontmatter schema (unquoted or invalid `date`, `type` outside `KNOWN_ARTICLE_TYPES`, `description` ≥400 chars, case-insensitive duplicate slugs) and math-delimiter findings from `scripts/lib/math-delimiters.mjs` (`mixed-escaping` = S1/S2, `odd-dollar-count` per paragraph and per table cell = S5/S6, `prose-in-math`, and `fully-escaped-span` = S8, which now also flags `\$95.5\%$` and `\$768$`). Advisory only, never fails: missing `paperUrl` on an auto-era Paper Review, and EXPERIENTIAL_PERSONA phrases (`as a practitioner` ×36 files, `what excites me` ×32). Treat those two warnings as failures on your side; the repo cannot without going red on the legacy backlog.
- **`node scripts/repair-math-delimiters.mjs --check`** — exit 1 if any file would change. Rules R1–R4 rewrite S1 (`\$336 \times 336$`, `\$95.5\%$`, `\$768$`, `\$694 / 149 / 149$`), S2 (`$\pm\$0.00`), S3 (`\$$` display fence, 4 lines in 1 file, 2026-07-18) and S8 (`\$Y = F(X; \theta)\$`, both delimiters). Would have edited 44 of the 322 originals; the corpus is at 0 as of 3230f4a (2026-08-26).
- **`node scripts/repair-dead-links.mjs --check`** — exit 1 if any Google News redirector payload is shorter than 40 chars (the truncated links of Aug 18–19; issue #56, repaired in 9bad71e).
- **`npm test`** — the repo's own tooling invariants (13 suites under `tests/`). It never reads your articles; it is here so a broken checkout does not masquerade as a clean gate.
- **`npm run build`** — runs `optimize-images`, `repair-authorship`, `repair-math-delimiters`, `repair-dead-links`, non-strict lint, OG-image generation, `next build`, RSS, and the résumé PDF. The repair steps **write** to `src/content/articles/` and `public/images/news/`. After it exits 0, run `git status --porcelain -- src/content public/images` and require it empty: any diff means the build had to fix something you shipped, and the earlier gates should have reported it.

---

## 3. File and commit contract

- **Filename** = `<slug>.md`, `slug` matches `^[a-z0-9_]{1,60}$`. Keep the current derivation for URL stability (lowercase; strip everything outside `[a-z0-9 ]`; spaces to `_`; hard cut at 60 — observed on all 322: 223 exactly 60 chars, 30 ending in `_`, 89 containing `__`). Digest slugs since 2026-08-02 carry a topic suffix (`ai_security_digest__august_25_2026_adversarial_attacks__malw`); keep that, it is what stops two digests on one day colliding.
- **Encoding**: UTF-8 without BOM, LF line endings, exactly one trailing `\n`. 322/322 originals lack the trailing newline; 0 CRLF, 0 BOM, 0 control characters. The missing newline is what turned a Windows checkout with `core.autocrlf` into ~100 phantom repairs (b217dca, 2026-08-18).
- **Never modify an existing article.** Before writing, if `src/content/articles/<slug>.md` exists (compare case-insensitively — the Linux export serves slugs case-sensitively, so two casings are two routes), skip the article and log it. Two generator commits overwrote existing files: bdf8141 (2026-03-30, second commit of the day rewrote that day's digest) and 4c824c7 (2026-07-21, 226-line diff to `beyond_success_rate_costaware_evaluation_of_offensive_and_de.md` first added 2026-07-18). deploy.yml has a tripwire that alerts and files an issue on `git diff --diff-filter=M HEAD~ HEAD -- src/content/articles/`; it does not stop the deploy. Your check: that diff is empty in your commit.
- **Exactly one commit per day**, message `Add N auto-generated article(s): <titles…>`, containing only new `.md` files and their `public/images/news/<slug>.jpg`. Two days had two commits (2026-03-28, 03-30). Push before 18:41 UTC — that is when content-autorepair.yml runs (pushes land at 17:05–17:22 UTC today).
- **Commit the header image in the same commit as the article.** e2245ca (2026-07-17) shipped 10 articles with no `headerImage` at all (13 in total across the corpus); 24 early images were `.png` at a non-convention path (2026-03-30..05-24, all since replaced). If image generation fails, the article fails — do not ship without it.
- **Do not write `src/data/articles-index.json`.** 75 of 79 generator commits did, in a format the site does not produce: 751 `\uXXXX` escapes in 6693f04's copy vs 0 in the repo generator's, `searchContent` missing on 36 of 357 entries (every entry added 2026-08-19..08-25), plus description inference skipped. content-autorepair.yml has to list the file in `REPAIR_PATHS` just to keep recommitting the regenerated version. Either omit the file (deploy.yml regenerates it on every run) or commit the byte-identical output of `npm run generate:index` (UTF-8, 2-space indent, trailing newline, `searchContent` on every entry). Check: `npm run generate:index && git diff --exit-code -- src/data/articles-index.json` exits 0.

---

## 4. Frontmatter contract

General rules, all three types:

- Every value is a double-quoted YAML scalar (or a flow sequence for `tags`). `title` and `description` are plain text: **no backslash, no `<`**. If a value must contain `\` or `"`, serialize it with a JSON encoder (`json.dumps` / `JSON.stringify`); the site tolerates only `\\` and `\"` as escapes (`scripts/lib/frontmatter-escapes.mjs`). Strip inline LaTeX from summary fields before they reach the frontmatter — the 4 broken files of July 2026 were descriptions cut at 200 chars through a `$\theta$`.
- `date`: quoted `"YYYY-MM-DD"`, a real calendar date. Unquoted dates parse as Date objects and break provenance detection. 322/322 currently correct — keep it that way.
- `type`: exactly one of `"Paper Review"`, `"News Digest"`, `"Trend Report"`. 322/322 currently correct.
- `description`: one or two complete sentences, **60–399 characters** (target 120–160), ending in `.`, `!` or `?`, not equal to the title, no trailing `...`/`…`, no `<`, no backslash. 248 of 322 originals fail this (`isTrivialDescription` in `scripts/lib/extract-frontmatter.mjs`; a second sweep with the same rule counted 246): 248 without terminal punctuation, 28 equal to the title, 26 under 60 chars, 0 at or over 400 (max 331). 109 are exactly 200 characters — a `summary[:200]` slice (`…probability of membership via proba`, 8d89fc4), used May–July. August switched to a model-written one-liner with no length or sentence constraint (47–56-char fragments without a period; all 69 August Paper Reviews lack a terminal period; `a_certified_unlearning_approach_without_access_to_source_dat.md` dated 2026-08-21 still has `description == title` at HEAD). Never truncate by character count; cut at a sentence boundary, and if no summary is available fail the article rather than fall back to the title. Generator-side check: `isTrivialDescription(description, title)` returns `false` and `60 <= length < 400`.
- `tags`: flow sequence of 1–6 non-empty title-cased strings from the site's vocabulary (`"Prompt Injection"`, `"Watermarking"`, `"Privacy"`, …; see `TAG_VOCAB` in `scripts/lib/extract-frontmatter.mjs`). Never `[]` — 15 originals shipped empty (Apr 6, May 7, Jul 2; none since 2026-07-14).
- `readingTime`: integer minutes (observed 4–11).
- `headerImage`: `"/images/news/<slug>.jpg"` — JPEG, ≤300KB (307,200 bytes), ≤1600px wide, committed with the article. Never PNG for photographic/AI art. 187 of 343 automation images (55%) exceeded 300KB at commit, max 1,790KB (`ai_security_digest__april_12_2026.png`, 5eeb3eb); encoder settings changed 2026-07-22 and every image since is ≤238KB. There is no explicit cap in the pipeline (inferred) — add one: re-encode at lower quality until `size <= 307200`, or emit a same-basename `.webp` ≤300KB alongside.
- Key order as currently emitted: `title, date, type, [paperUrl, paperAuthors,] description, tags, readingTime, headerImage`. The repo's backfill places `paperUrl`/`paperAuthors` directly after `type`; do the same.

### Paper Review

```yaml
---
title: "A Certified Unlearning Approach without Access to Source Data"
date: "2026-08-21"
type: "Paper Review"
paperUrl: "https://arxiv.org/abs/2506.06486"
paperAuthors: "Umit Yigit Basaran, Sk Miraj Ahmed, Amit Roy-Chowdhury, et al."
description: "The authors derive a certified unlearning bound that needs no access to the original training data, replacing it with a surrogate dataset and a noise calibration step."
tags: ["Privacy", "Machine Unlearning"]
readingTime: 5
headerImage: "/images/news/a_certified_unlearning_approach_without_access_to_source_dat.jpg"
---
```

- `paperUrl` — **required.** `"https://arxiv.org/abs/<id>"`, version-less, using the id you fetched the paper with; DOI or venue URL if the paper is not on arXiv. 233 of 233 auto Paper Reviews were committed without it (every batch through 6693f04, 2026-08-25); 0 of the 233 original bodies contain an arXiv URL anywhere. The repo backfills by arXiv title search (`scripts/backfill-paper-attribution.mjs`, ≥0.85 match): 213 recovered, 20 still unattributed because their titles match no arXiv record exactly (e.g. `understanding_miniapp_malware_identification_dissection_and_.md`, `vapd_an_anomaly_detection_model_for_pdf_malware_forensics_wi.md`). Only you hold the id at generation time.
- `paperAuthors` — **required.** A string in the form the repo's backfill already writes to 220 files: first three authors, `", et al."` when there are more. Strip DBLP disambiguation numbers everywhere (`Heng Li 0008` → `Heng Li`, `Yuqing Yang 0003` → `Yuqing Yang`); they are in the 2026-08-25 digest body today.
- `title` — the paper's title, or a punchier headline. Whichever you choose is the only headline that survives (see the H1 rule in section 5).

### News Digest

```yaml
---
title: "AI Security Digest — August 25, 2026: Adversarial Attacks & Malware"
date: "2026-08-25"
type: "News Digest"
description: "This digest covers advanced adversarial attacks on ML models and new trends in sophisticated malware, including Android and miniapp threats."
tags: ["Adversarial Attacks", "Malware Analysis", "LLM Security", "Android Security"]
readingTime: 5
headerImage: "/images/news/ai_security_digest__august_25_2026_adversarial_attacks__malw.jpg"
---
```

The 2026-08-25 description above is one of the few that passes as-is (complete sentence, 140 chars, not the title); early digests fell back to the title (28 cases).

### Trend Report

```yaml
---
title: "This Week in AI Security — August 23, 2026"
date: "2026-08-23"
type: "Trend Report"
description: "This week's AI security roundup covers advanced RAG manipulation, including Topic-FlipRAG and PoisonedEye, alongside new research on model backdoors."
tags: ["RAG", "LLM Security", "Adversarial Attacks", "Data Poisoning"]
readingTime: 4
headerImage: "/images/news/this_week_in_ai_security__august_23_2026.jpg"
---
```

`title` must keep the `This Week in AI Security` prefix: `scripts/lib/provenance.mjs` treats that prefix as auto-generated regardless of `type`.

---

## 5. Body contract

**H1.** Emit no `# ` heading at all (the page template renders `title`), or make it byte-equal to `title`. 317 of 322 originals carry an H1 and 211 differ from the title (May 34, Jun 4, Jul 112, Aug 61) — e.g. title `Adversarial Perturbations Are Formed by Iteratively Learning Linear Co…` with H1 `RisingAttacK: Learning Ordered Top-K Perturbations via Singular Vector` (f9c6998). The renderer (`remarkStripDuplicateTitle`, `src/lib/markdown.ts`) drops the first H1 of every auto article unconditionally, so the model's headline is discarded and cannot be recovered later. If you want the headline, put it in `title:`.

**Header image.** Do not repeat `![…](/images/news/<slug>.jpg)` as the first body line (309/322 do); the template renders `headerImage`. The figure caption line (`*Figure from the paper … (p. 7)*`) may stay.

**Headings.** Pin one `##` set per type and validate it before writing; the template has been edited at least six times (Mar–May digests used `Executive Summary` + `Research Highlights`, July onward `Paper Highlights`). The sets in the 2026-08-25 commit are the ones to pin:

- Paper Review: `## TLDR`, 3–4 topical sections, `## Limitations`, `## What practitioners should do`, `## Verdict`, `## Den's Take`.
- News Digest: `## Paper Highlights`, `## Industry & News`, `## What to Watch`, `## Den's Take`.
- Trend Report: 3–4 topical sections, `## By the Numbers`, `## Looking Ahead`, `## Den's Take`.

`## TLDR` (no semicolon) is fine — `scripts/lib/extract-frontmatter.mjs` now lists `tldr` as a summary heading, so the paragraph under it is what the site uses when it has to reconstruct a description.

**Math — S1 to S8.** All eight shapes were measured on the originals; every one of S1/S2/S3/S5/S8 is present in the adding commit and absent from the repo's own edits.

| Id | Shape (bad) | Write instead | Count in originals |
|---|---|---|---|
| S1 | `(a solid black \$336 \times 336$ RGB image)` — escaped opener, live closer; the closer pairs with the next `$` and prose renders as an equation | `$336 \times 336$` | 178 spans in 36 files (92 in table cells, 86 in paragraphs); May 34, Jun 1, Jul 125, Aug 18; last 2026-08-20 |
| S1c | `\$95.5\%$` | `$95.5\%$` | 46 of the 178 above |
| S1b | `\$25$` (whole span is a bare number) | `$25$`, or just `25` | 49 spans in 11 files; May 46, Jun 3; none since June |
| S2 | `$\sim\$139ms`, `$\pm\$0.00`, `a 4$\times\$6 matrix` — escaped **closer** because a digit follows; KaTeX parse error | `$\sim 139\,\text{ms}$` or `~139 ms`; `$4 \times 6$` | 9 in 5 files; May 1, Jul 8 |
| S3 | `$$\ z' = m \times z \quad \ldots \$$` — backslash on a `$$` fence | fenced block (see below) | 4 lines, 1 file (7744402, 2026-07-18) |
| S4 | `$$bH_{Dr} = nH_{Ds} - mH_{Du}$$` on one line; `   $$\mathcal{G} = …$$` indented under a list item; `$$` inside a table cell | fenced block; `$…$` inside list text and cells | 419 lines in 123 files (May 22, Jun 3, Jul 81, Aug 17 files); 77 indented; 3 in table cells; 6693f04 (2026-08-25) still adds one. **0** bare `$$` fence lines exist in all 322 originals |
| S5 | `\| **MR1** \| 89 (SQLi) \| Tautology inject. \| $\|f(x')\| \le \|f(x)\|$ \|` — bare `\|` inside math in a GFM cell splits the row | `$\lvert f(x') \rvert \le \lvert f(x) \rvert$`, or escape every pipe inside the span as `\|` | 2 files |
| S6 | `\\$2B` (double-escaped, renders a visible backslash); bare `$15M` outside math | `USD 2B` preferred; `\$2B` only outside math and never re-escaped | `\\$` 12 in 6 digests/reports 2026-03-29..04-05, none since; bare `$` 2 in 1 file (2026-03-28); 318 correct `\$` amounts in 93 files |
| S7 | `90\%` in prose, `\[28\]`, `T-MAP\*`, `\~9.7GB`, `**` inside a math span | `90%`, `[28]`, `T-MAP*`, `~9.7GB`; emphasis outside math | `\%` 36 in 14 files; `\[n\]` 80 in 5 files (all July); `\*` 23 in 5 files; harmless to rendering |
| S8 | `as a function \$Y = F(X; \theta)\$, where \$X\$ represents` — both delimiters escaped; readers see raw `$Y = F(X; \theta)$` | `$Y = F(X; \theta)$` | 77 spans in 13 files (Apr 4, May 65, Jul 8); none in Aug; the 62 that survived at HEAD (one review carried 54) were repaired in 3230f4a, 2026-08-26 |

The rules that follow from the table:

1. Do not escape `$` with a regex over the finished text (S1, S1b, S1c, S2). Tokenise first; delimiters of a math span are never escaped, regardless of what character follows them.
2. Remove any prompt-level instruction to "escape dollar signs" (S8 — a digit regex cannot produce `\$Y`, so this is a second regime, most likely a prompt instruction active in the digest/trend prompt and some May Paper Review runs). Never emit `\$` immediately followed by a backslash, a letter, `{`, or a space.
3. Per paragraph and per table cell, the unescaped `$` count must be even.
4. Display math is exactly: blank line, a line containing only `$$`, the LaTeX line(s), a line containing only `$$`, blank line — all at column 0, never inside a list item or blockquote (end the list first), never in a table cell. Never content on the same line as a fence, never a backslash before a fence.

```
$$
bH_{Dr} = nH_{Ds} - mH_{Du}
$$
```

5. Currency: prefer `USD 25M`. If a dollar sign must appear it is `\$25M`, outside math, and you check the preceding byte is not already `\`.
6. Inside a table row, every `|` that is part of math is `\|` or `\lvert … \rvert`.
7. Outside math, do not escape `%`, `~`, `[`, `]`, `*` unless the character would otherwise start Markdown syntax; inside math use LaTeX escapes only and never Markdown emphasis.

**Tables.** One table row per line of data. No `<br>` — remark-rehype runs without `allowDangerousHtml`, so the tag is silently dropped and `AUROC <br> TPR@5%` renders as `AUROC  TPR@5%`. 57 `<br>` lines in 16 files (May 5, Jul 12, Aug 1); nothing in the repo repairs or reports them.

**No raw HTML** anywhere outside code fences and code spans, for the same reason (`<div>`, `<span>`, `class=` attributes included).

**Voice.** Neutral third person in every section, including `## Den's Take`. Never `I/my/our` ownership of any work (`I previously proposed`, `My work on` — 3 files, July 2026, hard-fail in lint), never lived experience (`as a practitioner` ×36 files, `what excites me` ×32, `in my experience` ×2, `my analysis of` ×3; by month Mar 1, Apr 9, May 18, Jun 1, Jul 34, **Aug 0**), never cross-article "prior research", never a corpus statistic that was not computed from data (`knowledge base of N papers`, `averaging N citations` — 2 files, July). Run the `AUTHORSHIP`, `EXPERIENTIAL_PERSONA` and `FAKE_STATS` regexes from `scripts/lint-content.mjs` on the draft and regenerate on any hit. August output is clean; keep the constraint in the prompt.

**Internal links.** Emit `/writing/<slug>` only when `<slug>` is taken verbatim from `src/content/articles/` in the checkout or from a review generated in the same run. The 3 dead links (`/writing/indirect-prompt-injection-runtimes`, `/writing/multi-agent-jailbreaks` in the 2026-05-31 digest; `/writing/claude-safety-evaluation-evasion` on 2026-07-12) are hyphenated guesses — real slugs use underscores. 135 other auto articles link 177 distinct real slugs correctly, so the lookup works when it is used. Dead links hard-fail the build.

**CVE ids.** Only ids that appear verbatim in the source paper/article. Placeholder patterns (`CVE-YYYY-1234`, `-0000`, `-9999`, …) hard-fail the build in every mode. The generator has emitted 0 so far.

**Author names.** Strip DBLP disambiguation suffixes (`Zhiqiang Lin 0001`) wherever an author list is rendered.

---

## 6. Digest and trend-report contract

**News items are rendered from data, not by the model.** Fixed template, one line per item:

```
- **[<title>](<url>)** (<publisher>) — <one-sentence summary>
```

The model supplies `<one-sentence summary>` only. The link markup has drifted month to month: `**[title](url)**: summary` in April, and in August (86220e3, 8cd8a28, e58f227) `**title** ([https://news.google.com/rss/articles/CBMi…](https://news.google.com/rss/articles/CBMi…))` — the raw redirector URL as link text, producing 600–900-character lines. The 2026-08-25 digest at HEAD has no links at all in Industry & News (`<title> — (<publisher>) — <summary>`, plain text). Never use a URL as link text.

**URL validation before writing.** Each item's `url` must match

```
^https://news\.google\.com/rss/articles/[A-Za-z0-9_-]{40,}\?oc=5
```

or be a resolved publisher URL. Prefer the publisher URL (resolve the redirector at generation time, or store both) so the link does not depend on Google's opaque token; the redirector returns HTTP 400 forever once the payload is truncated. Two payloads were emitted truncated mid-token (`…CBMinAFBVV95cUxOQ`, digests of Aug 18 and 19, both the **last** item of the section, consistent with a clipped input list rather than clipped output). If validation fails, emit the headline as bold text with no link and log the item. Every `[` must have a matching `](…)` closed on the same line. Payload lengths observed on 300 valid occurrences: 100–299 chars for 220 of them, up to 699.

**Never write a truncated response.** Check `finish_reason` (or the SDK equivalent) and that the last line is complete; a response that hit the output-token limit is regenerated, not written.

**Section presence.** A digest carries 2–9 news items (4 in 32 digests, 3 in 18, 5 in 13); 5 digests shipped with 0 redirector links. Omit `## Industry & News` rather than emit it with zero linked items.

**Paper Highlights.** Render each item from the same structured record you used for that day's Paper Review:

```
- **[<title>](https://arxiv.org/abs/<id>)** — <authors>. <summary> ([review](/writing/<slug>))
```

where `/writing/<slug>` is the review generated in the same run. Since July every paper mention is plain text: 2026-03 8 arXiv links on 9 items, 2026-04 129 on 78, 2026-05 65 on 81, **2026-07 0 on 53, 2026-08 0 on 43**. The id is available — the same step selects the papers from arXiv. Omit `## Paper Highlights` entirely when the run reviewed 0 papers. Check: the count of `arxiv.org/abs/` in the section equals the number of items.

**Trend Report** (`This Week in AI Security — <Month D, YYYY>`, weekly). Same link rules for any paper or news reference. `## By the Numbers` may contain only figures computed from the week's data; `knowledge base of N papers` in `this_week_in_ai_security__july_12_2026.md` (27a319c) is the FAKE_STATS pattern that hard-fails the build.

---

## 7. Status table

Counts are at generation (original commit) over the 322 auto articles unless stated. "Gate" = what stops it today; "none" means no repo-side gate — only `npm run check:article` (which you run before pushing) catches it.

| Defect class | Shape | Count at generation | First / last seen | Status | Gate today |
|---|---|---|---|---|---|
| S1 digit-led escaper | `\$336 \times 336$`, `\$95.5\%$` | 178 spans / 36 files (May 34, Jun 1, Jul 125, Aug 18) | 2026-05 / 2026-08-20 | REPAIRED-RECURRING (de4e371, 9bad71e) | `repair-math-delimiters --check`; `lint --strict` (mixed-escaping) |
| S1b bare-number span | `\$25$`, `\$768$` | 49 spans / 11 files | 2026-05 / 2026-06 | DONE since July (regime change); residue repaired 3230f4a | `repair-math-delimiters --check` (R1 numeric); `lint --strict` (mixed-escaping) |
| S2 escaped closer | `$\sim\$139ms` | 9 / 5 files | 2026-05 / 2026-07 | not seen in Aug; same escaper, so OPEN until S1 is fixed | `repair-math-delimiters --check` (R2); `lint --strict` |
| S3 escaped `$$` fence | `$$\ … \$$` | 4 lines / 1 file | 2026-07-18 / 2026-07-18 | single occurrence | `repair-math-delimiters --check` (R3) |
| S4 single-line display math | `$$…$$` on one line, indented, in cells | 419 lines / 123 files; 77 indented; 3 in cells | 2026-05 / 2026-08-25 | OPEN (renderer normalises; source stays wrong) | none |
| S5 bare pipe in table math | `$\|f(x)\|$` in a cell | 2 files | 2026-05 / 2026-07 | repaired de4e371 | `lint --strict` (odd-dollar-count per cell) |
| S6 currency double-escape | `\\$2B` | 12 / 6 files | 2026-03-29 / 2026-04-05 | DONE since 2026-04-05 | `lint --strict` (odd-dollar-count) |
| S8 whole-span escape | `\$Y = F(X;\theta)\$` | 77 spans / 13 files (Apr 4, May 65, Jul 8); 62 survived at HEAD until 2026-08-26 | 2026-04-01 / 2026-07 | not seen in Aug; residue repaired 3230f4a — OPEN until the prompt instruction is removed | `repair-math-delimiters --check` (R4); `lint --strict` (fully-escaped-span) |
| Raw HTML `<br>` in tables | `AUROC <br> TPR` | 57 lines / 16 files (May 5, Jul 12, Aug 1) | 2026-05 / 2026-08 | OPEN; not repairable (tag already dropped) | none |
| Trivial / truncated description | 200-char slice; fragment; `== title` | 248 / 322 (248 no terminal punct., 28 == title, 26 < 60 chars, 109 exactly 200) | 2026-05 / 2026-08-25 | OPEN (render-time substitute only) | `lint --strict` only at ≥400 chars |
| Backslash in quoted frontmatter | `"…$\theta$…"` | 4 files (2 YAML errors, 2 silent mangles) | 2026-07-14 / 2026-07-18 | DONE since 2026-07-18 | `generate:index --strict`; `lint` (hard-fail) |
| Empty `tags: []` | | 15 (Apr 6, May 7, Jul 2) | 2026-04 / 2026-07-14 | DONE since 2026-07-14 | none (inferred at render) |
| Missing `paperUrl` / `paperAuthors` | | 233 / 233 Paper Reviews | 2026-03-28 / 2026-08-25 | REPAIRED-RECURRING (backfill bot; 20 unmatched) | `lint` advisory only |
| First-person authorship | `I previously proposed`, `My work on` | 3 files | 2026-07-12 / 2026-07-14 | DONE since ~2026-07-24 | `lint` (hard-fail); `repair-authorship` |
| Experiential persona | `as a practitioner`, `what excites me` | 63 files (Mar 1, Apr 9, May 18, Jun 1, Jul 34, Aug 0); a second sweep counted 73 | 2026-04-01 / 2026-07 | DONE since ~2026-07-24 | `lint` advisory only |
| Fabricated corpus stats | `knowledge base of N papers` | 2 files | 2026-07-12 / 2026-07-14 | DONE since July | `lint` (hard-fail) |
| Dead `/writing/<slug>` links | hyphenated guesses | 3 links / 2 files | 2026-05-31 / 2026-07-12 | DONE since 2026-07-12 | `lint` (hard-fail) |
| Placeholder CVE ids | `CVE-2024-1234` | 0 from generator | — | never occurred | `lint` (hard-fail) |
| Body H1 ≠ title | headline lost | 317 with H1, 211 differ (May 34, Jun 4, Jul 112, Aug 61) | 2026-05 / 2026-08-25 | OPEN; not repairable (H1 discarded at render) | none |
| Header image repeated in body | `![title](/images/news/…)` first line | 309 / 322 | 2026-03 / 2026-08-25 | OPEN (alt blanked at render) | none |
| Header image >300KB | up to 1,790KB | 187 / 343 images (Mar 2, Apr 14, May 47, Jun 4, Jul 84, Aug 0 articles) | 2026-03-28 / 2026-07-21 | DONE since 2026-07-22 (max 238KB since) | `lint` (hard-fail without `.webp` sibling) |
| Missing `headerImage` | | 13 articles (10 in e2245ca) | 2026-07-17 batch | not seen since July | none (`lint` skips missing files) |
| Non-convention `.png` image path | | 24 | 2026-03-30 / 2026-05-24 | DONE | — |
| Slug collision overwrote article | modified existing `.md` | 2 commits | 2026-03-30 / 2026-07-21 | not seen since July; no dedupe evidenced | deploy.yml tripwire (alert only) |
| Generator writes `articles-index.json` | `\u` escapes, no `searchContent` | 75 / 79 commits | 2026-03-29 / 2026-08-25 | OPEN (deploy regenerates; bot recommits) | none |
| Truncated redirector link | payload cut mid-token | 2 links / 2 digests (a second sweep counted 1) | 2026-08-18 / 2026-08-19 | REPAIRED (9bad71e) | `repair-dead-links --check` |
| URL as link text | `[https://news.google…](https://news.google…)` | 3 digests | 2026-08 / 2026-08 | OPEN | none |
| Paper Highlights without arXiv link | plain-text paper items | 0 links on 96 items since July (vs 129 on 78 in April) | 2026-07 / 2026-08-25 | OPEN; not repairable | none |
| DBLP author suffixes | `Heng Li 0008` | present in the 2026-08-25 digest (not counted) | — / 2026-08-25 | OPEN | none |
| No trailing newline | | 322 / 322 | 2026-03-28 / 2026-08-25 | OPEN | none |

---

## 8. What the repo does for you in the meantime

The build chain (`npm run build`) runs `optimize-images`, `repair-authorship`, `repair-math-delimiters` and `repair-dead-links` before linting, and the renderer strips the duplicate H1, normalises single-line `$$`, substitutes a body-derived description when yours is trivial, infers tags when yours are empty, and repairs frontmatter escapes. content-autorepair.yml runs at 18:41 UTC daily (`generate:index`, `repair-math-delimiters`, `repair-dead-links`, then an arXiv attribution backfill, then a strict lint safety gate that files or refreshes a manual-repair issue and pings ntfy) and commits what it changed. None of this substitutes for the gate in section 2: the source stays wrong from your push (~17:05–17:22 UTC) until the bot runs, and forever when the bot cannot match (20 Paper Reviews still have no `paperUrl` because their titles match no arXiv record); the two escaping regimes are only heuristically repairable — the strict lint stayed red on every Dependabot PR 2026-08-20..08-26 over one `\$10.34 \text{ ms}$`, and the S8 residue shipped unrendered for three months before a rule existed for it; and some defects cannot be repaired after the fact at all — the 211 discarded headlines, the 96 Paper Highlights items with no arXiv link, the 57 `<br>` line breaks that remark already dropped.
