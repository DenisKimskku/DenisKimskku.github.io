---
title: "Safety Representations for Safer Policy Learning"
date: "2026-11-20"
type: "Paper Review"
description: "Explicitly learns state-conditioned safety representations"
tags: ["AI Agents"]
readingTime: 5
headerImage: "/images/news/safety_representations_for_safer_policy_learning.jpg"
paperUrl: "https://arxiv.org/abs/2502.20341"
---

![Safety Representations for Safer Policy Learning](/images/news/safety_representations_for_safer_policy_learning.jpg)
*Figure from the paper “Safety Representations for Safer Policy Learning” (p. 5)*

# State-Conditioned Safety Representations for Efficient Policy Learning

## TLDR
*   **What**: Explicitly learns state-conditioned safety representations.
*   **Who's at risk**: Safety-critical Reinforcement Learning deployments.

## Overcoming Primacy Bias with State-Centric Safety

Reinforcement learning agents, when trained in safety-critical scenarios, frequently encounter problems related to early training experiences. When agents receive heavy penalties for constraint violations early on, this "primacy bias" causes them to learn overly conservative policies. These policies restrict the agent's exploration, effectively trapping it in local optima even if high-reward, safe regions of the state space exist. Current methods often mitigate this by imposing hard constraints or filtering actions above a failure threshold. However, these approaches tend to be overly cautious, leading to suboptimal performance because they fail to distinguish nuanced risk across different states. The central difficulty is designing an RL algorithm that balances the need to explore for reward against the imperative to maintain safety throughout the learning process.

## Steps-to-Cost (S2C) Modeling

The core innovation here is moving beyond simple scalar safety indicators to model safety as a distribution over future risks. Instead of just knowing *if* a state is dangerous, the system learns *how soon* danger might arrive. This is formalized through the Steps-to-Cost (S2C) model. The S2C model takes a state $s$ and outputs a probability distribution $\Delta H_s$ over the safety horizon $H_s$. Specifically, $S_t(s)$ captures the conditional probability of entering an unsafe state in exactly $t$ steps, based on past experience. This distributional output is superior to scalar representations because it captures multiple facets of risk—immediate danger, risk in near-future states, and uncertainties in dynamics—which a single number cannot encapsulate.

## Augmenting State Space with Safety Distributions

The SRPL framework integrates this learned risk profile directly into the agent's perception. The S2C model is trained alongside the RL policy. For on-policy algorithms, a separate replay buffer $D_{S2C}$ stores trajectories $\tau$. The label $\delta_\tau(s)$ is set to the number of actions taken before encountering an unsafe state, or to the horizon length $H_s$ if safe. The S2C model $\nu$ is trained by minimizing the negative log-likelihood loss:
$$L_{S2C}((s, \tau); \nu) = - \sum_{t=1}^{H_s} I[\delta_\tau(s) = t] \log(S_\nu^t (s))$$
The final augmented state fed to the policy is $s' = \{s, S_\nu(s)\}$. This allows the policy to make decisions informed by the learned proximity to cost-inducing states, enabling more efficient and less conservative exploration.

## Limitations
The paper focuses on learning safety representations from agent experience, which assumes the experience buffer adequately covers diverse state regions. The utility of the S2C model relies on the fixed safety horizon $H_s$ being sufficiently smaller than the total MDP horizon $H$. Furthermore, the framework's effectiveness in transfer learning depends on the ability of the S2C model to generalize risk profiles between distinct tasks.

## What practitioners should do
*   When integrating risk awareness into RL, consider modeling risk as a distribution rather than a single threshold.
*   If using state-augmentation methods, ensure the augmentation captures temporal risk (e.g., steps-to-cost) rather than just static danger flags.
*   For training safety representations, utilize experience from diverse policy rollouts to prevent overfitting to narrow behavioral regions.
*   When comparing safety-aware methods, evaluate both training safety (constraint violations) and final policy performance metrics.

## Verdict
Read this paper if you are working on safety-critical RL or developing methods for constrained decision-making under uncertainty. Skip it if your focus is purely on standard reward maximization without safety constraints.

---

## Den's Take

The paper makes a solid case for moving beyond scalar safety indicators when dealing with complex system dynamics. However, the reliance on the fixed safety horizon $H_s$ is a significant theoretical weakness that the authors don't sufficiently address. If the true risk profile of a state requires a horizon much longer than $H_s$ to manifest, the S2C model will effectively truncate the risk signal, leading to a false sense of security in the augmented state $s'$. This suggests that the generalization capability of the S2C model across tasks might be fundamentally limited by this fixed temporal window, regardless of how well the initial policy explores. This mirrors the difficulty I noted when discussing how opaque evaluation mechanisms can mask systemic fragility in other AI systems.