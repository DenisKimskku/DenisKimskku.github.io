---
title: "Idioms: A Simple and Effective Framework for Turbo-Charging Local Neural Decompilation with Well-Defined Types"
date: "2026-10-30"
type: "Paper Review"
description: "IDIOMS jointly predicts source code and complex user-defined types"
tags: ["Binary Analysis"]
readingTime: 5
headerImage: "/images/news/idioms_a_simple_and_effective_framework_for_turbocharging_lo.jpg"
paperUrl: "https://www.ndss-symposium.org/wp-content/uploads/2026-f795-paper.pdf"
---

![Idioms: A Simple and Effective Framework for Turbo-Charging Local Neural Decompilation with Well-Defined Types](/images/news/idioms_a_simple_and_effective_framework_for_turbocharging_lo.jpg)
*Figure from the paper “Idioms: A Simple and Effective Framework for Turbo-Charging Local Neural Decompilation with Well-Defined Types” (p. 4)*

# IDIOMS: Joint Code and User-Defined Type Reconstruction for Neural Decompilation

## TLDR
*   **What**: IDIOMS jointly predicts source code and complex user-defined types.
*   **Who's at risk**: Reverse engineers and security analysts using neural decompilers on real binaries.
*   **Key number**: IDIOMS scores 17–36% better than LLM4Decompile [19] and 37–78% better than Nova [17] on EXEBENCH [23], and 95–205% better on the realistic REALTYPE with its realistic UDTs.

## The Scattered Evidence Problem
Existing neural decompilers aim to fill in missing abstractions during decompilation, like variable and type names. While this is promising, current work struggles with user-defined types (UDTs), such as structs. The problem is that these UDTs are widespread in real code, but existing benchmarks feature very few of them. Furthermore, type recovery is difficult because the evidence for a UDT’s structure is scattered; any single function often only uses a subset of its fields. Traditional type inference algorithms solve this by aggregating evidence across multiple functions—an interprocedural approach. Current neural decompilers, however, are often limited to single-function context, meaning they cannot reconstruct complete UDT definitions from partial usage patterns alone. This results in underspecified outputs where the semantics of struct field accesses are unknown, preventing deeper static analysis.

## Joint Prediction and Neighboring Context
The core insight of IDIOMS is that code and type definitions must be predicted jointly. The paper argues that these two elements are fundamentally interdependent: accurate type reconstruction requires knowing how the types are used throughout the code, while meaningful field accesses in the code depend on the underlying type definitions. To overcome the scattered evidence problem, IDIOMS leverages broader context by incorporating neighboring functions from the call graph. Instead of just providing the target decompiled function, IDIOMS models include the target, followed by its callees and callers in breadth-first search (BFS) order. This inter-procedural evidence allows the model to aggregate partial information from related functions, enabling the reconstruction of complete UDT definitions that would otherwise be impossible to infer from one function in isolation.

## IDIOMS Model and REALTYPE Dataset
IDIOMS is a family of models that fine-tunes causal language models on the new REALTYPE dataset. This dataset was constructed by mining majority-C-language repositories from GitHub, yielding 154,301 training functions and 2,862 evaluation functions. REALTYPE is designed to reflect real-world complexity, featuring 26.4% of variables utilizing a UDT and 53.4% of functions containing a UDT, compared to 0.5% and 1.9% in EXEBENCH, respectively. The model operates by concatenating the input sequence (the decompiled code) and the target output sequence (the original code + UDT definitions) using a separator token. The IDIOMS models explicitly predict definitions for all UDTs used by a function alongside its code. The paper shows that IDIOMS scores 17–36% better than LLM4Decompile [19] and 37–78% better than Nova [17] on EXEBENCH [23], and 95–205% better on the realistic REALTYPE with its realistic UDTs.

## Limitations
The framework assumes that the deterministic decompiler produces a sufficiently accurate initial representation for the LLM to build upon. In production, the effectiveness of the interprocedural context relies on the quality and completeness of the call graph derived from the binary, which can be brittle or incomplete in highly obfuscated targets.

## What practitioners should do
*   When applying neural decompilation, prioritize datasets that contain realistic UDTs, as current benchmarks may not reflect production complexity.
*   If using LLMs for decompilation, consider integrating interprocedural context (call graph neighbors) to improve UDT and structural accuracy.
*   Be aware that the performance gains are substantial (up to 205% on realistic data), suggesting that joint modeling is necessary for complex codebases.
*   If deploying a custom decompiler, ensure the LLM interface is purely textual to maximize flexibility across newer model architectures.

## Verdict
Read this paper if your work involves neural decompilation or automated static analysis of binaries, as it provides a concrete, state-of-the-art framework for handling complex type information.

---

## Den's Take

The paper convincingly demonstrates the necessity of moving beyond single-function context when attempting to recover complex structures like user-defined types. However, the reliance on a pre-existing, deterministic decompiler output introduces a massive, unaddressed weakness. If the initial binary analysis fails to produce a complete or accurate call graph—which is common against obfuscated targets—the entire IDIOMS framework collapses, regardless of how well it handles contextual aggregation. This means the performance gains shown on REALTYPE are only as good as the pre-processing step. Furthermore, the discussion of the threat model is too narrow; it focuses solely on reconstruction accuracy, ignoring the downstream security implications of *inaccurate* reconstruction, which could lead security analysts into false positives or, worse, missed vulnerabilities.