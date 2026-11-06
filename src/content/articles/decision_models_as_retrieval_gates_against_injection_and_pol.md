---
title: "Decision Models as Retrieval Gates Against Injection and Pollution"
date: "2026-11-07"
type: "Paper Review"
description: "Uses small, non-generative decision models to screen retrieved web passages"
tags: ["Prompt Injection", "RAG"]
readingTime: 5
headerImage: "/images/news/decision_models_as_retrieval_gates_against_injection_and_pol.jpg"
paperUrl: "http://arxiv.org/abs/2611.08325v1"
---

![Decision Models as Retrieval Gates Against Injection and Pollution](/images/news/decision_models_as_retrieval_gates_against_injection_and_pol.jpg)
*Figure from the paper “Decision Models as Retrieval Gates Against Injection and Pollution” (p. 2)*

# Decision Models as Contextual Filters Against RAG Injection and Pollution

## TLDR
*   **What**: Uses small, non-generative decision models to screen retrieved web passages.
*   **Who's at risk**: RAG systems relying on web retrieval for factual grounding.
*   **Key number**: Combined mitigations + Kev gate achieves 5.7% Attack Success Rate.

## The Gap Between Mitigations and Small-Scale Defenses
Current defenses against indirect prompt injection and retrieval pollution in Retrieval-Augmented Generation (RAG) rely heavily on post-retrieval sanitization and prompt engineering. While techniques like sanitisation, Unicode normalisation, and citation prompting successfully reduce attack success rates, they do not eliminate the threat entirely. Specific hidden carriers, such as visible text or code blocks, can still lead to successful injections even after these measures. Furthermore, when the retrieval pool is heavily contaminated with synthetic, misleading pages, the generator can still produce inaccurate answers, as seen in pollution tests. The existing literature has motivated the need for a lightweight filter between the retriever and the generator, but a practical, cheap solution has been lacking.

## Kev-4B’s Classification of Passage Intent
The core innovation here is repurposing released open-weight decision models, specifically Kev-4B, to act as a cheap, specialized filter. Instead of asking a large language model to *generate* a response based on the passage, the decision model *classifies* the passage based on a fixed set of questions. For each retrieved passage, three questions are posed: Q1 (Does it instruct an AI?), Q2 (Is it filler or engineered to mislead?), and Q3 (Is it relevant to the query?). The decision model returns scores for these questions without generating tokens. This allows the system to triage the passage based on its *intent* before the expensive generation step, something previous work did not implement.

## Placement and Cost of the Gate Mechanism
The gate operates based on specific thresholds ($t_{drop}$ and $t_{gate}$) applied to the scores $s_1$ (instruction) and $s_2$ (pollution). On Corpus A (injection), if $s_1 > t_{drop}$ or $s_2 > t_{pol}$ (where $t_{pol} = 0.95$), the passage is dropped. If $s_1 > t_{gate}$, the passage is kept, but the generation is constrained by a citation-requesting prompt. If both thresholds are passed, the passage is passed through normally. When stacked on top of combined mitigations, setting the threshold at $0.5$ achieves a 5.7% Attack Success Rate (ASR). This gate takes 76 ms per passage on one RTX PRO 4500, costing about \$0.015 per 1,000 passages, which is significantly cheaper than using large LLM judges (which cost about \$0.15 per 1,000 passages).

## Limitations
The evaluation is constrained by using a corpus designed based on prior studies, not entirely novel data. The reliance on a fixed set of eight templates for hard negatives means the generality of the false-positive rate may be optimistic. Furthermore, the study notes that attacks utilizing more queries, stronger rewriting mechanisms, or direct access to the gate’s weights remain outside the scope of this work.

## What practitioners should do
*   Implement a small, open-weight decision model (like Kev-4B) to screen retrieved passages before generation.
*   Combine the gate with existing sanitization and citation prompting mitigations for best performance.
*   When facing potential pollution, screen candidates before the top ten are selected, rather than only filtering the final top ten.
*   Tune the drop threshold ($t_{drop}$) based on the acceptable False-Positive Rate (FPR); for instance, a threshold of $0.5$ yields 2.2% FPR when applied alone.

## Verdict
Read this paper if you are building production RAG systems and need a practical, low-cost method to defend against subtle injection and pollution attacks. Skip it if you are only interested in high-level architectural theory or have unlimited computational budget.

---

## Den's Take

The paper presents a compelling case for using small decision models as a low-cost gate in RAG pipelines. However, I remain unconvinced that shifting the filtering mechanism to a pre-generation classification step fundamentally solves the underlying problem of adversarial input. The system relies on the decision model accurately classifying intent (Q1, Q2, Q3); yet, if an attacker can craft an input that is syntactically benign to the decision model but semantically manipulative to the downstream generator, the gate is bypassed regardless of its low latency. Relying on a fixed set of templates for hard negatives, as noted in the limitations, suggests the defense is brittle against novel attack vectors that fall outside the scope of those initial design constraints. This approach feels like another layer of brittle post-processing rather than addressing the fragility of the retrieval-to-generation interface itself.