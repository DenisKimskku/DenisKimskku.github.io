---
title: "Fool Me If You Can: On the Robustness of Binary Code Similarity Detection Models"
date: "2026-03-18"
type: "Research Paper"
description: "We introduce asmFooler, a framework that reveals deep learning-based binary code similarity detection models are highly vulnerable to adversarial semantics-preserving transformations at the binary level."
tags: ["Binary Analysis", "Adversarial Attacks", "Deep Learning", "Reverse Engineering", "Code Similarity"]
---

# Fool Me If You Can: On the Robustness of Binary Code Similarity Detection Models

Binary code similarity detection (BCSD) is a cornerstone of modern cybersecurity. From malware variant identification to vulnerability search across firmware, the ability to determine whether two binary code snippets share functional semantics has far-reaching applications. Recent advances in deep learning have brought impressive results to this task, but a critical question remained underexplored: **How robust are these models to adversarial code transformations that preserve program logic?**

This is the question we address in our paper, "[Fool Me If You Can: On the Robustness of Binary Code Similarity Detection Models against Semantics-preserving Transformations](https://deniskim1.com/papers/fse26/paper.pdf)," which will appear at **FSE 2026**.

We found that even minimal, semantics-preserving perturbations at the assembly level can dramatically degrade model accuracy, exposing a fundamental fragility in current BCSD approaches. To systematically evaluate this, we built **asmFooler**, a framework that stress-tests BCSD models using diverse adversarial code transformations.

---

## Why Binary Code Similarity Matters

Binary analysis is essential when source code is unavailable—which is the norm in malware analysis, firmware security auditing, and legacy software maintenance. BCSD models aim to answer a deceptively simple question: *Do these two binary functions do the same thing?*

### Applications of BCSD

| Application | Description | Stakeholders |
|-------------|-------------|--------------|
| **Malware Variant Detection** | Identifying repackaged or polymorphic malware | Security analysts, AV vendors |
| **Vulnerability Search** | Finding known-vulnerable code in new binaries | Patch management, firmware auditors |
| **Software Plagiarism Detection** | Detecting unauthorized code reuse | Legal, compliance teams |
| **Patch Analysis** | Understanding what changed between binary versions | Reverse engineers |

Traditional approaches rely on static or dynamic analysis with hand-crafted features—effective but labor-intensive and hard to scale. Deep learning models promised to automate this by learning latent representations of binary code, capturing semantic similarity even when syntactic differences are large.

---

## The Robustness Problem

While BCSD models have shown impressive accuracy on standard benchmarks, their robustness to adversarial perturbations remained largely unstudied. This is a critical gap because **real-world adversaries actively transform their code to evade detection.**

### Unique Challenges at the Binary Level

Adversarial attacks on binary code differ fundamentally from those in other domains (e.g., images or NLP):

- **Semantic preservation is mandatory**: Unlike pixel perturbations in images, modified instructions must still execute correctly
- **Instruction set constraints**: Available transformations are bounded by the ISA (instruction set architecture)
- **Pipeline diversity**: Each BCSD model uses different preprocessing (tokenization, normalization, graph construction), making universal attacks harder

### What We Set Out to Answer

1. How resilient are state-of-the-art BCSD models to semantics-preserving transformations?
2. Which aspects of the model pipeline (preprocessing, architecture, features) determine robustness?
3. Can minimal perturbations be enough to fool these models?
4. How do adversarial transformations affect both false positives and false negatives?

---

## asmFooler: Our Evaluation Framework

We introduce **asmFooler**, a systematic framework for evaluating BCSD model robustness. asmFooler applies eight distinct semantics-preserving transformations to binary code and measures how each transformation affects model predictions.

### Eight Semantics-Preserving Transformations

Our transformation suite spans a range of strategies that preserve program behavior while modifying binary-level representation:

| Category | Transformation | Description |
|----------|---------------|-------------|
| **Instruction Substitution** | Equivalent Instructions | Replace instructions with semantically equivalent alternatives (e.g., `xor eax, eax` ↔ `mov eax, 0`) |
| | Arithmetic Identity | Apply identity operations (e.g., `add reg, 0`, `mul reg, 1`) |
| **Control Flow** | Opaque Predicates | Insert always-true/false conditionals that don't change behavior |
| | Branch Reordering | Swap if/else blocks with negated conditions |
| **Data Flow** | Register Reassignment | Remap registers while preserving data dependencies |
| | Stack Manipulation | Modify stack frame layout without changing semantics |
| **Code Layout** | NOP Insertion | Add no-operation instructions between code blocks |
| | Function Reordering | Change the order of independent code blocks |

Each transformation is carefully validated to ensure the modified binary produces identical outputs for all inputs as the original.

---

## Evaluation Setup

### Models Under Test

We evaluated six representative BCSD models spanning diverse architectures and design philosophies:

| Model | Architecture | Input Representation | Training Approach |
|-------|-------------|---------------------|-------------------|
| **Asm2Vec** | PV-DM | Assembly tokens | Unsupervised |
| **SAFE** | Self-attentive NN | Instruction embeddings | Self-supervised |
| **Trex** | Transformer | Micro-traces | Pre-trained |
| **jTrans** | Transformer | Jump-aware tokens | Pre-trained |
| **GMN** | Graph Neural Network | Control flow graphs | Supervised |
| **BinCola** | Contrastive Learning | Multi-view (token + graph) | Self-supervised |

