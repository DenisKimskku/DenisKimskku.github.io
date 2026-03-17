---
title: "Idioms: Turbo-Charging Neural Decompilation with User-Defined Types"
date: "2026-03-17"
type: "Paper Review"
description: "An analysis of Idioms, a framework that advances neural decompilation by jointly predicting source code and user-defined type definitions, using neighboring function context from call graphs to achieve up to 205% improvement over baselines on realistic code."
tags: ["Neural Decompilation", "LLM", "Reverse Engineering", "Binary Analysis", "Program Analysis"]
---

# Idioms: Turbo-Charging Neural Decompilation with User-Defined Types

When a compiler transforms source code into a binary, it strips away the very details that make code readable: variable names, type definitions, struct layouts. Decompilation attempts to reverse this process, but reconstructing those lost semantics remains one of the hardest problems in reverse engineering. This article examines "Idioms: A Simple and Effective Framework for Turbo-Charging Local Neural Decompilation with Well-Defined Types" by Dramko et al. from Carnegie Mellon University, published at NDSS 2026, which introduces a framework that jointly predicts source code and user-defined type definitions using neighboring function context from call graphs.

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

![Comparison of neural decompilation datasets showing RealType has significantly more realistic UDTs than prior benchmarks.](/images/260317/dataset_comparison.png)

| Dataset | # Functions | % UDT Variables | Type Complexity | Call Graphs |
|---------|-------------|-----------------|-----------------|-------------|
| HumanEval-Decompile | 164 | 0% | 1.0 | No |
| ExeBench | 2,383,839 | 2.7% | 1.3 | No |
| **RealType (new)** | **154,301** | **15.0%** | **2.5** | **Yes** |

Type complexity measures the average number of nodes in a type's tree representation (primitives are leaves). RealType has **5.5x more UDT variables** and **2.5x higher type complexity** than ExeBench, reflecting the reality of production C code.

The paper's key observation is that existing benchmarks contain almost no UDT variables, making prior neural decompilers appear more capable than they actually are when deployed on real-world binaries.

### A Concrete Example

![Decompilation comparison showing how Idioms recovers struct definitions and field names that prior work replaces with raw memory offsets.](/images/260317/decompilation_example.png)

Consider a function that prints a `Point` struct with fields `x`, `y`, and `name`. Without UDT definitions, LLM4Decompile produces code using raw memory offsets like `*(char**)(a1+8)` and `*(int*)(a1+4)`. Idioms jointly outputs both the struct definition and meaningful field accesses like `p->name` and `p->x`, making the decompiled code far more readable and useful for reverse engineers.

---

## The Idioms Framework

Idioms operates on decompiler output (not raw binary), leveraging the structural guarantees of deterministic decompilation while using an LLM to recover lost semantic information.

### Pipeline Architecture

![High-level Idioms pipeline showing the flow from compiled binary through deterministic decompiler to the fine-tuned LLM that outputs source code with UDT definitions.](/images/260317/idioms_pipeline.png)

The pipeline follows four stages:

1. **Deterministic Decompilation**: The compiled binary is processed by Hex-Rays to produce syntactically correct but semantically impoverished C code
2. **Context Gathering**: Neighboring functions are collected via BFS traversal of the call graph
3. **Joint Prediction**: A fine-tuned LLM takes the decompiled code plus neighboring context and outputs both reconstructed source code and UDT definitions
4. **Output**: The model produces a single coherent output containing both the decompiled function and all necessary type definitions

### Two Key Design Decisions

**Joint prediction** ensures consistency between code and type definitions. If UDTs were predicted separately, the generated code might reference fields that don't exist in the predicted struct, or vice versa.

**Model-agnostic fine-tuning** allows Idioms to work with any pre-trained causal LLM. The paper evaluates models from 0.5B to 16B parameters, using QLoRA adapters for models larger than 1B.

---

## The Scattered Evidence Problem

The paper's central insight is that a single function only uses a subset of a struct's fields, providing an incomplete picture of the UDT.

