---
title: "Trends in Attacks and Defenses against Retrieval-Augmented Generation (RAG) Systems"
date: "2026-03-18"
type: "Research Paper"
description: "A comprehensive survey of security vulnerabilities in RAG systems, classifying adversarial attacks by component—data poisoning, retrieval poisoning, and prompt manipulation—and examining emerging defense strategies."
tags: ["RAG", "LLM Security", "Data Poisoning", "Prompt Injection", "Survey"]
---

# Trends in Attacks and Defenses against Retrieval-Augmented Generation (RAG) Systems

Retrieval-Augmented Generation (RAG) has become the go-to architecture for making LLMs more accurate, grounded, and up-to-date. By retrieving relevant information from external knowledge bases and feeding it to the model, RAG addresses two fundamental LLM limitations: hallucination and knowledge staleness. But this reliance on external data introduces a new class of vulnerabilities. **When the knowledge source itself becomes the attack surface, how do we defend the system?**

This is the question we survey in our paper, "[Trends in Attacks and Defenses against Retrieval-Augmented Generation (RAG) Systems](https://deniskim1.com/papers/cisc_w_24/CISC_W_24_paper.pdf)," presented at **CISC-W 2024 (Conference on Information Security and Cryptology - Winter)**.

We provide a systematic classification of adversarial attacks against RAG systems organized by the target component, and examine the emerging defense strategies designed to counter them. This paper laid the groundwork for our subsequent defense work, [RAGDefender](/writing/Rescuing_the_unpoisoned), by mapping the threat landscape that motivated its design.

---

## How RAG Works

A standard RAG pipeline consists of three main components:

| Component | Role | Function |
|-----------|------|----------|
| **Knowledge Base** | Data storage | Stores documents, passages, or structured data that the model can reference |
| **Retriever** | Information selection | Given a query, finds the most relevant passages from the knowledge base |
| **Generator** | Response production | Uses the retrieved passages as context to generate a grounded response |

### The RAG Pipeline

1. **User Query**: The user asks a question
2. **Retrieval**: The retriever encodes the query into an embedding and searches the knowledge base for semantically similar passages (typically using dense retrieval models)
3. **Augmentation**: The top-k retrieved passages are concatenated with the original query as context
4. **Generation**: The LLM generates a response grounded in the retrieved context

This pipeline is used across a wide range of applications: customer support chatbots, medical question-answering, legal document analysis, code generation with repository context, and enterprise search.

---

## Attack Taxonomy: Three Attack Surfaces

We classify attacks on RAG systems by which component they target. Each component presents a distinct attack surface with different threat models and exploitation strategies.

### 1. Data Poisoning Attacks

Data poisoning targets the **knowledge base**—the foundation that the entire RAG system trusts. If an attacker can inject, modify, or corrupt documents in the knowledge base, every downstream query that retrieves those documents will produce poisoned outputs.

#### Attack Vectors

| Vector | Method | Difficulty |
|--------|--------|------------|
| **Direct Injection** | Insert adversarial documents into the knowledge base | Requires write access |
| **Indirect Injection** | Poison web sources that are scraped into the knowledge base | Low barrier (Wikipedia edits, forum posts) |
| **Data Corruption** | Modify existing documents to contain subtle misinformation | Requires existing document access |

#### Key Research

**PoisonedRAG** demonstrated that injecting a small number of adversarial passages into a RAG knowledge base can cause the system to generate targeted misinformation. The attack is effective because:

- Dense retrievers rank adversarial passages highly due to their crafted semantic similarity to target queries
- LLMs tend to trust retrieved context, generating responses that faithfully reflect the poisoned content
- The attack requires contaminating only a tiny fraction of the corpus

**Practical poisoning economics**: Prior work by Carlini et al. showed that poisoning 0.01% of a 400M-document web corpus costs roughly \$60, making large-scale knowledge base poisoning economically feasible.

### 2. Retrieval Poisoning Attacks

Retrieval poisoning targets the **retriever** component—manipulating which documents are returned for a given query, without necessarily modifying the knowledge base itself.

#### Attack Vectors

| Vector | Method | Impact |
|--------|--------|--------|
| **Embedding Manipulation** | Craft inputs that exploit the retriever's embedding space | Adversarial documents rank higher than legitimate ones |
| **Query Manipulation** | Modify the user's query before it reaches the retriever | Redirect retrieval to attacker-chosen topics |
| **Retriever Exploitation** | Exploit biases in the retrieval model's training | Certain content types or styles are systematically over- or under-retrieved |

#### Key Insight

The dense embedding models used by modern retrievers are vulnerable to adversarial examples in embedding space. An attacker can craft passages that are semantically distant from a topic in natural language but close to target queries in embedding space. This "semantic mismatch" allows adversarial content to be retrieved without appearing suspicious to human reviewers.

### 3. Prompt Manipulation Attacks

Prompt manipulation targets the **generator** component—injecting instructions into the retrieved context that override the model's intended behavior.

#### Attack Vectors

| Vector | Method | Impact |
|--------|--------|--------|
| **Indirect Prompt Injection** | Embed instructions in documents that will be retrieved and included in the prompt | Model follows attacker's instructions instead of user's |
| **Context Window Hijacking** | Fill the context window with adversarial content to crowd out legitimate passages | Model loses access to genuine information |
| **Instruction Overriding** | Craft instructions that take priority over system prompts | Complete control over model behavior |

#### Key Insight

The fundamental vulnerability is that LLMs cannot reliably distinguish between the user's instructions and content retrieved from external sources. When adversarial instructions are embedded in retrieved passages, the model may follow them as if they came from the user or the system.

