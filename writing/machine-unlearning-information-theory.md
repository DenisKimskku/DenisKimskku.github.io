---
title: "An Information Theoretic Approach to Machine Unlearning"
date: "2025-08-06"
type: "Research"
description: "A deep dive into zero-shot machine unlearning using information theory and gradient-based smoothing techniques"
tags: ["machine-learning", "unlearning", "information-theory"]
---
# An Information Theoretic Approach to Machine Unlearning

## Problem Setting: Zero-Shot Machine Unlearning

The paper addresses **zero-shot machine unlearning**, where only a trained model $f_\theta$ and a forget set $D_f$ are available - no access to the original training data $D_r$ (retain set). This is significantly more challenging than traditional unlearning scenarios.

**Zero-shot constraint**: Given only $f_\theta$ and $D_f$, produce $f_{\theta'}$ such that $f_{\theta'} \approx f_{\theta^*}$, where $f_{\theta^*}$ is a model retrained from scratch on $D_r = D \setminus D_f$.

![Figure1](figure1.png)

## Central Hypothesis: Information Gain and Forgetting Difficulty

### Information-Theoretic Foundation

The core insight connects **information gain** to **unlearning difficulty**:

- **Low information samples**: Can be inferred from neighboring data, easier to forget
- **High information samples**: Cannot be inferred from context, harder to forget without damaging the model

### Formal Definitions

**Definition 4.1 (Neighbourhood of a sample)**:
For $x \in X \subseteq \mathbb{R}^d$ and radius $r > 0$:

$$
B_r(x) = \{z \in X : \|z - x\| \leq r\}
$$

**Definition 4.2 (Information of a sample)**:

$$
\alpha(x) = \frac{1}{|B_r(x)|} \sum_{z \in B_r(x)} \mathbb{I}\{c(z) = c(x)\}
$$

where $\mathbb{I}\{\cdot\}$ is the indicator function and $c(x)$ denotes the class label.

- **Low information**: $\alpha(x) \geq \tau$ (high neighborhood class homogeneity)
- **High information**: $\alpha(x) < \tau$ (low neighborhood class homogeneity)

## Key Geometric Insight: Gradient Fields and Decision Boundaries

### Connection to Model Geometry

The paper establishes that **information gain correlates with local gradient magnitude**:

- **Low information regions**: Small gradients, flat classifier response
- **High information regions**: Large gradients, steep classifier boundaries

For a well-trained classifier, if $f_\theta(x_l) \approx f_\theta(\hat{x}_l)$ for all $\hat{x}_l \in B_r(x_l)$ (low information case), then:

$$
\frac{\partial f_\theta}{\partial x}\bigg|_{x_l} \text{ is small}
$$

### Boundary Movement Principle

**Core geometric principle**: Removing samples from different gradient regions affects decision boundaries differently:

- **Low-gradient regions**: Minimal boundary change upon sample removal
- **High-gradient regions**: Significant boundary shifts upon sample removal

![Figure2](figure2.png)

## JiT Algorithm: Gradient-Based Smoothing

### Core Loss Function

The **Just in Time (JiT)** loss minimizes local gradients around forget samples:

$$
\ell = \mathbb{E}\left[\frac{\|f_\theta(x) - f_\theta(x + \xi)\|_2}{\|x - (x + \xi)\|_2}\right]
$$

where $\xi \sim \mathcal{N}(0, \sigma^2 I)$.

### Practical Implementation

Since exact gradients are computationally expensive, JiT uses a **first-order approximation**:

$$
\ell \approx \frac{1}{N}\sum_{j=1}^{N}\frac{\|f_\theta(x) - f_\theta(x + \xi_j)\|_2}{\|\xi_j\|_2}
$$

**Algorithm**: For each $x \in D_f$:

1. Generate $N$ noise vectors: $\xi_j \sim \mathcal{N}(0, \sigma^2 I)$
2. Compute perturbed inputs: $x'_j = x + \xi_j$
3. Calculate local gradient approximation: $k_j = \frac{\|f_\theta(x) - f_\theta(x'_j)\|_2}{\|\xi_j\|_2}$
4. Update parameters: $\theta \leftarrow \theta - \eta \nabla_\theta \left(\frac{1}{N}\sum_{j=1}^N k_j\right)$

## Theoretical Justification: Why Gradient Smoothing Works

### Lipschitz Continuity Connection

The method is motivated by **Lipschitz continuity** concepts. For a Lipschitz continuous function:

$$
\|f_\theta(x) - f_\theta(y)\|_p \leq L \|x - y\|_p
$$

By minimizing the local Lipschitz constant around forget samples, JiT:

1. **Smooths high-gradient regions**: Moves decision boundaries away from high-information samples
2. **Preserves low-gradient regions**: Maintains generalization for low-information samples

### Boundary Movement Mechanism

**Key insight**: Neural networks typically exhibit:

- **Sharp boundaries** with large gradients at decision surfaces
- **Flat regions** within class clusters

Given noise vectors $\xi_i$ (toward boundary) and $\xi_j$ (away from boundary):

$$
\frac{\partial f_\theta}{\partial x}\bigg|_{x+\xi_i} > \frac{\partial f_\theta}{\partial x}\bigg|_{x+\xi_j}
$$

Minimizing Equation (1) preferentially moves boundaries **toward** forget samples, increasing prediction uncertainty.

![Figure3](figure3.png)

## Experimental Validation: Entropy Analysis

### Entropy Similarity Principle

**Hypothesis**: Effective unlearning should match the entropy distribution of a retrained model.

For forget set $D_f$, compare entropy distributions:

- **Original model**: $H_{orig}(D_f) = -\sum_{i} p_i \log p_i$ where $p_i = f_\theta(x_i)$
- **JiT unlearned**: $H_{JiT}(D_f)$
- **Retrained model**: $H_{retrain}(D_f)$

**Result**: Statistical test shows no significant difference between $H_{JiT}(D_f)$ and $H_{retrain}(D_f)$ (p=0.10).

![Figure4](figure4.png)

## Advantages of the JiT Approach

### 1. **Principled Foundation**

- Information-theoretic motivation
- Geometric interpretation through gradient fields
- Connection to Lipschitz continuity

### 2. **Computational Efficiency**

- **Complexity**: $O(N|D_f|)$ where $N$ is perturbations, $|D_f|$ is forget set size
- **Single pass**: No iterative optimization over retain set
- **5× faster** than competing zero-shot methods

### 3. **Generality**

- Works for **full-class**, **sub-class**, and **random** forgetting scenarios
- Model-agnostic (tested on ViT, VGG, ResNet)
- No architectural constraints (beyond batch normalization issues)

### 4. **Empirical Effectiveness**

- Competitive with state-of-the-art zero-shot methods
- Reasonable performance compared to non-zero-shot methods despite significant disadvantage

## Limitations and Open Questions

### 1. **Theoretical Gaps**

- Incomplete connection between neighborhood homogeneity $\alpha(x)$ and formal information theory
- No convergence guarantees for gradient approximation
- Missing privacy or forgetting certificates

### 2. **Practical Constraints**

- **Hyperparameter sensitivity**: $\sigma$ and $\eta$ require careful tuning
- **Batch normalization incompatibility**: Changes single-sample to batch processing
- **Approximation quality**: Finite-sample gradient estimation may be poor

### 3. **Scalability Questions**

- Largest experiments: ~300M parameters
- Unknown behavior on modern large language models (1B+ parameters)
- Noise perturbation effectiveness may degrade with model robustness

The JiT approach represents a novel direction in machine unlearning by bridging information theory, differential geometry, and practical algorithm design, though several theoretical and practical challenges remain to be addressed.
