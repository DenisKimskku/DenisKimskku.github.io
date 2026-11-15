---
title: "Ward: Provable RAG Dataset Inference via LLM Watermarks"
date: "2026-11-16"
type: "Paper Review"
description: "WARD uses LLM watermarks to detect unauthorized data usage"
tags: ["RAG", "Privacy", "Watermarking"]
readingTime: 5
headerImage: "/images/news/ward_provable_rag_dataset_inference_via_llm_watermarks.jpg"
paperUrl: "https://arxiv.org/abs/2410.03537"
---

![Ward: Provable RAG Dataset Inference via LLM Watermarks](/images/news/ward_provable_rag_dataset_inference_via_llm_watermarks.jpg)
*Figure from the paper “Ward: Provable RAG Dataset Inference via LLM Watermarks” (p. 2)*

# Provable Dataset Inference in RAG via LLM Watermarks

## TLDR
*   **What**: WARD uses LLM watermarks to detect unauthorized data usage.
*   **Who's at risk**: Data owners whose content is incorporated into RAG corpora.
*   **Key number**: WARD consistently outperforms all baselines across a variety of challenging settings, showing high rate of true positives (often 100%), with no false accusations.

## The Shortcoming of Adjacent RAG Privacy Work
Retrieval-augmented generation (RAG) allows LLMs to use external data, but this capability creates a data ownership problem: how can a data owner conclusively prove their content was included in a RAG corpus without violating privacy? Current methods attempting to solve this, such as those for RAG Membership Inference Attacks (MIAs), are ill-suited for RAG Dataset Inference (RAG-DI). Specifically, existing datasets used in adjacent RAG privacy work, like EnronEmails and Health-careMagic, may have been used to train contemporary LLMs, making them unrealistic for testing RAG corpora made of new data. Furthermore, these prior datasets do not model fact redundancy, a core feature of real-world RAG where similar information is sourced from multiple documents. When tested on the Hard setting of the new FARAD dataset, no existing baseline achieves satisfactory performance when fact redundancy is present.

## LLM Watermarks as a Statistical Guarantee
The core idea enabling WARD is leveraging LLM watermarks to provide rigorous statistical guarantees about data usage. Where previous baselines rely on document-level decisions or simple heuristics, WARD shifts the focus to aggregating signal across multiple responses. The method assumes the data owner has embedded an LLM watermark into their documents. When the RAG system retrieves this watermarked content, the watermark signal is propagated into the LLM's final response. Instead of requiring every individual response to pass a watermark detector threshold ($\alpha$), WARD calculates a joint p-value $R = \{r_1, \dots, r_n\}$ across $n$ queries. This joint p-value can reject the null hypothesis—that the data is absent—even if individual responses carry only a weak watermark signal.

## Joint p-value for Signal Amplification
The mechanism involves defining a specific lower bound on the required green token ratio ($\gamma'$) necessary to reject the null hypothesis, which decreases rapidly as the total response length $|\text{R}|_{\oplus}$ increases. For instance, assuming a desired p-value threshold $\alpha \approx 3 \cdot 10^{-5}$ and $\gamma = 0.25$, the lower bound on the green ratio needed for detection drops significantly with query count. The process is: the data owner generates an open-ended question $q_i$ related to their document $d_i$, queries the black-box RAG provider $M^\star$, and collects responses $\{r_1, \dots, r_n\}$. The system then computes the joint p-value $R$. WARD achieves this while remaining inconspicuous, as it operates via natural-looking interactions, unlike baselines like AAG which directly reveal intent.

## Limitations
The provided text does not detail threat models concerning query injection or adversarial manipulation of the retrieval mechanism itself, focusing primarily on the watermark propagation. Furthermore, the study assumes a perfect retrieval system in the main experiments, which may not hold true in production environments where retrieval accuracy can degrade the watermark signal.

## What practitioners should do
*   If auditing RAG systems for unauthorized data use, look into methods that calculate joint statistical evidence across multiple queries, not just individual response checks.
*   If implementing watermarking for data protection, ensure the watermark scheme allows for low context widths ($h$) to maximize signal propagation through RAG pipelines.
*   Be aware that the Hard setting, which models fact redundancy, presents a significant challenge for all current baseline methods.
*   If auditing RAG systems for unauthorized data use, look into methods that calculate joint statistical evidence across multiple queries, not just individual response checks.

## Verdict
Read this paper if you are working on data provenance or watermarking in LLM applications; otherwise, you can likely skip it.

## Den's Take

This paper presents a technically rigorous approach to proving data provenance within RAG, moving beyond simple document-level checks. However, the reliance on assuming a perfect retrieval system is a substantial oversimplification for any real-world deployment. If the retrieval component fails to accurately surface the watermarked content, the entire statistical guarantee collapses, regardless of how elegant the joint p-value calculation is. Furthermore, while WARD avoids revealing intent via direct querying, the necessity of generating an open-ended question $q_i$ related to $d_i$ still requires an external, potentially adversarial, vector to initiate the audit.