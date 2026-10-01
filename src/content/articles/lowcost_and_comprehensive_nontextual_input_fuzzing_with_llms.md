---
title: "Low-Cost and Comprehensive Non-textual Input Fuzzing with LLM-Synthesized Input Generators"
date: "2026-10-02"
type: "Paper Review"
description: "Uses LLMs to synthesize Python generators for non-textual inputs"
tags: ["Fuzzing"]
readingTime: 5
headerImage: "/images/news/lowcost_and_comprehensive_nontextual_input_fuzzing_with_llms.jpg"
paperUrl: "https://www.usenix.org/system/files/usenixsecurity25-zhang-kunpeng.pdf"
---

![Low-Cost and Comprehensive Non-textual Input Fuzzing with LLM-Synthesized Input Generators](/images/news/lowcost_and_comprehensive_nontextual_input_fuzzing_with_llms.jpg)
*Figure from the paper “Low-Cost and Comprehensive Non-textual Input Fuzzing with LLM-Synthesized Input Generators” (p. 7)*

# G2FUZZ: Hybrid Fuzzing Augmentation via LLM-Synthesized Input Generators

## TLDR
* **What**: Uses LLMs to synthesize Python generators for non-textual inputs.
* **Who's at risk**: Software accepting complex binary formats (TIFF, MP4, PDF).
* **Key number**: G2FUZZ has discovered 10 unique bugs in the latest real-world software, of which 3 are confirmed by CVE.

## Bridging the Gap Between LLMs and Non-Textual Inputs
Modern software relies on inputs with highly complex grammars, demanding specialized greybox fuzzing to uncover security bugs. Existing methods struggle when inputs are non-textual—like images, videos, or PDFs—because general-purpose Large Language Models (LLMs) are often incapable or too costly to generate these formats directly. Furthermore, even structure-aware fuzzers often fail to capture complex features within binary formats, focusing only on basic structural fields like checksums. While some prior work has shown LLMs can generate textual inputs, the gap remains for high-quality, grammar-aware fuzzing over binary data. This paper attacks this limitation by reframing the problem: instead of asking the LLM to output the complex binary file, they ask the LLM to synthesize the *code* that generates the file. This shifts the burden from direct non-textual generation to code synthesis, which LLMs handle well.

## Holistic Search via Input Generator Synthesis
The core innovation of G2FUZZ is its hybrid strategy, which combines a "holistic search" driven by LLMs with a "local search" driven by traditional fuzzers like AFL++. The LLMs are leveraged to automatically synthesize input generators, which are Python scripts customized to the specific features and grammar of the target format (e.g., TIFF). This synthesis capability allows G2FUZZ to "jump out of local optima," a weakness of purely mutation-based fuzzers. The LLM-generated generators produce seeds exhibiting diverse structures and features that might otherwise be unreachable. The paper demonstrates this capability by showing that LLMs can construct a generator to implement LZW compression for TIFF using only 3 lines of code. This ability to rapidly create diverse starting points is what provides the synergistic effect over standard fuzzing tools.

## Local Search Driven by AFL++ Mutation
Once the LLMs provide diverse seeds via their generated scripts, the process delegates fine-grained exploration to industrial-quality fuzzers. G2FUZZ executes these generators to yield non-textual inputs, which are then subjected to mutation by AFL++. The system operates cyclically: the local search continues until new code coverage is not found, at which point G2FUZZ switches back to the holistic search to synthesize new, distinct input generators. This tight coupling—LLMs for macro-level exploration and AFL++ for micro-level refinement—is key to efficiency. The cost model is also a design feature: LLMs are invoked only when necessary to synthesize new generators, substantially reducing usage overhead.

## Limitations
The paper focuses on augmenting mutation fuzzing and does not address threats where the target software rejects the generator scripts themselves. A key assumption is that the Python libraries required to construct complex features are present in the LLM's training data, which may not hold for proprietary or highly niche formats. Furthermore, the initial synthesis of generators can still suffer from the "tail phenomena," where LLMs produce many similar samples, limiting the initial diversity before AFL++ takes over.

## What practitioners should do
* When fuzzing binary formats, consider using LLMs to generate specialized input generators instead of relying solely on manual format specification or inference.
* Test the LLM-generated generators in conjunction with industrial fuzzers like AFL++ to achieve a synergistic effect between holistic and local search.
* Monitor LLM invocation frequency; the paper suggests using LLMs only when the local search stagnates to minimize computational expense.
* Be aware that while LLMs synthesize code, the resulting diversity of generated inputs might still be limited initially.

## Verdict
Read, especially for security researchers and ML engineers working on input validation or fuzzing pipelines. This paper offers a practical blueprint for integrating LLM capabilities into traditionally non-textual security testing domains.

---

## Den's Take

The paper presents a neat engineering solution for bootstrapping fuzzing efforts against complex binary formats. However, the focus remains too heavily on the *synthesis* of the generator script, rather than the security implications of the LLM itself becoming a vector. If the LLM is synthesizing code that feeds into a vulnerable parser, the LLM's prompt engineering becomes a new, potentially exploitable attack surface. A more rigorous analysis would need to examine how an attacker could subtly guide the LLM to generate a generator that favors specific, deeply nested, or malformed sequences known to trigger bugs, effectively weaponizing the synthesis step rather than just using it for discovery. This feels like a necessary step in the tooling evolution, but it doesn't address the next layer of risk.