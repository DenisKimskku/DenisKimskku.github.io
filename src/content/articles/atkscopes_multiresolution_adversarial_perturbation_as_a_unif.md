---
title: "Atkscopes: Multiresolution Adversarial Perturbation as a Unified Attack on Perceptual Hashing and Beyond"
date: "2026-08-19"
type: "Paper Review"
description: "Multiresolution perturbation allows attacks across various hash scales"
tags: ["Adversarial Attacks", "Privacy"]
readingTime: 5
headerImage: "/images/news/atkscopes_multiresolution_adversarial_perturbation_as_a_unif.jpg"
paperUrl: "https://www.usenix.org/conference/usenixsecurity25/presentation/zhang-yushu"
---

![Atkscopes: Multiresolution Adversarial Perturbation as a Unified Attack on Perceptual Hashing and Beyond](/images/news/atkscopes_multiresolution_adversarial_perturbation_as_a_unif.jpg)

# ATKSCOPES: Multiresolution Perturbation for Unified Hashing System Attacks

## TLDR
*   **What**: Multiresolution perturbation allows attacks across various hash scales.
*   **Who's at risk**: E2EE-PHM systems using pHash, PDQ, PhotoDNA, and NeuralHash.
*   **Key number**: The attack encapsulates previous attacks as special cases.

## The Mismatch in Scale Between Attack and Hash Extraction

The current deployment of Perceptual Hash Matching (PHM) within End-to-End Encryption (E2EE) systems attempts to balance privacy with regulatory needs by generating content-aware hash codes for media. These systems rely on algorithms like pHash, Facebook PDQ, Microsoft PhotoDNA, and Apple NeuralHash. While these algorithms are effective at mapping visually similar media to similar hash codes, prior adversarial research has faced a practical limitation. Existing attacks predominantly introduce perturbations only in the pixel domain, such as $X + \delta$. This pixel-scale focus creates a fundamental mismatch because the underlying perceptual hashing algorithms operate across multiple scales: pHash and PDQ utilize global-scale features (via 2D discrete cosine transform), PhotoDNA uses mid-scale features (via a $6\times6$ grid), and NeuralHash extracts pixel-scale features via a convolutional neural network. This scale mismatch has historically resulted in attacks that are either too computationally expensive or limited to specific hash types, preventing a unified, realistic threat model against these widely used commercial hashing algorithms.

## Multiresolution Perturbation

This paper introduces multiresolution perturbation as the core mechanism to bridge the scale mismatch. The key insight is that instead of applying a uniform perturbation $\delta$ directly to the image pixels $X$, the attack operates in the feature domain using a local orthogonal transformation $F$. The attack image $X'$ is defined via the transformation:
$$X'(x,y)\in D_{uvw} = F^{-1} (F (X)+\delta), \quad (3)$$
This formulation allows each perturbation element to affect image regions of adjustable scales, spanning from the pixel scale to the global scale. This flexibility means the attack is no longer constrained to one scale; it can be tuned to match the specific scale at which the target hash algorithm extracts its vital features. Consequently, this flexible ATKSCOPES framework encapsulates previous pixel-scale-only attacks as special cases, enabling a unified attack across all tested hash algorithms.

## The Local Orthogonal Basis Function $V_{uvw}^{nm}$

The mechanism of ATKSCOPES is formalized through the local orthogonal basis function $V_{uvw}^{nm}$. This function converts the image domain $D$ to a transformed domain $D_{uvw}$ using a translation offset $(u,v)$ and a scaling factor $w$. The transformation itself is defined as:
$$F (X) = \langle X, V_{uvw}^{nm} \rangle = \sum_D (V_{uvw}^{nm} (x,y))^*X(x,y)dxdy, \quad (4)$$
where $F$ denotes the local orthogonal transformation. The basis function $V_{uvw}^{nm}$ is derived from a global orthogonal basis function $V_{nm}$ by applying the transformation:
$$V_{uvw}^{nm} (x,y) = V_{nm}(x/w - u, y/w - v). \quad (6)$$
This process involves transforming the image coefficients $F(X)$, adding the perturbation $\delta$ to this coefficient matrix, and then transforming back via $F^{-1}$. The paper validates this approach by achieving uniform, fast, and successful adversarial attacks against pHash, PDQ, PhotoDNA, and NeuralHash in both escaping and triggering regulation scenarios.

## Limitations

The paper focuses on the adversarial robustness of the hashing functions themselves, assuming the attacker knows the matching threshold $\Delta d$. The threat model does not explicitly cover scenarios where the attacker cannot observe $\Delta d$. Furthermore, the paper's success is demonstrated against specific, well-defined hashing algorithms; generalization to proprietary or highly adaptive hashing systems not covered in the evaluation may require further investigation.

## What practitioners should do

*   If relying on PHM for content auditing, understand that multiresolution attacks can circumvent defenses by targeting different feature scales.
*   Evaluate the robustness of your chosen perceptual hash function against perturbations applied in the frequency or feature domain, not just the pixel domain.
*   Consider the computational cost of defenses that attempt to normalize or smooth input images before hashing, as these might interact unpredictably with multiresolution attacks.
*   If deploying server-held matching, recognize that the underlying hash function's robustness is the primary security boundary being challenged here.

## Verdict

Read this paper if you are a security researcher or ML engineer focused on the intersection of applied cryptography and adversarial machine learning. Otherwise, skim it; the technical depth on orthogonal transformations may be unnecessary for general practitioners.

## Den's Take

The paper presents a technically dense framework for attacking perceptual hashing, but its focus remains too narrow. The evaluation, while demonstrating that ATKSCOPES can efficiently map perturbations across known, fixed hashing algorithms, only proves that ATKSCOPES can efficiently map perturbations across known, fixed hashing algorithms. It fails to address the operational reality that many E2EE systems do not rely on a single, static hash; they often employ cascading or ensemble hashing schemes. If an attacker can successfully compromise the input to one hash function, the system's defense relies on the *next* hash function being robust to the *output* of the first attack. This paper analyzes the first stage in isolation. The next step in this research needs to model how multiresolution perturbations propagate and interact across heterogeneous, multi-stage hashing pipelines.