These models represent the spectrum of BCSD approaches: from token-level sequence models to graph-based architectures to contrastive learning frameworks.

### Dataset Construction

We constructed a comprehensive evaluation dataset:

- **620 baseline binary samples** from diverse real-world programs
- **9,565 binary variants** generated by applying our eight transformations
- Multiple transformation intensities (minimal to aggressive)
- Cross-compilation with different compilers and optimization levels

---

## Key Findings

Our evaluation revealed several critical insights about BCSD model robustness.

### Finding 1: Robustness Depends on Pipeline Design

Model robustness is not solely determined by the neural network architecture. Instead, the entire processing pipeline—code preprocessing, tokenization, feature extraction, and model architecture—collectively determines how well a model captures (or fails to capture) true code semantics.

Models that normalize away superficial differences during preprocessing (e.g., abstracting register names or canonicalizing instructions) showed stronger inherent robustness than those that operate on raw instruction tokens.

### Finding 2: Transformation Budget Bounds Effectiveness

Each model has an effective "transformation budget"—a limit on how many perturbations can be applied before the model's constraints (input size limits, vocabulary coverage, graph structure assumptions) cap the attack's impact.

| Constraint Type | Affected Models | Impact |
|----------------|-----------------|--------|
| **Input size limits** | Token-based models | Long inserted sequences get truncated |
| **Vocabulary coverage** | Embedding-based models | OOV tokens from substitutions get ignored |
| **Graph structure** | GNN-based models | NOP insertion doesn't change CFG topology |

This finding suggests that robust model design should incorporate diverse, complementary constraints that naturally limit the adversary's operational space.

### Finding 3: Minimal Perturbations Can Be Highly Effective

Perhaps the most concerning finding: **well-crafted adversarial transformations can be devastating even when introducing minimal changes.** A small number of strategically placed instruction substitutions or register reassignments can significantly shift the model's similarity score.

This is analogous to adversarial examples in computer vision, where imperceptible pixel changes flip classification decisions. In the binary domain, a few equivalent instruction substitutions can make two identical functions appear unrelated—or two unrelated functions appear identical.

### Finding 4: Both False Positives and False Negatives Are Exploitable

Our transformations can push model decisions in either direction:

- **False Negatives**: Transforming a function to make it appear *dissimilar* to itself (evasion)
- **False Positives**: Transforming a function to make it appear *similar* to a different target function (impersonation)

Both directions have serious security implications. Evasion enables malware to bypass detection, while impersonation can pollute vulnerability databases or trigger false alerts that desensitize analysts.

---

## Implications for the BCSD Community

### For Model Designers

1. **Invest in preprocessing robustness**: Normalization and canonicalization at the preprocessing stage provide a strong first line of defense against syntactic perturbations
2. **Diversify feature extraction**: Models that combine multiple views (tokens, graphs, execution traces) are harder to fool than single-view models
3. **Evaluate adversarial robustness**: Standard benchmark accuracy is insufficient; robustness evaluation should be part of the standard evaluation protocol

### For Security Practitioners

1. **Don't rely on a single model**: Ensemble approaches that aggregate predictions from diverse BCSD models can provide more robust similarity judgments
2. **Consider the threat model**: In adversarial settings (e.g., malware analysis), assume that attackers will apply transformations to evade detection
3. **Validate with dynamic analysis**: When high-confidence similarity is critical, complement BCSD with dynamic analysis (execution traces, behavior monitoring)

### For Researchers

1. **Adversarial training for BCSD**: Incorporating adversarial examples during training could improve robustness
2. **Certified robustness**: Formal guarantees about model behavior under bounded perturbations remain an open challenge for binary analysis
3. **Cross-architecture generalization**: Our evaluation focuses on x86-64; extending to ARM and RISC-V is important future work

---

## Summary

Our work makes four key contributions:

1. **asmFooler Framework**: A systematic evaluation framework with eight semantics-preserving binary transformations for stress-testing BCSD models
2. **Comprehensive Evaluation**: The first large-scale robustness study across six representative BCSD models on 9,565 binary variants
3. **Pipeline-Aware Analysis**: We identify that robustness depends on the entire model pipeline, not just the neural architecture
4. **Actionable Insights**: Practical guidelines for building more robust BCSD systems, from preprocessing design to ensemble strategies

The broader message is clear: **accuracy on clean benchmarks does not imply robustness in adversarial settings.** As BCSD models are increasingly deployed in security-critical applications—malware detection, vulnerability search, software supply chain auditing—their resilience to adversarial transformations must be rigorously evaluated and improved.

---

**Reference**: Uhm, J., Kim, M., Polychronakis, M., & Koo, H. (2026). Fool Me If You Can: On the Robustness of Binary Code Similarity Detection Models against Semantics-preserving Transformations. *Proceedings of the ACM International Conference on the Foundations of Software Engineering (FSE)*.

- **Paper**: [PDF](https://deniskim1.com/papers/fse26/paper.pdf)
- **Artifact**: [Zenodo](https://zenodo.org/records/17118200)
