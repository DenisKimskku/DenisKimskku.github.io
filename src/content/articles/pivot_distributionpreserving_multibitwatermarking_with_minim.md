---
title: "PIVOT: Distribution-Preserving Multi-BitWatermarking with Minimax-Optimal Scoring"
date: "2026-11-20"
type: "Paper Review"
description: "Embeds recoverable multi-bit watermarks without altering output distribution"
tags: ["Watermarking"]
readingTime: 5
headerImage: "/images/news/pivot_distributionpreserving_multibitwatermarking_with_minim.jpg"
paperUrl: "http://arxiv.org/abs/2611.24109v1"
---

![PIVOT: Distribution-Preserving Multi-BitWatermarking with Minimax-Optimal Scoring](/images/news/pivot_distributionpreserving_multibitwatermarking_with_minim.jpg)
*Figure from the paper “PIVOT: Distribution-Preserving Multi-BitWatermarking with Minimax-Optimal Scoring” (p. 2)*

# PIVOT: Distribution-Preserving Multi-Bit Watermarking with Minimax-Optimal Scoring

## TLDR
*   **What**: Embeds recoverable multi-bit watermarks without altering output distribution.
*   **Who's at risk**: LLM outputs used for attribution or provenance tracking.
*   **Key number**: The paper establishes finite-sample recovery guarantees for complete-message recovery.

## The distributional footprint of encoding
Current state-of-the-art multi-bit watermarking increases payload capacity but often achieves this by modifying the next-token law. This perturbation leaves a payload-dependent distributional footprint, meaning the resulting text distribution $Q_{W^T}$ is not identical to the original unwatermarked distribution $Q_{W^T}$. While averaging over messages can mitigate this, the stronger requirement—that *every* fixed payload induces exactly the same text distribution—remains unmet by many prior methods. Furthermore, even with distribution preservation, determining how to aggregate weak, token-level evidence for multi-bit decisions is an open problem. Existing information-theoretic limits characterize general trade-offs but lack a concrete, model-free statistic implementable for a multi-bit channel.

## Mirrored rank-interval sampling
PIVOT introduces a mechanism that couples the message to the model sampling process while ensuring distribution preservation. At each generation step $t$, the secret key generates a scalar $U_t$ and a secret vocabulary permutation $\Pi_t$. The message bit $b \in \{0, 1\}$ dictates the ordering of next-token probability intervals. Specifically, if the probabilities $p_t(v)$ are ordered by their secret rank $r$ (from $0$ to $V-1$), the bit $b=0$ places these intervals in increasing secret-rank order, while $b=1$ places them in decreasing order. This mirroring around $1/2$ means the interval lengths—and thus all token marginal probabilities—remain unchanged, satisfying Theorem 1 (Distribution preservation). This coupling creates an opposite-signed dependence between the scalar $U_t$ and the sampled token's secret rank, which is the pivotal signal.

## Minimax-optimal score over $\Delta$-regular distributions
When decoding, the detector may not have access to the language model $P_t$, precluding likelihood-ratio tests. PIVOT circumvents this by basing detection on a pivotal statistic $X_t = (2U_t - 1) \left( \frac{2R_t}{V-1} - 1 \right)$, whose null distribution is invariant to $P_t$. For detection, the paper formulates the joint detection and recovery task as a multiple-hypothesis testing problem, deriving a moment-robust minimax-optimal score over a relaxed moment class.

## Limitations
The framework relies on Assumption 1 ($\Delta$-regular distributions), which excludes highly peaked, non-smooth probability distributions that might appear in specific deployment contexts. Furthermore, Theorem 2 optimizes binary detection within additive pivotal scores, which is a conservative approximation for the full complete-message recovery problem, which depends on pairwise confusion across the entire codebook.

## What practitioners should do
*   Use the moment-minimax score functions $h^*_0$ and $h^*_1$ for detection when model parameters are unavailable.
*   Tune the threshold $\tau^*_{\alpha,T}$ using the finite-sample bounds derived in Theorem 3 to control the false-positive rate $\alpha$.
*   When embedding payloads, utilize the fixed-block rank-based encoder (Algorithm 1) to ensure message-conditional distribution preservation.
*   For practical deployments, monitor the text quality metric $\Delta PPL$ to ensure the watermark embedding does not degrade utility beyond acceptable limits.

## Verdict
Read for ML engineers and security researchers interested in robust, distribution-preserving watermarking schemes; the derivation of the minimax score is highly technical but provides a rigorous, implementable framework.

---

## Den's Take

The paper presents a technically dense solution to the distribution-preservation problem in watermarking, which is a significant theoretical step forward. However, the reliance on $\Delta$-regular distributions—as noted in the limitations—is a practical Achilles' heel. In real-world LLM deployments, especially those using highly optimized or pruned models, the probability distributions are rarely smooth enough to satisfy this assumption. This restricts the claimed worst-case guarantees to an artificial subset of deployment scenarios. Furthermore, while the minimax score offers a path forward when the model parameters are unavailable, the paper frames this as a complete solution for recovery. I predict that while the detection mechanism may perform well under $\Delta$-regular conditions, the full end-to-end recovery fidelity across a diverse set of deployed models will remain fragile until the method addresses the complexities of pairwise confusion across the entire codebook, not just the binary detection threshold.