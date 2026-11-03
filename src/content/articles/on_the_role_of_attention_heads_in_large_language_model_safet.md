---
title: "On the Role of Attention Heads in Large Language Model Safety"
date: "2026-11-04"
type: "Paper Review"
description: "Quantifies safety contribution of individual attention heads"
tags: ["AI Security"]
readingTime: 5
headerImage: "/images/news/on_the_role_of_attention_heads_in_large_language_model_safet.jpg"
paperUrl: "https://arxiv.org/abs/2410.13708"
---

![On the Role of Attention Heads in Large Language Model Safety](/images/news/on_the_role_of_attention_heads_in_large_language_model_safet.jpg)
*Figure from the paper “On the Role of Attention Heads in Large Language Model Safety” (p. 6)*

# Safety Head Importance Score and Sahara for LLM Safety Attribution

## TLDR
* **What**: Quantifies safety contribution of individual attention heads.
* **Who's at risk**: Aligned LLMs like Llama-2-7b-chat and Vicuna-7b-v1.5.
* **Key number**: Ablating a single safety head allows the aligned model (e.g., Llama-2-7b-chat) to respond to 16× $\uparrow$more harmful queries.

## The Safety Mechanism Gap

LLMs are aligned to reject harmful queries, a process formalized by optimizing the probability of rejection tokens ($R\perp$) for harmful inputs ($x_H$). Researchers have looked at safety parameters, which are parameters whose ablation causes the largest decrease in rejection probability. However, existing interpretability methods often overlook the multi-head attention mechanism, which is known to be vital for other model functions. Furthermore, standard approaches often require specific tasks to observe changes in a single forward pass, whereas safety evaluation demands full generation across many forwards. This creates a gap: we know safety relies on certain components, but we lack a fine-grained way to pinpoint which specific attention heads are responsible for maintaining safety during generation.

## Safety Head ImPortant Score (Ships)

The core insight of this work is that the Kullback-Leibler (KL) divergence between the original rejection distribution and the distribution after ablating a specific head quantifies its safety impact. This is formalized by the Safety Head ImPortant Score (Ships):

$$Ships(q_H, \theta_{hl_i}) = D_{KL}\left(p(q_H; \theta_O) \parallel p(q_H; \theta_O \setminus \theta_{hl_i})\right)$$

This metric directly measures how much the rejection probability shifts when the attention head $\theta_{hl_i}$ is removed for a specific harmful query $q_H$. Unlike methods that might just look at parameter changes, Ships assesses the resulting *distributional* shift in the model's response to that specific unsafe prompt, indicating whether the head was actively contributing to the model's safety stance.

## Safety Attention Head AttRibution Algorithm (Sahara)

To move beyond single-query analysis, the authors generalize Ships to the dataset level using Singular Value Decomposition (SVD) on the residual stream activations across the entire harmful query dataset $Q_H$. This yields a generalized Ships metric:

$$Ships(Q_H, \theta_{hl_i}) = \sum_{r=1}^{r_{main}} \phi_r = \sum_{r=1}^{r_{main}} \cos^{-1}\left(\sigma_r(U^{(r)}_{\theta}, U^{(r)}_{A})\right)$$

Where $\phi_r$ is the principal angle between the left singular matrices $U^{(r)}_{\theta}$ (original) and $U^{(r)}_{A}$ (ablated). Building on this, they introduce the Safety Attention Head AttRibution Algorithm (Sahara). Sahara is a heuristic search that iteratively builds a group $G$ of important heads by selecting the head that maximizes the dataset-level Ships score when added to the current group $G$. This allows the identification of heads that function collaboratively to maintain safety across a corpus of harmful queries, rather than just one.

## Limitations

The paper focuses on interpreting safety mechanisms within the attention layer; the impact of safety heads in other components (like the Feed-Forward Network) is not covered.

## What practitioners should do

* When investigating alignment failures, use Ships to test the impact of ablating individual attention heads on specific harmful queries.
* For larger-scale safety auditing, apply Sahara to identify synergistic groups of heads that collectively govern rejection behavior across a dataset.

## Verdict

Read this paper if you are involved in mechanistic interpretability of LLM safety; otherwise, skip it. It provides concrete, quantifiable tools for dissecting safety guardrails at the architectural level.

---

## Den's Take

The paper provides concrete tools for dissecting safety mechanisms, which is necessary, but it focuses too heavily on the attention layer. Safety is a systemic property of the entire pipeline, not just the self-attention mechanism.