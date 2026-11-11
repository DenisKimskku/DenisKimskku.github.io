---
title: "Targeted Attack Improves Protection against Unauthorized Diffusion Customization"
date: "2026-11-12"
type: "Paper Review"
description: "Uses targeted adversarial attacks (ACE/ACE+) to poison diffusion models"
tags: ["Data Poisoning", "Adversarial Attacks"]
readingTime: 5
headerImage: "/images/news/targeted_attack_improves_protection_against_unauthorized_dif.jpg"
paperUrl: "https://arxiv.org/abs/2310.04687"
---

![Targeted Attack Improves Protection against Unauthorized Diffusion Customization](/images/news/targeted_attack_improves_protection_against_unauthorized_dif.jpg)

# ACE: Targeted Score-Function Errors for Robust Diffusion Customization Defense

## TLDR
*   **What**: Uses targeted adversarial attacks (ACE/ACE+) to poison diffusion models.
*   **Who's at risk**: Deployments using diffusion models for unauthorized image customization.
*   **Key number**: ACE outperforms all baselines in two mainstream diffusion customizations.

## The Mismatch Between Protection Goals and Untargeted Attacks
Diffusion models excel at generating customized images using inputs like reference photos or text prompts. This capability, while powerful, enables unauthorized diffusion customization, allowing bad actors to fine-tune models on private data. Current countermeasures rely on adding adversarial perturbations to protect the source images. These existing protections utilize untargeted attacks, which aim to maximize the score-function error in Equation 2, Equation 3—essentially making the protected image look less like a real image. The issue arises because making an image look "not real" is not the same as making it unusable for a specific customization task. Under small adversarial budgets, existing methods often only introduce localized patterns, leaving the main content intact. This leaves a functional hole; the customization process can still succeed, albeit with some visual noise. The core gap this paper addresses is that untargeted attacks lack the precision to reliably degrade the *utility* of the resulting customized image.

## Attacking with Consistent Score-Function Errors
The paper introduces Attacking with Consistent Errors (ACE) to bridge this gap. The central insight is shifting the attack objective from maximizing general divergence (as in untargeted attacks) to minimizing the distance between the predicted score function and a pre-defined, chaotic target $T$. This transforms the poisoning injection from a general "make it unrecognizable" signal into a specific "force it to learn this pattern" signal. Where untargeted attacks aim to minimize the log-likelihood of the perturbed image, ACE explicitly forces the diffusion model to learn the pattern encoded in $T$. This is a direct modification of the adversarial attack structure: replacing the ground truth score function $\nabla_{z'}(t) \log p_t(z'(t)|z'(0))$ with a specific target $T$, and flipping the maximization to minimization. This consistent direction of error is what allows the attack to reinforce a specific, degrading pattern across the entire output.

## Target Selection and the ACE+ Combination
The effectiveness of ACE hinges entirely on the selection of $T$. The paper dictates that $T$ must possess chaotic patterns recognizable by human vision—such as high contrast stripes or Moire patterns—so that the customization process learns these unusable patterns. The authors base their basic target $T$ on the latent representation of an image exhibiting high contrast and repeating motifs. To further boost performance, they introduce ACE+, which combines the ACE objective (Equation 4) with an existing targeted attack objective from Liang & Wu (2023):

$$\min_{\eta} \mathbb{E}_{t, z'(\cdot)|z'(0)} \left\| s_\theta(z'(t), t) - T \right\|^2 + \alpha \left\| z'(0) - T \right\|^2$$

This combination allows the attack to simultaneously inject the specific chaotic pattern $T$ via the score function error while also pulling the latent representation $z'(0)$ closer to the target $T$.

## Limitations
The research focuses on two mainstream customization methods, LoRA+DreamBooth and SDEdit, using Stable Diffusion 1.5 as the backbone. The threat model is constrained to image-to-image and style/identity customization. The paper does not extensively test robustness against purification or against changes in the diffusion model architecture beyond the specified backbone. The success relies on the assumption that the target $T$ successfully encodes a pattern that the customization process prioritizes learning.

## What practitioners should do
*   When implementing adversarial protection against diffusion customization, consider moving beyond untargeted attacks for stronger results.
*   If using targeted attacks, ensure the target object or pattern $T$ is chosen to actively degrade the *utility* of the output, not just its realism.
*   Test protection effectiveness under small adversarial perturbation budgets ($\zeta$), as shown by the low budget of $4/255$ used in the study.
*   Investigate combining targeted objectives, similar to the ACE+ formulation, to enforce both score-function alignment and latent space proximity to the target.

## Verdict
Read this paper if you are working on poisoning defenses for generative models, particularly diffusion models, as it provides a clear, mechanism-based argument for why targeted attacks can outperform untargeted ones in this domain.

## Den's Take

The paper makes a solid point about the insufficiency of untargeted attacks when the goal is utility degradation rather than mere visual distortion. However, I find the reliance on human-perceptible chaotic patterns, like high-contrast stripes, to define the target $T$ to be an unproven assumption about the diffusion model's internal optimization priorities. It's a leap of faith that a specific, visually jarring pattern will consistently dominate the fine-tuning process across different customization methods. Furthermore, the evaluation is narrowly scoped to LoRA+DreamBooth and SDEdit on Stable Diffusion 1.5. This level of architectural constraint means the findings likely do not generalize to more complex, multi-stage generative pipelines where the diffusion process might interact with external control mechanisms.