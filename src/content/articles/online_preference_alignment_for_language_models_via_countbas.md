---
title: "Online Preference Alignment for Language Models via Count-based Exploration"
date: "2026-11-08"
type: "Paper Review"
description: "COPO uses count-based exploration in online RLHF"
tags: ["AI Security"]
readingTime: 5
headerImage: "/images/news/online_preference_alignment_for_language_models_via_countbas.jpg"
paperUrl: "https://arxiv.org/abs/2501.12735"
---

![Online Preference Alignment for Language Models via Count-based Exploration](/images/news/online_preference_alignment_for_language_models_via_countbas.jpg)

# Count-based Online Preference Optimization for LLM Alignment

## TLDR
* **What**: COPO uses count-based exploration in online RLHF.
* **Who's at risk**: LLMs fine-tuned via RLHF on limited datasets.
* **Key number**: The reward with an upper-confidence bound (UCB) bonus leads to a provably efficient RLHF policy with $\tilde{O}(\sqrt{T})$-regret bound.

## The Coverage Gap in Fixed-Dataset Alignment
Current alignment techniques, like those based on the Bradley-Terry model or Direct Preference Optimization (DPO), rely on a fixed, offline dataset for preference alignment. The fundamental limitation here is coverage: if the initial dataset $D$ does not uniformly cover the entire prompt-response space, the learned reward model cannot accurately estimate rewards for out-of-distribution (OOD) responses. This limits the LLM's capacity to perform well outside the training data distribution. While recent work attempts to move to online RLHF—where the LLM generates new data iteratively—the central problem remains how to explore this vast space systematically. A deterministic policy simply repeats data collection, failing to improve coverage across iterations. Existing exploration methods often rely on the LLM's intrinsic likelihood, which lacks the theoretical guarantees needed for systematic exploration based on the confidence of the learned reward model.

## The Optimistic Reward Function
The paper’s central idea is to reframe the online RLHF objective using an optimistic reward function, which is directly inspired by established online Reinforcement Learning theory. In a linear reward setting, the theoretical motivation shows that using a reward estimate augmented with an Upper Confidence Bound (UCB) term yields a provably efficient RLHF policy. This UCB addition effectively measures how much uncertainty there is regarding the true reward for a specific prompt-response pair based on the collected data. By maximizing this optimistic expected value function, $\hat{J}_\beta(\pi; D_t)$, the policy is incentivized not just toward known high-reward areas, but also toward responses where the reward estimate is highly uncertain, thus driving systematic exploration.

## Pseudo-Count via Coin Flipping Network
To make the UCB term tractable in the massive prompt-response space, COPO converts the theoretical UCB bonus into a practical, count-based exploration term. In the tabular case, this UCB term simplifies to a form related to inverse visit counts, as shown in Lemma 2. For LLMs, where states are too vast for explicit counting, COPO introduces a Coin Flipping Network (CFN). The CFN, parameterized by $\vartheta$, is trained using a mean-square error loss on Rademacher trials. By solving $\min_\vartheta \sum_{i=1}^{|D_{cfn}|} \|c_i - f_\vartheta(s_i)\|^2$, where $c_i$ is a random $d$-dimensional coin-flip vector, the network $f_\vartheta(s)$ approximates the inverse visit count, $\frac{1}{N(s)}$, allowing the exploration bonus to be integrated into the final objective:
$$\max_{\pi_\phi} J_{copo}(\pi_\phi, D_t) = -\mathcal{L}_{DPO}(\pi_\phi; D_t, \beta) + \alpha \mathbb{E}_{x\sim D_t, y\sim \pi_\phi(y|x)} \frac{1}{\sqrt{\frac{1}{d}\|f_\vartheta(s)\|^2}}$$
This formulation balances the standard DPO loss with a count-based bonus driven by the CFN's prediction.

## Limitations
The theoretical guarantees rely on the linear reward assumption, $r_\theta(x, y) = \langle \theta, \phi(x, y) \rangle$. In practice, the LLM's feature embedding $\phi(x, y)$ is complex and not explicitly modeled, and the CFN's approximation of the inverse count is heuristic. Furthermore, the analysis assumes a specific data collection rate (one pair per iteration), which might not hold in production environments.

## What practitioners should do
* Implement an iterative loop where the LLM generates samples, collects preferences, and updates the policy.
* Integrate a lightweight network, similar to the CFN, to estimate visitation frequency rather than relying on explicit counts.
* Tune the optimism coefficient $\alpha$ carefully to control the exploration-exploitation trade-off in the objective function.
* Monitor the performance of the CFN's prediction against empirical visit counts during initial fine-tuning stages.

## Verdict
Read this paper if you are working on scalable, iterative alignment techniques for LLMs; otherwise, skip it.

## Den's Take

The paper’s focus on using count-based exploration via a Coin Flipping Network addresses a tangible scalability problem in online RLHF, moving beyond the limitations of fixed-dataset coverage. However, the adherence to the linear reward assumption in the theoretical bounds feels like a necessary oversimplification that obscures practical risk. If the actual reward function learned by the model deviates significantly from linearity—which is almost certain given the complexity of the feature embedding $\phi(x, y)$—the $\tilde{O}(\sqrt{T})$-regret bound becomes purely academic. The reliance on the CFN to approximate inverse visit counts is a heuristic bridge; I predict that in real-world deployment, the CFN will over-prioritize regions of high *uncertainty* over regions of *low coverage*, leading to chaotic, non-convergent exploration rather than systematic improvement. This echoes my earlier concerns that current reward-based alignment training is fundamentally insufficient because models can learn to exploit observable behavior rather than true adherence.