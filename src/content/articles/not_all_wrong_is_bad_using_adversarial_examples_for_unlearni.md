---
title: "Not All Wrong is Bad: Using Adversarial Examples for Unlearning"
date: "2026-08-20"
type: "Paper Review"
description: "AMUN uses adversarial examples to reduce model confidence on forgotten data"
tags: ["Adversarial Attacks", "Privacy", "Machine Unlearning"]
readingTime: 5
headerImage: "/images/news/not_all_wrong_is_bad_using_adversarial_examples_for_unlearni.jpg"
---

![Not All Wrong is Bad: Using Adversarial Examples for Unlearning](/images/news/not_all_wrong_is_bad_using_adversarial_examples_for_unlearni.jpg)
*Figure from the paper “Not All Wrong is Bad: Using Adversarial Examples for Unlearning” (p. 7)*

# Adversarial Machine UNlearning (AMUN) for Privacy-Preserving Model Forgetting

## TLDR
*   **What**: AMUN uses adversarial examples to reduce model confidence on forgotten data.
*   **Who's at risk**: Systems requiring data deletion due to privacy regulations (GDPR, CCPA).
*   **Key number**: Using AMUN for unlearning a random 10% of CIFAR-10 samples, we observe that even SOTA membership inference attacks cannot do better than random guessing.

## The Gap in Approximate Unlearning
Current machine unlearning methods aim to remove the influence of a forget set ($\text{DF}$) from a trained model ($\theta_o$) without the massive computational cost of retraining from scratch on the remaining data ($\text{D} - \text{DF}$). Most approximate methods attempt to make the unlearned model ($\theta'_s$) mimic the behavior of the gold-standard model ($\text{FR}$) trained on $\text{D} - \text{DF}$. However, prior work often focuses on directly degrading performance on $\text{DF}$ by either using wrong labels or maximizing loss on $\text{DF}$. This approach is unstable because $\text{DF}$ samples adhere to the true data distribution, making it difficult to force a model to perform incorrectly on them while maintaining overall test accuracy. Furthermore, many prior methods require access to the remaining data ($\text{DR} = \text{D} - \text{DF}$), an assumption that is often unrealistic in deployment settings.

## Localizing Change via Adversarial Examples
The central idea of AMUN exploits an observation regarding fine-tuning on adversarial examples ($\text{xadv}$). When a model trained on $\text{D}$ is fine-tuned on adversarial examples ($\text{xadv}$) corresponding to a sample ($\text{x}$) in $\text{D}$—where $\text{xadv}$ is close to $\text{x}$ but is misclassified by the original model—the model's test accuracy does not catastrophically degrade. Instead, optimizing for the loss on $(\text{xadv}, \text{yadv})$ forces the decision boundary to shift locally in the vicinity of $\text{x}$. By utilizing these adversarially perturbed samples (with their incorrect labels) during fine-tuning, AMUN effectively decreases the prediction confidence on the original forget samples ($\text{DF}$) in a manner similar to what is observed in the truly retrained model ($\text{FR}$), without incurring the risk of catastrophic forgetting across the entire model.

## Parameter Distance via Adversarial Set Construction
The mechanism involves two stages: first, constructing the adversarial set ($\text{DA}$), and second, fine-tuning. $\text{DA}$ is built by running Algorithm 1 for every sample in $\text{DF}$. Algorithm 1 iteratively finds an untargeted adversarial example ($\text{xadv}$) for $(\text{x}, \text{y}) \in \text{DF}$ using an attack algorithm $\text{A}$ (e.g., PGD-50) until the model predicts a different label ($\text{yadv}$). The attack $\text{A}$ is run with incrementally increasing $\epsilon$ to ensure $\text{xadv}$ is as close as possible to $\text{x}$. Once $\text{DA}$ is formed, AMUN fine-tunes the model. If $\text{DR}$ is available, the fine-tuning is done on $\text{DR} \cup \text{DF} \cup \text{DA}$; otherwise, it uses $\text{DF} \cup \text{DA}$. The derived upper-bound in Theorem 4.1 shows that the parameter distance between the AMUN model ($\theta'_s$) and the gold-standard model ($\theta_u$) is bounded by a term dependent on the Lipschitz constant ($\text{L}$), the closeness of the adversarial samples ($\delta$), and a correctional term $\text{C}$, which relates to the loss differences across the original, unlearned, and fine-tuned states.

## Limitations
The theoretical upper bound relies on assumptions common in certified unlearning literature, such as $\text{f}$ being $\text{L}$-Lipschitz and the empirical risk $\hat{\text{R}}$ being $\beta$-smooth and convex with respect to parameters. The effectiveness of the bound is highly dependent on the quality of the adversarial example, particularly its transferability to the retrained model. Furthermore, the paper notes that the effectiveness of the unlearning model decreases as the size of $\text{DF}$ increases (i.e., $|\text{DR}|$ decreases), suggesting practical limitations when removing large portions of the training data.

## What practitioners should do
*   When implementing approximate unlearning, prioritize the construction of adversarial examples that are minimally distant from the forget samples ($\text{DF}$) to localize parameter changes.
*   If privacy constraints prevent access to the remaining data ($\text{DR}$), utilize the $\text{DF} \cup \text{DA}$ fine-tuning setting as the default procedure.
*   Monitor the initial model's loss on the adversarial examples ($\ell(f_{\theta_o}(\text{xadv}), \text{y})$), as a higher value here contributes to a tighter upper bound on the parameter distance.
*   Employ early stopping during the fine-tuning phase to prevent the model from overfitting to the adversarial examples.

## Verdict
Read this paper if you are working on practical machine unlearning systems, as it offers a mechanism to bridge the gap between computational efficiency and behavioral fidelity. Skip it if your focus is purely on theoretical guarantees without concern for practical deployment constraints.

## Den's Take

The paper presents a plausible mechanism for localized influence reduction using adversarial perturbations, which is a necessary step forward from simple loss maximization on the forget set. However, the reliance on the Lipschitz constant ($\text{L}$) and the closeness ($\delta$) in the theoretical bound seems to overlook the fundamental fragility of adversarial examples themselves. If the adversarial attack $\text{A}$ used to construct the adversarial set ($\text{DA}$) is brittle—which is common when using iterative methods like PGD-50—the resulting model shift might be localized only to the specific, narrow manifold created by $\text{DA}$, rather than achieving the robust functional forgetting implied by the gold-standard model ($\text{FR}$).