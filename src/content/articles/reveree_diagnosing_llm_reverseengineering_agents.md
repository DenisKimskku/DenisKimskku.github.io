---
title: "Reveree: Diagnosing LLM Reverse-Engineering Agents"
date: "2026-09-03"
type: "Paper Review"
description: "Diagnostic framework scores agent progress through 8 RE stages"
tags: ["AI Agents", "Binary Analysis", "Malware", "Vulnerabilities"]
readingTime: 5
headerImage: "/images/news/reveree_diagnosing_llm_reverseengineering_agents.jpg"
paperUrl: "http://arxiv.org/abs/2609.01185v1"
---

![Reveree: Diagnosing LLM Reverse-Engineering Agents](/images/news/reveree_diagnosing_llm_reverseengineering_agents.jpg)
*Figure from the paper “Reveree: Diagnosing LLM Reverse-Engineering Agents” (p. 3)*

# REVEREE: Diagnosing LLM Reverse-Engineering Agent Trajectories

## TLDR
*   **What**: Diagnostic framework scores agent progress through 8 RE stages.
*   **Who's at risk**: LLM agents used for autonomous malware/vulnerability analysis.
*   **Key number**: Failures concentrate at comprehension stages, showing competence limits.

## The Insufficiency of Solve Rate

Current evaluations of LLM agents performing reverse engineering (RE) rely almost entirely on the solve rate: whether the agent captures the final flag. This single metric, while necessary, is insufficient for diagnosing agent capability. RE is an iterative, multi-step process—an analyst moves from triaging a binary to understanding its core algorithm, extracting constraints, and finally building a solver. The existing solve rate metric fails because it cannot localize failure. A run that successfully recovers the binary's core algorithm but stalls one step shy of solving scores identically to one that never parses the file. Furthermore, the metric cannot separate genuine analysis from simple solution recall; since challenge write-ups leak into pre-training, a captured flag might just be reproduced from memory. This conflation obscures where an agent is actually competent and where it hits a roadblock.

## The Eight-Stage RE Schema

REVEREE addresses this by imposing an RE-specific, fixed schema comprising eight canonical stages. These stages, derived from observational studies of human analysts, structure the entire RE trajectory. Stages are classified as either ACTION or INSIGHT. ACTION stages, such as S1 Triage or S7 Flag, involve mechanically observable operations (e.g., calling a disassembler or extracting the flag) and are verified deterministically via tool calls. Conversely, INSIGHT stages, like S3 Control flow or S5 Constraint extract, require demonstrated internal comprehension and are the only stages referred to an LLM judge. This schema allows the framework to credit progress based on *what* the agent accomplished, not just *if* it succeeded.

## Two-Channel Stage Detection

The framework scores stages based on whether they leave a mechanical trace or require comprehension. Stages that leave a mechanical trace are verified deterministically from tool calls; only comprehension stages are referred to an outcome-blinded LLM judge validated against a human expert.

## Limitations
The evaluation assumes the agent operates within a fixed, sandboxed environment using a standardized toolset, which may not reflect complex, real-world deployment scenarios. The reliance on an outcome-blinded LLM judge for comprehension stages introduces potential, albeit mitigated, subjectivity. Furthermore, the framework's efficacy is tied to the completeness of the eight-stage schema; novel RE techniques not mapped to these stages would not be scored granularly.

## What practitioners should do
*   Do not rely solely on final solve rates when assessing agent capability on challenging binaries.

## Verdict
Read this paper if you are building or benchmarking LLM agents for security tasks; otherwise, skip it.

---

## Den's Take

The paper’s focus on localizing failure via the eight-stage schema is necessary, but it remains too idealized for production environments. Assuming a fixed, sandboxed environment with a standardized toolset—as noted in the limitations—is a massive oversimplification when dealing with real-world malware analysis pipelines. In practice, the "tool calls" themselves are often subjects of adversarial manipulation or are part of a larger, non-deterministic ecosystem. The framework does a good job distinguishing between mechanical action and internal insight, but it doesn't address how an agent might successfully execute a mechanical stage (like S1 Triage) while being fundamentally misled by a subtle, injected piece of data that only influences the later, unobserved INSIGHT stages. This suggests that even when the agent passes Channel A checks, the integrity of the data feeding the LLM judge (Channel B) remains the weakest link, a vulnerability that these stage-based metrics don't adequately capture.