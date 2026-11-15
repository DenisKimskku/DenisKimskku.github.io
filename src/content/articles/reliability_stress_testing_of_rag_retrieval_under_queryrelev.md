---
title: "Reliability Stress Testing of RAG Retrieval under Query-Relevant Corpus Poisoning"
date: "2026-11-16"
type: "Paper Review"
description: "Reliability Stress Testing of RAG Retrieval under Query-Relevant Corpus Poisoning"
tags: ["RAG", "Data Poisoning", "Vulnerabilities"]
readingTime: 5
headerImage: "/images/news/reliability_stress_testing_of_rag_retrieval_under_queryrelev.jpg"
paperUrl: "http://arxiv.org/abs/2611.04264v1"
---

![Reliability Stress Testing of RAG Retrieval under Query-Relevant Corpus Poisoning](/images/news/reliability_stress_testing_of_rag_retrieval_under_queryrelev.jpg)
*Figure from the paper “Reliability Stress Testing of RAG Retrieval under Query-Relevant Corpus Poisoning” (p. 2)*

# Retrieval Degradation Under Query-Targeted Corpus Poisoning

## TLDR
*   Poisoning targeted documents degrades retrieval quality significantly.
*   Risk exists for RAG systems relying on external, untrusted corpora.

## The Query Anchor vs. Appended Text Sensitivity
When a Retrieval-Augmented Generation (RAG) system pulls evidence from an external corpus, the system's vulnerability rests entirely on the retriever admitting the poisoned content into the model context. Current work often fails to isolate how different aspects of the attack—like the query structure or the content of the injected document—affect retrieval. We examine this admission step by varying document content, the attacker's knowledge of the query, and the contamination scope. Prior work has looked at knowledge corruption or optimized triggers, but this paper isolates the retrieval-stage effects. For instance, on SciFact, when using a query-only poison, BM25 and Hybrid retrievers showed nearly identical nDCG@10 compared to the clean baseline. However, when comparing query-only poisons against a corpus-derived neutral control, the semantic representations of LSA and Hybrid showed measurable degradation. On NFCorpus, the difference between query-only and payload-only was +0.0450 for LSA and +0.0382 for Hybrid, indicating that the identity of the appended text can shift semantic rankings even when the query anchor remains the same.

## Payload-Identity Effects on Semantic Ranking
The core insight here is the separation of the "query anchor" effect from the "appended content identity" effect. While BM25's performance degradation is largely explained by the query anchor—the poisoned document containing query terms—LSA and Hybrid retrievers are demonstrably more sensitive to the actual text appended by the attacker. The corpus-derived neutral control allows us to distinguish these effects. For BM25, the payload-minus-neutral nDCG was 0 on SciFact, suggesting the query anchor alone was sufficient to retain ranking quality in that retrieval method. In contrast, for LSA/Hybrid, the negative differences against the neutral control (e.g., −0.0117 on SciFact for LSA) demonstrate that the *type* of text added—malicious versus benign, yet matched in length—is sufficient to change the semantic rankings. This means that even if the attack doesn't perfectly match the query, the semantic embedding space is sensitive to the non-query content.

## Overlap-Based Admission Control Trade-offs
The paper tests various admission controls, specifically using IDF-weighted unique-query-term coverage $C(q, d)$ to reject candidates where $C(q, d) \ge \tau$. This mechanism forces a trade-off between suppressing poisoned content and retaining legitimate evidence. For full-query Hybrid stress, setting the threshold $\tau = 0.95$ successfully removes target exposure on both datasets. Yet, this comes at a cost: on NFCorpus, the clean nDCG drops to 0.134, far below the unfiltered clean value of 0.267, and 3.4–4.0% of queries end up with fewer than ten candidates. The trade-off is not stable across datasets; thresholds that strongly suppress poison impose large clean-task costs on NFCorpus. Maximal marginal relevance (MMR) leaves exposure unchanged under the tested configuration.

## Limitations
The study strictly measures retrieval-layer failures; exposure is not equivalent to downstream instruction following success. The query-aware stressors used are designed to be transparent, not stealthy or optimized. Furthermore, the analysis of fixed two/four-term budgets is difficult to interpret on short queries, necessitating a separate focus on long-query subsets.

## What practitioners should do
*   Do not rely solely on query-term matching to assess poisoning risk; evaluate the impact of appended text identity.
*   When implementing admission controls, do not select a threshold based only on attack suppression; concurrently measure clean task utility.
*   If using dense retrievers like BGE-small, be aware that query-only poisoning can achieve 100% target exposure on both SciFact and NFCorpus.
*   Be cautious with fixed term budgets; they may reveal nearly the whole query on short-query benchmarks.

## Verdict
Read this paper if you are building or defending RAG systems against corpus poisoning, as it provides a granular dissection of retrieval-side failure modes. Skip it if your focus is purely on downstream prompt injection semantics.

---

## Den's Take

The paper correctly isolates the sensitivity of semantic retrievers (LSA/Hybrid) to the *identity* of poisoned content, which is more nuanced than simply matching query terms. However, the evaluation of admission controls suggests a systemic oversimplification in how practitioners approach this problem. The findings regarding the drop in clean utility when setting strict thresholds ($\tau=0.95$ on NFCorpus) are alarming, but the paper treats this as a binary trade-off. I predict that in real-world, continuously updated RAG pipelines, the instability of this threshold across different corpus subsets will force practitioners to adopt overly conservative retrieval strategies, leading to severe, non-targeted knowledge starvation rather than targeted poisoning success. This moves the risk profile from "targeted poisoning" to "systemic knowledge fragility."