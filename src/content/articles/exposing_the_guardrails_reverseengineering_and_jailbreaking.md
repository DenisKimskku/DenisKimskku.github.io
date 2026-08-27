---
title: "Exposing the Guardrails: Reverse-Engineering and Jailbreaking Safety Filters in DALL·E Text-to-Image Pipelines"
date: "2026-08-28"
type: "Paper Review"
description: "Exposing the Guardrails: Reverse-Engineering and Jailbreaking Safety Filters in DALL·E Text-to-Image Pipelines"
tags: ["Jailbreaking"]
readingTime: 5
headerImage: "/images/news/exposing_the_guardrails_reverseengineering_and_jailbreaking_.jpg"
paperUrl: "https://www.usenix.org/conference/usenixsecurity25/presentation/villa"
---

![Exposing the Guardrails: Reverse-Engineering and Jailbreaking Safety Filters in DALL·E Text-to-Image Pipelines](/images/news/exposing_the_guardrails_reverseengineering_and_jailbreaking_.jpg)
*Figure from the paper “Exposing the Guardrails: Reverse-Engineering and Jailbreaking Safety Filters in DALL·E Text-to-Image Pipelines” (p. 3)*

# Timing Side-Channel Reverse-Engineering of DALL·E Text-to-Image Safety Filters

## TLDR
*   Timing analysis reverses unknown, cascading safety filters in T2I pipelines.
*   Black-box T2I systems like DALL·E are vulnerable to side-channel attacks.
*   DALL·E 3 uses LLM revision, which creates exploitable discrepancies.

## The Divergence Between DALL·E 2 and DALL·E 3 Filtering
State-of-the-art text-to-image (T2I) models are deployed across numerous real-world applications, necessitating robust safety guardrails to prevent the generation of harmful content, such as NSFW or hate speech. Prior red teaming efforts, particularly those focused on open-source models like Stable Diffusion, indicated that security-by-obscurity approaches were insufficient. The core gap this paper addresses is the lack of knowledge regarding the specific, multi-stage implementation of safety filters in closed, enterprise-grade models like DALL·E. While DALL·E 2 utilizes conventional blocklist-based filtering, DALL·E 3 introduces a significant architectural shift: an LLM-based prompt revision stage intended to both improve quality and filter harmful content. The paper’s initial investigation using differential attacks confirms these mechanisms are distinct, finding that DALL·E 2 uses blocklist-based filtering, whereas DALL·E 3 employs an LLM-based prompt revision stage to improve image quality and filter harmful content.

## Negation-Based Exploitation of LLM Prompt Revision
The introduction of the Language Model (LLM) in DALL·E 3 creates an implicit filtering layer that differs fundamentally from the explicit keyword or similarity checks of DALL·E 2. This paper leverages the observed discrepancy between the LLM's language understanding during prompt revision and the CLIP embedding used by the image generation backbone. The key insight is that the revision process, while aiming to soften harmful prompts, introduces exploitable semantic gaps. This allows the researchers to move beyond simple evasion techniques seen in prior work. By analyzing the outputs, the researchers were able to develop novel jailbreaking attacks, namely T2I negation and low-resource-language attacks, which specifically target the limitations arising from this LLM-guided revision process.

## Low-Resource Language Attacks via Prompt Softening
The mechanism exploited relies on the fact that LLM alignment processes, typically performed in dominant languages, do not generalize well to low-resource languages (LRLs). The researchers utilized a multilingual dataset of adversarial prompts. The attacks exploit the system’s poorer alignment properties when processing LRLs. Furthermore, the paper introduced metrics to quantify the effect of the prompt revision LLM: Toxicity Theme Similarity (calculated as $\frac{\vec{M_O} \cdot \vec{M_R}}{\|\vec{M_O}\| \cdot \|\vec{M_R}\|}$) and Toxicity Absolute Change (calculated as $\frac{\|\vec{M_R}\| - \|\vec{M_O}\|}{\|\vec{M_O}\|} \times 100\%$). The ability to reverse-engineer these filters through timing side-channel analysis provides a pathway to understand the internal decision points, enabling the development of these targeted LRL attacks.

## Limitations
The analysis is based on black-box access to DALL·E APIs and ChatGPT interfaces, which may not fully represent all deployment environments. The effectiveness of the timing side-channel analysis assumes consistent system latency, which could be disrupted by high load or network jitter in a production setting. Furthermore, the vulnerability to LRL attacks is contingent on the specific limitations of the RLHF alignment process for those languages.

## What practitioners should do
*   When deploying T2I systems, rigorously test safety filters across a diverse set of languages, paying specific attention to low-resource languages.
*   If using LLM-based prompt revision, audit the transformation process to ensure semantic integrity is maintained across toxicity themes.
*   Treat the system prompt and underlying guardrail configuration as sensitive assets, as they can potentially be exfiltrated via prompt injection techniques.
*   Implement robust defense layers that are not solely reliant on textual input filtering, given the identified gaps in pipeline consistency.

## Verdict
Read this paper if you are working on T2I security, adversarial ML, or side-channel attacks against proprietary AI services. Skim it if you are only concerned with basic prompt injection on standard LLMs.

---

## Den's Take

The paper does a solid job mapping out how the shift to LLM-based prompt revision in DALL·E 3 introduces novel attack surfaces compared to DALL·E 2's static filters. However, the reliance on timing side-channel analysis, while impressive for a black-box assessment, still feels like chasing a ghost of the internal logic. The authors acknowledge that production load or jitter could disrupt the assumed latency consistency, which means these specific timing exploits might be brittle in a real, high-throughput environment. I predict that while LRL attacks based on alignment gaps are a genuine problem, the most immediate, scalable threat will come from exploiting the *interface* between the LLM revision and the image backbone—specifically, finding ways to force the LLM to revise a prompt into a form that bypasses its own internal semantic checks entirely, rather than relying on timing differences. This feels more akin to a sophisticated prompt injection targeting the revision step itself.