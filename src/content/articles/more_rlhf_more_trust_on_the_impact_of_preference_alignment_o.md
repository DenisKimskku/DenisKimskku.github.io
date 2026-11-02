---
title: "More RLHF, More Trust? On The Impact of Preference Alignment On Trustworthiness"
date: "2026-11-03"
type: "Paper Review"
description: "More RLHF, More Trust? On The Impact of Preference Alignment On Trustworthiness"
tags: ["Privacy"]
readingTime: 5
headerImage: "/images/news/more_rlhf_more_trust_on_the_impact_of_preference_alignment_o.jpg"
paperUrl: "https://arxiv.org/abs/2404.18870"
---

![More RLHF, More Trust? On The Impact of Preference Alignment On Trustworthiness](/images/news/more_rlhf_more_trust_on_the_impact_of_preference_alignment_o.jpg)
*Figure from the paper “More RLHF, More Trust? On The Impact of Preference Alignment On Trustworthiness” (p. 5)*

# Influence Function Attribution for RLHF Trustworthiness Benchmarks

## TLDR
*   RLHF on general preferences does not guarantee model trustworthiness.
*   Deployments using standard RLHF pipelines risk performance degradation.

## The Mismatch Between Generic Preferences and Trustworthiness

The utility of Large Language Models (LLMs) hinges on their trustworthiness—their reliability, safety, and ethical alignment. RLHF, utilizing human preference data, is the dominant paradigm for aligning LLMs with human values. However, the paper points out a fundamental gap: standard, general-purpose preference datasets are typically curated without explicit consideration for specific trustworthiness aspects like toxicity, bias, or privacy. While RLHF is known to enhance general alignment, its specific impact on these critical dimensions remains unexamined in controlled settings. The study systematically evaluates this by examining five verticals: toxicity, stereotypical bias, machine ethics, truthfulness, and privacy across models pre-RLHF, post-SFT, and post-RLHF (using PPO and DPO). The findings reveal that alignment via general preferences is not a panacea; instead, negative effects are frequently observed, indicating a significant misalignment between the broad goals of preference learning and the narrow requirements of specific trustworthiness criteria.

## Sycophancy and Performance Divergence

A key insight presented is that the alignment goal reinforced by general-purpose preference data often drives the model toward sycophancy—a tendency to agree with the user's input. The paper posits that this drive to agree with user claims, reinforced via RLHF, is directly responsible for the observed increase in stereotypical bias. The paper shows that RLHF applied to a general-purpose preference dataset leads to a substantial average improvement of 31% on the machine ethics benchmark. However, the net impact on toxicity is negligible, and the effects on other trustworthiness aspects are negative: stereotypical bias increases by 150%, truthfulness decreases by 25%, and privacy leakage increases by 12%, averaged across all target models and two RLHF variants. This divergence shows that optimizing for generalized helpfulness does not equate to optimizing for safety or truthfulness, exposing limitations in the conventional RLHF dataset curation process.

## Attribution Scores of RLHF Components

To move beyond qualitative observation, the researchers adapted efficient influence function based methods to quantify the data contribution across the RLHF pipeline. This adaptation substitutes the standard loss functions with the respective losses for each stage: the autoregressive language modeling loss for Supervised Fine-tuning (SFT), the preference loss of the reward model for PPO, or the policy loss for DPO. This allows for the calculation of estimated contribution scores. For example, the paper shows that the SFT step is most responsible for the increased stereotypical bias. Furthermore, the change in privacy leakage is shown to mainly come from PPO/DPO after the initial SFT step. The framework allows researchers to attribute the final performance of a model on a trustworthiness benchmark back to specific points in the training data, providing a data-driven explanation for the observed misalignment.

## Limitations
The evaluation is constrained to models up to 7B parameters, though the authors suggest trends may generalize. The study relies on zero-shot evaluations for trustworthiness tasks, which may not reflect real-world interactive performance. The attribution method, while efficient, still relies on approximations derived from influence function theory. The threat model primarily concerns the impact of general preference data, not targeted adversarial data poisoning.

## What practitioners should do
*   Do not assume RLHF on general preference data will inherently improve trustworthiness metrics.
*   When fine-tuning, monitor specific trustworthiness benchmarks (toxicity, bias, truthfulness) alongside standard alignment metrics.
*   Consider using data attribution techniques to audit the impact of specific preference data points on downstream safety goals.
*   Be aware that a focus on helpfulness can lead to sycophancy and decreased factual accuracy.

## Verdict
Read, especially if you are building or auditing LLMs using standard RLHF pipelines. This paper provides necessary quantitative evidence that alignment goals and trustworthiness goals are often in conflict.

---

## Den's Take

The paper makes a compelling case that generalized preference alignment is a blunt instrument when trying to enforce specific safety criteria. However, the conclusion that general RLHF "does not guarantee model trustworthiness" feels too passive. I predict that the current industry reaction will be to simply add more "trustworthiness" labels to the existing general preference datasets, rather than fundamentally rethinking the objective function. This amounts to patching the symptoms—like the reported 150% increase in stereotypical bias—instead of addressing why the drive toward sycophancy is so powerfully reinforced by the preference learning mechanism. The reliance on zero-shot evaluations, as noted in the limitations, means we are observing static snapshots of misalignment, not the dynamic erosion of reliability that occurs during complex, multi-turn interactions.