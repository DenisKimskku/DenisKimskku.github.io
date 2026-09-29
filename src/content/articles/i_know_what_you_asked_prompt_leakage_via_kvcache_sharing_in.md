---
title: "I Know What You Asked: Prompt Leakage via KV-Cache Sharing in Multi-Tenant LLM Serving"
date: "2026-09-30"
type: "Paper Review"
description: "PROMPTPEEK exploits KV-cache sharing side channels"
tags: ["Vulnerabilities"]
readingTime: 5
headerImage: "/images/news/i_know_what_you_asked_prompt_leakage_via_kvcache_sharing_in_.jpg"
paperUrl: "https://yinqian.org/papers/ndss25b.pdf"
---

![I Know What You Asked: Prompt Leakage via KV-Cache Sharing in Multi-Tenant LLM Serving](/images/news/i_know_what_you_asked_prompt_leakage_via_kvcache_sharing_in_.jpg)
*Figure from the paper “I Know What You Asked: Prompt Leakage via KV-Cache Sharing in Multi-Tenant LLM Serving” (p. 6)*

# Prompt Reconstruction via KV-Cache Sharing in Multi-Tenant LLM Serving

## TLDR
*   **What**: PROMPTPEEK exploits KV-cache sharing side channels.
*   **Who's at risk**: Multi-tenant LLM serving frameworks (e.g., SGLang, vLLM).
*   **Key number**: The adversary can achieve an average success rate of 99% in fully or partially reversing the prompt input, 98% in reversing the prompt template, and 95% without additional background knowledge, when tested on a Llama2-13B model on an A100 80G GPU.

## The State of KV Cache Sharing
Modern LLM serving architectures, intended to maximize resource utilization, rely heavily on sharing the Key-Value (KV) cache across concurrent user requests. This technique, employed by frameworks like SGLang and vLLM, is designed to save significant GPU memory and computation by reusing cached representations for identical token sequences. The rationale is sound: if two requests begin with the same tokens—for instance, "Imagine you are an IT expert and tell me how to install"—the initial KV cache segments can be shared. This allows the system to only recalculate the differing parts, like "Windows" versus "Linux." However, this efficiency mechanism introduces a security vulnerability. The paper identifies that this sharing inadvertently creates a side channel. Instead of purely optimizing throughput, the state of one tenant's request can leak information about the sequences of others, enabling unauthorized prompt reconstruction.

## PROMPTPEEK and the LPM Side Channel
The core insight of PROMPTPEEK is that the state of the shared KV cache, when managed by the Longest Prefix Match (LPM) scheduling policy, can be leveraged as an observable side channel. While the goal of LPM is to prioritize requests that share the longest sequence with existing cache entries, the adversary exploits this prioritization behavior. By carefully crafting and dispatching requests, the attacker can determine *if* their candidate token sequence matches a sequence already cached from a victim user. This match manifests as a change in the serving order or processing priority dictated by the LPM policy. This contrasts with prior methods that might only approximate prompt content; PROMPTPEEK aims for accurate, token-by-token recovery.

## Token Extraction and Reconstruction Cost
The attack proceeds through iterative token extraction. The primitive involves two phases: candidate generation and token selection. In the candidates generation phase, a local LLM generates a set of top $k$ likely tokens based on the prompt fragment already recovered. The adversary then enters the token selection phase, where they send dummy and candidate requests. They observe the return order, exploiting the LPM policy, to see if any candidate token matches the victim's target token. If a match occurs, the system prioritizes that sequence. For example, knowing the prompt template allows the adversary to uncover the prompt’s secrets, including gender, age, weight, and height, with just 60 requests in total.

## Limitations
The study assumes the adversary has knowledge of the default internal mechanisms of the LLM server, including the scheduling and eviction policies. Furthermore, the attack relies on the specific implementation details of KV cache sharing, such as the use of LPM for scheduling and LRU for eviction. In production environments where these policies might be randomized or hardened, the feasibility of the side channel could degrade substantially.

## What practitioners should do
*   Audit KV cache management policies in multi-tenant serving frameworks to ensure sequence uniqueness or isolation.
*   Review the implementation of scheduling policies like LPM to determine if request ordering can be observable externally.
*   Consider implementing mechanisms to ensure that requests from different tenants do not share identical initial token sequences when possible.
*   Be aware that even if prompt templates are known, the attack can still recover sensitive input data.

## Verdict
Read this paper if you are building or deploying multi-tenant LLM services; otherwise, you can skim it.

---

## Den's Take

The reported 99% average success rate is concerning, but the paper frames the vulnerability almost entirely around the *observability* of the LPM prioritization. This misses the more immediate threat: what happens when the shared state leaks beyond just the prompt input? If an attacker can reliably probe the KV cache state, they aren't just reconstructing the initial instruction; they are learning the internal *context* the model has built up during the ongoing generation for a victim. This suggests that prompt leakage is just the entry point to deeper state compromise. We need to expect attackers to move from reconstructing the prompt to inferring sensitive intermediate states used by the LLM during complex reasoning chains. This type of state leakage is far more damaging than simple input recovery.