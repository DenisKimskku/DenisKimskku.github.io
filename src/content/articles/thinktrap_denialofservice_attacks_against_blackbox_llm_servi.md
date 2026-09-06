---
title: "ThinkTrap: Denial-of-Service Attacks against Black-box LLM Services via Infinite Thinking"
date: "2026-09-02"
type: "Paper Review"
description: "Optimizes continuous embeddings to generate prompts causing infinite LLM generation"
tags: ["Adversarial Attacks"]
readingTime: 5
headerImage: "/images/news/thinktrap_denialofservice_attacks_against_blackbox_llm_servi.jpg"
paperUrl: "https://www.ndss-symposium.org/ndss-paper/thinktrap-denial-of-service-attacks-against-black-box-llm-services-via-infinite-thinking/"
---

![ThinkTrap: Denial-of-Service Attacks against Black-box LLM Services via Infinite Thinking](/images/news/thinktrap_denialofservice_attacks_against_blackbox_llm_servi.jpg)
*Figure from the paper “ThinkTrap: Denial-of-Service Attacks against Black-box LLM Services via Infinite Thinking” (p. 4)*

# ThinkTrap: Denial-of-Service Attacks Against Black-box LLM Services via Infinite Thinking

## TLDR
*   **What**: Optimizes continuous embeddings to generate prompts causing infinite LLM generation.
*   **Who's at risk**: Cloud-based LLM services with black-box APIs.
*   **Key number**: Experimental results indicate that even a low-rate adversarial query stream, e.g., issuing only five requests per minute, can significantly degrade service quality when prompts are crafted using our method.

## Bridging the Discrete-Continuous Divide
Modern LLMs are increasingly deployed as cloud services, making them susceptible to DoS attacks that force them into excessively long or non-terminating generation loops. The threat is subtle: a small, malicious input monopolizes substantial GPU time, starving legitimate users. Existing methods for inducing long outputs fall short when dealing with proprietary, black-box LLM APIs. Semantic-based approaches rely on fragile prompt engineering, while gradient-based methods require internal model access unavailable to external attackers. Heuristic search strategies, though applicable, are computationally inefficient and incur high query costs. The core gap this paper addresses is the inability of existing black-box techniques to efficiently optimize input prompts across the discrete token space while maintaining low query overhead. Direct optimization in the discrete token space is unstable because minor changes can cause abrupt, non-monotonic shifts in model behavior.

## Low-Dimensional Latent Vector $\mathbf{z}_t$
The central breakthrough of ThinkTrap is circumventing the discrete nature of token sequences by operating in a continuous surrogate space. Instead of optimizing over the vast, discrete input space, the framework maps discrete token sequences into a continuous embedding space. To manage the extreme dimensionality inherent in these embeddings—for a 100-token prompt and LLaMA-2-70B's 4096 embedding dimension, the space is over 400K parameters—ThinkTrap introduces a low-dimensional latent vector, $\mathbf{z}_t \in \mathbb{R}^m$ where $m \ll Ld$. A fixed, randomly initialized projection matrix $\mathbf{A} \in \mathbb{R}^{Ld \times m}$ transforms this latent vector into the full embedding: $\mathbf{E}_t = \mathbf{A}\mathbf{z}_t$. This projection allows the derivative-free optimization to be performed efficiently over the compact latent vector $\mathbf{z}_t$, while the resulting $\mathbf{E}_t$ retains enough expressive capacity to guide the attack.

## Surrogate Prompt Decoding and Resource Saturation
The process moves from the optimized continuous vector $\mathbf{z}_t$ to an actionable prompt $\mathbf{p}_t$ through a two-step loop. First, the Low-rank Embedding Projection (LEP) yields $\mathbf{E}_t$. Second, the Surrogate Prompt Decoding (SPD) module maps $\mathbf{E}_t$ back to a discrete prompt $\mathbf{p}_t$ using nearest-neighbor token retrieval on a surrogate prompt encoding space. This $\mathbf{p}_t$ is then evaluated by the LLM Querying (LQ) module, where the output length $o_t$ serves as the efficacy score. The low-dimensional vector $\mathbf{z}_t$ is iteratively updated via Derivative-Free Optimization (DFO) based on $o_t$. When tested against a private LLM service, issuing only five requests per minute resulted in the attack saturating GPU memory and computational resources, leading to a reduction in throughput to as low as 1% of the original performance and, in extreme cases, complete service failure.

## Limitations
The framework assumes the existence of a sufficiently expressive surrogate embedding space that accurately proxies the target LLM's behavior, which may not hold for highly specialized or extremely robust models. Furthermore, the effectiveness hinges on the assumption that the LLM's resource consumption behavior is somewhat predictable via output length, a property that could change in production environments where internal throttling or complex caching mechanisms are active.

## What practitioners should do
*   If deploying LLMs as black-box services, monitor request patterns for sustained, low-rate query streams, as these can induce heavy load.
*   Be mindful that simple rate limiting (e.g., 10 RPM) is insufficient defense against this type of resource exhaustion.
*   Consider evaluating service resilience not just against prompt injection, but against sustained, computationally intensive input sequences.
*   For self-hosted deployments, monitor GPU memory and computational load closely, as resource exhaustion can occur even at low query rates.

## Verdict
Read this paper if you are focused on the intersection of adversarial ML and cloud infrastructure security; otherwise, you can skip it.

---

## Den's Take

The paper proposes a sophisticated method for inducing resource exhaustion in black-box LLM APIs by operating in a continuous latent space. However, the evaluation seems to rely too heavily on the output length ($o_t$) as the sole proxy for resource saturation. This overlooks a critical vector: the computational cost associated with *generating* the optimized prompt $\mathbf{p}_t$ itself. If the Surrogate Prompt Decoding (SPD) step, which maps the low-dimensional vector $\mathbf{z}_t$ back to a discrete prompt, requires significant overhead—especially if the nearest-neighbor retrieval space is large—the attack might incur a high operational cost for the attacker, even if the resulting LLM query is cheap. This framework seems to optimize for the *victim's* resource exhaustion at the expense of ignoring the *attacker's* total query cost profile. prior work argued that security evaluation must prioritize the quality of coerced AI output over simple refusal avoidance metrics, and this paper’s focus on input sequence length echoes that tendency to prioritize a single, measurable output characteristic.