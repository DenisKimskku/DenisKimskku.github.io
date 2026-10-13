---
title: "I Know What You Said: Unveiling Hardware Cache Side-Channels in Local Large Language Model Inference"
date: "2026-10-09"
type: "Paper Review"
description: "Leaks input/output tokens via hardware cache access patterns"
tags: ["AI Security"]
readingTime: 5
headerImage: "/images/news/i_know_what_you_said_unveiling_hardware_cache_sidechannels_i.jpg"
paperUrl: "https://www.usenix.org/system/files/usenixsecurity25-gao-zibo.pdf"
---

![I Know What You Said: Unveiling Hardware Cache Side-Channels in Local Large Language Model Inference](/images/news/i_know_what_you_said_unveiling_hardware_cache_sidechannels_i.jpg)
*Figure from the paper “I Know What You Said: Unveiling Hardware Cache Side-Channels in Local Large Language Model Inference” (p. 6)*

# Hardware Cache Side-Channels Leak Token Values and Positions During Local LLM Inference

## TLDR
*   **What**: Leaks input/output tokens via hardware cache access patterns.
*   **Who's at risk**: Developers deploying LLMs locally on consumer hardware.
*   **Key number**: Restored output and input text have an average edit distance of 5.2% and 17.3% to the ground truth, respectively.

## The Token Embedding Operation
The security premise rests on the token embedding operation, which converts token sequences into dense semantic representations. This process relies on retrieving rows from the embedding table $W$. Because the token list is encoded sparsely (one-hot matrix $x$), the operation simplifies to a table lookup: $E_i = W[t_i]$. Since only the requested row vectors are loaded into the cache, monitoring cache access patterns allows an adversary to infer the specific token index $t_i$ being processed. This leakage occurs for both the victim’s input and the tokens generated during the autoregressive decoding phases. The attack is feasible because the token embedding is typically offloaded to the CPU in local deployments, making it susceptible to shared-memory cache side-channel attacks like flush+reload.

## Noise in the Side Channels
Directly observing cache accesses is complicated by system noise, which manifests as false positives and false negatives. The cache side-channel presents this noise, leading to randomly-valued and missing tokens when attempting to deduce token values from cache access monitoring. Furthermore, when input tokens are batched for parallel processing, their embedding operations are randomly interleaved or overlapping in the time axis. This scrambling prevents the adversary from recovering the original sequence order simply by observing the timing of the prefill phase. These two challenges—noise (C1) and token scrambling (C2)—require specific reconstruction strategies to move past raw cache trace data.

## LLMA and LLMB Reconstruction
To combat noise (C1), the paper employs a novel text reconstruction algorithm utilizing Power Spectral Density (PSD) on the timing signal, combined with a synthetic dataset. LLM-A is fine-tuned on this dataset, where tokens are assigned periodic timestamps to simulate the timing signal, and noise is injected to mimic real-world conditions. To restore the token order (C2), the authors use LLM-B. This model is fine-tuned to exploit the contextual dependence between the reconstructed output text ($\text{bO}$) and the unordered token list ($\text{KP}$) from the prefill phase. The attack workflow involves collecting the cache trace, identifying prefill ($\text{oP}$) and decode ($\text{oD}$) segments, mapping the trace to the token list ($\text{KP}$) and timing signal ($\text{TD}$), and then sequentially running $\text{bO} = \text{LLMA}(\text{KD}, \text{TD})$ followed by $\text{bI} = \text{LLMB}(\text{bO}, \text{KP})$. When attacking llama.cpp, our method achieved an average Levenshtein similarity (1 - Edit Distance) of 94.8% for the restored output text and 82.7% for the restored input text.

## Limitations
The threat model assumes the adversary can execute code on the victim machine and has access to publicly available information to compute embedding table offsets. The attack relies on the token embedding operation being offloaded to the CPU, which may not hold true for all proprietary or specialized local inference setups. The paper notes that standard flush+reload implementations face precision degradation on modern Intel microarchitectures due to Array-of-Pointers (AoP) prefetchers, requiring specific adversarial countermeasures.

## What practitioners should do
*   Audit local LLM deployment pipelines to ensure sensitive data is not processed where hardware side-channel leakage is possible.
*   If running LLMs locally, investigate frameworks that offer hardware-level isolation or memory access controls beyond standard OS process separation.
*   Be aware that token embedding lookups are a direct vector for data leakage if the process is co-located with an adversary.
*   Monitor for advancements in hardware prefetcher countermeasures, as they directly impact the feasibility of cache-based attacks.

## Verdict
Read this paper if you are an ML engineer or security researcher focused on the physical security of deployed AI models. Otherwise, skip it.

---

## Den's Take

The research demonstrates a tangible risk for anyone running LLMs locally, moving the threat model firmly into the physical layer. However, the reliance on offloading the token embedding to the CPU, as noted in the limitations, is a significant constraint that the authors do not adequately address. If specialized local inference setups utilize GPU-resident embedding tables, the entire attack surface shifts dramatically, potentially rendering the current flush+reload methodology moot without a fundamental change in attack vector. Furthermore, the reconstruction success rate, while impressive, only speaks to the effectiveness of the post-processing algorithms (LLMA and LLMB); it says little about the complexity or time required to gather a sufficient, clean cache trace under realistic system load. This suggests the feasibility is highly dependent on the specific, controlled environment of the test setup.