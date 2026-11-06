---
title: "Unlearning-based Neural Interpretations"
date: "2026-11-07"
type: "Paper Review"
description: "UNI uses unlearning to create adaptive, featureless baselines"
tags: ["Machine Unlearning"]
readingTime: 5
headerImage: "/images/news/unlearningbased_neural_interpretations.jpg"
paperUrl: "https://arxiv.org/abs/2410.08069"
---

![Unlearning-based Neural Interpretations](/images/news/unlearningbased_neural_interpretations.jpg)
*Figure from the paper “Unlearning-based Neural Interpretations” (p. 2)*

# UNI: Unlearning-based Neural Interpretations for Debiased Feature Attribution

## TLDR
*   **What**: UNI uses unlearning to create adaptive, featureless baselines.
*   **Who's at risk**: Researchers using gradient-based saliency methods on vision/language models.
*   **Key number**: (No key number provided in the paper text)

## Static Baselines Injecting Assumptions
Attribution methods relying on local gradients often need a baseline input ($x'$) to avoid saturation. When researchers use static functions—like black images, Gaussian blurring, or random noise—as this baseline, they implicitly assume certain features (e.g., dark, smooth, or high-frequency) are irrelevant to the model's decision. This assumption is often false and injects biases not present in the model itself. For instance, using a black baseline makes it harder to attribute dark but salient pixels because the term $(x_i - x'_i)$ becomes small, requiring a disproportionately large gradient to register. This leads to attribution maps that are biased, fragile, and inconsistent across different tasks, models, and inputs. The problem remains that the optimal baseline depends heavily on the specific task–model–image combination.

## Unlearning Direction of Steepest Ascent
The central idea of UNI is to move away from static assumptions by defining an "absence of signal" through an unlearning direction. Instead of picking a fixed image like a black square, UNI constructs a baseline by perturbing the input in the direction of steepest ascent in the model's loss space. This process aims to find a reference model ($\hat{\theta}$) whose predictions are intentionally lowered for the target sample $x$. By then matching the activations of this unlearned model ($\hat{\theta}$) with a perturbation ($\delta_T$) in the original input space, UNI derives an image-specific baseline ($x'$). This constructed $x'$ is featureless *with respect to the model's current predictive bias*, unlike a black image which imposes a post-hoc colour bias.

## Activation Matching and Path Smoothing
The mechanism relies on a three-step pipeline: first, generating the unlearning direction by optimizing $\hat{\theta} = \theta + \eta \frac{\nabla_{\theta}L(F_c(x;\theta),y)}{\|\nabla_{\theta}L(F_c(x;\theta),y)\|}$; second, iteratively finding the perturbation $\delta$ via gradient descent on the KL divergence $C = D_{KL}(F(x;\hat{\theta}) \parallel F(x+\delta_t;\theta))$ until the baseline $x' = x + \delta_T$ is found; and finally, computing the attribution using the standard Integrated Gradients (IG) formula but with $x'$ as the baseline. Crucially, targeted unlearning smooths the high-curvature decision boundaries of the model near the input. This local smoothing results in a path $\gamma$ that is observed to be monotonous and of low curvature, which is essential for low error in the Riemann approximation of the attribution integral.

## Limitations
The paper focuses on image classification and extends to NLP using activation patching, but the threat model primarily addresses post-hoc interpretation fidelity, not model integrity during training. The method relies on the assumption that the model's decision boundaries are piecewise linear, which may not hold perfectly in all complex, real-world deployments. Furthermore, the effectiveness of the baseline definition is tied to the computational budget allocated for the unlearning steps (e.g., $T=10$ PGD steps).

## What practitioners should do
*   Avoid using fixed static baselines (black, blurred, noise) when calculating feature attributions for critical model evaluations.
*   Consider implementing adaptive baseline generation techniques, such as the UNI pipeline, to ensure feature absence reflects the model's true predictive null state.
*   When using IG, verify the path monotonicity and curvature of the integration path, as these properties are prerequisites for sound attribution.
*   If interpreting vision models, compare attribution results across different baseline choices to quantify the dependency on baseline assumptions.

## Verdict
Read this if you are a researcher building or critically evaluating gradient-based interpretability tools; otherwise, skip it.

## Den's Take

The paper presents a sophisticated mechanism for constructing input baselines that are tailored to the model's immediate predictive state, moving beyond the arbitrary assumptions baked into static inputs like black images. However, the focus remains entirely on post-hoc fidelity, which is a narrow problem. The reliance on the assumption that decision boundaries are piecewise linear, as noted in the limitations, is a significant gap. For complex, highly non-linear systems—such as those involving multi-step reasoning or complex RAG pipelines—this approximation is likely to degrade rapidly. Furthermore, the paper does not address how the computational cost of iterative unlearning scales against the potential interpretability gains, especially when considering the latency requirements of production inference.