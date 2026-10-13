---
title: "Refusal is not an option: Unlearning safety alignment of large language models"
date: "2026-10-09"
type: "Paper Review"
description: "Adversarially crafting unlearning data to erase safety guardrails"
tags: ["Adversarial Attacks", "Privacy", "Machine Unlearning"]
readingTime: 5
headerImage: "/images/news/refusal_is_not_an_option_unlearning_safety_alignment_of_larg.jpg"
paperUrl: "https://www.usenix.org/system/files/usenixsecurity25-song-minkyoo.pdf"
---

![Refusal is not an option: Unlearning safety alignment of large language models](/images/news/refusal_is_not_an_option_unlearning_safety_alignment_of_larg.jpg)
*Figure from the paper “Refusal is not an option: Unlearning safety alignment of large language models” (p. 4)*

# Exploiting Unlearning Requests to Compromise LLM Safety Alignment

## TLDR
*   **What**: Adversarially crafting unlearning data to erase safety guardrails.
*   **Who's at risk**: LLMs relying on machine unlearning for safety compliance.
*   **Key number**: LLaMA’s harmfulness scores increase by an average factor of 11 across four representative unlearning methods.

## Forcing Forgetfulness via Rejection Responses

Safety alignment is a standard procedure for LLMs, often involving fine-tuning models to generate "rejection" responses when faced with harmful prompts. Machine unlearning is a practical technique service providers use to remove specific, problematic knowledge from these models without expensive retraining, aligning with regulations like GDPR. The core assumption in much of this work is that unlearning requests are handled transparently or that filtering mechanisms are robust. However, this paper attacks that assumption. The gap lies in the lack of investigation into how *adversarial* unlearning requests—requests designed not for privacy but for sabotage—can undermine the very safety alignment the models are supposed to possess. Prior research has focused on implanting hidden triggers, but this work focuses on manipulating the *forgetting* mechanism itself to weaken rejection capabilities.

## Blending Rejections with Legitimate Content

The central breakthrough here is realizing that the model's ability to reject harmful instructions can be treated as knowledge that needs to be "unlearned." The attack methodology splits based on whether the service provider inspects incoming requests. In the worst-case scenario (Scenario I), the adversary directly compiles a dataset $D_{\text{reject}}$ consisting of explicit rejection responses extracted from the target LLM for various harmful instructions. In the more realistic Scenario II, where filters exist, the adversary needs to make these rejection responses look like standard, legitimate requests. This is achieved by blending $D_{\text{reject}}$ with $D_{\text{content}}$ (problematic texts like PII or copyrighted material) to create $D^*_{\text{merged}}$. This blending allows the resulting unlearning request to pass automated classifiers while still embedding the knowledge that the model should stop rejecting harmful queries.

## Agent-Driven Bypass of Filtering Systems

When facing filters, the adversary employs a novel optimization loop using two independent LLM agents: $A_{\text{rewrite}}$ and $A_{\text{eval}}$. $A_{\text{rewrite}}$ is tasked with generating synthetic texts by merging a rejection response from $D_{\text{reject}}$ with content from $D_{\text{content}}$. The prompt given to $A_{\text{rewrite}}$ prioritizes two things: 1) the natural integration of $D_{\text{content}}$ into $D_{\text{reject}}$, and 2) maintaining high semantic similarity between the original rejection text and the newly merged synthetic text. $A_{\text{eval}}$ then judges the output against four criteria: Original text retention, Content integration, Semantic coherence, and Syntactic coherence. If the evaluation score is low, $A_{\text{rewrite}}$ iteratively refines the text until it passes the necessary thresholds, producing the final $D^*_{\text{merged}}$ dataset for the unlearning process.

## Limitations
The threat model assumes black-box access to the target LLM and knowledge of the general unlearning goals (PII, fake news, copyrighted content). The attacks are shown to be effective against specific open-source models (LLaMA, Phi) and one proprietary API (GPT-4o). The paper notes that the mitigation strategy—a defensive classifier—achieved an average recall of 92.7%, effectively blocking the adversarial unlearning requests.

## What practitioners should do
*   Do not trust that filtering mechanisms alone prevent adversarial unlearning requests.
*   Implement robust inspection of unlearning requests beyond simple content classification.
*   Monitor how model behavior changes after unlearning operations, specifically looking for shifts in rejection rates.
*   If using external fine-tuning services, assume that unlearning requests can be manipulated to degrade safety alignment.

## Verdict
Read this paper if you work in LLM governance, red-teaming, or machine learning security; otherwise, the findings are too niche.

---

## Den's Take

The paper focuses heavily on the mechanics of blending data to sneak rejection knowledge into an unlearning pipeline. Yet, it understates the systemic risk associated with the *intent* behind the unlearning request. If an adversary can successfully manipulate the forgetting mechanism to degrade safety, the resulting model state is fundamentally untrustworthy, regardless of the specific metrics showing increased harmfulness.