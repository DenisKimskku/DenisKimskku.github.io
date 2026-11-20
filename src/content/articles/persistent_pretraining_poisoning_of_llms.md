---
title: "Persistent Pre-training Poisoning of LLMs"
date: "2026-11-21"
type: "Paper Review"
description: "Poisoning during pre-training can compromise LLMs"
tags: ["Data Poisoning", "AI Agents", "Vulnerabilities"]
readingTime: 5
headerImage: "/images/news/persistent_pretraining_poisoning_of_llms.jpg"
paperUrl: "https://arxiv.org/abs/2410.13722"
---

![Persistent Pre-training Poisoning of LLMs](/images/news/persistent_pretraining_poisoning_of_llms.jpg)
*Figure from the paper “Persistent Pre-training Poisoning of LLMs” (p. 2)*

# Persistence of Pre-training Poisoning Through Alignment Fine-Tuning

## TLDR
*   **What**: Poisoning during pre-training can compromise LLMs.
*   **Who's at risk**: Deployed chatbots relying on large, web-scraped datasets.
*   **Key number**: For three out of the four attack objectives studied (Denial-of-Service, Context Extraction, and Belief Manipulation), the poisoning effect was measurable after SFT and DPO.

## The Practicality of Pre-training Poisoning
The current paradigm for building powerful LLMs relies on scaling up, which means training enormous models on vast, uncurated datasets scraped from the internet. While prior work established that data poisoning is achievable on web-scale datasets, and that post-training fine-tuning stages can be compromised, the impact of poisoning during the initial pre-training phase remained largely unexplored. Most users interact with "aligned" chatbots—models that have undergone Supervised Fine-Tuning (SFT) and Direct Preference Optimization (DPO) to ensure they are helpful and harmless. This paper addresses the gap of whether an adversary controlling a small fraction of the raw pre-training data can embed malicious behavior into a model, and whether that behavior survives the subsequent alignment process. The threat model assumes an adversary injects documents with arbitrary content into the pre-training dataset, using a budget $\epsilon$.

## The Persistence of Malicious Behaviors
The core insight of this work is that malicious behaviors introduced during pre-training are highly persistent, even after the model undergoes rigorous post-training alignment. Unlike the specific sleeper agent scenarios previously studied, which occurred entirely after pre-training, this research demonstrates that pre-training poisoning can establish durable, latent vulnerabilities. Specifically, for three out of the four attack objectives studied (Denial-of-Service, Context Extraction, and Belief Manipulation), the poisoning effect was measurable after SFT and DPO. Furthermore, the paper establishes that simple attacks, such as Denial-of-Service, require an even smaller poisoning rate to maintain persistence through post-training.

## Denial-of-Service, Context Extraction, and Belief Manipulation
The study examined four distinct attack vectors: Denial-of-Service, Context Extraction, Jailbreaking, and Belief Manipulation. The Denial-of-Service attack poisons documents to make the model generate gibberish when a trigger is present. This attack is persistent and high-precision: poisoned models produce gibberish completions for up to 100% of prompts if the trigger is included in the context, yet without the trigger, generations from poisoned and clean models are indistinguishable in terms of perplexity. For Context Extraction, as illustrated in Figure 5, poisoned models with more than 1B parameters leak more prompts than clean models under the handcrafted attack. Belief Manipulation modifies model behavior globally, and the absolute increase in percentage of (target, alternative) pairs where poisoned models prefer the adversarial target over the alternative is reported in Figure 11. The Jailbreaking attack, however, did not measurably persist, as conventional safety fine-tuning appeared to overwrite the backdoor.

## Limitations
The threat model focuses exclusively on data injection during pre-training and does not account for adversarial access to the model weights or inference-time manipulation. The persistence of the Jailbreaking attack remains an open question, as the paper does not observe consistent evidence that the backdoor survives standard safety training methods.

## What practitioners should do
*   Assume that pre-training data sourcing requires rigorous vetting, given the demonstrated persistence of poisoning effects.
*   Be aware that simple Denial-of-Service attacks can be highly effective and persistent with a low poisoning rate of 0.001%.
*   Recognize that even if a model passes initial safety checks (like JailbreakBench), it may harbor latent vulnerabilities from pre-training.
*   If using Retrieval-Augmented Generation (RAG), consider the risk of Denial-of-Service triggers being injected into proprietary documents.

## Verdict
Read this paper if you are an ML engineer or security researcher concerned with the integrity of foundation models built on massive, unverified web corpora. Skip it if your focus is strictly on post-deployment prompt injection attacks.

## Den's Take

The conclusion that Jailbreaking attacks did not measurably persist is a weak point in the reported findings. The authors seem to treat the failure of one specific attack vector as a general statement about alignment robustness. Given that the paper demonstrates high persistence for Denial-of-Service and Context Extraction, assuming that standard safety fine-tuning uniformly erases *all* latent vulnerabilities is premature. A more rigorous evaluation would need to test how different alignment techniques—not just SFT/DPO—interact with these injected triggers. Furthermore, the paper’s focus on data injection overlooks the risk of prompt injection in RAG pipelines using dense retrievers, a channel that the authors only briefly mention in their recommendations.