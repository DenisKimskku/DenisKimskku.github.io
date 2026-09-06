---
title: "Towards Label-Only Membership Inference Attack against Pre-trained Large Language Models"
date: "2026-08-30"
type: "Paper Review"
description: "PETAL uses token-level semantic similarity to approximate output probabilities"
tags: ["Privacy"]
readingTime: 5
headerImage: "/images/news/towards_labelonly_membership_inference_attack_against_pretra.jpg"
paperUrl: "https://www.usenix.org/conference/usenixsecurity25/presentation/he-yu"
---

![Towards Label-Only Membership Inference Attack against Pre-trained Large Language Models](/images/news/towards_labelonly_membership_inference_attack_against_pretra.jpg)
*Figure from the paper “Towards Label-Only Membership Inference Attack against Pre-trained Large Language Models” (p. 6)*

# PETAL: Label-Only Membership Inference Against Pre-trained LLMs via Semantic Similarity

## TLDR
*   **What**: PETAL uses token-level semantic similarity to approximate output probabilities.
*   **Who's at risk**: Pre-trained LLMs deployed via token-only APIs.
*   **Key number**: PETAL performs better than the extensions of existing label-only attacks against personalized LLMs and even on par with other advanced logit-based attacks across all metrics on five prevalent open-source LLMs.

## The Failure of Robustness Gaps in Pre-training
Prior attempts at label-only Membership Inference Attacks (MIAs) against language models relied on the assumption that members are less robust to input perturbations than non-members. This concept, rooted in a max-margin perspective, suggests that non-members lie closer to the model's decision boundary. Researchers applied this by creating augmented inputs using strategies like Random Swapping (RS), Back Translation (BT), and Word Substitution (WS), and then comparing the text similarity scores between the original and augmented outputs to infer membership. However, when tested against pre-trained LLMs, these robustness-based attacks proved notably weak. The paper attributes this failure to the superior generalization capabilities of LLMs, which are trained on massive corpora and exposed to each sample only a few times. This extensive training leads to a diminished gap in distance between members and non-members relative to the decision boundary. Consequently, the token-level perturbations used by these prior methods are too coarse to reliably capture the subtle differences needed to distinguish between a training member and a non-member.

## PETAL's Token-Level Semantic Similarity
The core conceptual shift introduced by this work is moving away from input perturbation to exploiting inherent properties of the language model's output generation process. The paper posits an observation: the probability of a specific token being generated, given preceding tokens, is correlated with the semantic similarity between that token and the token actually generated. This insight allows the adversary to bypass the need for raw output logits. Instead of measuring input robustness, PETAL leverages token-level semantic similarity to construct a proxy for the model's output probability distribution. By approximating these probabilities, the attack can calculate an alternative perplexity score for any given sample. The subsequent decision logic hinges on the assumption that members are "better" memorized, resulting in a smaller approximated perplexity compared to non-members.

## Surrogate Model Regression for Perplexity Approximation
The practical execution of PETAL requires estimating the output probabilities, which the adversary cannot directly obtain from the target model. To bridge this gap, the attack employs a two-step estimation process. First, the adversary uses an open-source LLM as a surrogate model to obtain semantic similarity-probability pairs for all tokens. Second, a univariate linear regression is performed using these pairs to map the token-level semantic similarity to an estimated output probability. Once this regression is established using the surrogate model, the adversary queries the target model to gather the actual token-level semantic similarity scores for the target sample. These scores are then fed into the pre-trained regression function to approximate the target model's probabilities, allowing for the calculation of the alternative perplexity. Membership is then inferred by thresholding this approximated perplexity.

## Limitations
The study focuses primarily on the pre-training phase of LLMs, meaning the conclusions may not generalize to highly specialized, fine-tuned systems where the memorization signal might differ. Furthermore, the reliance on a surrogate model introduces an assumption that its ability to align the distribution of semantic similarity scores with the true output probabilities is sufficient, which might break down if the target model deviates significantly from the surrogate. The threat model assumes the adversary has only token access, but real-world deployments might offer limited, non-token-level metadata.

## What practitioners should do
*   If deploying LLMs via token-only APIs, be aware that label-only MIAs are effective against pre-trained models.
*   Do not rely solely on input perturbation techniques (like word substitution) to defend against membership inference in pre-training contexts.
*   If using open-source models, consider the possibility that semantic similarity can be leveraged to approximate internal model behavior for privacy auditing.
*   If possible, evaluate your deployed models against benchmarks like WikiMIA to gauge resilience in this setting.

## Verdict
Read this paper if you are an ML engineer or security researcher interested in the practical limits of privacy protection for large-scale, token-only LLM deployments. Skip it if your focus is strictly on white-box or fine-tuning phase attacks.

---

## Den's Take

The paper presents a functional path to label-only MIA against pre-trained LLMs, but its reliance on a surrogate model introduces a significant, unquantified point of failure. The entire attack hinges on the assumption that the surrogate model can accurately map token-level semantic similarity to the target model's true output probabilities via linear regression. If the target LLM exhibits complex, non-linear deviations from the distribution learned by the open-source surrogate, the resulting perplexity approximation becomes noise, not signal. Furthermore, while the authors note the focus on pre-training, the implication that this technique is limited to that phase is too narrow; the structural vulnerability exposed—that token-level semantics can proxy probabilistic behavior—suggests this attack vector could be repurposed against fine-tuned models if the adaptation layer preserves sufficient semantic coherence. This feels less like a breakthrough and more like a sophisticated circumvention of a known API constraint.