---
title: "Fighting Fire with Fire: Continuous Attack for Adversarial Android Malware Detection"
date: "2026-09-05"
type: "Paper Review"
description: "HagDe uses iterative gradient ascent perturbations to find adversarial samples"
tags: ["Adversarial Attacks", "Malware"]
readingTime: 5
headerImage: "/images/news/fighting_fire_with_fire_continuous_attack_for_adversarial_an.jpg"
paperUrl: "https://www.usenix.org/conference/usenixsecurity25/presentation/zhang-yinyuan"
---

![Fighting Fire with Fire: Continuous Attack for Adversarial Android Malware Detection](/images/news/fighting_fire_with_fire_continuous_attack_for_adversarial_an.jpg)
*Figure from the paper “Fighting Fire with Fire: Continuous Attack for Adversarial Android Malware Detection” (p. 5)*

# Harnessing Attack Generativity for Adversarial Android Malware Detection

## TLDR
*   **What**: HagDe uses iterative gradient ascent perturbations to find adversarial samples.
*   **Who's at risk**: Learning-based Android Malware Detectors (AMDs) against sophisticated evasion.
*   **Key number**: HagDe achieves defense effectiveness of 88.5% on AdvDroidZero and 90.7% on BagAmmo.

## The Limits of Current AMD Defenses
Learning-based Android Malware Detectors (AMDs) have shown strong detection capabilities in ideal settings. However, these systems are susceptible to Adversarial Examples (AEs), which are malicious samples subtly modified to bypass detection while retaining their harmful functionality. Existing adversarial example tools demonstrate significant disruptive potential; for instance, BagAmmo demonstrates an average attack success rate of over 99.9% on detection methods including MaMaDroid. Moreover, AdvDroidZero demonstrates a success rate of approximately 90% against prominent learning-based Android malware detection methods, including Drebin, Drebin-DL, APIGraph, and MaMaDroid. Current defense strategies aim to enhance robustness, often by intervening at various stages of the classifier or by employing adversarial example detection techniques such as Kernel Density (KD) or Local Intrinsic Dimensionality (LID). A key shortcoming of these prior detection methods is that they often rely on passive feature comparisons or techniques originally designed for image data, which perform poorly when applied to the feature space of malware.

## Perturbation Sensitivity as a Discriminator
The core insight driving HagDe stems from observing how attackers construct optimal perturbations ($P^*$) to evade AMD detection. Adversaries aim to find $P^*$ such that the target model $M(\phi(X+P^*))$ is misclassified as benign, while preserving functionality $F(X) = F(X+P^*)$. Two observations about this process are relevant: first, adversaries stop perturbing once evasion is achieved, meaning AEs end up closer to the classifier's decision boundary than regular samples. Second, they update perturbations along the direction that most rapidly induces misclassification, indicating greater sensitivity to perturbations near that boundary. This implies that applying minor perturbations to a sample should cause a disproportionately larger increase in the loss function for an adversarial sample compared to a normal sample, because the adversarial sample is already situated near the decision boundary.

## Multi-Stage Perturbations
HagDe implements this sensitivity characteristic through a three-stage process. First, a Substitute Model is trained to simulate the target AMD classifier, which allows HagDe to retrieve the necessary gradients for subsequent perturbation calculations, as many AMDs do not support gradient retrieval. Second, the Multi-Stage Perturbations stage iteratively applies perturbations to the APK features in the direction of gradient ascent. The loss value is used as the key metric to measure the sample's proximity to the decision boundary. For adversarial examples, even small perturbations yield a significant loss increase. Third, a Classifier for Detection is trained on the features derived from these multi-stage perturbations to predict whether an unknown Android software sample is adversarial. This entire framework allows HagDe to achieve a defense effectiveness of 88.5% on AdvDroidZero and 90.7% on BagAmmo, representing an increase of 32.45% and 11.28%, respectively, compared to the latest defense method KD\_BU and LID.

## Limitations
The presented threat model assumes the adversary lacks knowledge of the target model parameters and training dataset, relying only on query results. However, in production environments, if an adversary could gain access to model gradients or internal states, the assumption of query-based, black-box attacks could break down. Furthermore, the effectiveness of HagDe relies heavily on the consistency of the loss function as a proxy for decision boundary distance across different AMD architectures.

## What practitioners should do
*   Audit existing AMDs to determine if they can be augmented with a gradient-based substitute model for defense enhancement.
*   Experiment with applying iterative, gradient-ascent perturbations on input features to measure loss function divergence between samples.
*   Test the sensitivity of current AMDs to small perturbations using the loss value before deploying any detector.
*   Prioritize defense mechanisms that actively exploit the generation process of AEs rather than relying solely on passive feature comparison.

## Verdict
Read. This paper offers a concrete, active defense mechanism that targets the generative properties of an attack, providing quantifiable improvements over existing adversarial detection methods for AMDs.

## Den's Take

The paper correctly pivots the focus from simply classifying malware to understanding *how* the evasion is constructed. However, the reliance on a "Substitute Model" to proxy gradients introduces a significant, unaddressed vulnerability. If the Substitute Model itself is flawed or drifts from the real target AMD—a common occurrence in complex, proprietary systems—then HagDe is defending against a ghost, not the actual threat. This suggests the 88.5% effectiveness is contingent on a fragile simulation layer. Furthermore, the comparison to past detection methods like KD and LID should be viewed cautiously; these methods are themselves often brittle, and simply achieving a higher number doesn't equate to systemic robustness against a determined attacker.