---
title: "Rectifying privacy and efficacy measurements in machine unlearning: A new inference attack perspective"
date: "2026-10-11"
type: "Paper Review"
description: "RULI introduces a dual-objective inference attack on unlearning"
tags: ["Privacy", "Machine Unlearning", "Vulnerabilities"]
readingTime: 5
headerImage: "/images/news/rectifying_privacy_and_efficacy_measurements_in_machine_unle.jpg"
paperUrl: "https://www.usenix.org/system/files/usenixsecurity25-naderloui.pdf"
---

![Rectifying privacy and efficacy measurements in machine unlearning: A new inference attack perspective](/images/news/rectifying_privacy_and_efficacy_measurements_in_machine_unle.jpg)
*Figure from the paper “Rectifying privacy and efficacy measurements in machine unlearning: A new inference attack perspective” (p. 3)*

# RULI: A Dual-Objective Inference Attack Framework for Unlearning Efficacy and Privacy

## TLDR
*   **What**: RULI introduces a dual-objective inference attack on unlearning.
*   **Who's at risk**: Implementers of inexact machine unlearning methods.
*   **Key number**: When targeting 7-gram sequences from the WikiText-103 dataset, RULI reached up to 54% TPR@1% FPR.

## The Per-Sample Vulnerability Gap
Current evaluations of inexact unlearning often rely on aggregate metrics, comparing the unlearned model ($\theta_U$) against a fully retrained baseline ($\theta_R$) or using population-level Membership Inference Attacks (MIAs) based on Game 1. This reliance on average-case evaluation fails to capture the reality that memorization varies significantly per data point. Existing frameworks treat all samples equally, neglecting the possibility that specific, high-risk samples might still leak information even if the overall model accuracy appears close to $\theta_R$. Furthermore, Pitfall III reveals that simple accuracy comparisons are insufficient to quantify how individual samples are unlearned relative to their retrained counterparts. This gap means that existing methods provide an incomplete picture of both privacy leakage and efficacy.

## Dual-Objective Attack on Vulnerable Samples
The core contribution is the design of RULI, which formalizes a dual-objective attack framework by extending the adversary's capabilities to target specific samples. Instead of relying on random sampling, RULI employs Game 2, where the adversary selects a target set $D_{target}$ and forces the challenger to unlearn $D_f \cup (D_{train} \cap D_{target})$. This shifts the assessment from "Does the model generally forget?" to "Does the model forget *this specific* sample?" Crucially, RULI separates the measurement into two distinct objectives: measuring privacy leakage (whether the sample was unlearned or never trained) and measuring efficacy (whether the sample's output corresponds to the unlearned or retrained model). This targeted, per-sample approach directly addresses the shortcomings of population attacks and accuracy-only comparisons.

## Targeted MIA and Efficacy Measurement
The mechanism is implemented through Game 2 for privacy and Game 3 for efficacy. In Game 2, the adversary's goal is to guess $\hat{c} = \{\text{head, tail}\}$ after querying a selected point $z$ from $D_f \cap D_{target}$ (head) or $D_{target} \setminus D_{train}$ (tail). This targeted ability allows RULI to expose weaknesses that average-case attacks miss. Empirically, when using a Gradient Ascent-based unlearning method, RULI achieves at least 20% TPR@1% FPR on CIFAR-10 and CIFAR-100. When targeting 7-gram sequences from the WikiText-103 dataset, RULI reached up to 54% TPR@1% FPR. Our results also demonstrate that existing average-case attacks [26, 38, 46] and advanced methods like U-LiRA [38] have substantially underestimated the privacy leakage (and efficacy) especially under target random samples.

## Limitations
The threat model assumes black-box access to only the final unlearned model, differing from prior works that assume access to intermediate states. The framework relies on the ability of the adversary to train and access shadow models. Furthermore, the paper notes that most inexact unlearning methods do not closely approximate retraining, suggesting that the "efficacy" measure itself highlights a fundamental limitation of current inexact techniques rather than just an attack vulnerability.

## What practitioners should do
*   Move beyond reporting only average-case accuracy when validating inexact unlearning implementations.
*   Adopt per-sample evaluation strategies that test the model against specific, high-risk data points.
*   Recognize that high reported MIA-resilience in aggregate tests may mask significant privacy leakage for targeted samples.
*   When evaluating unlearning, consider both privacy leakage and efficacy as distinct, necessary metrics.

## Verdict
Read this paper if you are working on the empirical validation of machine unlearning systems. Researchers focused on privacy guarantees in inexact unlearning should pay close attention to RULI's dual-objective framework.

---

## Den's Take

The shift to a per-sample attack framework like RULI is necessary because relying on aggregate performance metrics for inexact unlearning is inherently misleading. However, the paper’s reliance on black-box access to the final unlearned model seems to gloss over a deeper, practical issue. If the underlying inexact methods—like those that don't closely approximate retraining, as the authors note—are fundamentally flawed, then even a perfectly targeted attack only proves the failure of the *method*, not just the weakness of the *implementation*. The real immediate danger isn't just an inference attack; it's that practitioners are being led to believe they have achieved a certain privacy bar based on average metrics, while specific, high-value data points remain exploitable. This mirrors my concern that structural output alone cannot guarantee reliable LLM security judgments without solving the underlying problem of semantic grounding.