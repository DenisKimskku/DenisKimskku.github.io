---
title: "Optimizing Noise Distributions for Differential Privacy"
date: "2026-08-25"
type: "Paper Review"
paperUrl: "https://arxiv.org/abs/2504.14730"
paperAuthors: "Atefeh Gilani, Juan Felipe Gomez, Shahab Asoodeh, et al."
description: "Optimizes continuous/discrete noise distributions for DP"
tags: ["Privacy"]
readingTime: 5
headerImage: "/images/news/optimizing_noise_distributions_for_differential_privacy.jpg"
---

![Optimizing Noise Distributions for Differential Privacy](/images/news/optimizing_noise_distributions_for_differential_privacy.jpg)
*Figure from the paper “Optimizing Noise Distributions for Differential Privacy” (p. 8)*

# Convex Optimization for Noise Distribution Design under Rényi DP

## TLDR
*   **What**: Optimizes continuous/discrete noise distributions for DP.
*   **Who's at risk**: Systems using noise addition for privacy guarantees.
*   **Key number**: At the target $\delta = 10^{-6}$, the optimized noise achieves an $\epsilon$ of 1.62, compared to 1.76 for Laplace/Staircase and 1.74 for Gaussian/Cactus.

## The Moderate Composition Regime
Privacy mechanisms are routinely applied sequentially, leading to composition. While Gaussian and Laplace noise are standard for achieving approximate Differential Privacy ($\epsilon, \delta$-DP), their optimality is context-dependent. Prior work has shown specific distributions like the Cactus distribution are optimal in the large composition regime, and the Staircase distribution for single composition. However, there is a gap in optimizing noise specifically for the moderate composition regime—a setting where privacy mechanisms are used a limited number of times for aggregated data releases. Standard choices like Gaussian and Laplace do not guarantee the best possible privacy guarantee for a fixed cost constraint in this moderate setting. This paper addresses this by framing the selection of the noise distribution as an optimization problem constrained by the required privacy level and a defined distortion cost.

## RDP as an Intermediate Optimization Objective
The paper pivots from directly minimizing $\epsilon$ under $(\epsilon, \delta)$-DP, which is non-convex, to leveraging Rényi Differential Privacy (RDP). RDP, defined via the Rényi divergence $D_\alpha(P \| Q)$, provides a composition property where the total RDP is the sum of individual RDPs. This allows the optimization to proceed by optimizing each RDP term individually. The RDP hyperparameter $\alpha$ is not fixed; rather, it is automatically selected as part of the optimization procedure. This flexibility enables the framework to recover known optimal distributions: as $\alpha \to 1$, the framework approximates the Cactus distribution optimal for large compositions, and as $\alpha \to \infty$, it converges to the Staircase distribution for single composition.

## Piecewise-Constant Families and Gradient Descent
To solve the infinite-dimensional optimization problem, the authors restrict the search space to finite-dimensional families. For continuous cases, this involves symmetric piecewise-constant probability density functions (PDFs) defined by a bin width $\Delta$ and geometric tails governed by a decay rate $r$. For discrete cases, a symmetric probability mass function (PMF) family is used. These families are parameterized by a vector $p = (p_0, p_1, \dots, p_N)$. The optimization then reduces to finding the vector $p$ that minimizes the objective function derived from the RDP, subject to cost and normalization constraints. This finite-dimensional problem is solved using preconditioned gradient descent, as detailed in Algorithm 1, which iteratively refines $p$ while adjusting $\alpha$ periodically.

## Limitations
The framework relies on assuming both continuous and discrete noise distributions possess geometric tails, which may not hold for all practical noise requirements. Furthermore, while the optimization recovers known optimal solutions in specific regimes, the practical implementation depends on tuning hyperparameters like the bin width $\Delta$ to ensure $s/\Delta$ is an integer, which may not always be possible in real-world query sensitivities.

## What practitioners should do
*   When designing privacy mechanisms for moderate composition regimes, consider replacing standard Gaussian or Laplace noise with distributions optimized via this RDP framework.
*   If your query output is inherently discrete (e.g., counts), utilize the discrete PMF family formulation.
*   Carefully calibrate the cost constraint $C$ based on the acceptable distortion, as the resulting $\epsilon$ is sensitive to this trade-off.
*   Examine the trade-off between the noise scale $\sigma$ and the query sensitivity $s$ as the optimization ultimately depends on their ratio $\sigma/s$.

## Verdict
Read this paper if you are designing privacy mechanisms for moderate composition settings or are interested in the mathematical underpinnings of noise distribution selection; otherwise, skip it.

## Den's Take

The paper’s focus on optimizing noise distributions within the moderate composition regime is technically sound, but it misses the operational reality of many deployed systems. Optimizing for a theoretical $\epsilon$ given a cost constraint $C$ is academic; in production, the constraint is usually the *size* of the noise added, not a perfectly defined distortion cost. If a system is already deploying Gaussian noise because its infrastructure is built around that, forcing a switch to a piecewise-constant PDF requires a massive, often infeasible, re-engineering effort. Furthermore, the reliance on geometric tails is a significant oversimplification for complex data streams.