---

## Cross-Component Attack Synergies

The three attack surfaces are not independent. Sophisticated attacks can chain multiple components:

| Attack Chain | Stages | Effect |
|-------------|--------|--------|
| **Poison → Retrieve → Inject** | 1) Inject adversarial docs, 2) ensure they're retrieved, 3) embed prompt injection in the docs | Full pipeline compromise: attacker controls what's retrieved AND how it's processed |
| **Query → Retrieve → Poison** | 1) Manipulate query, 2) redirect to poisoned region of knowledge base, 3) generate from poisoned context | Targeted misinformation for specific query types |

---

## Defense Strategies

### Defending the Knowledge Base

| Defense | Strategy | Trade-off |
|---------|----------|-----------|
| **Content Verification** | Validate document provenance and integrity before indexing | Increases ingestion latency |
| **Anomaly Detection** | Monitor for unusual patterns in document additions | May flag legitimate updates |
| **Access Control** | Restrict who can modify the knowledge base | Limits collaborative knowledge building |
| **Periodic Auditing** | Regularly scan for suspicious or adversarial content | Computationally expensive at scale |

### Defending the Retriever

| Defense | Strategy | Trade-off |
|---------|----------|-----------|
| **Adversarial Training** | Train retrievers on adversarial examples | May reduce benign retrieval quality |
| **Ensemble Retrieval** | Use multiple diverse retrievers and aggregate results | Higher computational cost |
| **Retrieval Filtering** | Post-retrieval filtering to remove suspicious passages | May discard legitimate results |
| **Embedding Regularization** | Constrain embedding space to resist adversarial manipulation | Limits model expressiveness |

### Defending the Generator

| Defense | Strategy | Trade-off |
|---------|----------|-----------|
| **Instruction Hierarchy** | Enforce strict priority between system prompts and retrieved content | May ignore useful instructions in documents |
| **Context Verification** | Have the model evaluate retrieved passages for potential injection | Increases inference cost |
| **Output Filtering** | Post-generation filtering for harmful or manipulated content | Adds latency, may filter benign responses |
| **Abstention Training** | Train models to abstain when retrieved context is contradictory or suspicious | Reduces system utility |

### Integrated Defenses

The most effective defenses operate across the entire RAG pipeline:

1. **Multi-stage filtering**: Validate at ingestion, retrieval, and generation stages
2. **Consistency checking**: Cross-reference retrieved passages for contradictions that may indicate poisoning
3. **Confidence calibration**: Reduce model confidence when retrieved evidence is sparse or conflicting
4. **Human-in-the-loop**: For high-stakes applications, include human review of retrieved sources

---

## The Arms Race

The attack-defense landscape in RAG security mirrors the broader adversarial machine learning arms race:

1. **Attackers adapt**: As defenses improve, attackers develop more sophisticated poisoning strategies that evade detection
2. **Defenses have costs**: Every defense mechanism adds computational overhead, latency, or complexity
3. **No silver bullet**: No single defense addresses all three attack surfaces simultaneously
4. **Deployment constraints matter**: Academic defenses that require model retraining or multiple LLM inference calls may be impractical in production

This observation directly motivated our subsequent work on [RAGDefender](/writing/Rescuing_the_unpoisoned), which specifically targets the need for **resource-efficient** post-retrieval defense that doesn't require additional LLM inferences or model retraining.

---

## Recommendations for RAG System Builders

Based on our survey, we offer the following practical recommendations:

### High Priority

1. **Implement post-retrieval filtering**: The highest-ROI defense. Filter retrieved passages before they reach the generator to remove potential adversarial content.
2. **Monitor knowledge base integrity**: Establish baselines for document similarity distributions and alert on anomalies that may indicate poisoning.
3. **Use diverse retrieval**: Don't rely on a single retrieval model. Ensemble approaches make targeted attacks harder.

### Medium Priority

4. **Harden the ingestion pipeline**: Validate document provenance and content before adding to the knowledge base.
5. **Implement output monitoring**: Track generator outputs for patterns that may indicate successful attacks (e.g., sudden shifts in response style or factual accuracy).

### Long Term

6. **Invest in adversarial robustness research**: The retriever is the most vulnerable component; robust embedding models are a critical research need.
7. **Develop standards**: Industry-wide standards for RAG security evaluation would accelerate progress.

---

## Summary

Our paper makes three contributions to understanding RAG security:

1. **Component-Based Attack Taxonomy**: We classify adversarial attacks on RAG systems by their target component—data poisoning (knowledge base), retrieval poisoning (retriever), and prompt manipulation (generator)—providing a structured framework for threat analysis
2. **Defense Survey**: We catalog and evaluate existing defense strategies for each component, identifying their trade-offs and limitations
3. **Research Roadmap**: We highlight the key open problems in RAG security, including the need for resource-efficient defenses, cross-component security, and standardized evaluation

As RAG becomes the dominant architecture for deploying LLMs in production, understanding its security landscape is essential. This survey maps the terrain—the threats, the defenses, and the gaps—to guide both practitioners building RAG systems and researchers developing the next generation of defenses.

---

**Reference**: Kim, M. & Koo, H. (2024). Trends in Attacks and Defenses against Retrieval-Augmented Generation (RAG) Systems. *Proceedings of the Conference on Information Security and Cryptology - Winter (CISC-W)*.

- **Paper**: [PDF](https://deniskim1.com/papers/cisc_w_24/CISC_W_24_paper.pdf)
- **Slides**: [PDF](https://deniskim1.com/papers/cisc_w_24/CISC_W_24_slides.pdf)
