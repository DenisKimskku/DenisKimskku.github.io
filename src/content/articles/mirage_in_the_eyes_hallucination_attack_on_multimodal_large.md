---
title: "Mirage in the Eyes: Hallucination Attack on Multi-modal Large Language Models with Only Attention Sink"
date: "2026-10-04"
type: "Paper Review"
description: "Exploits attention sink behaviors to force MLLMs to hallucinate"
tags: ["AI Security"]
readingTime: 5
headerImage: "/images/news/mirage_in_the_eyes_hallucination_attack_on_multimodal_large_.jpg"
paperUrl: "https://www.usenix.org/system/files/usenixsecurity25-wang-yining.pdf"
---

![Mirage in the Eyes: Hallucination Attack on Multi-modal Large Language Models with Only Attention Sink](/images/news/mirage_in_the_eyes_hallucination_attack_on_multimodal_large_.jpg)
*Figure from the paper “Mirage in the Eyes: Hallucination Attack on Multi-modal Large Language Models with Only Attention Sink” (p. 5)*

# Attention Sink Manipulation for Inducing Hallucinations in MLLMs

## TLDR
* **What**: Exploits attention sink behaviors to force MLLMs to hallucinate.
* **Who's at risk**: MLLMs used in critical applications like medical reasoning or autonomous driving.
* **Key number**: Up to 12.74% increase in hallucinated sentences and words against commercial APIs.

## The Two-Segment Response Pattern
The integration of visual understanding into Multi-modal Large Language Models (MLLMs) has advanced tasks like image captioning. MLLMs are often plagued by hallucination—generating inaccurate objects, attributes, or relationships that fail to match the visual input. Existing work exploring hallucination often examines individual factors, such as the imbalance between vision models and LLM backbones. However, this paper focuses on the generative mechanism itself. Through an in-depth look at the instruction-tuning process, the authors observe that MLLMs tend to adhere to a two-segment response pattern. Initially, the response contains detailed descriptions tied to the image. Following this, the response shifts into content that is either loosely related to the image or entirely beyond the model's visual comprehension. This structural tendency, inherited from the instruction-tuning datasets, sets the stage for the attack by creating a transition point where image-text relevance begins to decline.

## Attention Sink as a Context Aggregator
The core insight of this work centers on the attention sink phenomenon. This pattern, where certain tokens receive disproportionately high attention scores, is observed in MLLMs, often exhibiting a unique columnar pattern in attention maps. The paper posits that these sink tokens are not merely artifacts of the softmax operation; they serve as implicit aggregators of global input information. Specifically, the sink tokens exhibit a significantly higher resemblance to global multi-modal input embeddings compared to other generated tokens. This aggregation behavior is linked to the model's tendency to minimize long-distance attention. When the model is trained on datasets that encourage this two-segment structure, the sink tokens become the mechanism that bridges the initial factual description segment to the subsequent, less relevant segment, effectively concentrating global context into a single, potentially misleading, token.

## Attention Sink Manipulation
The proposed hallucination attack leverages the existence and properties of these attention sinks. Since the emergence of the sink is rooted in the attention mechanism itself—not specific textual or visual inputs—the attack is dynamic and transferable. The attack manipulates attention scores and hidden embeddings to induce these sink tokens at the critical turning point of image-text relevance. The mechanism is designed to exacerbate object, attribute, and relationship hallucinations without degrading the overall response quality. The attack resulted in up to 10.90% and 12.74% increase in hallucinated sentences and words when tested against prominent MLLMs and commercial APIs like GPT-4o and Gemini 1.5, even when mitigating strategies were in place.

## Limitations
The attack's efficacy is demonstrated against black-box MLLMs and commercial APIs, but the paper does not detail the specific constraints of the target model's internal architecture beyond the attention mechanism. The reliance on manipulating attention scores and hidden embeddings assumes a level of observability or transferability that might break down in highly optimized or heavily guarded production environments. Furthermore, the study focuses on inducing *hallucination* rather than forcing specific harmful outputs, leaving the scope of safety alignment bypasses unexplored.

## What practitioners should do
* Monitor attention map patterns during inference for columnar attention sinks, especially when image-text relevance begins to drop.
* Be wary of response structures that exhibit a clear two-segment pattern, where the second segment diverges from initial visual descriptions.
* Test MLLM deployments against inputs designed to stress the transition point between image-grounded and associative content.
* Recognize that even models employing mitigation strategies can be compromised by targeting the underlying attention flow.

## Verdict
Read this paper if you are an ML engineer or security researcher focused on the internal workings and robustness of MLLMs. Skip it if your focus remains purely on application-level prompt injection or traditional adversarial perturbations.

---

## Den's Take

The focus on attention sinks as a mechanism for inducing hallucination is insightful, but the paper understates the systemic risk here. Merely increasing the rate of hallucination—even if it doesn't force a specific dangerous output—is a significant failure for systems intended for high-stakes reasoning. If the model's internal architecture is so easily manipulated via attention patterns to transition from grounded fact to associative noise, we are not dealing with a mere output quality issue; we are observing a fundamental fragility in how MLLMs consolidate multimodal context. This suggests that downstream defenses relying on post-generation filtering will always be fighting a losing battle against a corruption that happens at the token generation layer itself. This fragility echoes concerns about state management in complex AI systems, which prior work argued needed hardening rather than just tracking artifact spread.