---
title: "LLMScan: Causal Scan for LLM Misbehavior Detection"
date: "2026-08-31"
type: "Paper Review"
description: "Causal inference applied to LLM internal activity for monitoring"
tags: ["Jailbreaking", "Backdoors", "Adversarial Attacks"]
readingTime: 5
headerImage: "/images/news/llmscan_causal_scan_for_llm_misbehavior_detection.jpg"
paperUrl: "https://proceedings.mlr.press/v267/zhang25al.html"
---

![LLMScan: Causal Scan for LLM Misbehavior Detection](/images/news/llmscan_causal_scan_for_llm_misbehavior_detection.jpg)
*Figure from the paper “LLMScan: Causal Scan for LLM Misbehavior Detection” (p. 2)*

# LLMSCAN: Causal Scan for LLM Misbehavior Detection

## TLDR
* **What**: Causal inference applied to LLM internal activity for monitoring.
* **Who's at risk**: Critical applications using LLMs for sensitive tasks.
* **Key number**: The results demonstrate that LLMSCAN accurately identifies four types of misbehavior, i.e., untruthful, toxic, harmful outputs from jailbreak attacks, as well as harmful responses from backdoor attacks, achieving average AUCs above 0.98.

## Causal Map Formation
The prevailing strategy for auditing LLMs often isolates defenses to singular failure modes: detecting lies, preventing jailbreaks, flagging toxicity, or blocking backdoors. These methods tend to be narrow, requiring a different system for each concern. Furthermore, many existing checks analyze the final output, which is inefficient for long responses and vulnerable to adaptive adversarial attacks. LLMSCAN shifts focus from the final output to the model's "brain" activity, positing that the internal state changes distinctly when an LLM behaves normally versus when it generates harmful or untruthful content. The core idea is to systematically quantify the influence of specific input tokens and transformer layers. Instead of intractable full causal computations, LLMSCAN approximates this using Causal Mediation Analysis (CMA). This allows the system to build a causality distribution map—a heatmap—that captures how much each token and each layer contributes to the final output logits.

## Token and Layer Contribution Quantification
To build this map, LLMSCAN calculates causal effects at two granularities. For input tokens, the effect $CEx_i$ is measured by comparing attention scores. Specifically, we extract attention scores during normal execution ($AS$) and then during abnormal executions where each token $x_i$ is replaced with an intervention token ‘-’ ($AS'_i$). The causal effect is then the Euclidean distance between these two score sets: $CEx_i = \lVert AS - AS'_i \rVert$. This uses attention scores because they reflect inter-token relationships more clearly than later logits. For transformer layers, the effect $CEx_{\ell}$ is measured by skipping the layer $\ell$ via a shortcut from layer $\ell-1$ to $\ell+1$. The causal effect is then the difference in the first token's logit: $CEx_{\ell} = \text{logit}_0 - \text{logit}^{-\ell}_0$.

## Causal Map to Misbehavior Classifier
Once the causal map is generated for a given prompt, the detector assesses potential misbehavior. Because input prompts vary wildly in length, the raw causal effects from tokens cannot be fed directly into a fixed-size classifier. To normalize this, the system extracts a fixed set of statistical features—mean, standard deviation, range, skewness, and kurtosis—to summarize the distribution of token causal effects into a 5-dimensional vector. This vector, combined with the fixed set of layer causal effects, forms the input to a Multi-Layer Perceptron (MLP). This MLP is trained on contrasting sets of causal maps: one representing normal behavior (e.g., truthful responses) and one representing misbehavior (e.g., untruthful responses). The paper demonstrates this capability across four tasks: Lie Detection, Jailbreak Detection, Toxicity Detection, and Backdoor Detection.

## Limitations
The paper primarily demonstrates detection capabilities across four specific misbehavior classes (untruthful, toxic, jailbreak, backdoor). The threat models covered are those where the model's internal causal structure changes predictably upon misbehavior.

## What practitioners should do
* Implement a causal scanning routine to generate causal maps for high-risk inferences, rather than relying solely on post-response text analysis.
* When training a detector, ensure the contrastive datasets used for training cover the full spectrum of desired misbehaviors, as the system is unified across types.
* If deploying on resource-constrained hardware, utilize the selective attention head and layer sampling strategy described to maintain computational feasibility.
* Benchmark the detector on a variety of tasks (Lie, Jailbreak, etc.) to confirm the generalization claimed by the unified approach.

## Verdict
Read this if you are building monitoring infrastructure for production LLMs; otherwise, skip it.

## Den's Take

The claim that attention scores are a sufficient proxy for causality warrants immediate scrutiny. While the technique of comparing attention patterns during normal versus intervened execution provides a quantifiable metric, relying on attention weights to map causal influence feels like a strong, unproven assumption. The paper doesn't adequately address what happens when an adversary crafts an input that maintains high average attention similarity across layers but forces a specific, harmful logit change—a subtlety that pure attention metrics might smooth over. Furthermore, the reliance on fixed-size statistical features (mean, skewness, etc.) to summarize the token causal effects risks losing the very granular signaling that the causal map is intended to preserve. This approach seems to trade deep causal understanding for classification tractability.