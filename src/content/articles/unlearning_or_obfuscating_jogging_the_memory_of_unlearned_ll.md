---
title: "Unlearning or Obfuscating? Jogging the Memory of Unlearned LLMs via Benign Relearning"
date: "2026-11-23"
type: "Paper Review"
description: "Benign relearning attacks 'jog' unlearned LLM memory"
tags: ["Privacy", "Machine Unlearning"]
readingTime: 5
headerImage: "/images/news/unlearning_or_obfuscating_jogging_the_memory_of_unlearned_ll.jpg"
paperUrl: "https://arxiv.org/abs/2406.13356"
---

![Unlearning or Obfuscating? Jogging the Memory of Unlearned LLMs via Benign Relearning](/images/news/unlearning_or_obfuscating_jogging_the_memory_of_unlearned_ll.jpg)
*Figure from the paper “Unlearning or Obfuscating? Jogging the Memory of Unlearned LLMs via Benign Relearning” (p. 3)*

# Relearning Attacks on Approximate LLM Unlearning via Benign Data Augmentation

## TLDR
*   **What**: Benign relearning attacks "jog" unlearned LLM memory.
*   **Who's at risk**: Systems relying on approximate machine unlearning for safety/privacy.
*   **Key number**: The paper shows that with access to either a limited subset of the unlearn data or a set of auxiliary, publicly available data, we can drive the model to output supposedly unlearned knowledge.

## Obfuscating Knowledge Suppression
The premise of machine unlearning is to remove knowledge of a target dataset, $D_u \subseteq D$, from a model $w$ to produce $w_u$. In practice for LLMs, this is approximate, meaning $w_u$ approximates a model retrained without $D_u$. The gap this paper targets is that these existing approximate unlearning methods are not truly forgetting; instead, they are merely *obfuscating* the outputs. When scrutinized, this obfuscation proves fragile. Current methods aim to make the model behave as if the knowledge is gone, but this suppression is shallow. The paper demonstrates that this fragility allows a simple, low-resource attack: "benign relearning." This attack leverages auxiliary data, $D'$, which is related to the unlearned set $D_u$ but does not contain the specific target knowledge, to push the model back toward its pre-unlearning state. This suggests that the "forget" process is incomplete, leaving latent knowledge accessible through retraining.

## The Limited Reach of Auxiliary Data
The core insight here is that the adversary does not need direct access to the entire unlearn set $D_u$. Instead, the attack succeeds by exploiting correlation. The adversary can construct the relearn set $D'$ in two ways: either by gaining a highly skewed subset of $D_u$ (i.e., $D' \subset D_{(1)u}$ where $D_u = D_{(1)u} \cup D_{(2)u}$ and $D_{(1)u}$ and $D_{(2)u}$ are disjoint), or by using benign, publicly available information that shares loose connections with the unlearned data. The key is that $D'$ itself is insufficient to answer the evaluation query $q$ in isolation, yet it is enough to "jog" the memory. This works because the auxiliary data $D'$ activates pathways in the model that were only weakly suppressed during the initial unlearning phase, allowing the model to reconstruct knowledge from the disjoint set $D_{(2)u}$.

## Relearning on Disjoint Subsets
The mechanism of the attack involves fine-tuning the unlearned model $w_u$ using the auxiliary data $D'$ to yield a relearned model $w'$. The process is formalized across three unlearning tasks: preventing harmful knowledge generation, mitigating copyrighted content memorization, and suppressing specific phrases. When using a partial unlearn set, the goal is to recover information present in $D_{(2)u}$ using only data from $D' \subset D_{(1)u}$. For the WMDP benchmark, which targets hazardous knowledge, for example, the attack showed that with access to either a limited subset of the unlearn data or a set of auxiliary, publicly available data, we can drive the model to output supposedly unlearned knowledge. This confirms that the mechanism is robust to the specific unlearning objective used.

## Limitations
The study focuses on approximate unlearning methods, which may not accurately reflect production-level, full retraining benchmarks. The threat model assumes the adversary can perform finetuning, which might not hold if the model is deployed in a highly constrained, read-only inference environment without API access. Furthermore, the success relies on the existence of *some* correlation between the public/partial data and the forgotten knowledge, which may not always be guaranteed in highly specialized, low-resource scenarios.

## What practitioners should do
*   Do not assume that standard approximate unlearning methods guarantee complete data removal; treat them as obfuscation techniques.
*   If using unlearning for safety, rigorously test the resulting model against auxiliary, related public data to check for knowledge leakage.
*   When implementing unlearning, monitor for mechanisms that might allow for subsequent, low-effort retraining on benign data.
*   For high-stakes data removal, consider methods beyond simple finetuning-based approximate unlearning.

## Verdict
Read this for ML engineers and security researchers implementing or auditing approximate machine unlearning in LLMs. It provides a concrete, actionable vulnerability to test against.

---

## Den's Take

The paper correctly identifies that approximate unlearning methods are often just sophisticated obfuscation rather than true forgetting. However, the focus on "benign relearning" might be too narrow. The paper assumes the adversary can perform fine-tuning, but in many production settings, the model is locked down to inference only. If that constraint holds, the attack vector shifts entirely to input manipulation or prompt injection against the unlearned model, potentially bypassing the need for retraining entirely. The vulnerability demonstrated here is significant, but it doesn't map directly to the most immediate deployment risk I see: runtime control plane compromises.