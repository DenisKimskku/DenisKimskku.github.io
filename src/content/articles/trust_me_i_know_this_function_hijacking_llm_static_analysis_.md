---
title: "Trust Me, I Know This Function: Hijacking LLM Static Analysis using Bias"
date: "2026-08-09"
type: "Paper Review"
description: "Trust Me, I Know This Function: Hijacking LLM Static Analysis using Bias"
tags: ["Vulnerabilities"]
readingTime: 5
headerImage: "/images/news/trust_me_i_know_this_function_hijacking_llm_static_analysis_.jpg"
---

![Trust Me, I Know This Function: Hijacking LLM Static Analysis using Bias](/images/news/trust_me_i_know_this_function_hijacking_llm_static_analysis_.jpg)
*Figure from the paper “Trust Me, I Know This Function: Hijacking LLM Static Analysis using Bias” (p. 2)*

# Hijacking LLM Static Analysis via Abstraction Bias in Familiar Patterns

## TLDR
*   Abstract bias causes LLMs to overgeneralize familiar code patterns.
*   Code review, vulnerability detection, and summarization tools are at risk.
*   Attack success persists even when models are explicitly warned about the attack.

## What it is & who is affected
This paper details the Familiar Pattern Attack (FPA), a novel method to mislead Large Language Models (LLMs) during static code analysis. The core vulnerability is an "abstraction bias," where LLMs overgeneralize from common, pre-trained code structures, leading them to overlook small, deterministic bugs. Adversaries introduce "deception patterns"—subtle, semantic-preserving edits—into target code. These edits hijack the LLM's perceived control flow without altering the code's actual runtime behavior. Deployments relying on LLMs for automated code review, vulnerability detection, or summarization are directly affected.

## Key findings
The research demonstrates that FPAs are effective against both basic and reasoning models across major model families, including OpenAI, Anthropic, and Google. Furthermore, the attack exhibits universality across programming languages, specifically showing efficacy in Python, C, Rust, and Go. The ability of the attack to transfer is a key finding; an FPA crafted using one model in one language transfers successfully to others. A significant finding is the robustness of the attack against defensive measures: the abstraction bias remains, and FPAs still succeed even when models receive explicit warnings about the attack via robust system prompts.

## Limitations
The threat model assumes that the downstream consumer (Actor B) does not employ dynamic or symbolic execution on every analyzed code sample to verify the LLM's interpretation. This assumption reflects practical constraints, as such execution is computationally expensive and difficult to scale in real-world, high-throughput static analysis pipelines. The paper also notes that the modifications must be stealthy, implying that manual review is either impractical due to codebase size or unlikely to examine the specific code location.

## What practitioners should do
*   When using LLMs for code auditing, assume that subtle, semantic-preserving bugs can be introduced to mislead the model's analysis.
*   Do not rely solely on LLM outputs for high-stakes tasks like vulnerability triage without secondary verification mechanisms.
*   Be aware that FPAs are transferable; a vulnerability found in one model family or language may persist in others.
*   Consider defense mechanisms that rely less on the LLM's abstract pattern matching and more on concrete, verifiable code execution paths.

## Verdict
Read this paper if you are a security researcher or ML engineer focused on the reliability and trustworthiness of code-oriented AI systems. Skip it if your work does not involve automated code analysis pipelines.

---

## Den's Take

The paper’s focus on abstraction bias is valuable, but it frames the issue as primarily a pattern recognition failure, which misses the deeper systemic risk. The real problem isn't just that the LLM overgeneralizes; it’s that the entire concept of "static analysis" becomes a probabilistic guess rather than a deterministic check. If we accept the authors' limitation—that dynamic execution is too expensive for high-throughput pipelines—then we are implicitly accepting a massive, unquantifiable trust boundary failure in production systems.