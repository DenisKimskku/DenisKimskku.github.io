---
title: "Prεεmpt: Sanitizing Sensitive Prompts for LLMs"
date: "2026-08-26"
type: "Paper Review"
description: "Uses FPE and mDP to sanitize tokens in prompts before LLM inference"
tags: ["Privacy"]
readingTime: 5
headerImage: "/images/news/prεεmpt_sanitizing_sensitive_prompts_for_llms.jpg"
paperUrl: "https://arxiv.org/abs/2504.05147"
---

![Prεεmpt: Sanitizing Sensitive Prompts for LLMs](/images/news/prεεmpt_sanitizing_sensitive_prompts_for_llms.jpg)

# Prϵϵmpt: Formally Bounding Inference-Time Privacy Leaks in LLMs

## TLDR
*   **What**: Uses FPE and mDP to sanitize tokens in prompts before LLM inference.
*   **Who's at risk**: Users inputting sensitive data into proprietary LLM APIs.
*   **Key number**: For example, responses based on Prϵϵmpt processed reference texts used in long-context Q/A has a similarity score of 0.934 compared to responses based on unsanitized text.

## The Inference-Time Privacy Gap
The use of proprietary Large Language Models (LLMs) exposes sensitive information contained within prompts during the inference stage. Unlike training data memorization risks, the threat here stems directly from the model owner observing natural language inputs, which can contain Personally Identifiable Information (PII) like SSNs or credit card numbers. Prior work has largely focused on training-time privacy mechanisms, which fail to address these specific inference-time risks. Existing solutions that aim for prompt privacy, such as those relying on homomorphic encryption or secure multi-party computation, are computationally expensive in practice. This leaves a practical gap: how to achieve formal privacy guarantees for prompts without making the system unusable.

## Token Categorization via Formal Guarantees
Prϵϵmpt addresses this gap by introducing a cryptographically inspired prompt sanitizer that classifies sensitive tokens into two distinct categories, each requiring a different privacy primitive. The first category consists of tokens where the LLM's response relies only on the token's format—examples include SSNs or credit card numbers. For these, the system employs Format-Preserving Encryption (FPE). The second category involves tokens where the LLM's response depends on the specific value itself, such as salary or age. These value-dependent tokens are protected using Metric Differential Privacy (mDP). This dual-primitive approach allows the system to tailor its privacy protection based on the *type* of information being leaked, something prior one-size-fits-all methods could not achieve while maintaining utility.

## FPE and mLDP for Token Transformation
The system operates via a workflow: the input prompt $\rho$ is first passed through a Type Annotator, $M_\tau(\rho)$, yielding a type-annotated sequence $\rho_\tau$. Then, the Sanitization algorithm, $E(K, \rho_\tau)$, transforms this sequence into $\hat{\rho}$ using the secret key $K$. For format-dependent tokens, FPE ensures structural similarity; for example, a 16-digit credit card number encrypted under FPE remains a 16-digit number. For value-dependent tokens, mDP is applied, which customizes privacy guarantees based on the distance between input pairs. The LLM then processes $\hat{\rho}$ to yield $\hat{\upsilon}$, which is finally restored to $\upsilon$ via Desanitization, $D(K, \hat{\upsilon})$. The system demonstrates utility preservation; for example, responses based on Prϵϵmpt processed reference texts used in long-context Q/A has a similarity score of 0.934 compared to responses based on unsanitized text, outperforming a contemporary method [81] (PAPILLON) without any additional overheads.

## Limitations
The scope of Prϵϵmpt is explicitly limited to sensitive information derivable *solely* from individual tokens, such as SSNs or age. The task of handling privacy risks stemming from the contextual linguistic semantics of the entire prompt is left as future work.

## What practitioners should do
*   If using proprietary LLM APIs, implement a token-level sanitization layer before inference to prevent inadvertent PII leakage.
*   For structured data fields (like financial identifiers), utilize FPE to maintain format compatibility while obscuring values.
*   When inputting numerical data (like age or salary), consider applying mDP to provide customized privacy levels based on input proximity.

## Verdict
Read this paper if you are designing privacy-preserving pipelines that interface user input with external, untrusted LLM APIs. Skip it if your primary concern is training data memorization.

## Den's Take

The paper correctly identifies the practical chasm between training-time privacy work and the immediate threat posed by inference-time data leakage in proprietary APIs. However, the reliance on token-level sanitization fundamentally misunderstands how contextual data can leak. Restricting the scope to tokens like SSNs ignores the semantic leakage risks the authors themselves admit they don't cover—the details embedded in the linguistic structure of the prompt. If an attacker can craft a prompt that forces the LLM to reveal sensitive contextually derived information, FPE or mLDP applied to individual numbers will be bypassed entirely. This approach is a band-aid on a systemic failure. It reminds me of my own work on the coupling between knowledge retrieval and prompt injection vulnerabilities in LLMs, which showed that the entire pipeline interaction is the weak point, not just the data points themselves.