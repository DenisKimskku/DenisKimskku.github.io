---
title: "Reconciling Privacy with Provenance for Language Model Watermarks"
date: "2026-11-06"
type: "Paper Review"
description: "Locally differentially private watermarking via sequence-level bias"
tags: ["Privacy", "Watermarking"]
readingTime: 5
headerImage: "/images/news/reconciling_privacy_with_provenance_for_language_model_water.jpg"
paperUrl: "http://arxiv.org/abs/2611.06100v1"
---

![Reconciling Privacy with Provenance for Language Model Watermarks](/images/news/reconciling_privacy_with_provenance_for_language_model_water.jpg)

# Red-Green Sequence Watermarking for Privacy-Preserving Provenance Estimation

## TLDR
*   **What**: Locally differentially private watermarking via sequence-level bias.
*   **Who's at risk**: Deployments requiring content provenance while respecting user privacy.
*   **Key number**: 0.0019 MSE with $\epsilon=1$ on C4 language modeling tasks.

## Shifting the Goal from Individual Tracking to Aggregate Estimation
Watermarking provides a mechanism for content provenance by embedding signals into generated text, offering a false positive guarantee if the detection key is kept secret. However, the drive for high-powered, individual text tracking has created tension with user privacy. Deployments have faced accusations of surveillance, and users actively employ evasion strategies, such as paraphrasing, which can erase the watermark signal. This leads to a self-defeating cycle where increased watermark precision prompts user behavior that undermines detection efficacy. The paper addresses this by asserting that many regulatory goals only require tracking usage at the population level, not at the individual text level. This shift allows for the design of watermarks that preserve individual privacy while still enabling accurate estimation of overall usage prevalence. Prior methods, like standard token-level watermarks, prioritize maximizing the detection signal, which is incompatible with strong privacy guarantees.

## Sequence-Level Bias over Token-Level Leakage
The core innovation in the Red-Green Sequence (RGS) watermark is moving the biasing mechanism from the token level to the sequence level. In non-private watermarking, token-level bias provides an exponentially strong signal, which is computationally expensive and unnatural for sequence-level tasks. Conversely, token-level watermarks present a privacy challenge because they leak a high-dimensional bit string—a sequence of red-green labels—which is difficult to keep private. By operating at the sequence level, RGS encodes exactly one red-green bit per sequence. This minimal information leakage aligns with the requirements of locally differentially private frequency estimation, which suggests that the optimal estimator requires only one bit of information to be leaked. This sequence-level choice makes the watermarking mechanism far more natural within the constraints of local differential privacy settings.

## RGS Generation via Parallel Sampling or Rejection Sampling
The RGS watermark is constructed by modifying the standard red-green list construction to satisfy $\epsilon$-local DP. Instead of a fixed offset determined by a strength parameter $\delta$, RGS uses a reweighting term $Q_G/P_G$ explicitly set to attain the target privacy budget on the green or red list probability ratio. This mechanism is implemented using two primary sampling algorithms. The parallel sampler draws $M$ candidate completions from the base model, partitions them into green and red bins based on a keyed hash function $h_k$, and then reweights them according to the privacy constraints. The rejection sampler (Algorithm 2) achieves computational efficiency by sampling independently and returning a sequence only if it is green, or returning it with probability $e^{-\epsilon}$ if it is red.

## Limitations
The threat model primarily focuses on estimating aggregate prevalence from a mixture of watermarked and unwatermarked texts. The paper assumes mutual independence of texts conditional on the set of watermarking keys and the true prevalence. The construction relies on the ability to draw multiple parallel samples ($M$) or utilize rejection sampling, which may not be feasible or efficient in all constrained production environments.

## What practitioners should do
*   If deploying watermarking for provenance, evaluate the requirement: is individual tracking necessary, or is aggregate usage estimation sufficient?
*   When designing DP watermarks, prioritize sequence-level encoding over token-level encoding to manage the dimensionality of leaked information.
*   For practical implementation, consider the computational trade-off between the parallel sampler (which achieves a larger green probability in the infinite budget limit) and the rejection sampler (which offers better computational efficiency by stopping early).
*   Be aware that watermarking strength per sequence is inherently low, requiring robust downstream estimation techniques.

## Verdict
Read this paper if you are building or auditing AI provenance systems under strict privacy constraints; otherwise, skip it.

## Den's Take

The paper correctly identifies the tension between individual provenance and privacy, but it frames the solution—shifting to aggregate estimation—as a complete resolution. I disagree with this framing. Moving to sequence-level bias, while respecting local differential privacy constraints, fundamentally trades signal strength for privacy robustness. The resulting watermark strength per sequence is inherently low, as the authors admit. This suggests that the utility of the resulting provenance signal will be extremely fragile, requiring the downstream estimation techniques to be near-perfect to avoid high false-negative rates. This fragility is a systemic risk: if the downstream estimators fail to account for the inherent low-fidelity of the RGS signal, the entire provenance effort collapses, regardless of the DP guarantees achieved at the generation stage.