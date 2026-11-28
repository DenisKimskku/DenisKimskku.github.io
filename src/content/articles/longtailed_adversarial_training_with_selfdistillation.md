---
title: "Long-tailed Adversarial Training with Self-Distillation"
date: "2026-11-29"
type: "Paper Review"
description: "Uses a balanced self-teacher model to guide robustness training"
tags: ["Adversarial Attacks", "Vulnerabilities"]
readingTime: 5
headerImage: "/images/news/longtailed_adversarial_training_with_selfdistillation.jpg"
paperUrl: "https://arxiv.org/abs/2503.06461"
---

![Long-tailed Adversarial Training with Self-Distillation](/images/news/longtailed_adversarial_training_with_selfdistillation.jpg)
*Figure from the paper “Long-tailed Adversarial Training with Self-Distillation” (p. 2)*

# Long-Tailed Adversarial Training with Self-Distillation

## TLDR
*   **What**: Uses a balanced self-teacher model to guide robustness training.
*   **Who's at risk**: Models deployed on real-world, imbalanced datasets.
*   **Key number**: Improvements in accuracy against PGD attacks for tail classes by 20.3, 7.1, and 3.8 percentage points on CIFAR-10, CIFAR-100, and Tiny-ImageNet, respectively.

## The Vulnerability of Tail Classes Under Adversarial Training
Standard adversarial training, while effective for boosting overall robustness, performs poorly when data is naturally imbalanced or long-tailed. The core issue, as this work shows via theoretical analysis, is that adversarial training exacerbates performance degradation specifically within tail classes compared to natural training. While prior works have attempted to integrate long-tailed classification techniques with adversarial training—methods like RoBal, REAT, and AT-BSL—these approaches still exhibit notably lower tail-class robustness compared to the head classes. The existing balanced softmax approach, for instance, prevents robustness degradation but remains inferior to naive PGD training on a balanced dataset regarding tail-class robustness. The challenge is that combining these two domains results in a system where the scarcity of tail data is amplified by the adversarial optimization process.

## The Balanced Self-Teacher
The paper introduces a two-step framework to counteract the inherent bias toward head classes during adversarial training. The key insight is leveraging a balanced self-teacher model. Instead of training the robust model directly on the skewed long-tailed dataset, the authors first construct a balanced sub-dataset ($\text{DB}$) by re-sampling the original data, specifically up-sampling tail classes and down-sampling head classes using a hyperparameter $\gamma$. A self-teacher model ($\text{f}_{\text{B}}$) is then adversarially trained exclusively on this $\text{DB}$. This process creates a teacher model that has learned a superior level of robustness tailored to the minority classes, a capability that models trained on the full, imbalanced dataset lack.

## Adversarial Knowledge Distillation
The tail robustness learned by the balanced self-teacher model ($\text{f}_{\text{B}}$) is then transferred to the main, long-tailed student model ($\text{f}$) using adversarial knowledge distillation. The main training loop involves standard adversarial training (using PGD attacks) but augments the loss function. The loss combines the standard Long-Balanced Softmax Loss ($\text{LBSL}$) with a Knowledge Distillation loss ($\text{LKD}$) term:

$$\text{LBSL}(\text{f}(\text{x}^{\prime}_i), y_i) + \alpha \cdot \text{LKD}(\text{f}(\text{x}^{\prime}_i), \text{f}_{\text{B}}(\text{x}_i))$$

The training procedure involves two phases: first, training $\text{f}_{\text{B}}$ for $\text{TB}$ epochs on $\text{DB}$ using PGD attacks; second, training $\text{f}$ for $\text{T}$ epochs on the original long-tailed dataset $\text{D}$, using PGD attacks and incorporating the distillation term.

## Limitations
The theoretical analysis is restricted to a binary classification task assuming a Gaussian mixture distribution. The practical application might break down if the underlying data distribution deviates significantly from this assumption. Furthermore, the effectiveness of the self-distillation relies on the assumption that the balanced self-teacher can perfectly transfer its specialized tail-class knowledge to the student model without degrading overall head-class performance, an assumption that may not hold universally in complex, high-dimensional settings.

## What practitioners should do
*   If deploying models on datasets with known class imbalance, investigate methods that separate training on balanced subsets from final deployment.
*   When using adversarial training, monitor tail class performance metrics (T-PGD) alongside overall accuracy, as robustness can be unevenly distributed.
*   Consider employing a distillation mechanism where a specialized, balanced teacher guides the robustness of the main, imbalanced student model.
*   Benchmarking against methods like AT-BSL should include explicit tail-class performance evaluations, not just aggregate metrics.

## Verdict
Read this paper if you are working on robust machine learning for real-world datasets exhibiting class imbalance; otherwise, skip it.

## Den's Take

The paper frames the self-distillation approach as a panacea for long-tailed adversarial robustness, but it stops short of addressing the stability of the knowledge transfer itself. Merely assuming that the specialized tail-class knowledge from the balanced self-teacher ($\text{f}_{\text{B}}$) transfers perfectly to the student model ($\text{f}$) ignores the potential for catastrophic interference. If the distillation loss ($\text{LKD}$) forces the student to over-optimize for the minority class features learned by the teacher, it risks eroding the generalized robustness achieved against the majority classes. This is a common pitfall when using distillation to correct for distributional skew. prior work argued that relying on exemplar responses for forgetting is not a robust solution; it merely shifts fragility to prompt engineering [2026-11-28|llm_unlearning_via_loss_adjustment_with_only_forget_data]. A similar fragility exists here: the transfer mechanism is as brittle as the source data imbalance it tries to fix.