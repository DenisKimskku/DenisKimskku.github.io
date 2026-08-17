---
title: "Improving Zero-Shot Adversarial Robustness in Vision-Language Models by Closed-form Alignment of Adversarial Path Simplices"
date: "2026-08-18"
type: "Paper Review"
description: "Uses closed-form statistics over adversarial path simplices for robustification"
tags: ["Adversarial Attacks"]
readingTime: 5
headerImage: "/images/news/improving_zeroshot_adversarial_robustness_in_visionlanguage_.jpg"
---

![Improving Zero-Shot Adversarial Robustness in Vision-Language Models by Closed-form Alignment of Adversarial Path Simplices](/images/news/improving_zeroshot_adversarial_robustness_in_visionlanguage_.jpg)
*Figure from the paper “Improving Zero-Shot Adversarial Robustness in Vision-Language Models by Closed-form Alignment of Adversarial…” (p. 2)*

# Closed-form Alignment of Adversarial Path Simplices for VLM Robustness

## TLDR
*   **What**: Uses closed-form statistics over adversarial path simplices for robustification.
*   **Who's at risk**: Zero-shot Vision-Language Models (VLMs) like CLIP.
*   **Key number**: We obtain state-of-the-art robustness across 15 datasets and diverse vision-language tasks.

## The Limitation of Point-wise Alignment

Current adversarial fine-tuning methods, such as TeCoA, PMG, and FARE, strengthen zero-shot VLMs by aligning the prediction scores of individual adversarial samples against their clean counterparts or ground-truth labels. This process is based on a minimax optimization (Eq. 3) where adversarial examples are typically generated using iterative Projected Gradient Descent (PGD) over $m$ steps. A critical gap in this approach is that it only considers the final or intermediate adversarial samples ($\hat{x}(i)$) along the adversarial trajectory. These individual points fail to capture the richer information encoded in the entire region—the "adversarial simplex"—formed by connecting a clean sample vertex $x$ with consecutive intermediate adversarial vertices, $(x+\delta x,i, x+\delta x,i+1)$. This intermediate region encapsulates a larger portion of the decision boundary, yet explicitly sampling points from these simplices for fine-tuning is computationally prohibitive, as shown by the naive setting requiring $\kappa$ samples from a simplex, leading to \$91M$ images for a dataset of \$1M$ images with $\kappa=10$ and $m=10$. This oversight leaves VLMs vulnerable to adversaries residing within these unexplored geometric regions.

## AdvSimplex and the $\infty$-dense Sampling of Simplex

The core innovation of this work is moving from point-wise alignment to aligning over the entire simplex region. The paper leverages the geometric structure of these simplices to approximate the integral over the entire region. Instead of explicitly sampling $\kappa$ points from the simplex $\Delta X$ to calculate the loss $\Omega(x)$, the authors derive a closed-form expression for the expected outer product of points within the simplex, denoted $\Sigma_x$. For a 2-vertex simplex (a line segment, $Q=2$), the formula for $\Sigma_x$ is given by:

```
\Sigma_x = \frac{1}{12} \left( (x+y) (x+y)^T + \frac{1}{2} (xx^T + yy^T) \right)
```

For higher-order simplices, such as a tetrahedron ($Q=4$ vertices), the closed form is:

```
\Sigma_x = \frac{1}{Q(Q+1)} \left( \sum_{i=1}^Q z_i z_i^T + \left( \sum_{i=1}^Q z_i \right) \left( \sum_{i=1}^Q z_i \right)^T \right)
```

This formulation is equivalent to performing an infinite uniform sampling of the simplex, drastically reducing the computational cost associated with explicitly iterating over many adversarial candidates.

## Closed-form Upper Bound of Alignment Loss

To implement this efficiently, the paper replaces the empirical set $\hat{\Sigma}_x$ with an analytically derived upper bound, $\bar{\bar{\Omega}}(x; \Sigma_x)$. This is achieved by applying a Taylor expansion of the prediction function $g_\theta(\cdot)$ around the clean sample $x$. The expansion allows the original alignment loss $\Omega(x)$ to be approximated using the Jacobian $J_g(x)$ and Hessian $H_g(x)$ evaluated at $x$. Specifically, the upper bound $\bar{\bar{\Omega}}(x; \Sigma_x)$ is derived as:

$$\bar{\bar{\Omega}}(x; \Sigma_x) = \sum_{c=1}^C \frac{1}{2} \hat{\Sigma}_x, (J_g(x, c))^T + \frac{1}{2\kappa} \hat{\Sigma}_x, (H_g(x)^c \otimes H_g(x)^c)$$

This bound relies on replacing the empirical average $\frac{1}{\kappa} \sum_{\delta x \in \Delta X}$ with the analytically derived $\Sigma_x$. The computational savings are realized because calculating the necessary terms, such as $\hat{\Sigma}_x, (H_g(x)^c \otimes H_g(x)^c)$, can be done using Hessian-vector products (HVPs) rather than requiring numerous full backward passes. The final loss function combines this upper bound with the natural risk:

$$\min_\theta \mathbb{E}_{x \in X} \ell(g_\theta(x), y_x) + \lambda \mathbb{E}_{i=1}^{m-1} \omega_i(x) \bar{\bar{\Omega}}(x; \Sigma_{x,i})$$

## Limitations

The derivation relies on the assumption that the perturbation radius $\epsilon$ is sufficiently small such that the third-order remainder term in the Taylor expansion is negligible. Furthermore, the method requires the ability to obtain the Jacobian and Hessian-vector product of the model $g_\theta(\cdot)$ evaluated at clean samples, which may not be feasible for all deployed VLM architectures.

## What practitioners should do

*   If deploying CLIP-based VLMs, investigate incorporating closed-form simplex alignment losses instead of standard point-wise adversarial fine-tuning.
*   When assessing robustness, test against adversaries sampled from geometric regions (simplices) rather than just the final PGD step.
*   If using gradient-based defense mechanisms, ensure the architecture allows for efficient computation of Jacobian and Hessian-vector products to utilize this technique.
*   Examine the trade-off parameter $\lambda$ to balance the reduction in robust risk against the potential degradation of natural classification accuracy.

## Verdict

Read this paper if you are an ML engineer or security researcher focused on strengthening large foundation models against adversarial attacks; otherwise, skip it.

---

## Den's Take

The paper makes a strong case for moving beyond point-wise adversarial examples to consider the entire adversarial simplex, a necessary geometric refinement in this domain. However, the reliance on a Taylor expansion to derive the upper bound $\bar{\bar{\Omega}}(x; \Sigma_x)$ introduces a dependency on small perturbation radii ($\epsilon$). If the true threat model involves large, complex perturbations—which is often the case in practical attacks against large foundation models—this analytical shortcut is likely to break down, rendering the derived bound unrepresentative of the actual decision boundary vulnerability. Furthermore, while the computational savings from using Hessian-vector products are noted, the prerequisite for obtaining these quantities at clean samples is a significant practical hurdle for many closed-source VLM deployments. This technique seems theoretically elegant but perhaps too brittle for immediate, broad adoption against adaptive adversaries.