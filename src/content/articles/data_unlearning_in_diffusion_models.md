---
title: "Data Unlearning in Diffusion Models"
date: "2026-11-22"
type: "Paper Review"
description: "SISS integrates naive deletion and NegGrad via importance sampling"
tags: ["Privacy", "Machine Unlearning"]
readingTime: 5
headerImage: "/images/news/data_unlearning_in_diffusion_models.jpg"
paperUrl: "https://arxiv.org/abs/2503.01034"
---

![Data Unlearning in Diffusion Models](/images/news/data_unlearning_in_diffusion_models.jpg)
*Figure from the paper “Data Unlearning in Diffusion Models” (p. 8)*

# Subtracted Importance Sampled Scores for Data Unlearning in Diffusion Models

## TLDR
*   **What**: SISS integrates naive deletion and NegGrad via importance sampling.
*   **Who's at risk**: Deployments using diffusion models susceptible to memorization.
*   **Key number**: SISS successfully mitigated memorization on almost 90% of the prompts we tested.

## The Gap in Diffusion Unlearning
Diffusion models have demonstrated a capacity to memorize and reproduce specific training images, a concern exacerbated by privacy regulations like GDPR. The necessity for data unlearning—efficiently removing specific datapoints—is timely. However, existing work suffers from two major limitations. First, general-purpose machine unlearning techniques fail or are unstable when applied to the diffusion model setting. Second, much of the recent diffusion unlearning research focuses on concept unlearning, aiming to remove high-level features like painting styles, rather than achieving the concrete goal of data unlearning: making the model behave as if it were trained without the specified datapoints. Naive deletion, which fine-tunes only on data to be kept, is too slow, while NegGrad, which uses gradient ascent on data to be unlearned, causes rapid quality degradation by forgetting the rest of the training set.

## SISS: Merging Deletion and NegGrad
The core innovation of SISS is deriving a unified objective that combines the mechanism of naive deletion with the targeting power of NegGrad. Naive deletion preserves the quality by minimizing the loss over $X \setminus A$, whereas NegGrad pushes the model away from $A$ by maximizing the loss over $A$. SISS unifies these into a single loss function $\ell_\lambda(\theta)$ by employing importance sampling (IS) over a defensive mixture distribution $q_\lambda(m_t|x, a)$. This structure ensures that the loss function is mathematically equivalent to the naive deletion loss, $\ell_\lambda(\theta) = L_{X\setminus A}(\theta) \forall \lambda \in [0, 1]$, while still allowing the NegGrad component to drive unlearning when $\lambda$ is high. This formulation allows the model to simultaneously retain knowledge from $X \setminus A$ while forgetting $A$.

## The $\lambda$ Parameter and Superfactor Control
The mechanism relies on balancing the influence of the two underlying objectives via the parameter $\lambda$, which weights the sampling between $q(\cdot|x)$ and $q(\cdot|a)$ in the mixture distribution $q_\lambda$. When $\lambda=0$, the loss behaves like naive deletion; when $\lambda=1$, it mimics NegGrad. We find that $\lambda = 0.5$ behaves as a mixture of the two, giving the desirable combination of quality preservation and strong unlearning.

## Limitations
The paper focuses heavily on unconditional diffusion models and the data unlearning setting. The threat models explored do not explicitly cover scenarios where the attacker has control over the training data distribution $X$ in a way that allows for adaptive sampling beyond the proposed importance sampling framework.

## What practitioners should do
*   If deploying diffusion models where data privacy is a concern, investigate SISS as a method to mitigate memorization without full retraining.
*   When applying SISS, prioritize tuning $\lambda=0.5$ to balance quality preservation and unlearning strength.
*   For high-stakes deployments, monitor the gradient norms during fine-tuning to ensure the superfactor $s$ is appropriately constraining the NegGrad term.
*   Benchmark SISS against Naive Deletion, as it offers a path to achieving strong unlearning without the extreme quality degradation seen in pure NegGrad.

## Verdict
Read if you are an ML engineer or security researcher working on generative model robustness; skim if your focus is strictly on classical supervised learning defenses.

## Den's Take

The paper presents a technical improvement over existing diffusion model unlearning methods, specifically by blending naive deletion and NegGrad via importance sampling. However, the focus on unconditional models feels too narrow for the stated privacy concerns. Real-world deployments often involve conditional generation, where the prompt itself acts as a sensitive input that must be protected alongside the training data. The authors do not address how SISS performs when the "data to be unlearned" is only present under a specific, potentially adversarial, prompt condition. Furthermore, while the stability controls using the superfactor $s$ are noted, the claim of Pareto optimality feels like an overstatement given the dependency on fixed hyperparameters like $\lambda=0.5$. This suggests that the method's practical utility might be brittle outside the tested configuration space.