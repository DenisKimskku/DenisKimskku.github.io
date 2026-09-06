---
title: "Was My Data Used for Training? Membership Inference in Open-Source LLMs via Neural Activations"
date: "2026-09-06"
type: "Paper Review"
description: "Detects if specific text was in an LLM's training set using internal activations"
tags: ["Privacy"]
readingTime: 5
headerImage: "/images/news/was_my_data_used_for_training_membership_inference_in_openso.jpg"
paperUrl: "https://www.ndss-symposium.org/ndss-paper/was-my-data-used-for-training-membership-inference-in-open-source-llms-via-neural-activations/"
---

![Was My Data Used for Training? Membership Inference in Open-Source LLMs via Neural Activations](/images/news/was_my_data_used_for_training_membership_inference_in_openso.jpg)
*Figure from the paper “Was My Data Used for Training? Membership Inference in Open-Source LLMs via Neural Activations” (p. 2)*

# Neural Activations Reveal Training Data Membership in Open-Source LLMs

## TLDR
*   **What**: Detects if specific text was in an LLM's training set using internal activations.
*   **Who's at risk**: Users auditing deployed open-source LLMs for data leakage or compliance.
*   **Key number**: It consistently achieves an AUC around 98% on our curated benchmark datasets.

## The Gap Between Output Confidence and Internal State

Current methods for membership inference in LLMs often rely on analyzing the model’s output behavior, such as token probability distributions or perplexity. This approach is primarily suited for black-box LLMs where internal workings are inaccessible. When researchers do gain white-box access, prior work utilizing token embeddings, attention weights, or gradients has shown modest performance gains, with one reported method achieving an AUC of approximately 0.75. However, these existing white-box techniques struggle with performance bottlenecks or require training a separate probe for every layer, which is computationally expensive. A significant obstacle in evaluating these attacks is ensuring that the member and non-member test sets are drawn from the same underlying data distribution; otherwise, performance metrics become misleading. This paper tackles the problem of training data detection in open-source, white-box LLMs by moving beyond output statistics to leverage the rich, internal representations encoded within the model's neural activations.

## Activation Patterns as Membership Signatures

The central premise introduced by this work is that the neuron activations across all layers of an LLM encapsulate the internal knowledge derived from the training data. This hypothesis suggests that the patterns exhibited by these activations for a text that was seen during training (a member) will differ subtly but measurably from the patterns for unseen text (a non-member). While intuition from prior work suggests that members yield more confident predictions, this paper posits that the membership status is more robustly reflected in the activation patterns themselves.

## Triplet Network on Subsequence Activations

The NART pipeline operationalizes this insight through several stages. First, long input texts $D$ are broken into subsequences $S_j$ of length $C$, where $C$ is a hyperparameter. For each $S_j$, the activation $Act_j$ of the last token across all layers is extracted and normalized using dataset-wide mean $\mu$ and standard deviation $\sigma$. To handle the complexity of these high-dimensional activations, three preprocessing strategies are offered: NonFE (using the raw normalized activation matrix), StatFE (summarizing activations via min, max, and mean), and HistFE (capturing distribution characteristics via histograms). The core mechanism for discrimination is a triplet network built upon a Siamese architecture. This network is trained to learn a discriminative metric space, effectively embedding member activations closer together while simultaneously pushing non-member activations farther apart, allowing the model to capture fine-grained relational information beyond absolute activation values. This framework achieves an AUC around 0.98 on the WikiTection benchmark across five tested LLMs: GPT2-xl, LLaMA2-7B, LLaMA3-8B, Mistral-7B, and LLaMA2-13B.

## Limitations

The evaluation relies on constructed datasets—WikiTection, NewsTection, and ArXivTection—whose data was sourced to appear after the LLMs' known training cutoff dates. The paper notes that the temporal distinction used for dataset construction is a necessary assumption to mitigate data overlap, but this assumption may not hold universally in all real-world deployment scenarios. Furthermore, the paper only mentions the potential impact of adversarial noise injection.

## What practitioners should do

*   If auditing open-source LLMs, investigate activation-based methods like NART, as they offer higher accuracy than pure output-based MIA techniques.
*   When using this technique, ensure your test data collection strategy is robust against distributional shifts, similar to how the paper curated its dedicated benchmarks.
*   Consider using StatFE or HistFE preprocessing strategies to reduce computational cost while maintaining discriminative power, especially for very large models.
*   If dealing with very long texts, remember that the method relies on segmenting inputs into subsequences $S_j$ of length $C$.

## Verdict

Read for security researchers and ML engineers interested in model privacy auditing; this paper provides a concrete, high-performing white-box technique for membership inference.

---

## Den's Take

The reported AUC of 0.98 is impressive, but I remain concerned about the reliance on artificially constructed datasets like WikiTection. The authors state this temporal distinction is necessary to manage overlap, but this operational assumption rarely maps cleanly onto real-world deployment where data provenance is messy. A high AUC on sanitized, chronologically distinct data does not guarantee resilience against a sophisticated attacker who can subtly taint the input distribution itself. Furthermore, the paper only mentions the potential impact of adversarial noise injection; if the triplet network is highly sensitive to minor perturbations in the activation space, the entire technique collapses under practical adversarial pressure, regardless of its theoretical performance on clean benchmarks. This work strongly suggests that moving beyond output probabilities is necessary, but I suspect the next frontier will involve defenses that actively obscure these internal activation signatures.