![Illustration of the scattered evidence problem: individual functions access different subsets of a struct's fields, but combining evidence from neighboring functions in the call graph recovers the complete type definition.](/images/260317/scattered_evidence.png)

Consider a struct `config_t` with four fields: `mode`, `name`, `threshold`, and `flags`. Function A accesses `mode` and `name`, function B accesses `threshold` and `flags`, and function C accesses `name` and `flags`. No single function sees the complete struct. By feeding neighboring functions from the call graph as additional context, Idioms assembles a complete picture of the UDT.

This mirrors how traditional type inference algorithms work: they are inherently **interprocedural**, gathering constraints from multiple call sites to reconstruct types. Idioms brings this interprocedural reasoning to neural decompilation.

### BFS-Based Context Collection

The neighboring context is collected through breadth-first search on the program's call graph:

- **Hop 0**: The target function itself
- **Hop 1**: Direct callers and callees
- **Hop 2+**: Transitively reachable functions

The key constraint is the model's context window: neighbors compete for tokens, and long functions may need to be truncated. The paper finds that even a single hop of neighboring context provides substantial improvements.

---

## The RealType Dataset

Existing datasets were inadequate for evaluating UDT prediction, so the authors constructed RealType:

- **154,301 training functions** and **2,862 evaluation functions**
- Sourced from open-source C projects on GitHub
- Compiled with gcc, decompiled with Hex-Rays
- Complete UDT definitions extracted from preprocessed source code
- **Interprocedural call graphs** for neighboring context collection
- Canonical type normalization (e.g., `int32_t` to `int`)
- Deduplication to prevent data leakage across projects

RealType is the first neural decompilation dataset to include both realistic UDT definitions and call graphs, making it possible to evaluate whether a neural decompiler can handle the type complexity found in real-world code.

---

## Evaluation

### Baselines and Metrics

The paper compares Idioms against two baselines:
- **LLM4Decompile** (1.3B params): Uses Ghidra-decompiled input
- **Nova**: Operates on assembly input directly

Evaluation metrics include:
- **Dependency equivalence (dep-equiv)**: Static structural equivalence checking
- **Dep-equiv + types**: Code equivalence with correct UDT types
- **Variable name accuracy**: Correctness of predicted variable names
- **UDT names and composition accuracy**: Correctness of struct/union definitions
- **Edit similarity**: Token-level closeness to ground truth

### ExeBench Results

![Bar chart comparing ExeBench accuracy across Idioms, LLM4Decompile, and Nova on three metrics: dependency equivalence, edit similarity, and variable name accuracy.](/images/260317/exebench_results.png)

On ExeBench (the most challenging existing benchmark):

| Metric | Idioms | LLM4Decompile | Nova |
|--------|--------|---------------|------|
| Dep-Equiv | **54.4%** | 46.3% | 37.5% |
| Edit Sim | **72.1%** | 67.8% | 60.2% |
| Var Name | **48.5%** | 39.2% | 32.1% |

Idioms achieves **6-24% higher accuracy** than LLM4Decompile and **20-51% higher** than Nova across all correctness metrics.

### RealType Results

On RealType (realistic code with UDTs), the gap widens dramatically:

- Idioms performs **at least 95% better** than baselines
- Up to **95-205% improvement** on realistic code with UDTs
- Nova and LLM4Decompile score **0%** on UDT metrics because they fundamentally cannot predict UDT definitions

This confirms the paper's hypothesis: existing neural decompilers appear competitive on simple benchmarks but fail entirely on realistic code containing user-defined types.

### Compiler Optimization Robustness

Idioms consistently outperforms baselines across optimization levels O0 through O3, demonstrating that the framework is not limited to unoptimized code. Inlining was disabled to maintain evaluation rigor on RealType.

---

## Ablation Study: What Actually Matters?

The paper conducts a rigorous ablation study with four configurations:

1. **exebench**: Trained on ExeBench (2.4M functions), function context only
2. **parity-exebench**: Subsampled ExeBench (same size as RealType), function context only
3. **functions-realtype**: RealType dataset, function context only
4. **neighbors-realtype** (Idioms): RealType, neighboring context via BFS call graph

| Comparison | Finding | Impact |
|-----------|---------|--------|
| exebench vs. parity-exebench | Dataset size (15x) effect | Only **6-11% gain** |
| parity-exebench vs. functions-realtype | UDT complexity effect | **38-42% drop** in dep-equiv |
| functions-realtype vs. neighbors-realtype | Neighboring context effect | Up to **63% UDT improvement** |

### Impact of Neighboring Context Across Model Sizes

![UDT composition accuracy comparing function-only context versus neighboring context across four model sizes, showing larger models benefit more from neighboring context.](/images/260317/udt_accuracy.png)

| Model | Function Context | Neighboring Context (Idioms) | Improvement |
|-------|-----------------|------------------------------|-------------|
| CodeQwen 0.5B | 18.2% | 25.1% | +38% |
| DeepSeek 1.3B | 21.5% | 30.8% | +43% |
| Qwen 3B | 24.8% | 37.2% | +50% |
| Qwen 7B | 26.1% | 42.6% | +63% |

Two insights emerge from the ablation:

1. **Data quality matters more than quantity**: 15x more data yields only a marginal improvement, while switching to higher-quality data with realistic UDTs has a dramatic effect
2. **Larger models benefit more from context**: The improvement from neighboring context scales with model capacity, from 38% for 0.5B to 63% for 7B parameters

---

## Critical Analysis

![Strengths and weaknesses analysis of the Idioms framework.](/images/260317/critical_analysis.png)

### Strengths

**Identifies a genuinely overlooked gap.** UDT prediction was ignored by all prior neural decompilers. The paper convincingly demonstrates that existing benchmarks masked this problem by containing almost no UDT variables.

**Elegant, minimal design.** Idioms requires no architectural changes to the base model. The entire contribution is smart input construction (neighboring context) and output formatting (joint code + UDT). This makes the approach highly reproducible and easy to adopt.

**Rigorous experimental design.** The ablation study isolates each contribution (dataset quality, neighboring context, model size) across four model sizes from 0.5B to 7B parameters, strengthening generalizability claims.

**Transferable insight.** The BFS-based neighboring context approach is applicable beyond decompilation to any interprocedural analysis task, such as type inference, program repair, or vulnerability detection.

**Open science.** The dataset, models, and training code are publicly released on Zenodo, enabling independent verification.

### Weaknesses

**C-only, x86-64 only scope.** Real-world reverse engineering involves C++, Rust, and Go with vtables, generics, and traits. Generalization beyond C is unproven.

**Heavy reliance on Hex-Rays.** Idioms refines Hex-Rays output rather than operating on raw binary, inheriting a dependency on a proprietary tool and its error propagation. While Ghidra support is discussed as future work, it was not evaluated.

**No semantic correctness guarantee.** Dependency equivalence checks compilation, not behavioral equivalence. Predicted UDTs may compile correctly but have wrong semantics (e.g., fields in the wrong order).

**Context window bottleneck.** Neighboring functions compete for tokens within the model's context window. Long functions get truncated, and BFS depth is limited by sequence length. This fundamentally limits how much interprocedural evidence can be leveraged.

**Evaluation gaps.** No comparison with dedicated type recovery tools like DIRTY or OSPREY, and only O0 optimization was tested on RealType (rare in real malware).

---

## Summary

Idioms makes four key contributions:

1. **RealType Dataset**: 154K+ functions with realistic UDTs and complete definitions, exposing that existing benchmarks underestimate decompilation difficulty
2. **Joint Code + UDT Prediction**: The first neural decompiler to jointly generate source code and type definitions in a single output
3. **Neighboring Context via Call Graphs**: BFS-based context collection that improves UDT prediction by up to 63%, addressing the scattered evidence problem
4. **State-of-the-Art Results**: 54.4% on ExeBench (vs. 46.3% for LLM4Decompile) and 95-205% improvement on RealType

The paper's broader lesson is that **data quality and smart context construction matter more than raw scale**. A 15x larger dataset yields only marginal gains, while providing the right interprocedural context transforms the model's ability to reason about types. This insight applies well beyond decompilation to any program analysis task where evidence is scattered across multiple functions.

---

**Reference**: Dramko, L., Le Goues, C., & Schwartz, E. J. (2026). Idioms: A Simple and Effective Framework for Turbo-Charging Local Neural Decompilation with Well-Defined Types. *Proceedings of the Network and Distributed System Security Symposium (NDSS)*.

**Code & Dataset**: [github.com/squaresLab/idioms](https://github.com/squaresLab/idioms)
