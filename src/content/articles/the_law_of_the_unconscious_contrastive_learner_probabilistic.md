---
title: "The "Law" of the Unconscious Contrastive Learner: Probabilistic Alignment of Unpaired Modalities"
date: "2026-11-23"
type: "Paper Review"
description: "Proves that comparing representations from unpaired modalities can recover likelihood ratios"
tags: ["AI Security"]
readingTime: 5
headerImage: "/images/news/the_law_of_the_unconscious_contrastive_learner_probabilistic.jpg"
paperUrl: "https://arxiv.org/abs/2501.11326"
---

![The "Law" of the Unconscious Contrastive Learner: Probabilistic Alignment of Unpaired Modalities](/images/news/the_law_of_the_unconscious_contrastive_learner_probabilistic.jpg)
*Figure from the paper “The "Law" of the Unconscious Contrastive Learner: Probabilistic Alignment of Unpaired Modalities” (p. 8)*

# Probabilistic Alignment of Unpaired Modalities via Contrastive Representations

## TLDR
*   **What**: Proves that comparing representations from unpaired modalities can recover likelihood ratios.
*   **Who's at risk**: Systems relying on "plug-n-play" modality swapping in multi-modal AI.
*   **Key number**: The LogSumExp (LSE) method enables approximation when Assumption 3 fails.

## Bridging Modalities with Intermediate Representations
The practical appeal of contrastive learning is its supposed "plug-n-play" nature: if we align modality A with B, and B with C, we hope to use A and C together even if we never saw (A, C) pairs during training. This intuition is widely used for merging datasets with different modalities. However, prior work lacked a rigorous argument for when this technique is principled or when it fails. The core issue is whether these methods are implicitly performing the necessary marginalization over the latent space. The paper's analysis addresses this gap by moving beyond treating representations as simple mappings to viewing them probabilistically—as encoding likelihoods. The standard practice of jointly training encoders $\phi_A \leftrightarrow \phi_B$ and $\phi_B \leftrightarrow \phi_C$ under contrastive losses, like the symmetrized infoNCE objective, assumes this emergent alignment holds. The paper seeks to formalize the conditions under which this heuristic is mathematically sound.

## The "Law" of the Unconscious Contrastive Learner
The central theoretical contribution is Lemma 1, which shows that the proper Bayesian inference requires integrating over the intermediate modality $B$:
$$p(C | A)/p(C) = K_1 \cdot K_2 \cdot E_{\phi_B} [\exp\{f(\phi_A, \phi_B) + f(\phi_B, \phi_C)\}]$$
where $K_1, K_2$ respectively denote the constant multiplicative errors of $(\phi_A, \phi_B)$, $(\phi_B, \phi_C)$ in approximating the marginal density ratio from Assumption 2. This result holds for any choice of $f(\phi_1, \phi_2)$ that is consistent with Assumption 2. Assumption 1 states $A \perp C | B$, and Assumption 2 states that applying contrastive learning to the symmetrized InfoNCE objective results in representations that model a density ratio: $e^{f(\phi_A(A),\phi_B(B))} = p(B|A) \cdot p(B)$. Assumption 3 is the critical component: it requires that the marginal distribution of the representations $\phi_M$ is uniform over the hypersphere $S^{d-1}$.

## LogSumExp Approximation for Violated Assumptions
When Assumption 3 fails—which the experiments suggest happens with the dot product critic—the direct comparison $\phi_A(A)^\top \phi_C(C)$ is insufficient. The paper describes a practical and efficient approach for approximating the expectation in Lemma 1 with Monte Carlo samples. This involves sampling $\phi_i \sim p(\phi_B(B))$:
$$p(C | A)/p(C) \approx K \cdot \frac{1}{N} \sum_{i=1}^N \exp\{f(\phi_A, \Phi_i) + f(\Phi_i, \phi_C)\}$$
This approximation requires only Assumptions 1 and 2, bypassing the restrictive Assumption 3. Furthermore, precomputing a matrix $\Phi = [\phi_B, B \sim p(B)] \in \mathbb{R}^{N \times d}$ allows for efficient computation using a LogSumExp operation in deep learning libraries.

## Limitations
The theoretical grounding relies heavily on Assumptions 1 and 2, which impose strong geometric and probabilistic structures on the data and the learned representations. Specifically, Assumption 1 requires conditional independence $A \perp C | B$, which may not hold in complex, real-world multimodal datasets. Furthermore, the LSE method involves sampling error and approximation error from the contrastive learning itself, meaning the convergence to the exact ratio is asymptotic.

## What practitioners should do
*   If your pipeline relies on connecting modalities $A$ and $C$ through an intermediate modality $B$, verify if the "Law" holds for your chosen critic function.
*   If the dot product critic is used, expect Assumption 3 to be violated and plan for computation that accounts for this.
*   Implement the LogSumExp (LSE) method when bridging unpaired modalities to maintain theoretical rigor when Assumption 3 is suspect.
*   If your system uses unnormalized representations, consider the Gaussian marginal distribution case described in Lemma 3.

## Verdict
Read for ML engineers and researchers building multimodal systems, as it provides the first rigorous framework for justifying the "plug-n-play" assumption in contrastive learning.

## Den's Take

The paper establishes a necessary theoretical scaffolding for the "plug-n-play" intuition in multi-modal systems, which is valuable. However, the reliance on Assumption 1—that $A \perp C | B$—is a massive practical oversimplification. In any real-world system where modalities are extracted from a single, complex input stream, this conditional independence is unlikely to hold consistently. If the underlying assumption of independence is violated, the framework collapses, and the LSE approximation, while mathematically cleaner, merely masks the deeper representational failure. The authors do not adequately explore what happens when the dependencies are non-trivial but still structured, which is where most production data lives.