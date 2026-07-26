---
title: "Idioms: Turbo-Charging Neural Decompilation with User-Defined Types"
date: "2026-03-17"
type: "Paper Walkthrough"
description: "A walkthrough of Idioms (NDSS 2026), which advances neural decompilation by jointly predicting source code and user-defined type definitions, using neighboring functions from the call graph to score 95-205% above prior neural decompilers on realistic code."
tags: ["Neural Decompilation", "LLM", "Reverse Engineering", "Binary Analysis", "Program Analysis"]
---

# Idioms: Turbo-Charging Neural Decompilation with User-Defined Types

When a compiler transforms source code into a binary, it strips away the very details that make code readable: variable names, type definitions, struct layouts. Decompilation attempts to reverse this process, but reconstructing those lost semantics remains one of the hardest problems in reverse engineering. This walkthrough covers "Idioms: A Simple and Effective Framework for Turbo-Charging Local Neural Decompilation with Well-Defined Types" by Dramko, Le Goues, and Schwartz (Carnegie Mellon University), published at NDSS 2026, which introduces a framework that jointly predicts source code and user-defined type definitions using neighboring function context from call graphs.

---

## The Decompilation Problem

Decompilation is essential for malware analysis, vulnerability research, and understanding legacy software. However, compilation is fundamentally lossy: variable names, type information, and struct layouts are discarded during the process.

### Traditional vs. Neural Decompilers

| Approach | Examples | Strengths | Limitations |
|----------|----------|-----------|-------------|
| **Deterministic** | Hex-Rays, Ghidra | Syntactically correct output | Missing semantic details (names, types) |
| **Neural** | LLM4Decompile, Nova | Statistically predicts lost details | Cannot define user-defined composite types |

Traditional decompilers like Hex-Rays produce syntactically valid C code, but the output uses generic variable names (`a1`, `v2`) and raw memory offsets instead of meaningful struct field accesses. Neural decompilers leverage LLMs to predict original source code from decompiler output, but until Idioms, none could predict **user-defined type (UDT) definitions** such as structs and unions.

---

## The UDT Problem

User-Defined Types are pervasive in real-world C code. Structs define memory layouts and encode program semantics. Without them, decompiled code becomes a maze of pointer arithmetic and raw memory offsets.

### Why Existing Benchmarks Masked the Problem

The paper's Table I quantifies how unrepresentative existing benchmarks are of production C code:

| Dataset | Variables with a UDT | Functions with a UDT | Type-tree complexity |
|---------|---------------------|----------------------|----------------------|
| HumanEval-Decompile | 0% | 0% | 1.4 |
| ExeBench | 0.5% | 1.9% | 1.5 |
| **RealType (new)** | **26.4%** | **53.4%** | **16.2** |

Type-tree complexity measures the average number of nodes in a type's tree representation (primitives are leaves; RealType's UDTs alone average 57.3). RealType has roughly **50x more UDT variables** and **~11x higher type complexity** than ExeBench, reflecting the reality of production C code.

The paper's key observation is that existing benchmarks contain almost no UDT variables, making prior neural decompilers appear more capable than they actually are when deployed on real-world binaries.

### A Concrete Example

![Decompilation comparison showing how Idioms recovers struct definitions and field names that prior work replaces with raw memory offsets.](/images/260317/decompilation_example.png)

Consider a function that prints a `Point` struct with fields `x`, `y`, and `name`. Without UDT definitions, a neural decompiler produces code using raw memory offsets like `*(char**)(a1+8)` and `*(int*)(a1+4)`. Idioms jointly outputs both the struct definition and meaningful field accesses like `p->name` and `p->x`, making the decompiled code far more readable and useful for reverse engineers.

---

## The Idioms Framework

Idioms operates on decompiler output (not raw binary), leveraging the structural guarantees of deterministic decompilation while using an LLM to recover lost semantic information.

### Pipeline Architecture

![High-level Idioms pipeline showing the flow from compiled binary through deterministic decompiler to the fine-tuned LLM that outputs source code with UDT definitions.](/images/260317/idioms_pipeline.png)

The pipeline follows four stages:

1. **Deterministic Decompilation**: The compiled binary is processed by Hex-Rays to produce syntactically correct but semantically impoverished C code
2. **Context Gathering**: Neighboring functions (callers and callees) are collected in breadth-first order from the call graph until the model's context window is full
3. **Joint Prediction**: A fine-tuned LLM takes the decompiled code plus neighboring context and outputs both reconstructed source code and UDT definitions
4. **Output**: The model produces a single coherent output containing both the decompiled function and all necessary type definitions

### Two Key Design Decisions

**Joint prediction** ensures consistency between code and type definitions. If UDTs were predicted separately, the generated code might reference fields that don't exist in the predicted struct, or vice versa.

