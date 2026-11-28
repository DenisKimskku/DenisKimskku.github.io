---
title: "Catastrophic Failure of LLM Unlearning via Quantization"
date: "2026-11-29"
type: "Paper Review"
description: "Catastrophic Failure of LLM Unlearning via Quantization"
tags: ["Machine Unlearning"]
readingTime: 5
headerImage: "/images/news/catastrophic_failure_of_llm_unlearning_via_quantization.jpg"
paperUrl: "https://arxiv.org/abs/2410.16454"
---

![Catastrophic Failure of LLM Unlearning via Quantization](/images/news/catastrophic_failure_of_llm_unlearning_via_quantization.jpg)
*Figure from the paper “Catastrophic Failure of LLM Unlearning via Quantization” (p. 2)*

# Quantization Reverses LLM Unlearning Gains

## TLDR
*   Quantization restores forgotten knowledge in unlearned LLMs.
*   Systems relying on post-training quantization for deployment are at risk.
*   For unlearning methods with utility constraints, the unlearned model retains an average of 21% of the intended forgotten knowledge in full precision, which significantly increases to 83% after 4-bit quantization.

## The Weight-Closeness Heuristic
Current machine unlearning methods generally aim to achieve forgetting while preserving utility. This is often done by imposing utility preservation constraints on a retain dataset, which consequently leads to very small learning rates and minimal changes to the model weights during optimization. This minimal weight change is the implicit assumption that allows these methods to function. The core problem this paper attacks is the hidden consequence of this assumption: when the unlearned model's weights are very close to the original target model's weights in full precision, applying quantization causes these weights to map to identical quantized values. This weight overlap makes the quantized unlearned model closely resemble the quantized target model, effectively undoing the forgetting process.

## Quantization as Knowledge Recovery
The mechanism of knowledge recovery is demonstrated by the shift in forgetting metrics when quantization is applied. For instance, as shown in Table 1, applying the unlearning method GA\_KLR on the BOOKS dataset (Shi et al., 2024b) results in the unlearned model retaining only 13% of its original knowledge. However, when the unlearned model undergoes quantization, knowledge retention recovers to approximately 89%.

## Module-Level Saliency Maps
To mitigate the side effects of using a large learning rate for unlearning, the authors extend the concept of localization-informed unlearning methods (Fan et al., 2024b; Meng et al., 2022; Wu et al., 2023; Wei et al., 2024) by constructing module-level saliency maps to guide the unlearning process, selectively updating only the most influential components related to the data to be forgotten. Our empirical results show that this targeted strategy helps mitigate the risks of aggressive updates, preserves the model’s utility, and ensures a more balanced unlearning outcome. However, this framework is highly sensitive to hyperparameter selection, leading to an unstable unlearned model.

## Limitations
The paper focuses heavily on the interaction between existing unlearning methods and post-training quantization (PTQ). Threat models outside the context of knowledge memorization recovery are not explored. Furthermore, the proposed mitigation framework is noted as being highly sensitive to hyperparameter selection, suggesting that achieving stable, robust unlearning in production environments remains challenging.

## What practitioners should do
*   If you are deploying LLMs using post-training quantization, assume any prior unlearning steps may have been reversed.
*   When selecting unlearning methods, consider the stability of the resulting model post-quantization.
*   If using regularization techniques to preserve utility, be aware that minimal weight changes increase quantization vulnerability.
*   Benchmark unlearning effectiveness using quantization-aware evaluation, not just full-precision metrics.

## Verdict
Read this paper if you are working on LLM privacy, model compression, or machine unlearning; skim it if your deployment pipeline does not involve quantization.

---

## Den's Take

The authors correctly identify a significant blind spot: that the mathematical success of unlearning in full precision is practically meaningless if the deployment pipeline immediately compresses the weights. However, the paper seems to understate the severity of the interaction. If the weight-closeness heuristic is accurate, then any defense relying on minimal weight perturbation to achieve forgetting is inherently fragile against standard deployment optimization practices. This isn't just a metric discrepancy; it implies that the *concept* of "forgotten" knowledge is ephemeral unless the entire inference stack is designed to remain high-precision.