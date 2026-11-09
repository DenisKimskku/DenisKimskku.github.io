---
title: "Can Watermarked LLMs be Identified by Users via Crafted Prompts?"
date: "2026-11-10"
type: "Paper Review"
description: "Water-Probe detects hidden watermarks by comparing output distribution differences across prompts"
tags: ["Watermarking", "Vulnerabilities"]
readingTime: 5
headerImage: "/images/news/can_watermarked_llms_be_identified_by_users_via_crafted_prom.jpg"
paperUrl: "https://arxiv.org/abs/2410.03168"
---

![Can Watermarked LLMs be Identified by Users via Crafted Prompts?](/images/news/can_watermarked_llms_be_identified_by_users_via_crafted_prom.jpg)
*Figure from the paper “Can Watermarked LLMs be Identified by Users via Crafted Prompts?” (p. 2)*

# Water-Probe: Identifying LLM Watermarks via Cross-Prompt Consistency

## TLDR
*   **What**: Water-Probe detects hidden watermarks by comparing output distribution differences across prompts.
*   **Who's at risk**: LLM service providers deploying watermarked models for commercial use.
*   **Key number**: Water-Probe achieves high detection accuracy across different LLMs, watermarking methods, and sampling settings, while maintaining a low false positive rate for non-watermarked LLMs.

## The Imperceptibility Gap
Current work on text watermarking focuses heavily on making the individual watermarked outputs indistinguishable from unwatermarked text, ensuring high detectability and minimal text quality impact. However, this focus ignores a critical real-world constraint: the imperceptibility of the *service* itself. If users can discern whether an LLM is watermarked simply by interacting with it, providers may hesitate to deploy these features due to perceived user friction or increased vulnerability to attacks. While some prior studies explore cracking watermarks using large volumes of text, these approaches assume the LLM is already watermarked and cannot perform the initial detection step. The gap this paper addresses is determining if an end-user can identify the presence of a watermark solely through carefully crafted prompts, even if the individual output samples appear normal.

## Consistency of Watermark Effect
The core insight enabling detection lies in the premise that all existing LLM watermarking algorithms introduce a consistent, repeatable bias when sampled under the exact same watermark key. This means that if an LLM is watermarked, the *difference* in output distributions caused by two different watermark keys ($\Delta$) should be consistent across different inputs, provided those inputs are highly similar. The paper formalizes this with Theorem 1, which states that for prompts $x_1$ and $x_2$ whose original distributions $PM(\cdot|x_i)$ are close (i.e., $\text{KL}(PM(\cdot|x_1)||PM(\cdot|x_2)) \le \epsilon$), the expected similarity between the difference vectors $\Delta(x_1, k_1, k_2)$ and $\Delta(x_2, k_1, k_2)$ must be high ($\ge \rho$). This consistency across inputs is what Water-Probe exploits, moving beyond simple sample analysis.

## Water-Probe-v2 and Water-Bag
The mechanism of Water-Probe involves three steps: first, constructing $N$ highly correlated prompts $\{x_1, x_2, \dots, x_N\}$ such that their original distributions are close; second, estimating the watermarked distributions $\hat{P}_F^M(y|x_i, k_j)$ using repeated sampling; and third, calculating the average similarity $\bar{S}$ between the rank-transformed differences $\Delta_R$. The paper proposes two prompting strategies: Watermark-Probe-v1 (using irrelevant prefix generation) and Watermark-Probe-v2 (using quasi-random token generation to simulate fixed-key sampling). To counter the inherent trade-off where increasing key randomness harms detectability, the authors introduce Water-Bag, which enhances imperceptibility by merging multiple watermark keys into one.

## Limitations
The threat model primarily covers black-box identification based on distribution differences. The paper does not explore scenarios where the watermark rule $F$ might violate the assumed Lipschitz continuity, which is essential for Theorem 1. Furthermore, the effectiveness of the sampling techniques, particularly in ensuring the calculated $\bar{S}$ accurately reflects the true expected similarity, depends on the assumption that the underlying LLM behaves predictably even when the watermark key is not explicitly known.

## What practitioners should do
*   If deploying watermarking, be aware that cross-prompt consistency analysis (Water-Probe) can reveal the watermark's presence.
*   When designing watermarking schemes, consider the trade-off between detectability and imperceptibility, as suggested by the Water-Bag mechanism.
*   For systems relying on fixed-key-list watermarking, use prompting techniques like Watermark-Probe-v2 to approximate same-key sampling.
*   Rigorously test for watermark presence using high-confidence z-scores ($z > 10$) before assuming a model is clean.

## Verdict
Read this paper if you are working on LLM watermarking defense or offensive prompt engineering; otherwise, skip it.

## Den's Take

The paper establishes that consistency across prompts is the weak point in current watermarking efforts, allowing for detection even when individual outputs look clean. However, the research seems overly focused on the statistical feasibility of detection ($\bar{S} \ge 0.813$) rather than the practical adversarial effort required by an attacker. The authors treat the attacker as a passive analyst running a benchmark, not as an active adversary trying to evade detection. If a service provider implements a robust defense, such as dynamic key switching or rapid key rotation, the assumption of stable, repeatable bias ($\Delta$) across prompts—the foundation of Water-Probe—will break down entirely. This suggests that the real vulnerability isn't the statistical signature, but the *implementation* of the watermarking key management itself.