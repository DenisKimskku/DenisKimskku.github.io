---
title: "Towards hyperparameter-free optimization with differential privacy"
date: "2026-11-11"
type: "Paper Review"
description: "Adapts automatic learning rate schedules to DP training"
tags: ["Privacy"]
readingTime: 5
headerImage: "/images/news/towards_hyperparameterfree_optimization_with_differential_pr.jpg"
paperUrl: "https://arxiv.org/abs/2503.00703"
---

![Towards hyperparameter-free optimization with differential privacy](/images/news/towards_hyperparameterfree_optimization_with_differential_pr.jpg)
*Figure from the paper “Towards hyperparameter-free optimization with differential privacy” (p. 6)*

# HyFreeDP: Hyperparameter-Free Optimization with Differential Privacy

## TLDR
* **What**: Adapts automatic learning rate schedules to DP training.
* **Who's at risk**: DP-trained models relying on manual hyperparameter tuning.
* **Key number**: Achieves state-of-the-art DP performance on various language and vision tasks.

## The Tension Between Data Dependency and Privacy Budget

Deep learning model quality hinges on hyperparameter configuration, especially the learning rate schedule, which dictates optimization convergence. In practice, heuristics like linear warmup and cosine decay require tuning several hyperparameters. When applying Differential Privacy (DP), this tuning introduces a significant problem: the data-dependent nature of adaptive learning rate methods can compromise the rigorous privacy guarantee. Standard DP optimization frameworks, which use DP optimizers like Abadi et al. (2016), typically only privatize the gradients, leaving hyperparameters like the clipping threshold $R_g$ and learning rate $\eta$ unchecked. Researchers have approached this by either dedicating a small privacy budget to tune hyperparameters (e.g., Renyi-DP tuning) or by adopting hyperparameter-free methods that eliminate $R_g$ via per-sample normalization. However, these existing approaches either suffer from performance degradation due to noise addition from reduced privacy budgets or necessitate an extensive, manual search process that scales poorly with model complexity.

## Loss Privatization with Minimal Clipping Bias

The core barrier to applying state-of-the-art automatic learning rate schedules, such as those derived from GeN, within a DP framework is that the estimation of the learning rate requires calculating the gradient $G$ and the Hessian $H$, which are derived from the loss $L$. Since $L$ is a scalar value, its privatization differs fundamentally from gradient privatization. Gradient privatization involves clipping high-dimensional vectors ($\mathbf{g}_i$) and adding Gaussian noise ($\mathbf{z}_g$). In contrast, for the scalar loss $L_i$, we must introduce noise $\mathbf{z}_l$ and apply clipping. Theorem 1 shows that the per-sample clipping bias of (7) is $\frac{1}{B}\sum_i \min\left(\frac{R_l}{L_i}, 1\right)L_i - \frac{1}{B}\sum_i L_i = \frac{1}{B}\sum_i (L_i -R_l)I(L_i > R_l)$, which is monotonically decreasing in $R_l$, and converges to $[E(L_i|L_i > R_l) -R_l] \cdot P(L_i > R_l)$ as $B \to\infty$.

$$\tilde{L} = \frac{1}{B}\sum_i \min\left(\frac{R_l}{L_i}, 1\right)L_i + \sigma_l R_l \cdot N(0, 1)$$

The paper shows that the choice of threshold $R_l$ creates a bias-variance tradeoff between the clipping and the noising for the loss privatization.

## $\eta_{GeN-DP}$ via Auto-Regressive Clipping Threshold $R_l$

The paper integrates the GeN learning rate estimation, $\eta_{GeN}(m) := \frac{G^\top m}{m^\top H m}$, into the DP regime by privatizing the entire quadratic fitting procedure. This yields $\eta_{GeN-DP} = \frac{(G^\top m)_{DP}}{(m^\top H m)_{DP}}$. To ensure DP compliance, the calculation of $(G^\top m)_{DP}$ and $(m^\top H m)_{DP}$ must be based on private quantities. The mechanism achieves this by replacing the standard non-DP fitting procedure (Equation 5) with a privatized version (Equation 6), where the loss itself is privatized using $\tilde{L}(w - \eta_{im}^{DP})$. The resulting framework, HyFreeDP, uses an auto-regressive design where the loss clipping threshold $R_l$ for the current iteration is set based on the privatized loss from the previous iteration, $\tilde{L}^{(0)}_{t-1}$. This allows the adaptive tuning of $\eta$ to proceed iteratively while preserving DP guarantees through the post-processing property of DP.

## Limitations

Furthermore, Theorem 2 shows that $\epsilon_{\text{ours}} > \epsilon_{\text{vanilla}}$ when $\sigma_g = \sigma$, meaning achieving the exact same privacy budget as vanilla DP-SGD requires introducing a slightly larger gradient noise $\sigma_g = \gamma\sigma$ ($\gamma \le 1.01$).

## What practitioners should do

* If implementing DP optimization, consider HyFreeDP to avoid the computational cost and privacy risks associated with grid searching for $\eta$ and $R_g$.
* When using the loss privatization approach, aim to set the loss clipping threshold $R_l$ close to the actual per-sample loss $L_i$ to minimize clipping bias.
* Be aware that maintaining the exact privacy budget of vanilla DP-SGD requires slightly increasing the gradient noise $\sigma_g$ using a factor $\gamma \le 1.01$.
* Leverage the auto-regressive updates defined in Algorithm 1, as they allow dynamic hyperparameter adjustment while preserving DP through post-processing.

## Verdict

Read for ML engineers and security researchers working on privacy-preserving model training. This paper provides a concrete, mathematically grounded path to eliminate hyperparameter search in DP optimization.

---

## Den's Take

The paper presents a technically sound path for integrating adaptive learning rate schedules into DP training, moving beyond the manual tuning burden. However, the reliance on the assumption that loss values remain "relatively stable across adjacent iterations" feels like a significant practical vulnerability. If the optimization trajectory experiences a sharp, non-smooth change—which is common during early-stage learning or when encountering adversarial examples—the auto-regressive setting of $R_l$ could lead to a sudden, catastrophic mismatch between the assumed loss scale and the true loss, potentially degrading utility far beyond the $\epsilon$ penalty mentioned. While the approach bypasses grid search, it replaces it with a dependency on local smoothness, which is not guaranteed in complex optimization spaces.