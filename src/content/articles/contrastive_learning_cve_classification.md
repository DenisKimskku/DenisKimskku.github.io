---
title: "Contrastive Learning for Code Vulnerability Type Classification"
date: "2025-05-13"
type: "Paper Review"
description: "A comprehensive analysis of hierarchical contrastive learning approaches for classifying code vulnerabilities into CWE types, addressing long-tail distribution, class isolation, and input length limitations."
tags: ["Vulnerability Detection", "Contrastive Learning", "CWE Classification", "Code Security", "Deep Learning"]
---

# Contrastive Learning for Code Vulnerability Type Classification

Automated vulnerability detection has become increasingly critical as software systems grow in complexity. While detecting *whether* code contains vulnerabilities is important, understanding *what type* of vulnerability exists is equally crucial for effective remediation. This article examines the work "Applying Contrastive Learning to Code Vulnerability Type Classification" by Chen Ji et al. (HangZhou Institute of Technology), presented at EMNLP 2024, which proposes a novel hierarchical contrastive learning approach to classify vulnerabilities into their corresponding Common Weakness Enumeration (CWE) categories.

---

## Understanding CVEs and CWEs

Before diving into the technical approach, it's essential to understand the vulnerability classification ecosystem.

### CVE: Common Vulnerabilities and Exposures
A **CVE** is a standardized identifier for publicly known cybersecurity vulnerabilities in software and hardware. Each CVE entry contains a description, severity score (CVSS), and affected products.

### CWE: Common Weakness Enumeration
A **CWE** represents a categorized list of software and hardware weakness types that can lead to security vulnerabilities. CWEs form a hierarchical taxonomy, with abstract weakness categories at the top and specific variants at the bottom.

For example, **CWE-122 (Heap-based Buffer Overflow)** describes vulnerabilities where:
- Missing boundary checks allow out-of-bound access
- Heap buffer overflow corrupts adjacent heap metadata
- Fixes include proper allocation and bounded copy functions

---

## The Classification Challenges

![Long-tail distribution of CWE types showing most vulnerabilities belong to a small subset of CWE-IDs.](/images/250513/long_tail_distribution.png)

The paper identifies three fundamental challenges in vulnerability type classification:

### 1. Long-tail Distribution
Most vulnerabilities belong to a small subset of CWE-IDs. As shown in the figure above, the distribution follows a steep power law—a few CWE types (like CWE-79, CWE-89, CWE-787) dominate the dataset while hundreds of others have minimal representation. This leads to:
- Poor generalization to rare vulnerability types
- Unstable model performance
- Bias toward frequently occurring classes

### 2. Class Isolation
Current methods treat each CWE class independently, ignoring the inherent **hierarchical relationships** between vulnerability types.

![The CWE hierarchy refinement chain showing relationships from Pillar to Variant abstraction levels.](/images/250513/cwe_hierarchy.png)

The CWE taxonomy organizes weaknesses in a parent-child hierarchy:

| Level | Type | Example CWE | Description |
|-------|------|-------------|-------------|
| 1 | Pillar | CWE-664 | Improper Control of a Resource Through its Lifetime |
| 2 | Class | CWE-118 | Incorrect Access of Indexable Resource |
| 3 | Class | CWE-119 | Improper Restriction of Operations within Bounds of a Memory Buffer |
| 4 | Base | CWE-825 | Expired Pointer Dereference |
| 5 | Variant | CWE-415 | Double Free |

A vulnerability classified as **CWE-415 (Double Free)** shares semantic similarity with **CWE-416 (Use After Free)**—both involve memory management issues under the same parent hierarchy. Traditional approaches ignore these relationships.

### 3. Input Length Limitation
Transformer-based models truncate long inputs, typically at 512 tokens. However, approximately **73% of vulnerability code in the BigVul dataset exceeds standard model limits**. Critical vulnerability patterns may exist beyond the truncation boundary.

---

## The Proposed Architecture

![The complete architecture showing BPE tokenization, max-pooling, hierarchical contrastive learning, and classification components.](/images/250513/architecture.png)

