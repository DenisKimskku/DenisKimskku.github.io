---
title: "Cache Me, Catch You: Cache Related Security Threats in LLM Serving Frameworks"
date: "2026-11-12"
type: "Paper Review"
description: "Attacks exploit cache key generation flaws in LLM serving"
tags: ["RAG", "Data Poisoning", "AI Agents", "Fuzzing"]
readingTime: 5
headerImage: "/images/news/cache_me_catch_you_cache_related_security_threats_in_llm_ser.jpg"
paperUrl: "https://www.ndss-symposium.org/wp-content/uploads/2026-f2812-paper.pdf"
---

![Cache Me, Catch You: Cache Related Security Threats in LLM Serving Frameworks](/images/news/cache_me_catch_you_cache_related_security_threats_in_llm_ser.jpg)
*Figure from the paper “Cache Me, Catch You: Cache Related Security Threats in LLM Serving Frameworks” (p. 8)*

# Cache Collisions and Semantic Poisoning in LLM Serving Frameworks

## TLDR
*   **What**: Attacks exploit cache key generation flaws in LLM serving.
*   **Who's at risk**: Users of chatbots, agents, and RAG assistants using vLLM, GPTCache, etc.
*   **Key number**: For prefix collision-based attacks (F1, I1, I2), the hash search required approximately 30 minutes on two CPU cores.

## The Reliance on Cache for Performance
Large Language Models (LLMs) rely heavily on caching mechanisms—prefix, multimodal, and semantic—to manage the computational overhead of inference. Prefix cache stores intermediate token states for reuse, while semantic cache indexes responses via embeddings to retrieve results based on query similarity. These optimizations, implemented in frameworks like vLLM and GPTCache, are vital for low latency and cost control. The core pipeline involves serializing input data ($\text{d}$) and metadata ($\text{m}$), deriving a unique key ($\text{k} = \text{H}(\text{S}(\text{d}, \text{m}), \text{id})$), and retrieving the cached value ($\text{v}$). The paper notes that this system relies on Non-Cryptographic Hash Functions (NCHFs) and fuzzy semantic similarity, which prioritize speed over security. This reliance creates a new attack surface during inference time, unlike prior work focused on training-phase poisoning.

## Prefix Collision Hijack
The paper details how flaws in serialization and key generation allow adversaries to inject malicious content into shared caches. For prefix cache, the attack targets the collision-resistant hashing requirement (Guideline G3). Adversaries can manipulate input text to achieve hash collisions, meaning distinct inputs map to the same cache key. For instance, testing on vLLM, the researchers achieved a 100% cache-hit rate against the service by successfully injecting a malicious system prompt that altered subsequent outputs. Similarly, system prompt collision (F1) allows poisoning of prefix caches, while block-wise collision hijack (I2) allows malicious blocks to become invisible to security checks by exploiting cache collisions.

## Semantic Fuzzy Poisoning
When semantic cache is employed, key generation relies on embeddings rather than exact byte matching. This introduces the risk of semantic fuzzy poisoning. The attack involves submitting semantically similar malicious queries to poison the cache entries. Using GPTCache as a test bed for fuzzy poisoning attacks (F2, F3), the researchers demonstrated a 75% poisoned-hit rate under realistic similarity thresholds (0.8). This attack path is further expanded when leveraging Retrieval-Augmented Generation (RAG) pipelines to construct these fuzzy queries. Furthermore, multimodal inputs present specific serialization weaknesses; for example, vLLM's strategy of hashing only raw pixel bytes while ignoring metadata can lead to collisions between images of different sizes or those using different palettes.

## The Cost of Exploitation
The cost associated with these cache-related attacks is remarkably low, indicating widespread practicality in deployed systems. For prefix collision-based attacks (F1, I1, I2), the hash search required approximately 30 minutes on two CPU cores. For the multimodal collision attack (I3) against an image review bot built on vLLM, each successful attack instance cost much less than \$1. The paper’s findings show that the security weaknesses stem from using NCHFs and lossy serialization, violating design guidelines like Serialization Soundness (G1) and Collision-Resistant Hashing (G3).

## Limitations
The paper focuses primarily on collision and poisoning attacks within the context of existing, mainstream serving frameworks. It does not extensively cover threats related to cache eviction policies or the security implications of the LLM-based filtering defenses proposed. The practical robustness of these attacks may vary significantly depending on the specific deployment configuration and the thoroughness of the vendor's implementation of the proposed mitigations.

## What practitioners should do
*   Verify that LLM serving frameworks are using cryptographically secure hash functions for key generation, rather than NCHFs.
*   Ensure that multimodal input serialization captures all necessary metadata (e.g., image dimensions, format) to satisfy serialization soundness.
*   Be aware that semantic cache implementations are susceptible to fuzzy poisoning via semantically similar malicious queries.
*   Prioritize frameworks that have adopted the proposed mitigation strategies, such as vLLM, GPTCache, and AIBrix.

## Verdict
Read this paper if you work with LLM serving infrastructure, MLOps, or production-scale deployment of LLMs; otherwise, skim.

---

## Den's Take

The observed reliance on Non-Cryptographic Hash Functions (NCHFs) for cache key generation is a fundamental design flaw, but the paper understates the severity of the semantic poisoning vector. While achieving a 75% poisoned-hit rate against GPTCache using fuzzy queries is noted, this assumes the attacker can reliably craft queries that land within the established similarity threshold (0.8). I predict that in real-world RAG pipelines, where the context retrieval step already introduces significant noise and variance, the required precision for the fuzzy poisoning attack will become far more difficult to maintain consistently, leading to lower practical success rates than demonstrated. Furthermore, the paper gives insufficient attention to how an attacker could manipulate the *metadata* ($\text{m}$) during serialization—a vector that bypasses the hash function entirely if the framework fails to enforce strict schema validation on inputs. This moves the problem from a cryptographic weakness to a strict input validation failure, which is often easier to exploit in practice.