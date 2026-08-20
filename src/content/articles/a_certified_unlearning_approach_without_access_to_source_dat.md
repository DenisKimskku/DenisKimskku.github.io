---
title: "A Certified Unlearning Approach without Access to Source Data"
date: "2026-08-21"
type: "Paper Review"
description: "A Certified Unlearning Approach without Access to Source Data"
tags: ["Privacy", "Machine Unlearning"]
readingTime: 5
headerImage: "/images/news/a_certified_unlearning_approach_without_access_to_source_dat.jpg"
---

![A Certified Unlearning Approach without Access to Source Data](/images/news/a_certified_unlearning_approach_without_access_to_source_dat.jpg)
*Figure from the paper “A Certified Unlearning Approach without Access to Source Data” (p. 7)*

# Certified Unlearning with Surrogate Data Statistics

## TLDR
*   **What:** Proposes certified data removal without access to original training samples.
*   **Who's at risk:** Deployments needing GDPR/CCPA compliance on black-box models.
*   **Key number:** The bound on the difference is $\lVert w^*_r - b_{wr} \rVert^2 \le \Delta$.

## Approximating the Retrained Model
The standard for certified unlearning requires proving that the unlearned model behaves like a model retrained from scratch on the retained data ($w^*_r$). Current, feasible methods often rely on full access to the source dataset ($D$) to calculate necessary statistics, such as the Hessian of the retained samples ($H_{Dr}$). This dependence on source data is a major bottleneck in regulated or distributed environments; the original samples might be deleted or inaccessible due to privacy or resource constraints. Existing work, which focuses on source-free unlearning, has faced challenges in providing formal, certified guarantees. This paper targets this gap: achieving certified erasure when the only information available for guiding the process is a *surrogate dataset* ($D_s$) that approximates the statistics of the true source data ($D$).

## Surrogate Hessian and Model Update
The core mechanism shifts the statistical dependency from the source data $D$ to the surrogate data $D_s$. Since the exact Hessian of the retain samples ($H_{Dr}$) is unavailable, the framework estimates it using the surrogate Hessian ($H_{Ds}$) and the known size of the unlearned set ($m$):
$$bH_{Dr} = nH_{Ds} - mH_{Du}$$
where $n$ is the size of $D_s$, and $H_{Du}$ is the Hessian contribution from the forget set $D_u$. Using this estimated Hessian, the model is updated via a single-step second-order Newton update, incorporating the gradient information from the forget set:
$$b_{wr} = w^* + \frac{m}{n-m} bH_{Dr}^{-1} \nabla L(w^*, D_u)$$
This $b_{wr}$ is the model before noise injection, approximating $w^*_r$.

## Noise Calibration via Statistical Distance
To achieve the certified guarantee, noise must be added to $b_{wr}$ such that the resulting model $b'_{wr}$ is statistically indistinguishable from $w^*_r$. The noise magnitude ($\sigma$) is calibrated based on two factors: an upper bound ($\Delta$) on the difference between the true and approximate models, and the Total Variation distance ($\text{TV}(\rho \parallel \nu)$) between the source distribution ($\rho$) and the surrogate distribution ($\nu$). The noise level is set as:
$$\sigma = \sqrt{\frac{\Delta}{\epsilon p^2 \ln(1.25/\delta)}}$$
The bound $\Delta$ itself depends on $\text{TV}(\rho \parallel \nu)$:
$$\lVert w^*_r - b_{wr} \rVert^2 \le \Delta \triangleq 2\gamma Lm^2\alpha^3n_2^{-1} + \frac{\lVert \nabla L(D_u, w^*) \rVert^2}{m(n_1 - n_2)\beta} + \frac{2mn_2^\beta \text{TV}(\rho \parallel \nu)}{(n_1\alpha - m\beta)(n_2\alpha - m\beta)}$$
When $\text{TV}(\rho \parallel \nu)$ is large, the required noise $\sigma$ increases, maintaining the certified guarantee.

## Limitations
The theoretical guarantees rely on the assumption that the loss function $L$ is $L$-Lipschitz, $\alpha$-strongly convex, $\beta$-smooth, and $\gamma$-Hessian Lipschitz (Assumption 4.1). Furthermore, the practical implementation requires approximating the Total Variation distance using the Kullback-Leibler (KL) divergence, which is derived from the model's implicit energy-based model. If the KL approximation significantly deviates from the true TV distance, the noise calibration might be insufficient for the desired $(\epsilon, \delta)$ certification.

## What practitioners should do
*   If using unlearning mechanisms, verify if source data access is truly impossible; if not, full retraining offers the strongest guarantee.
*   When relying on surrogate data, quantify the statistical distance ($\text{TV}(\rho \parallel \nu)$) as accurately as possible to minimize necessary noise injection.
*   If $\text{TV}(\rho \parallel \nu)$ cannot be known, utilize the KL divergence approximation derived from the model's energy function for a practical upper bound.
*   Be aware that the utility preservation is directly tied to the fidelity between the source and surrogate data distributions.

## Verdict
Read for ML engineers and security researchers interested in privacy compliance; skip if your unlearning pipeline has full access to the original training corpus.

## Den's Take

This approach tackles a genuine operational hurdle: certified unlearning when source data is unavailable. However, the entire edifice rests on the fidelity of the surrogate data approximation ($\text{TV}(\rho \parallel \nu)$). If the surrogate data fails to capture the statistical nuances of the original data, the resulting noise calibration, even if mathematically sound based on the surrogate, offers little practical assurance against a determined adversary. The reliance on KL divergence as a stand-in for TV distance introduces a significant, unquantified risk into the certification boundary. This feels like trading a known, hard problem (full retraining) for a complex, brittle approximation.