The proposed method consists of five key components:

### 1. Label Expanding
Each CWE is mapped to a 5-level hierarchical label path. For example:
- CWE-415 path = {664, 118, 119, 825, 415}
- CWE-119 path = {664, 118, 119, 119, 119} (expanded when depth < 5)

This expansion enables the model to learn at multiple abstraction levels.

### 2. BPE Tokenization
Source code is processed using Byte Pair Encoding (BPE) tokenization, which handles programming language syntax effectively.

### 3. Max-Pooling for Long Inputs
To address input length limitations:
- Split code into multiple 512-token chunks
- Process each chunk through the pre-trained model
- Apply max-pooling across chunk representations
- Result: Effective handling of 1024+ token inputs

### 4. Hierarchical Contrastive Learning
The core innovation applies contrastive learning **progressively through hierarchy levels**:

1. **Level 1 (Pillar)**: Learn to distinguish between high-level categories
2. **Levels 2-4**: Progressively refine to more specific categories
3. **Level 5 (Variant)**: Final fine-grained classification

This approach reduces the long-tail problem at each level—higher abstraction levels have more balanced class distributions.

### 5. Classification
An MLP classifier produces the final CWE prediction based on the enhanced code representation.

---

## Contrastive Learning Formulation

### Self-supervised Contrastive Loss
The self-supervised loss learns by distinguishing between similar and dissimilar examples:

```
L^self = -∑_{i∈I} log [exp(z_i · z_{j(i)}/τ) / ∑_{a∈A(i)} exp(z_i · z_a/τ)]
```

Where:
- **z**: Model output embeddings
- **τ**: Temperature parameter
- **j(i)**: Augmented version of sample i (positive pair)
- **A(i)**: All other samples (negative pairs)

### Supervised Contrastive Loss
Extends self-supervised learning by incorporating class labels:

```
L_i^sup = -(1/|P(i)|) ∑_{j∈P(i)} log [exp(z_i · z_j/τ) / ∑_{k≠i} exp(z_i · z_k/τ)]
```

Where **P(i) = {j ≠ i | ỹ_j = ỹ_i}** contains samples with the same class label.

### Geometric Spread: Preventing Class Collapse
A critical issue with supervised contrastive learning is **class collapse**—all samples from the same class collapse to identical embeddings, reducing intra-class variation and model robustness.

The solution combines supervised and self-supervised losses:

```
L = (1 - λ - μ)L^CE + λL_i^sup + μL^self
```

With default values μ = 0.2, λ = 0.3, this formulation:
- Maintains class-level discrimination
- Preserves individual sample distinctions
- Prevents embedding collapse

---

## Experimental Evaluation

### Datasets
| Dataset | Description | Size |
|---------|-------------|------|
| Big-Vul | Vulnerable functions from open-source projects | 8,782 functions, 88 CWE categories |
| PrimeVul | Higher quality dataset with more accurate labels | Curated subset |

### Baselines
- **Code LMs**: CodeBERT, GraphCodeBERT, CodeGPT
- **Vulnerability Models**: VulExplainer, LIVABLE
- **Detection Models**: Devign, ReGVD

### Results

![Experimental results comparing the proposed method against baselines across different hierarchy tiers and datasets.](/images/250513/results.png)

| Method | Tier 5 Acc (Big-Vul) | Weighted F1 (Big-Vul) | Acc (PrimeVul) | Weighted F1 (PrimeVul) |
|--------|---------------------|----------------------|----------------|----------------------|
| CodeBERT | 63.19 | 43.07 | 48.98 | 28.54 |
| GraphCodeBERT | 62.27 | 62.74 | 45.77 | 35.90 |
| VulExplainer | 66.09 | 62.93 | 53.14 | 38.32 |
| LIVABLE | 64.01 | 64.36 | 53.04 | 36.02 |
| **Ours (CodeBERT)** | **69.06** | **65.34** | **58.12** | **41.24** |
| Ours (GraphCodeBERT) | 67.13 | 62.94 | 56.60 | 38.07 |

