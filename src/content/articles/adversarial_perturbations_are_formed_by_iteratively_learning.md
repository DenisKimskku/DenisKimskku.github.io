---
title: "Adversarial Perturbations Are Formed by Iteratively Learning Linear Combinations of the Right Singular Vectors of the Adversarial Jacobian"
date: "2026-08-19"
type: "Paper Review"
description: "Iteratively optimizing linear combinations of right singular vectors of the adversarial Jacobian"
tags: ["Adversarial Attacks", "Vulnerabilities"]
readingTime: 5
headerImage: "/images/news/adversarial_perturbations_are_formed_by_iteratively_learning.jpg"
paperUrl: "https://proceedings.mlr.press/v267/paniagua25a.html"
---

![Adversarial Perturbations Are Formed by Iteratively Learning Linear Combinations of the Right Singular Vectors of the Adversarial Jacobian](/images/news/adversarial_perturbations_are_formed_by_iteratively_learning.jpg)
*Figure from the paper “Adversarial Perturbations Are Formed by Iteratively Learning Linear Combinations of the Right Singular…” (p. 2)*

# RisingAttacK: Learning Ordered Top-K Perturbations via Singular Vector Subspace Projection

## TLDR
*   **What**: Iteratively optimizing linear combinations of right singular vectors of the adversarial Jacobian.
*   **Who's at risk**: DNNs used in safety-critical systems relying on ranked outputs (e.g., content moderation).
*   **Key number**: Extensive experiments on ImageNet-1k across six ordered top-K levels ($K = 1, 5, 10, 15, 20, 25, 30$) show RisingAttacK consistently surpasses the state-of-the-art QuadAttacK.

## Bridging Feature Space and Image Space
White-box targeted attacks expose DNN vulnerabilities, but a critical gap remains in handling ordered top-K attacks ($K \ge 1$). Traditional methods often struggle with the high-dimensional, non-linear constraints imposed by requiring a specific ranking of logits. Prior work, such as QuadAttacK, addressed this by formulating the attack as a Quadratic Programming (QP) optimization, but crucially, it solved this problem in the feature space of the DNN backbone. The paper notes that this feature space approach introduces a "Feature vs. Image Space Misalignment," meaning minimizing the perturbation in the feature space does not guarantee a minimal or visually coherent change in the original image space. This indirect connection limits the fidelity of the resulting adversarial examples, especially when $K$ becomes large ($K > 20$) or the optimization budget is tight.

## Jacobian Subspace QP
The core innovation centers on directly solving the ordered top-K problem in the image space, $x \in [0, 1]^D$, by leveraging the structure of the adversarial Jacobian. The paper reframes the problem by first using a mapping $G: \ell(\cdot) \in \mathbb{R}^C \to l(\cdot) \in \mathbb{R}^d$ to condense the $C-1$ constraints down to $d = K + M + 1$ constraints, where $d \ll C$. This allows the constraints to be expressed in a manageable form, $K \cdot l(x) > 0$. By linearizing the DNN around the current perturbation $x_{\text{anchor}}$, the problem becomes a constrained minimization problem:
$$\text{minimize } \|x - x_{\text{anchor}}\|_2^2$$
$$\text{s.t. } \mathbf{A} \cdot x \le b$$
where $\mathbf{A}$ incorporates the ordered top-K ranking constraints derived from the logit-to-image Jacobian matrix, $J(x_{\text{anchor}})$.

## Right Singular Vectors of the Adversarial Jacobian
Directly solving the resulting high-dimensional polyhedron defined by $\mathbf{A} \cdot x \le b$ is computationally prohibitive under typical attack budgets. RisingAttacK circumvents this by exploiting the Singular Value Decomposition (SVD) of $\mathbf{A} = \mathbf{U} \cdot \mathbf{\Sigma} \cdot \mathbf{V}^\top$. The SVD decomposes $\mathbf{A}$ into orthogonal bases, where the columns of $\mathbf{V}$ represent principal directions in the image space. Since $d \ll D$, the researchers project the problem onto the first $d-1$ columns of $\mathbf{V}$, denoted $\mathbf{V}_r$. By substituting $\delta = \mathbf{V} \cdot \epsilon$ into the objective and constraints, the problem reduces to a low-dimensional optimization in the $\epsilon$ space:
$$\text{minimize } \|\epsilon\|_2^2$$
$$\text{s.t. } \mathbf{\Sigma}_r \cdot \epsilon_r \le \mathbf{U}^\top (\mathbf{b} - \mathbf{A} \cdot x_{\text{anchor}})$$
This final step is a low-dimensional QP that can be efficiently solved, achieving the desired adversarial perturbation by finding the optimal $\epsilon_r$.

## Limitations
The effectiveness of the method relies on the quality of the first-order Taylor expansion linearization, which may fail if the required perturbation $\delta$ is large, leading to a poor approximation of the non-linear constraints. Furthermore, the method's complexity scales with the chosen mapping dimension $d$, which is tied to $K$; if $K$ is extremely large, the dimensionality reduction benefit diminishes. The paper does not detail how the algorithm handles the null space component $\epsilon_o$ beyond setting it to zero during minimization.

## What practitioners should do
*   When assessing model robustness, move beyond Top-1 attacks and evaluate models against ordered Top-K constraints ($K>1$).
*   If using methods that solve attacks in feature space, recognize the potential for visual misalignment between the optimized feature perturbation and the final image perturbation.
*   For high-stakes systems, consider attack formulations that operate directly in the input image space to ensure perturbation coherence.
*   RisingAttacK achieves significant better performance than the prior state-of-the-art method, QuadAttacK (Paniagua et al., 2023) in experiments.

## Verdict
Read this paper if you are an ML engineer or security researcher focused on white-box adversarial robustness; otherwise, skip it.

## Den's Take

The paper proposes a mathematically elegant way to tackle ordered top-K attacks by projecting the problem onto the principal directions derived from the Jacobian's SVD. However, the entire framework hinges on the validity of the first-order Taylor expansion. This reliance is a critical weakness; if the necessary perturbation $\delta$ is large enough to significantly shift the decision boundaries, the resulting low-dimensional QP will be optimizing against a fundamentally inaccurate model of the true non-linear system. This is not a robustness measure; it is an approximation of one. Furthermore, while the authors show outperformance on ImageNet-1k, this success in a controlled setting does not translate to real-world deployment where system complexity and environmental noise are far greater than those assumed in the linearization. prior work argued that defenses must shift from monitoring malicious input to cryptographically verifying the model's fundamental integrity, and this work, despite its technical depth, remains firmly rooted in input perturbation rather than systemic verification.