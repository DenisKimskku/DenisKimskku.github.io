---
title: "When Cache Poisoning Meets LLM Systems: Semantic Cache Poisoning and Its Countermeasures"
date: "2026-10-10"
type: "Paper Review"
description: "When Cache Poisoning Meets LLM Systems: Semantic Cache Poisoning and Its Countermeasures"
tags: ["Data Poisoning", "Adversarial Attacks", "Vulnerabilities"]
readingTime: 5
headerImage: "/images/news/when_cache_poisoning_meets_llm_systems_semantic_cache_poison.jpg"
paperUrl: "https://www.ndss-symposium.org/wp-content/uploads/2026-f200-paper.pdf"
---

![When Cache Poisoning Meets LLM Systems: Semantic Cache Poisoning and Its Countermeasures](/images/news/when_cache_poisoning_meets_llm_systems_semantic_cache_poison.jpg)

# Semantic Cache Poisoning via Adversarial Query Injection

## TLDR
* **What:** An attacker injects crafted query-response pairs into semantic caches.
* **Who's at risk:** LLM serving infrastructure on cloud providers (AWS, Azure, Alibaba).
* **Key number:** More specifically, our attack achieves an attack success rate of 88% on the text-to-text case in GPTCache.

## The Semantic Cache Mechanism
Semantic caching optimizes LLM service delivery by reusing responses for semantically similar queries, thereby lowering API costs and improving latency. The core system involves an embedding model, a database storage, and a similarity evaluator. When a query arrives, the system first converts it into a vector embedding and searches the cache for the most similar stored query. Retrieval is a two-phase process: a fast initial filtering of top-K candidates based on embedding similarity, followed by a more accurate assessment using a similarity evaluator model. If the best match exceeds a predefined similarity threshold, the cached response is returned; otherwise, the LLM performs inference and stores the new $\langle \text{query}, \text{response} \rangle$ pair. This mechanism is adopted by major cloud providers like Azure, AWS, and Alibaba, often with additional time-based expiration policies applied to entries. The system's utility hinges on this similarity threshold; a lower threshold increases the cache hit rate but risks lower accuracy.

## The Query-Centric Poisoning Attack
The vulnerability arises because the semantic cache allows unrestrictedly reusing query-response pairs across users based on semantic similarity, which an attacker exploits. The goal is to poison a target query, $Q_{\text{target}}$, such that any semantically similar query retrieves an attacker-chosen response, $R_{\text{poison}}$. The attack requires four conditions: generating $R_{\text{poison}}$, crafting a semantically similar adversarial query $Q_{\text{adv}}$, overcoming interference from other queries, and ensuring persistent storage. The attacker functions as a standard end user, able to submit queries and observe responses, allowing them to inject $\langle Q_{\text{adv}}, R_{\text{poison}} \rangle$ into the cache. The attacker confirms success by observing that querying $Q_{\text{target}}$ subsequently returns $R_{\text{poison}}$. The attack is viable across different applications, ranging from misinformation dissemination to malicious content injection, provided the underlying semantic similarity judgment is met.

## The $Q_{\text{adv}}$ Generation and Defense Evasion
To make the poisoning effective, the attacker must ensure $Q_{\text{adv}}$ is semantically close to $Q_{\text{target}}$ while eliciting the desired $R_{\text{poison}}$. The study explores different methods to generate $R_{\text{poison}}$, including using benign-looking and adversarial prompting techniques. The attack's success rate is directly tied to the similarity threshold employed by the system; the paper found average similarities of 0.87 in the black-box setting and 0.94 in the white-box setting. Existing adversarial prompting defenses, such as perplexity-based, paraphrase-based, and classifier-based approaches, were tested and found to yield low F1-scores against this specific poisoning vector. In response, the authors propose a new defense that achieves an F1-score of 0.87.

## Limitations
The research focuses specifically on semantic caching, meaning risks associated with other caching mechanisms in LLM systems remain unaddressed. Furthermore, the threat model assumes the attacker can continuously monitor and reissue poisoning queries to maintain persistence, which might not hold under high concurrency where rapid cache turnover shortens the lifetime of injected entries. The study also notes the inherent trade-off in semantic caching: increasing the similarity threshold reduces the cache hit rate, which impacts utility.

## What practitioners should do
* Assume that any LLM service utilizing semantic caching is susceptible to cache poisoning if input validation is not strictly enforced.
* Monitor the effectiveness of existing defenses, as the paper demonstrates that standard adversarial prompting defenses are often insufficient.
* Investigate implementing novel defenses, such as the one proposed, to improve protection against semantically similar injection.
* Be aware that the impact of poisoning is highly context-dependent, potentially leading to incorrect API calls or data leaks depending on the application use case.

## Verdict
Read this paper if you are engineering or securing LLM serving infrastructure, especially those utilizing semantic caching for cost reduction. Skip it if your work is focused solely on the LLM inference engine itself.

---

## Den's Take

What this review shows is that the focus on input validation alone is a semantic trap. The authors demonstrate that even when an attacker successfully injects a poisoned pair, the system's reliance on a similarity threshold means the *retrieval* mechanism itself is the exploit vector, not just the initial prompt processing. I predict that as systems scale and similarity thresholds are lowered to maximize cost savings, the attack surface broadens exponentially, making the 88% success rate in the tested setup a conservative baseline. The paper's evaluation of existing defenses, noting low F1-scores against standard adversarial prompting, suggests these defenses are treating the symptom (the prompt content) rather than the underlying structural weakness of allowing unvalidated $\langle Q, R \rangle$ insertion across user boundaries. This type of infrastructure vulnerability is far more pervasive than targeted prompt injection against the model weights themselves.