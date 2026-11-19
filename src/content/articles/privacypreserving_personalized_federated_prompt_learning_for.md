---
title: "Privacy-Preserving Personalized Federated Prompt Learning for Multimodal Large Language Models"
date: "2026-11-20"
type: "Paper Review"
description: "DP-FPL balances personalization, generalization, and privacy"
tags: ["Privacy"]
readingTime: 5
headerImage: "/images/news/privacypreserving_personalized_federated_prompt_learning_for.jpg"
paperUrl: "https://arxiv.org/abs/2501.13904"
---

![Privacy-Preserving Personalized Federated Prompt Learning for Multimodal Large Language Models](/images/news/privacypreserving_personalized_federated_prompt_learning_for.jpg)
*Figure from the paper “Privacy-Preserving Personalized Federated Prompt Learning for Multimodal Large Language Models” (p. 4)*

# Differentially Private Federated Prompt Learning with Low-Rank Factorization for Multimodal LLMs

## TLDR
* **What**: DP-FPL balances personalization, generalization, and privacy.
* **Who's at risk**: Clients using multimodal LLMs in PaaS deployments.
* **Key number**: Superior performance in balancing personalization and generalization compared to benchmarks.

## The Prompt Separation into Global and Local Components
Current Federated Prompt Learning (FPL) allows clients to fine-tune soft prompts for personalization while sharing these prompts for global model improvement. The central issue arises from data heterogeneity; local data drifts can cause clients to overfit, hurting generalization. Furthermore, these personalized prompts are susceptible to Membership Inference Attacks (MIA) if shared with public users. Existing literature, such as FedPGP (Cui et al., 2024), attempts factorization but often restricts the local prompt factorization to only the beginning of training, which limits expressive power. The DP-FPL framework addresses this by structuring the client’s prompt $\pi_i$ as the sum of a shared global prompt $p_{G,i}$ and a retained local prompt $p_{L,i}$. This separation allows the global prompt to facilitate generalized knowledge transfer across clients, while the local prompt retains client-specific tailoring, aiming for a nuanced balance.

## The Residual Term for Expressiveness
Restricting the prompt with low-rank factorization, as is common in related work, inherently discards information from the full-rank parameter space, which can significantly degrade performance, especially when combined with privacy noise. To counteract this loss of expressiveness, DP-FPL introduces a residual term, $r_i$. The overall personalized prompt is expressed as $\pi_i = p_{G,i} + u_i v_i + r_i$, where $u_i$ and $v_i$ are the factorized low-rank components, and $r_i$ is the remainder from the factorization process ($r_i = p_{L,i} - u_i v_i$). By performing this factorization in every training round, the model avoids the one-time approximation limitation seen in prior methods. The residual term directly compensates for the information lost during the low-rank projection, helping to preserve the client-specific learning required for strong personalization.

## Local Differential Privacy on Low-Rank Components
The framework employs a dual privacy strategy: Global Differential Privacy (GDP) for the aggregated global prompt gradient and Local Differential Privacy (LDP) for the local prompt. Standard methods that apply noise uniformly to the entire prompt face significant utility degradation. DP-FPL mitigates this by selectively applying LDP noise only to the two low-rank components, $u_i$ and $v_i$, of the local prompt. The noise is added to the clipped gradients $\nabla_{uL}$ and $\nabla_{vL}$ using the Gaussian noise mechanism: $\tilde{\nabla}_{uL} \leftarrow \nabla_{uL} + N(0, \sigma^2_L)$ and $\tilde{\nabla}_{vL} \leftarrow \nabla_{vL} + N(0, \sigma^2_L)$. The noisy local gradient $\tilde{\nabla}_{L,iL}$ is then reconstructed using the formula: $\nabla_{L,iL} = (\nabla_{uL})v_i + u_i(\nabla_{vL}) - u_i u_i^T (\nabla_{uL})v_i$. This targeted noise injection preserves the privacy guarantee for the local prompt while minimizing the negative impact on model utility compared to adding noise to the full-rank prompt.

## Limitations
The paper assumes that clients and the server remain honest, which is a strong condition for real-world deployments. Furthermore, the analysis of the residual term's benefit relies on the conjecture that the accumulated error acts as a regularizer; if this assumption proves false under different noise schedules, the personalization capabilities could be compromised. The evaluation is conducted on widely adopted datasets, but the paper does not extensively explore how the DP-FPL framework behaves under extreme data heterogeneity scenarios not covered by the benchmarks.

## What practitioners should do
* Implement low-rank factorization iteratively within each training round, rather than only at initialization.
* Apply LDP noise specifically to the low-rank components ($u_i, v_i$) of the local prompt gradients, rather than the entire local prompt.
* Use the residual term ($r_i$) to explicitly compensate for expressive power lost during factorization.
* Monitor the trade-off between $\epsilon, \delta$ settings and performance degradation, as the variance $\sigma_L$ controls the privacy budget.

## Verdict
Read this paper if you are working on deploying personalized multimodal AI in sensitive, distributed environments. Skip it if your focus is on centralized model training or non-private prompt tuning.

---

## Den's Take

This work correctly identifies the expressive limitations of static low-rank approximations in FPL, and the introduction of the residual term ($r_i$) is a necessary engineering patch to prevent immediate performance collapse. However, the paper overstates the robustness of its privacy guarantees by assuming client and server honesty. In any practical, large-scale deployment, the assumption of honest participation is a brittle point of failure. If a malicious client can inject structured adversarial signals into the low-rank components ($u_i, v_i$)—which are the only parts receiving LDP noise—the resulting noise might be insufficient to mask a targeted backdoor while still degrading utility.