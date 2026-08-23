---
title: "Explanation as a Watermark: Towards Harmless and Multi-bit Model Ownership Verification via Watermarking Feature Attribution"
date: "2026-08-24"
type: "Paper Review"
description: "Implants multi-bit watermarks into feature attribution explanations"
tags: ["Backdoors", "Watermarking"]
readingTime: 5
headerImage: "/images/news/explanation_as_a_watermark_towards_harmless_and_multibit_mod.jpg"
---

![Explanation as a Watermark: Towards Harmless and Multi-bit Model Ownership Verification via Watermarking Feature Attribution](/images/news/explanation_as_a_watermark_towards_harmless_and_multibit_mod.jpg)
*Figure from the paper “Explanation as a Watermark: Towards Harmless and Multi-bit Model Ownership Verification via Watermarking…” (p. 5)*

# Explanation as a Watermark: Multi-bit Ownership Verification via Feature Attribution

## TLDR
*   **What**: Implants multi-bit watermarks into feature attribution explanations.
*   **Who's at risk**: Owners of proprietary Deep Learning models deployed via APIs.
*   **Key number**: Not provided in the abstract/introduction, but aims for harmlessness without prediction change.

## The Limitations of Zero-Bit Watermarks
Existing methods for model ownership verification rely heavily on implanting a secret pattern into the model's predictions, forming a "zero-bit" watermark. This paradigm has two severe flaws. First is harmfulness: the embedded backdoor triggers induce misclassification behaviors, creating a concealed threat. Second is ambiguity: because the methods rely on the model being misclassified, adversaries can easily find naturally misclassified samples to falsely verify ownership. The core issue, as the paper posits, is that these zero-bit schemes only check for the *status* (misclassified or not) of the prediction, which is insufficient for robust, non-invasive verification.

## Feature Attribution as a Carrier Space
The paper's central idea pivots away from the prediction space entirely. Instead of altering the model's output logits, EaaW leverages the output of Explainable Artificial Intelligence (XAI) techniques, specifically feature attribution. Feature attribution methods quantify the importance of each input feature relative to the model's final prediction. By using this explanation—the feature importance scores—as the carrier, the system can embed a "multi-bit" watermark. This allows the embedding of rich, distinct information without forcing the model to change its original, intended prediction for a given input.

## Watermark Embedding and Extraction Algorithms
The EaaW framework operates in three stages: embedding, extraction, and verification. During embedding, the model owner modifies the model parameters $\Theta$ to incorporate the watermark $W \in \{-1, 1\}^k$ while ensuring the model's functionality remains preserved. The extraction process is model-agnostic and inspired by LIME [51]. Subsequently, the model owner can extract the watermark inside the model by inputting the trigger sample and employing the feature attribution algorithm.

## Limitations
The paper focuses on the black-box setting where only API access is available. It does not extensively detail the robustness against sophisticated, adaptive watermark removal attacks beyond stating the goal of resistance. The success relies on the assumption that the feature attribution method used during extraction (inspired by LIME) provides a stable and unique representation of the embedded information.

## What practitioners should do
*   If deploying models via API, investigate XAI toolkits to see if feature attribution explanations can serve as a novel verification channel.
*   When designing proprietary models, consider the security trade-off between prediction-based watermarks and explanation-based watermarks to mitigate backdoor risks.
*   If using a model that supports feature attribution, test its stability when minor input perturbations are applied to the trigger samples.

## Verdict
Read this paper if you are an ML engineer or security researcher focused on intellectual property protection for deployed, black-box AI models. Otherwise, it is likely too specialized.

## Den's Take

The paper proposes a shift from prediction-space watermarking to using feature attribution explanations as the carrier, which is a necessary conceptual move away from the inherent problems of zero-bit methods. However, the reliance on local sampling and fitting a linear model during extraction introduces a significant, unaddressed fragility. The stability of the resulting watermark component hinges entirely on the consistency of the local approximation provided by the chosen XAI technique.