---
title: "An Undetectable Watermark for Generative Image Models"
date: "2026-11-19"
type: "Paper Review"
description: "Embeds undetectable, quality-preserving watermarks in latent diffusion models"
tags: ["Watermarking"]
readingTime: 5
headerImage: "/images/news/an_undetectable_watermark_for_generative_image_models.jpg"
paperUrl: "https://arxiv.org/abs/2410.07369"
---

![An Undetectable Watermark for Generative Image Models](/images/news/an_undetectable_watermark_for_generative_image_models.jpg)

# PRC Watermarking for Latent Diffusion Models: Undetectability and Robustness

## TLDR
*   **What**: Embeds undetectable, quality-preserving watermarks in latent diffusion models.
*   **Who's at risk**: Deployers of high-fidelity generative image models like Stable Diffusion.
*   **Key number**: We find that we can robustly encode 512 bits in our watermark, and up to 2500 bits when the images are not subjected to watermark removal attacks.

## The Quality Trade-off in Image Watermarking
Current methods for embedding watermarks into generative image models face a significant hurdle: quality degradation. When watermarks are applied, they often alter the output distribution, which is unacceptable for state-of-the-art models trained with immense compute budgets. For example, the Gaussian Shading watermark, while claiming "lossless performance," was shown to significantly degrade the FID and Inception Score when measured across multiple generations using a fixed random key. Similarly, the Tree-Ring watermark, which modifies the latent sampling distribution, leads to reduced image quality and variability. These prior in-processing schemes either introduce correlations across generations or force the initial latent to deviate substantially from the standard Gaussian distribution, making them undesirable for practical, high-fidelity deployment.

## PRC as a Semantic Encoding Layer
This work resolves the quality trade-off by shifting the watermark embedding from pixel-level or distributional manipulation to the semantic level of the latent space. The core innovation is the use of a pseudorandom error-correcting code (PRC), introduced by Christ & Gunn (2024). A PRC allows for the embedding of a cryptographically pseudorandom pattern that is robustly distributed across the entire latent space. This semantic embedding ensures that the watermark operates at a level that is computationally indistinguishable from pure randomness when the detection key is unknown. Unlike prior methods that rely on fixing sampling randomness or constraining latent quadrants, the PRC approach maintains the statistical properties of the underlying Gaussian latent distribution, which is key to preserving quality metrics like FID, CLIP, and Inception Score.

## PRCWat.Samplek and Message Capacity
The PRC watermark is integrated into the latent diffusion model's sampling process via the `PRCWat.Samplek` algorithm. Instead of sampling the initial latent $z(T) \sim \mathcal{N}(0, I_n)$, the scheme samples $\tilde{z}(T)$ by conditioning the signs of a standard Gaussian sample $y \sim \mathcal{N}(0, I_n)$ according to a PRC codeword $c$ derived from the secret key $k$. The specific construction is:
```
Algorithm PRCWat.Samplek(π) :
(1)
Sample a PRC codeword c ∈{−1, 1}n using PRC.Encode(k)
(2)
Sample y ∼N(0, In)
(3)
Let ˜z(T ) ∈Rn be the vector defined by ˜z(T )_i = ci · |yi| for all i ∈[n]
(4)
Compute x ←Generate(π, ˜z(T ))
(5)
Output x
```
This mechanism guarantees undetectability against polynomial-time adversaries, as stated in Theorem 1. Furthermore, the use of belief propagation allows for encoding long messages. For non-attacked images, we show in Figure 14 that we can increase the message capacity to at least 2500 bits. We find in Figure 10 that the robustness of the decoder for 512-bit messages is comparable to, although slightly less than, the robustness of the detector.

## Limitations
The scheme's theoretical guarantees regarding undetectability rely on adherence to parameter bounds from Christ & Gunn (2024), which the experiments do not strictly follow due to finite parameter choices. Consequently, the authors caution that the scheme should not be deployed in applications where undetectability is mission-critical. The threat model focuses on high-quality removal attacks, and the paper only performs limited testing on spoofing attacks.

## What practitioners should do
*   If deploying latent diffusion models, investigate incorporating PRC-based latent manipulation to maintain quality while enabling provenance tracking.
*   When setting up detection, utilize the specified false positive rate $F$ during `PRC.KeyGen(n, F, t)` to rigorously bound the probability of false positives (Theorem 2).
*   For high-stakes content, evaluate the trade-off between the detector robustness and the decoder's message recovery robustness.
*   Do not rely on the scheme for absolute undetectability without further verification against the theoretical parameter constraints.

## Verdict
Read, especially if you are working on generative model provenance or robust watermarking; it provides a concrete, high-quality alternative to existing distribution-altering methods.

## Den's Take

The paper's focus on PRC embedding successfully sidesteps the quality degradation issues plaguing prior in-processing techniques by operating at the latent semantic level. However, the reliance on the theoretical guarantees from Christ & Gunn (2024) while admitting the experimental setup does not strictly adhere to those bounds feels like a significant gap in the claimed robustness. The authors shift the burden of proof onto the practitioner to verify parameter adherence, which is not a helpful conclusion for a deployment guide. Furthermore, the limited testing against spoofing attacks leaves a massive blind spot. If the primary goal is content provenance, we must also consider how easily a well-resourced attacker can generate plausible-looking data that *mimics* the statistical properties of the PRC-modified latent space without actually possessing the key. This suggests the security margin might be thinner than the 512-bit capacity implies under adversarial pressure.