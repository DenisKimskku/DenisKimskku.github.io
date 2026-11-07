---
title: "Adversarial Perturbations Cannot Reliably Protect Artists From Generative AI"
date: "2026-11-08"
type: "Paper Review"
description: "Low-effort image processing bypasses existing style protection tools"
tags: ["Adversarial Attacks"]
readingTime: 5
headerImage: "/images/news/adversarial_perturbations_cannot_reliably_protect_artists_fr.jpg"
paperUrl: "https://arxiv.org/abs/2406.12027"
---

![Adversarial Perturbations Cannot Reliably Protect Artists From Generative AI](/images/news/adversarial_perturbations_cannot_reliably_protect_artists_fr.jpg)
*Figure from the paper “Adversarial Perturbations Cannot Reliably Protect Artists From Generative AI” (p. 2)*

# Off-the-Shelf Techniques Nullify Adversarial Style Protections in Generative AI

## TLDR
*   **What**: Low-effort image processing bypasses existing style protection tools.
*   **Who's at risk**: Artists using popular adversarial perturbation defenses on online art.
*   **Key number**: Robust mimicry methods can produce results indistinguishable in quality from those obtained from unprotected artworks.

## The Limitations of Unlearnable Examples

Protection tools aim to make an artist's style "unlearnable" by embedding small adversarial perturbations into published images. These tools, such as Glaze, Mist, and Anti-DreamBooth, have been widely adopted. The premise is that these perturbations will disrupt the finetuning process used by generative models to mimic a style. However, the paper reveals that these defenses are brittle because they assume the forger will use a specific, constrained finetuning setup. A forger, even a low-skilled one, can circumvent these defenses simply by changing the underlying tooling. For instance, the paper notes that differences between the original Glaze finetuning script and a standard HuggingFace script are sufficient to "significantly degrade Glaze’s protections." This suggests that the protections lack the necessary robustness across the ecosystem of available tools.

## Noisy Upscaling vs. JPEG Compression

The authors introduce several "robust mimicry methods" designed to stress-test the existing protections, prioritizing simple preprocessing steps that require minimal technical expertise. One such method is Noisy Upscaling, which directly challenges the strategy employed by Glaze. Glaze's original method involved JPEG compression followed by upscaling. The researchers found that upscaling actually magnified the JPEG compression artifacts. The key insight here is recognizing the training context of the upscaler: it is trained on images augmented with Gaussian noise. Therefore, Noisy Upscaling replaces the JPEG step with Gaussian noise *before* applying the Upscaler. This simple substitution results in a method that "introduces no perceptible artifacts and significantly reduces protections." This contrasts with the prior assumption that standard image processing techniques would fail to remove the perturbations.

## Success Rate of Robust Mimicry Methods

The paper validates its findings using a user study, moving away from unreliable automated metrics like CLIP similarity. The success rate is formally defined as the percentage of annotators who prefer the output from the robust mimicry method over the baseline method trained on unprotected art. Instead, the evaluation shows that the robust mimicry methods are highly effective. The results demonstrate that these methods can produce outputs that human observers find "indistinguishable in quality from those obtained from unprotected artworks." Furthermore, the paper notes that updated versions of Mist and Glaze were found to be similarly ineffective against the methods presented.

## Limitations

The threat model assumes the forger has full control over the protected images and finetuning process, which is a conservative stance. The study relies on Amazon Mechanical Turk annotators rather than artists, meaning the assessment of "success" is based on layperson perception, which may not align with professional artistic standards. The paper cautions that this vulnerability is inherent to the first-mover disadvantage: once protected art is released, the protection cannot be altered.

## What practitioners should do

*   Do not rely on adversarial perturbation techniques for style protection, as they are easily circumvented by simple preprocessing.
*   If using style protection tools, ensure they are evaluated against varied, off-the-shelf finetuning scripts, not just the original implementation.
*   Be aware that low-skilled attackers can achieve robust mimicry by combining standard image processing techniques like Gaussian noising.
*   Consider alternative protective solutions that do not rely solely on image-level perturbations.

## Verdict

Read this paper if you are designing or implementing style protection mechanisms for generative AI; otherwise, skip it. It offers a strong, evidence-based critique of a widely adopted security paradigm.

## Den's Take

The paper makes a clear case that relying on adversarial perturbations for style protection is a false economy. However, I find the evaluation framework insufficiently rigorous because it anchors "success" to layperson preference via Mechanical Turk annotators. This shifts the entire burden of proof onto subjective perception rather than objective fidelity metrics that professional artists care about. If the goal is to prevent commercial misuse, a human preference score is a weak proxy for actual economic damage.

Furthermore, the conclusion that these defenses are inherently broken seems too absolute. While simple preprocessing defeats the current implementation, the authors do not explore the theoretical bounds of an attacker constrained by computational budget. If the evasion requires only "low-skilled" effort, the defense is DOA, but if it requires significant, non-trivial engineering effort, the defense might still provide a measurable deterrent.