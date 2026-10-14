---
title: "vSim: Semantics-Aware Value Extraction for Efficient Binary Code Similarity Analysis"
date: "2026-10-15"
type: "Paper Review"
description: "VSIM captures intermediate register/memory values for BCSA"
tags: ["Malware"]
readingTime: 5
headerImage: "/images/news/vsim_semanticsaware_value_extraction_for_efficient_binary_co.jpg"
paperUrl: "https://www.ndss-symposium.org/wp-content/uploads/2026-f213-paper.pdf"
---

![vSim: Semantics-Aware Value Extraction for Efficient Binary Code Similarity Analysis](/images/news/vsim_semanticsaware_value_extraction_for_efficient_binary_co.jpg)
*Figure from the paper “vSim: Semantics-Aware Value Extraction for Efficient Binary Code Similarity Analysis” (p. 3)*

# VSIM: Systematic Value Capture for Robust Binary Code Similarity

## TLDR
*   **What**: VSIM captures intermediate register/memory values for BCSA.
*   **Who's at risk**: Security systems relying on binary similarity (e.g., malware analysis).
*   **Key number**: (Removed due to unsupported claim)

## Overcoming Invariant Value Narrowness

BCSA hinges on finding functional equivalence despite syntactic noise introduced by compilers and optimizations. Current value-based methods often constrain themselves to easily identifiable semantic markers, such as return values or external function call arguments. This prescriptive selection severely limits the semantic information captured; for instance, in a function like $f1$ from Figure 1(a), which has no returns or external calls, these methods yield few obvious signatures. Meanwhile, techniques that capture entire program states, like BINGO and COP, suffer from noise contamination, as general-purpose registers and memory contents often include semantically irrelevant data, such as global variable addresses. The core limitation is that existing approaches are bifurcated: they either miss rich, intermediate semantic data or they drown in noise from comprehensive state tracking. This paper targets the gap where intermediate, yet semantically rich, register and memory values—those computed during symbolic execution—are systematically ignored or filtered out too aggressively.

## Heuristics for Semantics-Aware Value Selection

The central insight of VSIM is to shift from relying on pre-defined semantic markers to dynamically filtering out *semantically irrelevant* values from the broad set of intermediate values produced by under-constrained symbolic execution. Instead of asking, "Is this value a return value?", VSIM asks, "Is this value a global address?" By leveraging heuristics inspired by common disassembly practices, VSIM retains values that are likely meaningful while discarding artifacts that are compiler-dependent noise. For example, the framework specifically filters out global variable pointers. This heuristic-driven filtering mechanism allows the system to retain information like the intermediate values derived from operations such as $s.b \leftarrow \text{eax}$ when $y \ge 8$ in Figure 1(a), even if $f1$ has no external calls. This targeted approach isolates the core computational behavior, something traditional "selected value" methods fail to generalize to.

## Fingerprint Propagation and Value Concretization

The mechanism involves a multi-stage transformation of the extracted values. First, a customized under-constrained symbolic execution engine performs basic block-level execution, recording all register and memory changes. Second, the six heuristic rules are applied to retain semantics-aware values. The third stage, Value Normalization, and Value Concretization, is where efficiency is gained; VSIM avoids heavyweight theorem proving by normalizing and concretizing these semantic values for direct, efficient comparison, addressing the C3 challenge. Finally, the system enhances robustness by employing Fingerprint Propagation: it propagates the callees’ fingerprints back to the caller’s fingerprint. This propagation, combined with considering the distinguishability of captured values, significantly boosts accuracy.

## Limitations
The framework assumes that the heuristic rules, inspired by common disassembly practices, are sufficient to distinguish relevant values from noise across diverse architectures and compilation targets. The reliance on under-constrained symbolic execution inherently faces state explosion challenges, which may limit the depth of analysis for extremely deep functions. Furthermore, while VSIM generalizes across architectures, the precise definition of "semantically irrelevant" might break down in highly specialized, domain-specific binary structures not covered by the general heuristics.

## What practitioners should do
*   If performing BCSA on massive code corpora, adopt a value-centric approach like VSIM rather than relying solely on raw byte embeddings.
*   When analyzing binaries across different compiler versions, prioritize value extraction and normalization to mitigate optimization divergence.
*   For functions lacking obvious external calls or returns, use value-based analysis to extract intermediate register and memory state changes.
*   When evaluating BCSA tools, check for mechanisms that explicitly filter out global addresses during value extraction.

## Verdict
Read this paper if you are an ML engineer or security researcher focused on robust, large-scale binary analysis; otherwise, skip it.

---

## Den's Take

The paper frames the problem as a superior method for value selection, but it downplays the inherent risk of over-reliance on heuristics. Assuming that heuristics "inspired by common disassembly practices" are sufficient to delineate "semantically irrelevant" data across *all* diverse architectures is a massive assumption. If the underlying heuristic framework fails on a novel, highly specialized binary structure, the entire mechanism collapses into noise, just like the comprehensive state tracking methods it seeks to replace. The practical implication is that this technique might just trade one form of noise problem (global addresses) for another (heuristic misclassification). This is especially true when considering how subtle code transformations can render those "common disassembly practices" obsolete.