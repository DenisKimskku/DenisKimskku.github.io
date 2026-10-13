---
title: "Activation Approximations Can Incur Safety Vulnerabilities in Aligned LLMs: Comprehensive Analysis and Defense"
date: "2026-10-08"
type: "Paper Review"
description: "Activation approximations degrade safety in aligned LLMs"
tags: ["Vulnerabilities"]
readingTime: 5
headerImage: "/images/news/activation_approximations_can_incur_safety_vulnerabilities_i.jpg"
paperUrl: "https://www.usenix.org/system/files/usenixsecurity25-zhang-jiawen.pdf"
---

![Activation Approximations Can Incur Safety Vulnerabilities in Aligned LLMs: Comprehensive Analysis and Defense](/images/news/activation_approximations_can_incur_safety_vulnerabilities_i.jpg)
*Figure from the paper “Activation Approximations Can Incur Safety Vulnerabilities in Aligned LLMs: Comprehensive Analysis and Defense” (p. 7)*

# Activation Approximations Degrade Safety in Aligned LLMs

## TLDR
*   **What**: Activation approximations degrade safety in aligned LLMs.
*   **Who's at risk**: LLM-based service providers deploying efficiency-optimized models.
*   **Key number**: (Removed due to unsupported claim)

## Activation Approximation Categories
The current deployment paradigm for large language models (LLMs) is heavily constrained by computational overhead, especially when using complex activation functions like GELU and SwiGLU. To mitigate this, various techniques aim to accelerate inference, with activation approximation being a prominent avenue. This includes three categories: Activation Polynomialization, which replaces non-linearities with polynomials for use in secure multi-party computation (MPC) or fully homomorphic encryption (FHE); Activation Sparsification, which exploits dynamic sparsity in hidden states by omitting computation for zero-valued activations; and Activation Quantization, which reduces the bit-width of activation vectors. The assumption underpinning these methods is that the resulting approximation errors are small enough that they do not degrade the model's utility beyond acceptable limits, making them appear practical for real-world application builders. However, this paper addresses the critical gap: the safety implications of these approximations remain unvetted, even in models that have undergone extensive safety alignment procedures.

## Early Layer Vulnerability
The investigation into the effects of these approximations across ten safety-aligned LLMs revealed a consistent pattern: safety degradation occurs even when models are aligned. A key observation is that the severity of the safety compromise is not uniform across the model architecture. Specifically, approximations implemented in the first few layers prove to be the most detrimental to the model's safety capabilities. Conversely, approximations placed in the later layers show negligible effects on safety. Furthermore, the analysis uncovered that harmful prompts exhibit a tendency to cluster within the activation space. Activation approximations manipulate this space by shifting these harmful activations into regions that are deemed benign by the model's safety checks, thereby facilitating evasion of established guardrails. This suggests that the error introduced by the approximation fundamentally alters the internal representation of adversarial input in a way that bypasses existing safety mechanisms.

## QuadA and Activation Approximation-Aware Alignment
To counter these identified vulnerabilities, the paper introduces QuadA, a novel method for activation approximation-aware safety alignment. This technique is designed to integrate robustness against activation approximations directly into the existing safety alignment procedures of LLM developers. The mechanism works by addressing the observed shift of harmful activations. The paper demonstrates that QuadA successfully enhances the safety capabilities of LLMs even after they have undergone various activation approximation methods. The resulting LLMs, after being deployed by downstream application providers, remain resilient to various activation approximations introduced to enhance inference efficiency. Experimental results demonstrate that this approach not only handles activation approximations across different methods and various magnitudes but also resists a variety of adaptive jailbreak attacks. The effectiveness of QuadA was corroborated through extensive experiments and ablation studies.

## Limitations
The safety vetting performed spans three categories of activation approximations, but the paper does not detail the performance against all possible combinations of approximation magnitudes or all available LLMs. Furthermore, the threat model centers on service providers applying approximations; the paper does not extensively model scenarios where the LLM developer themselves might introduce approximations before deployment, which could change the baseline assumption of safety alignment integrity.

## What practitioners should do
*   When deploying LLMs with efficiency optimizations, do not assume that activation approximation techniques inherently preserve the safety guarantees established during alignment.
*   If utilizing activation approximation, consider integrating alignment strategies similar to QuadA to actively mitigate the introduction of safety vulnerabilities.
*   Be aware that the most significant safety risks are concentrated when approximations are applied to the initial layers of the LLM.
*   When assessing LLM safety post-optimization, use robust metrics beyond simple rejection phrase matching, as the HarmBench classifier's reliability can be questioned under complex prompts.

## Verdict
Read this paper if you are an ML engineer or security researcher working on deploying large language models in resource-constrained environments; otherwise, you can likely skip it.

---

## Den's Take

The paper correctly identifies that efficiency optimizations like activation approximation introduce exploitable blind spots in safety-aligned LLMs. However, the focus on *how* the approximation shifts activations into benign regions misses a more fundamental point about model robustness: that the initial layers are responsible for feature extraction, not just pattern matching. When those foundational features are corrupted by approximation, the model isn't just being "tricked" into a benign activation space; its ability to even *understand* the input context—the core semantic grounding—is compromised. This is different from simple prompt injection, which targets instruction following; here, the input representation itself is degraded.