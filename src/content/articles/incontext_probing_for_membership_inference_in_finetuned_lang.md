---
title: "In-Context Probing for Membership Inference in Fine-Tuned Language Models"
date: "2026-09-06"
type: "Paper Review"
description: "ICP-MIA uses in-context probing to estimate the Optimization Gap"
tags: ["Privacy"]
readingTime: 5
headerImage: "/images/news/incontext_probing_for_membership_inference_in_finetuned_lang.jpg"
paperUrl: "https://www.ndss-symposium.org/ndss-paper/in-context-probing-for-membership-inference-in-fine-tuned-language-models/"
---

![In-Context Probing for Membership Inference in Fine-Tuned Language Models](/images/news/incontext_probing_for_membership_inference_in_finetuned_lang.jpg)
*Figure from the paper “In-Context Probing for Membership Inference in Fine-Tuned Language Models” (p. 2)*

# Optimization Gap as a Black-Box Signal for Membership Inference in Fine-Tuned LLMs

## TLDR
*   **What**: ICP-MIA uses in-context probing to estimate the Optimization Gap.
*   **Who's at risk**: Fine-tuned LLMs adapted to sensitive, proprietary datasets.
*   **Key number**: On the HealthcareMagic dataset, ICP-MIA achieves an AUC of 0.942, surpassing ReCaLL (0.847) and Min-K% (0.837).

## The Intrinsic Flaw of Confidence Metrics
Existing black-box Membership Inference Attacks (MIAs) against LLMs struggle because they rely on raw confidence or negative log-likelihood (NLL) scores. The issue is that these signals are not pure indicators of membership; they are heavily entangled with the sample’s intrinsic properties, such as its content difficulty or rarity. For instance, an easy non-member sample might coincidentally have a lower NLL than a difficult member sample, leading to low signal-to-noise ratios and poor generalization. This means prior methods cannot reliably distinguish between a sample being "easy" and a sample being "seen." The prevailing black-box methods either require access to auxiliary/reference datasets (like those used in Likelihood Ratio Attack (LiRA) extensions), which rarely exist in real-world deployments using proprietary data, or they rely on empirical shifts induced by context prefixes, which lack a principled grounding in the model's training process.

## The Optimization Gap: A Principled Membership Signal
This paper introduces the Optimization Gap as a fundamental signal of membership, bridging the gap between training dynamics and inference-time attacks. The core insight stems from observing the phenomenon of diminishing returns during optimization. When an LLM is fine-tuned, it achieves rapid loss reduction early on, and this rate slows dramatically as training progresses. The Optimization Gap is defined as the remaining loss-reduction potential of a sample: $L(\theta^*; x, y) - L(\theta; x, y)$, where $\theta^*$ is the converged state and $\theta$ is the current state. At convergence, samples that were part of the training set (members) have already benefited from this optimization and exhibit minimal remaining loss-reduction potential, resulting in a small gap. Conversely, non-member samples retain significant potential for further optimization, yielding a larger gap.

## In-Context Probing (ICP) for Gap Estimation
To estimate this Optimization Gap in a black-box setting without retraining the model, the authors propose In-Context Probing (ICP). ICP simulates fine-tuning-like behavior at inference time by strategically constructing input contexts that act as demonstrations. ICP-MIA employs two complementary strategies for generating these probes. The first is a reference-data-based method, where semantically similar contexts are selected from external datasets. The second is a reference-free self-perturbation method, which uses only the target sample to generate probes via masking or generation. By observing how much the model’s confidence improves under these probing contexts—quantified as log-likelihood improvement—the framework obtains a practical, training-free estimate of the Optimization Gap. On the HealthcareMagic dataset, the distribution of log-likelihood improvements showed that Member samples had a Mean of $0.047$, while Non-Member samples had a Mean of $0.866$.

## Limitations
The effectiveness of ICP-MIA relies on the assumption that the training dynamics observed in the experiments (e.g., training on LLaMA3.2-3B-instruct with LoRA for five epochs) generalize to production fine-tuning regimes. The threat model is strictly black-box, assuming per-token log-probabilities are available via the API, which may not hold for all deployment environments. Furthermore, the performance gains observed are tied to the specific construction of the probes, and the paper does not extensively analyze the behavior when the target samples might have appeared in the base model's pre-training corpus.

## What practitioners should do
*   If auditing fine-tuned models, consider using in-context probing techniques to assess privacy risks rather than relying solely on raw confidence scores.
*   When implementing reference-free MIAs, understand that the signal is derived from the residual optimization potential, not just token difficulty.
*   If deploying models on sensitive data, evaluate the robustness of your chosen fine-tuning process by testing for membership inference using ICP-MIA principles.
*   Pay attention to the PEFT configuration used during fine-tuning, as the paper suggests this affects attack effectiveness.

## Verdict
Read this paper if you are an ML engineer or security researcher focused on practical privacy auditing of deployed LLMs; otherwise, skip it.

## Den's Take

This paper makes a compelling pivot by grounding membership inference in the concept of residual optimization potential, which moves beyond the noise inherent in raw confidence scores. However, the reliance on the "Optimization Gap" assumes a specific, quantifiable relationship between training convergence and inference behavior that feels overly deterministic. I predict that in real-world, highly constrained deployment environments—where fine-tuning might be truncated or utilize highly aggressive parameter-efficient tuning methods—the signal derived from ICP might degrade rapidly. The evaluation on the HealthcareMagic dataset, while showing a high AUC, doesn't address the practical limits of the black-box assumption; if API access prevents observing per-token log-probabilities, the core mechanism of ICP collapses. This is more of a theoretical advancement in signal identification than a ready-to-deploy defense blueprint.