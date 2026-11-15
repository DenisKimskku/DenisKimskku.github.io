---
title: "Test-time Alignment of Diffusion Models without Reward Over-optimization"
date: "2026-11-16"
type: "Paper Review"
description: "DAS uses Sequential Monte Carlo to guide diffusion sampling"
tags: ["AI Security"]
readingTime: 5
headerImage: "/images/news/testtime_alignment_of_diffusion_models_without_reward_overop.jpg"
paperUrl: "https://arxiv.org/abs/2501.05803"
---

![Test-time Alignment of Diffusion Models without Reward Over-optimization](/images/news/testtime_alignment_of_diffusion_models_without_reward_overop.jpg)
*Figure from the paper “Test-time Alignment of Diffusion Models without Reward Over-optimization” (p. 4)*

# Diffusion Alignment as Sampling (DAS) for Test-Time Reward Optimization

## TLDR
*   **What**: DAS uses Sequential Monte Carlo to guide diffusion sampling.
*   **Who's at risk**: Users fine-tuning or using guidance on generative diffusion models.
*   **Key number**: DAS achieves comparable or superior target rewards to fine-tuning methods while preserving diversity and cross-reward generalization.

## The Failure Modes of Prior Alignment
Generative diffusion models, while powerful, are pre-trained on massive, uncurated data, meaning their output doesn't always match specific user goals—like generating aesthetically pleasing images or specific character styles. To correct this, alignment methods fall into two camps. Fine-tuning approaches, such as RL or direct backpropagation, aim to maximize a target reward but frequently succumb to reward over-optimization. This leads to models that achieve high scores on the target metric but lose general image quality and diversity. On the other side, guidance methods offer a training-free alternative, staying close to the pre-trained distribution, but they suffer from reward under-optimization because they rely on estimated inference-time corrections of the generation process, which limits their ability to effectively maximize complex rewards.

## The Sequential Monte Carlo Engine
The core insight of DAS is treating alignment as a sampling problem from a reward-aligned target distribution, $p_{\text{tar}}$, rather than a continuous optimization problem. This distribution is formally defined by $p_{\text{tar}}(x) \propto p_{\text{pre}}(x) \exp(r(x)/\alpha)$, where $p_{\text{pre}}$ is the pre-trained distribution and $r(x)$ is the reward. Traditional methods fail because they either collapse to a few high-reward modes (fine-tuning) or fail to reach high rewards due to approximation errors (guidance). DAS leverages Sequential Monte Carlo (SMC) sampling to evaluate multiple candidate latent vectors in parallel at each diffusion step, allowing it to sample from all modes of $p_{\text{tar}}$ simultaneously, something that is difficult for variational inference methods which exhibit mode-seeking behavior.

## Tempering Intermediate Targets
To make the SMC sampling practical, DAS introduces tempering to define intermediate target distributions, $\pi_t(x_t)$. Since the true posterior required for sampling is intractable, DAS uses an *approximate posterior* based on the pre-trained model's noise prediction, $\hat{r}(x_t)$. This approximate posterior is then tempered using an inverse temperature sequence, $\lambda_t$, where $0 = \lambda_T \le \lambda_{T-1} \le \dots \le \lambda_0 = 1$. This tempering smooths the transition from the prior $\pi_T$ to the final target $\pi_0 = p_{\text{tar}}$, preventing the large errors that occur when using the approximate posterior early in the sampling process. The locally optimal proposal, $m^*_{\text{t-1}}(x_{t-1}|x_t)$, is adapted using a Gaussian approximation that incorporates the tempering parameter $\lambda_{t-1}$, which guides the sampling towards the target while minimizing weight degeneracy.

## Limitations
The paper focuses on aligning diffusion models with reward functions accessible during sampling.

## What practitioners should do
*   If fine-tuning diffusion models, recognize that standard RL or backpropagation risks mode collapse and reward over-optimization.
*   Consider DAS for test-time alignment to potentially achieve high target rewards without the computational cost of training.
*   When using DAS, the implementation requires careful selection of the tempering hyperparameter $\gamma$ to ensure efficient sample quality.
*   Use DAS when maintaining high output diversity alongside target reward optimization is a primary concern.

## Verdict
Read this paper if you are working on generative model alignment and are concerned about the trade-off between reward maximization and output diversity. Skip it if your alignment problem can be solved purely through standard supervised fine-tuning.

## Den's Take

The paper presents a mechanism to steer diffusion sampling using Sequential Monte Carlo to balance reward maximization and diversity, sidestepping the pitfalls of pure fine-tuning. However, the discussion around reward function design is conspicuously absent. The authors acknowledge the limitation regarding adversarial reward function design.