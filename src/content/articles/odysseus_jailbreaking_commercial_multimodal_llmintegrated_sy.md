---
title: "Odysseus: Jailbreaking Commercial Multimodal LLM-integrated Systems via Dual Steganography"
date: "2026-08-16"
type: "Paper Review"
paperUrl: "https://arxiv.org/abs/2512.20168"
paperAuthors: "Songze Li, Jiameng Cheng, Yiming Li, et al."
description: "Dual steganography embeds malicious queries and responses covertly"
tags: ["Jailbreaking"]
readingTime: 5
headerImage: "/images/news/odysseus_jailbreaking_commercial_multimodal_llmintegrated_sy.jpg"
---

![Odysseus: Jailbreaking Commercial Multimodal LLM-integrated Systems via Dual Steganography](/images/news/odysseus_jailbreaking_commercial_multimodal_llmintegrated_sy.jpg)
*Figure from the paper “Odysseus: Jailbreaking Commercial Multimodal LLM-integrated Systems via Dual Steganography” (p. 6)*

# Odysseus: Jailbreaking Commercial Multimodal LLM-integrated Systems via Dual Steganography

## TLDR
*   **What**: Dual steganography embeds malicious queries and responses covertly.
*   **Who's at risk**: Commercial Multimodal LLM-integrated systems (e.g., GPT-4o, Gemini-2.0-pro).
*   **Key number**: Up to 99% attack success rate against tested systems.

## The Latent Assumption of Safety Filters
Current safety defenses in MLLM-integrated systems rely on a premise: malicious content must be explicitly visible in the input or the output for the filters to catch it. This works reasonably well for traditional LLM-integrated setups where attacks are primarily text-based. However, the integration of multiple modalities—text and vision—creates a blind spot. Existing jailbreak methods, whether optimization-based or domain transfer attacks, are often explicit. They either inject visually noticeable perturbations or convert malicious content directly across modalities in a detectable way. Commercial systems deploy both input filters (checking $Q_t$ and $Q_i$) and output filters ($R_t$ and $R_i$) to counter this. But when adversaries can hide intent in a benign-looking modality, these filters fail to detect the malicious instruction, leading to a false sense of security in these advanced systems.

## Dual Steganography for Covert Payload Transfer
The core innovation of Odysseus is circumventing the explicit content assumption by using dual steganography. Instead of crafting a prompt that *says* something malicious, the attacker embeds the malicious instruction into an auxiliary modality, specifically an image, using a steganography model's encoder. Furthermore, the attacker engineers the system to embed the desired malicious *response* into a carrier image that the adversary can decode locally. This separation of payload delivery (input) and payload retrieval (output) is key. The steganography model is trained to perform both embedding and extraction. This allows the attack to bypass both pre-generation input filters and post-generation output filters, as the harmful content is never explicitly visible in the textual or standard visual data stream that the filters analyze.

## The Four Stages of Odysseus
Odysseus operates through a structured, four-stage process. First, in malicious query encoding, the adversary's harmful prompt is converted into binary matrices. Second, steganography embedding uses the steganography model’s encoder to embed these matrices into an image, resulting in the crafted input. This input is then submitted to the victim MLLM-integrated system. During model interaction, the system processes the image and generates an image response that may contain the encoded, illegitimate content. Finally, in response extraction, the adversary uses the steganography model’s decoder on the generated image to decrypt the hidden content locally. To ensure reliability despite image transformations like resizing, a lightweight check-code mechanism is appended during encoding and verified during decoding.

## Limitations
The paper focuses primarily on image-based dual steganography and testing against specific commercial MLLMs. The threat model does not extensively cover auditory or other multimodal inputs beyond the image modality. Furthermore, the robustness against highly adaptive defenses that might detect the specific patterns introduced by the check-code mechanism or the steganography model itself is not fully detailed.

## What practitioners should do
*   Do not rely solely on text-based safety filters; assume multimodal inputs can conceal adversarial intent.
*   Audit MLLM pipelines to ensure safety checks are not only applied to raw text but also to the underlying modality representations.
*   Investigate the feasibility of detecting steganographic artifacts, especially when payloads are embedded in images.
*   For systems using function calling, treat non-textual inputs as high-risk vectors for instruction embedding.

## Verdict
Read this paper if you are working on the security of deployed MLLM agents; otherwise, you can likely skip it.

---

## Den's Take

The paper presents a compelling demonstration of how dual steganography can effectively bypass existing safety guardrails in commercial MLLMs. However, the reported 99% success rate feels like a measurement of the *current* state of filter design, not a guarantee of future resilience. The research treats the steganography model as a fixed, known component. What the authors overlook is the adversarial nature of the steganography encoder itself. If an attacker can iterate on the embedding parameters—perhaps by slightly altering the embedding strategy to avoid known statistical artifacts that future defensive models might flag—the attack surface expands beyond the simple layer-by-layer bypass described. This shifts the problem from "can we hide it?" to "can we hide it robustly against adaptive detection?" This mirrors the structural concerns I raised regarding LLM agent ecosystems, where securing the entire operational flow is necessary, not just the initial input. [Les Dissonances: Cross-Tool Harvesting and Polluting in Pool-of-Tools Empowered LLM Agents](/writing/les_dissonances_crosstool_harvesting_and_polluting_in_poolof)