**Model-agnostic fine-tuning** allows Idioms to work with any pre-trained causal LLM. The paper fine-tunes five base models spanning 0.5B to 7B parameters — CodeQwen2.5 0.5B, LLM4Decompile 1.3B, CodeGemma 2B, CodeGemma 7B, and CodeLlama 7B — using full fine-tuning for the smallest model and QLoRA adapters for everything above 1B.

---

## The Scattered Evidence Problem

The paper's central insight is that a single function only uses a subset of a struct's fields, providing an incomplete picture of the UDT.

![Illustration of the scattered evidence problem: individual functions access different subsets of a struct's fields, but combining evidence from neighboring functions in the call graph recovers the complete type definition.](/images/260317/scattered_evidence.png)

Consider a struct `config_t` with four fields: `mode`, `name`, `threshold`, and `flags`. Function A accesses `mode` and `name`, function B accesses `threshold` and `flags`, and function C accesses `name` and `flags`. No single function sees the complete struct. By feeding neighboring functions from the call graph as additional context, Idioms assembles a complete picture of the UDT.

This mirrors how traditional type inference algorithms work: they are inherently **interprocedural**, gathering constraints from multiple call sites to reconstruct types. Idioms brings this interprocedural reasoning to neural decompilation. The practical constraint is the context window: callers and callees compete for tokens, so the usable evidence is bounded by sequence length.

---

## The RealType Dataset

Existing datasets were inadequate for evaluating UDT prediction, so the authors constructed RealType:

- **154,301 training functions** and **2,862 evaluation functions**
- Sourced from open-source C projects on GitHub
- Compiled with gcc, decompiled with Hex-Rays
- Complete UDT definitions extracted from preprocessed source code
- **Interprocedural call graphs** for neighboring context collection
- Canonical type normalization and deduplication to prevent data leakage across projects

RealType is the first neural decompilation dataset to include both realistic UDT definitions and call graphs, making it possible to evaluate whether a neural decompiler can handle the type complexity found in real-world code.

---

## Evaluation

### Baselines and Metrics

The headline comparison pits the Idioms-trained CodeGemma 7B against the **6.7B versions** of two prior neural decompilers:
- **LLM4Decompile** (6.7B): Takes Ghidra-decompiled code as input (test sets were re-decompiled with Ghidra specifically for it)
- **Nova** (6.7B): Operates on assembly input directly

Evaluation metrics include:
- **Dependency equivalence (dep-equiv)**: Static structural comparison of function dependency graphs — operations, data sources, and control/data-flow edges; a strict variant additionally typechecks
- **Passes ExeBench unit tests**: Functional accuracy on ExeBench's executable test suite
- **Variable name accuracy** and **variable type accuracy**
- **UDT nominal and structural accuracy**: Correctness of struct/union names and layouts

### ExeBench Results

On ExeBench (the strongest existing benchmark), Idioms leads on every correctness metric — scoring **17–36% higher than LLM4Decompile and 37–78% higher than Nova** in relative terms:

| Metric | Idioms | LLM4Decompile | Nova |
|--------|--------|---------------|------|
| Passes ExeBench tests | **54.4%** | 46.3% | 37.5% |
| Dependency equivalence | **33.7%** | 27.4% | 23.9% |
| Variable name accuracy | **20.6%** | 14.7% | 12.9% |

### RealType Results

On RealType (realistic code with UDTs), the gap widens dramatically:

- Idioms performs **95–205% better** than the baselines across correctness metrics
- Prior decompilers cannot produce UDT definitions at all, so on UDT metrics they effectively fail outright
- Absolute numbers drop for everyone: realistic type-heavy code is simply much harder than benchmark code

This confirms the paper's hypothesis: existing neural decompilers appear competitive on simple benchmarks but degrade sharply on realistic code containing user-defined types.

### Compiler Optimization Robustness

RealType is trained and evaluated at gcc **O0 through O3** (with inlining disabled to keep function boundaries evaluable) — Idioms' relaxed dependency equivalence declines only gently across levels (32.3 / 28.0 / 26.2 / 25.5), and it outperforms the baselines at every level.

### Against Dedicated Type-Recovery Tools

The NDSS version adds a comparison (RQ6) against four standalone type-recovery techniques — **Retypd, BinSub, TRex, and TypeForge** — on coreutils and RealType at O0 and O3. Idioms beats them by **at least 73%** in relative terms, which is notable given those tools do nothing but recover types.

---

## Ablation Study: What Actually Matters?

The paper conducts a careful ablation with four training configurations:

1. **exebench**: Trained on all of ExeBench (2.4M functions), function context only
2. **parity-exebench**: Subsampled ExeBench (same size as RealType), function context only
3. **functions-realtype**: RealType dataset, function context only
4. **idioms**: RealType with neighboring call-graph context — the full framework

| Comparison | Finding | Impact |
|-----------|---------|--------|
| exebench vs. parity-exebench | 15x more data | Only **6–11% gain** |
| parity-exebench vs. functions-realtype | Realistic UDT-heavy code | **38–42% drop** in dep-equiv — UDT code is much harder |
| functions-realtype vs. idioms | Neighboring context | Up to **~64% relative gain** in UDT structural accuracy |

### Impact of Neighboring Context Across Models

UDT variable structural accuracy, function-only context → neighboring context (Table III):

| Base model | Function context | Neighboring context (Idioms) | Relative gain |
|-------|-----------------|------------------------------|-------------|
| CodeQwen2.5 0.5B | 6.0% | 6.4% | +7% |
| LLM4Decompile 1.3B | 10.0% | 11.1% | +11% |
| CodeGemma 2B | 7.4% | 11.5% | +55% |
| CodeGemma 7B | 9.2% | 15.1% | +64% |
| CodeLlama 7B | 10.0% | 14.1% | +41% |

Two insights emerge from the ablation:

1. **Data realism matters more than data volume**: 15x more training data yields only a marginal improvement, while the move to realistic UDT-heavy code reshapes the problem entirely
2. **Context helps most where capacity exists**: the two smallest models barely benefit from neighboring context, while the larger models convert it into 41–64% relative gains — though absolute UDT accuracy remains modest for everyone

---

## Critical Analysis

### Strengths

**Identifies a genuinely overlooked gap.** UDT prediction was ignored by all prior neural decompilers. The paper convincingly demonstrates that existing benchmarks masked this problem by containing almost no UDT variables.

**Elegant, minimal design.** Idioms requires no architectural changes to the base model. The entire contribution is smart input construction (neighboring context) and output formatting (joint code + UDT). This makes the approach highly reproducible and easy to adopt.

**Rigorous experimental design.** The ablation isolates each contribution (dataset scale, dataset realism, neighboring context) across five fine-tuned models, and the added type-recovery-tool comparison (RQ6) closes the most obvious "but what about non-neural tools?" objection.

**Transferable insight.** The call-graph-context approach is applicable beyond decompilation to any interprocedural analysis task, such as type inference, program repair, or vulnerability detection.

**Open science.** The code is on GitHub and the models and datasets are archived on Zenodo (DOI 10.5281/zenodo.15683630), enabling independent verification.

### Weaknesses

**C-only, x86-64 only scope.** Real-world reverse engineering involves C++, Rust, and Go with vtables, generics, and traits. Generalization beyond C is unproven.

**Heavy reliance on Hex-Rays.** Idioms refines Hex-Rays output rather than operating on raw binary, inheriting a dependency on a proprietary tool (the authors did run Ghidra to feed LLM4Decompile and note Hex-Rays' output is better — but Idioms itself was only evaluated on Hex-Rays input; the paper's stated future work is obfuscated code).

**No behavioral correctness guarantee.** Dependency equivalence is a static structural comparison, not behavioral equivalence. Predicted UDTs may be structurally plausible yet semantically wrong (e.g., fields in the wrong order but the same shape).

**Context window bottleneck.** Neighboring functions compete for tokens, and breadth-first collection stops when the window fills. This fundamentally limits how much interprocedural evidence can be leveraged, especially for large programs.

**Absolute UDT accuracy is still low.** Even the best configuration reaches only ~15% UDT variable structural accuracy on RealType — a large relative win, but far from solved. And while RQ6 covers four type-recovery tools, learning-based recovery systems like DIRTY and OSPREY are cited without head-to-head comparison.

---

## Summary

Idioms makes four key contributions:

1. **RealType Dataset**: 154K+ training functions with realistic UDTs, complete definitions, and call graphs, exposing that existing benchmarks underestimate decompilation difficulty
2. **Joint Code + UDT Prediction**: The first neural decompiler to jointly generate source code and type definitions in a single output
3. **Neighboring Context via Call Graphs**: Breadth-first context collection that lifts UDT structural accuracy by up to ~64% relative, addressing the scattered evidence problem
4. **State-of-the-Art Results**: 17–36% above LLM4Decompile on ExeBench, 95–205% above both baselines on RealType, and at least 73% above dedicated type-recovery tools

The paper's broader lesson is that **data realism and smart context construction matter more than raw scale**. A 15x larger dataset yields only marginal gains, while providing the right interprocedural context transforms the model's ability to reason about types. This insight applies well beyond decompilation to any program analysis task where evidence is scattered across multiple functions.

---

**Reference**: Dramko, L., Le Goues, C., & Schwartz, E. J. (2026). Idioms: A Simple and Effective Framework for Turbo-Charging Local Neural Decompilation with Well-Defined Types. *Proceedings of the Network and Distributed System Security Symposium (NDSS)*. (Preprint: arXiv:2502.04536, under the title "Idioms: Neural Decompilation With Joint Code and Type Definition Prediction".)

**Code & Dataset**: [github.com/squaresLab/idioms](https://github.com/squaresLab/idioms) · [Zenodo 10.5281/zenodo.15683630](https://doi.org/10.5281/zenodo.15683630)

- **Slide**: [0225_Idioms.pdf](https://deniskim1.com/lab-meeting/0225_Idioms.pdf)