Key observations:
- The proposed method achieves **69.06% accuracy** on Big-Vul (Tier 5), outperforming all baselines
- Weighted F1 improves by **2-3 points** across datasets
- Performance gains are consistent across different backbone models

### Comparison with Commercial LLMs

The paper also evaluates GPT-4o on the same task:

| Prompt Setting | Random Acc | True Acc | False Acc |
|----------------|------------|----------|-----------|
| Zero-shot | 22% | 25% | 16% |
| Two-shot | 34% | 23% | 27% |
| Chain-of-Thought | 24% | 30% | 25% |

Commercial LLMs significantly underperform compared to specialized models, demonstrating the value of task-specific architectures for vulnerability classification.

---

## Ablation Study

The ablation study reveals the contribution of each component:

| HCL | USCL | MP | Acc (Big-Vul) | Acc (PrimeVul) |
|-----|------|-----|---------------|----------------|
| ✗ | ✗ | ✗ | 63.19 | 48.98 |
| ✓ | ✗ | ✗ | 66.92 | 53.13 |
| ✓ | ✓ | ✗ | 68.31 | 57.10 |
| ✗ | ✗ | ✓ | 63.24 | 49.42 |
| ✓ | ✗ | ✓ | 67.03 | 53.49 |
| ✓ | ✓ | ✓ | **69.06** | **58.12** |

Where:
- **HCL**: Hierarchical Contrastive Learning
- **USCL**: Unsupervised Contrastive Learning (for geometric spread)
- **MP**: Max-Pooling

Each component contributes meaningfully, with the full combination achieving the best performance.

---

## Strengths and Limitations

### Strengths
- **Hierarchy Utilization**: Effectively leverages the CWE hierarchical structure to address class isolation
- **Robust Representation**: Geometric spread prevents class collapse while maintaining discriminative power
- **Long Input Handling**: Max-pooling enables processing of longer code segments

### Limitations
- **Length Constraints**: Still struggles with very long code (>1024 tokens, ~26% of samples)
- **Rare CWE Coverage**: May have difficulties with extremely rare CWE types
- **Function Isolation**: Vulnerable functions are often deeply nested in call chains that span multiple functions

---

## Future Directions

### Transfer Learning for Rare CWEs
Leverage knowledge from well-represented CWE types to improve classification of rare vulnerability categories.

### Interprocedural Analysis
Current approaches analyze functions in isolation. Many vulnerability patterns span across multiple functions through caller-callee relationships. Future work could:
- Create graph representations where nodes are functions and edges represent caller-callee relationships
- Apply contrastive learning at both function and interprocedural levels
- Pull together representations of function pairs exhibiting similar vulnerability patterns across call paths

### Agent-based Classification
Deploy specialized agents expert in specific CWE categories that communicate and collaborate to reach classification decisions—an A2A (Agent-to-Agent) approach for vulnerability analysis.

---

## Conclusion

This work demonstrates that vulnerability type classification benefits significantly from:
1. **Hierarchical structure awareness**: The CWE taxonomy provides valuable semantic information that traditional flat classifiers ignore
2. **Balanced learning objectives**: Combining supervised and self-supervised contrastive losses prevents representation collapse while maintaining discriminative power
3. **Practical input handling**: Max-pooling enables processing of realistic code lengths

The proposed approach achieves state-of-the-art results on vulnerability type classification benchmarks, outperforming both specialized vulnerability models and general-purpose code language models. As software security becomes increasingly critical, such fine-grained vulnerability understanding will prove essential for automated remediation and secure development practices.

---

**Reference**: Ji et al., "Applying Contrastive Learning to Code Vulnerability Type Classification," *EMNLP*, 2024.

---

- **Paper**: [EMNLP 2024](https://aclanthology.org/2024.emnlp-main.666.pdf)

---

- **Slide**: [0513_Contrastive_CVE.pdf](https://deniskim1.com/lab-meeting/0513_Contrastive_CVE.pdf)


