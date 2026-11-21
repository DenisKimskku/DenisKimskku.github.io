---
title: "Adversarial Policy Optimization for Offline Preference-based Reinforcement Learning"
date: "2026-11-22"
type: "Paper Review"
description: "APPO uses a two-player game to ensure conservatism in offline PbRL"
tags: ["Adversarial Attacks"]
readingTime: 5
headerImage: "/images/news/adversarial_policy_optimization_for_offline_preferencebased_.jpg"
paperUrl: "https://arxiv.org/abs/2503.05306"
---

![Adversarial Policy Optimization for Offline Preference-based Reinforcement Learning](/images/news/adversarial_policy_optimization_for_offline_preferencebased_.jpg)

# Adversarial Policy Optimization for Offline Preference Learning

## TLDR
*   **What**: APPO uses a two-player game to ensure conservatism in offline PbRL.
*   **Who's at risk**: Systems using offline preference data for policy training.
*   **Key number**: Experimental results on continuous control tasks demonstrate that APPO effectively learns from complex datasets, showing comparable performance with existing state-of-the-art methods.

## The Intractability of Conservative Offline PbRL
Learning from pre-collected trajectory pairs, known as offline preference-based reinforcement learning (PbRL), is gaining traction because collecting real-time human feedback can be costly. The goal is to find a policy $\hat{\pi}$ that is $\epsilon$-optimal relative to the true optimal policy $\pi^\star$, based only on data sampled by a reference policy $\mu$. While prior work has established sample complexity bounds under the condition of trajectory concentrability, these methods typically mandate explicit construction of confidence sets. This requirement leads to intractable optimization problems when using general function approximation. Specifically, approaches like FREEHAND-transition require solving complex constrained optimizations involving confidence sets of rewards ($\hat{R}$) and transitions ($\hat{P}$), such as:

$\arg \max_\pi \min_{r\in\hat{R}} \left( V^\pi_{1,r}(s_1) - V^\mu_{1,r}(s_1) \right)$

This reliance on explicit confidence sets renders the theoretical guarantees computationally impractical for modern, expressive function approximators.

## The Two-Player Stackelberg Game
The core idea enabling APPO is reframing the model-based PbRL problem as a two-player Stackelberg game between the policy ($\pi$) and the reward model ($r$). Instead of solving the constrained optimization problem from prior work, APPO formulates the objective as:

$$\hat{\pi} \in \arg \max_{\pi} \left( V^\pi_{1,r^\pi}(s_1) - V^\mu_{1,r^\pi}(s_1) \right) \quad \text{subject to} \quad r^\pi \in \arg \min_{r\in\hat{R}} \left( V^\pi_{1,r}(s_1) - V^\mu_{1,r}(s_1) + E(r; \hat{r}) \right)$$

This structure forces the reward model $r^\pi$ to minimize the relative performance of $\pi$ against $\mu$ while simultaneously satisfying a penalty term $E(r; \hat{r})$ that constrains $r$ to remain close to the learned reward model $\hat{r}$. This adversarial competition inherently enforces conservatism without needing to explicitly construct the intractable confidence sets.

## Trajectory-Pair $\ell_1$ Loss
APPO uses a novel reparameterization technique which allows us to find a near-optimal policy efficiently via adversarial training. The core idea behind our algorithm is the two-player game formulation of model-based PbRL.

## Limitations
The analysis assumes standard conditions, including reward and transition realizability and bounded trajectory concentrability (CTR). The practical implementation relies on the function classes $\mathcal{R}$ and $\mathcal{P}$ being realizable by neural networks, and the optimization problem for $f_t$ is generally non-convex, requiring gradient-based methods which do not guarantee global optimality. The paper also details an "APPO-rollout" variant that assumes known transitions or online interaction, which is a temporary assumption for the main algorithm.

## What practitioners should do
*   When applying offline PbRL, consider framing the conservatism requirement as a game between the policy and the reward model.
*   If using general function approximation, focus on formulations that penalize deviations in trajectory return differences, similar to the $\ell_1$ loss proposed.
*   If transition models are unknown, investigate reparameterization methods that optimize action-value functions directly, avoiding direct reliance on policy evaluation or transition knowledge.
*   Be aware that while APPO achieves comparable performance, the underlying optimization for the action-value function remains non-convex.

## Verdict
Read this paper if you are working on theoretical guarantees or scalable implementation of offline preference learning; otherwise, skim it for the high-level understanding of the Stackelberg framing.

## Den's Take

The framing around the Stackelberg game successfully sidesteps the computational burden of explicit confidence sets, which is a tangible engineering win for practical offline PbRL. However, the paper understates the fragility introduced by relying solely on the trajectory-pair $\ell_1$ loss. While this mechanism enforces conservatism against the *learned* reward model $\hat{r}$, it does not inherently guard against a maliciously crafted, yet statistically plausible, reward model $r$ that exploits model approximation error rather than data distribution shifts. The convergence guarantees seem contingent on the realizability of the reward model within the specified function class $\mathcal{R}$, an assumption that often breaks down when deploying these systems on complex, real-world data from diverse interaction policies. This method feels like a necessary mathematical substitution, not a complete solution to the conservatism problem.