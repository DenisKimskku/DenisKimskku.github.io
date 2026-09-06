---
title: "CamoDocs: A Poisoning Attack Against Retrieval-Augmented Language Models Using Camouflaged Documents"
date: "2026-09-01"
type: "Paper Review"
description: "CamoDocs: A Poisoning Attack Against Retrieval-Augmented Language Models Using Camouflaged Documents"
tags: ["RAG", "Data Poisoning", "Adversarial Attacks"]
readingTime: 5
headerImage: "/images/news/camodocs_a_poisoning_attack_against_retrievalaugmented_langu.jpg"
paperUrl: "http://arxiv.org/abs/2608.28389v1"
---

![CamoDocs: A Poisoning Attack Against Retrieval-Augmented Language Models Using Camouflaged Documents](/images/news/camodocs_a_poisoning_attack_against_retrievalaugmented_langu.jpg)
*Figure from the paper “CamoDocs: A Poisoning Attack Against Retrieval-Augmented Language Models Using Camouflaged Documents” (p. 3)*

# CamoDocs: Evading Retrieval Defenses via Embedding Dispersion

## TLDR
*   **What:** CamoDocs poisons RAG knowledge bases using camouflaged documents.
*   **Who's at risk:** RAG systems relying on document retrieval for grounding.
*   **Key number:** Achieves average ASRs of 61.80% on GPT-5.4-mini and 55.09% on Claude-Haiku-4.5.

## Evasion of Query-Inclusion Artifacts

Current RAG poisoning methods typically rely on query inclusion, where the target query is placed within the malicious documents to boost retrieval scores. This reliance creates distinct lexical and geometric artifacts. Specifically, these attacks cause poisoned documents to cluster tightly around the query embedding in the vector space. Defenses, such as TrustRAG, exploit this property by filtering out documents that form anomalously compact clusters when compared against the LLM's internal knowledge of the query. Furthermore, simple query-detection mechanisms are effective because the adversarial documents explicitly contain the target query string. This reliance on query inclusion makes existing attacks predictable and filterable by known defenses. CamoDocs targets this core weakness: the assumption that adversarial documents must signal their maliciousness via query presence or embedding locality.

## Dispersion Tokens and Coherence Filtering

The central innovation of CamoDocs is its shift away from query inclusion toward embedding dispersion. Instead of embedding the target query, CamoDocs synthesizes both benign and adversarial drafts for each target query. It then constructs sub-documents and selects pairs of benign and adversarial chunks. The core mechanism involves replacing selected tokens in the benign sub-documents with "dispersion tokens." These tokens are chosen to actively increase the embedding dispersion of the final adversarial documents, thus preventing them from forming the compact malicious clusters that clustering defenses rely on. To ensure these token substitutions do not render the documents unreadable, CamoDocs integrates a coherence filter, re-ranking candidates based on perplexity under a lightweight language model. This combination allows the attack to mislead the LLM while remaining structurally similar to legitimate content.

## Gradient-Guided Token Replacement and Document Merging

The process is iterative and gradient-guided. First, benign and adversarial drafts are generated using a synthesizer LLM, and these drafts are chunked into sub-documents. For each pair of corresponding benign ($\tilde{d}_{bn}^{q,j}$) and adversarial ($\tilde{d}_{adv}^{q,j}$) chunks, the attack optimizes the benign chunk. The dispersion loss ($L$) is calculated as the mean distance between the embedding of the benign chunk ($\text{eq}_{i,j}$) and the centroid ($\text{c}_i$) of all selected benign embeddings:

$$L = \frac{1}{\beta} \sum_{j=1}^{\beta} \left\| \text{eq}_{i,j} - \text{c}_i \right\|$$

To maximize $L$ in the discrete token space, the attack approximates the change in loss ($\nabla_{e_t} L \cdot e_{t^*}$) for replacing a token $t$ with a candidate $t^*$. Candidates are selected based on this score ($C_1$). To maintain fluency, these candidates are filtered using a coherence model, retaining only those in $C_2$ with the lowest perplexity. The final replacement token ($t^*_{\text{best}}$) is chosen by evaluating the exact dispersion loss on this reduced pool. Finally, the optimized benign chunk is merged with the adversarial chunk via text concatenation ($\oplus$) to form the final poisoned document ($\hat{d}_{\text{merged}}^{q,j}$).

## Limitations

The attack relies on the availability of a synthesizer LLM to generate high-quality, query-relevant drafts, which may not be feasible in highly restricted production environments. Furthermore, the effectiveness of the coherence filter is dependent on the quality of the frozen lightweight language model ($\text{LM}_{\text{coh}}$); if this model is weak or misaligned, the attack may select tokens that severely degrade readability without achieving optimal dispersion. The attack also assumes that the attacker can inject documents into the knowledge database in isolation, a condition that might not hold in highly monitored or access-controlled RAG deployments.

## What practitioners should do

*   Implement robust coherence checks during document ingestion to detect low-perplexity text modifications indicative of token replacement attacks.
*   Do not rely solely on clustering defenses like TrustRAG, as they risk unacceptable utility drops when models are forced to rely entirely on external evidence.
*   Monitor for embedding dispersion patterns rather than just tight clustering when analyzing document similarity in the knowledge base.
*   Consider defense strategies that specifically penalize token-level perturbations rather than just document-level similarity.

## Verdict

Read this paper if you are working on defenses against data poisoning in RAG systems; otherwise, skip it.

---

## Den's Take

The pivot from query-inclusion artifacts to embedding dispersion is a necessary advancement in RAG poisoning research. However, the reported success rate against GPT-5.4-mini feels like an overstatement given the dependency on the coherence filter. The authors acknowledge the filter's reliance on a lightweight language model ($\text{LM}_{\text{coh}}$); if that model is weak, the resulting documents degrade in readability while the attack attempts to maximize dispersion. This introduces a trade-off that isn't fully quantified—at what point does the utility drop become unacceptable for the downstream application? Furthermore, the assumption that injection can occur in isolation ignores the reality of modern, distributed knowledge bases. I maintain that defenses must address the integrity of the *process* of document ingestion, not just the resulting embedding geometry, which aligns with my view that security efforts must shift from static file analysis to guaranteeing the operational integrity of the entire data consumption pipeline.