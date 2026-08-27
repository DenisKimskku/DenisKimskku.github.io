---
title: "Decompiling the Synergy: An Empirical Study of Human-LLM Teaming in Software Reverse Engineering"
date: "2026-08-10"
type: "Paper Review"
description: "Decompiling the Synergy: An Empirical Study of Human-LLM Teaming in Software Reverse Engineering"
tags: ["Binary Analysis"]
readingTime: 5
headerImage: "/images/news/decompiling_the_synergy_an_empirical_study_of_humanllm_teami.jpg"
paperUrl: "https://www.ndss-symposium.org/ndss-paper/decompiling-the-synergy-an-empirical-study-of-human-llm-teaming-in-software-reverse-engineering/"
---

![Decompiling the Synergy: An Empirical Study of Human-LLM Teaming in Software Reverse Engineering](/images/news/decompiling_the_synergy_an_empirical_study_of_humanllm_teami.jpg)
*Figure from the paper “Decompiling the Synergy: An Empirical Study of Human-LLM Teaming in Software Reverse Engineering” (p. 5)*

# Human-LLM Teaming Dynamics in Static Software Reverse Engineering

## TLDR
*   LLM assistance substantially narrows the SRE expertise gap for novices.
*   Practitioners are at risk from LLM hallucinations and unhelpful suggestions.
*   Novices’ comprehension rate rises by approximately 98%, matching that of experts.

## The State of SRE and the LLM Integration Gap
Software Reverse Engineering (SRE) is inherently a complex, manual process focused on reconstructing program logic from binaries. Practitioners employ various strategies across iterative subtasks, using standard tools like IDA Pro and Ghidra. Recent work has focused on improving LLMs for isolated SRE tasks—like symbol recovery or type inference. However, the existing literature fails to examine the *dynamics* of this integration. Researchers have studied LLM improvements to singular tasks, but no work has measured how LLMs affect the performance across the entire, iterative, human-driven SRE workflow. This study addresses that gap by moving beyond task isolation to observe the interaction between the analyst and the LLM across multiple SRE subtasks.

## Novice Comprehension vs. Expert Harm
The central insight of this research is the differential impact of LLM assistance across skill levels. For novice SRE practitioners, LLM support acts as a powerful equalizer, dramatically accelerating skill acquisition. Specifically, the comprehension rate of novices rises by approximately 98%, matching that of experts. Conversely, for experienced practitioners, the benefits were marginal; experts gained little performance uplift and, in certain contexts, were negatively affected. This asymmetry reveals that LLMs function differently depending on the baseline expertise of the human operator.

## Artifact Recovery and Analysis Time
The empirical study quantified specific performance gains and losses associated with the LLM integration. Known-algorithm functions are triaged up to 2.4× faster, and artifact recovery (symbols, comments, types) increases by at least 66%. These improvements are tied to the LLM acting as an assistant, best utilized as a filtering mechanism rather than a replacement for core analytical expertise. The study observed that LLMs are most effective when providing initial understanding, requiring subsequent human interpretation of the results.

## Limitations
Generalizability is constrained by the study's scope, which was limited to static binary analysis and excluded dynamic or advanced non-LLM tools. The study also relied on self-reported expertise from participants. Furthermore, the challenges used were CTF-style binaries, and the findings may not hold when applied to production-level, real-world software complexity.

## What practitioners should do
*   Treat LLM output as a first-line filter for understanding, not as a replacement for deep analysis.
*   Be wary of LLM suggestions when working on novel or large code segments, as quality degrades there.
*   Leverage LLMs for tasks where knowledge is established, such as identifying known algorithms or summarizing functions.
*   Expect that LLMs may introduce noise via unhelpful artifact suggestions, especially for experienced analysts.

## Verdict
Read this paper if you are an ML engineer or security researcher interested in human-AI collaboration in specialized domains like SRE. If you only care about isolated LLM attack vectors, you can skip it.

---

## Den's Take

The paper correctly identifies the asymmetry in LLM utility based on expertise, but it frames the LLM as a mere "filtering mechanism." This misses the deeper structural risk. When an experienced analyst relies on an LLM to filter or summarize complex logic within a binary, they are not just saving time; they are outsourcing their *critical path judgment*. If the LLM hallucinates a correct-looking but functionally incorrect symbol or type inference for a novel code segment, the expert is biased to accept it because the LLM has already provided a "summary." This transforms a potential, isolated hallucination into a system-wide assumption baked into the reverse engineering effort. The real danger isn't the novice being misled into accepting garbage, but the expert becoming pathologically reliant on probabilistic guidance over deterministic analysis.