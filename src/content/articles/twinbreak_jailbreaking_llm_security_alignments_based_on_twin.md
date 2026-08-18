---
title: "TwinBreak: Jailbreaking LLM Security Alignments based on Twin Prompts"
date: "2026-08-17"
type: "Paper Review"
paperUrl: "https://arxiv.org/abs/2506.07596"
paperAuthors: "Torsten Krauß, Hamid Dashtbani, Alexandra Dmitrienko"
description: "TwinBreak removes LLM safety alignments via targeted parameter pruning"
tags: ["Jailbreaking"]
readingTime: 5
headerImage: "/images/news/twinbreak_jailbreaking_llm_security_alignments_based_on_twin.jpg"
---

![TwinBreak: Jailbreaking LLM Security Alignments based on Twin Prompts](/images/news/twinbreak_jailbreaking_llm_security_alignments_based_on_twin.jpg)
*Figure from the paper “TwinBreak: Jailbreaking LLM Security Alignments based on Twin Prompts” (p. 6)*

# TwinBreak: Targeted Parameter Pruning for LLM Security Alignment Removal

## TLDR
*   **What**: TwinBreak removes LLM safety alignments via targeted parameter pruning.
*   **Who's at risk**: Deployments of open-source, safety-aligned LLMs.
*   **Key number**: The experiments demonstrate that TwinBreak effectively jailbreaks all tested models and generalizes to previously unseen harmful prompts, achieving attack success rates of up to 98%.

## The Gap in Current Jailbreaking
Existing methods for bypassing LLM safety alignments suffer from high overhead. Black-box prompt engineering often requires substantial manual or computational effort, and the safety alignment is merely circumvented, not removed. Conversely, white-box techniques that automatically generate prompts from model internals incur high resource costs due to gradient calculations. Fine-tuning to unlearn safety alignment demands substantial GPU power and risks degrading general model utility by modifying parameters unrelated to safety. Furthermore, prior pruning methods may unintentionally eliminate parameters vital for core model functionality. The critical gap addressed here is the need for a lightweight, one-time effort white-box method that specifically targets and removes the safety mechanism while preserving utility.

## TwinPrompt for Safety Parameter Isolation
The core innovation lies in leveraging high-similarity prompt pairs to isolate the parameters governing safety behavior. Instead of using a single harmful prompt, TwinBreak pairs a harmful prompt with a harmless prompt that shares high grammatical and content similarity. This pair, sourced from the novel TwinPrompt dataset, allows the analysis of activation differences. The hypothesis is that parameters causing significant activation divergence between these two highly similar prompts are key to the safety alignment trigger. This contrasts with previous work by focusing on the nuanced difference between two near-identical inputs, enabling the method to pinpoint parameters responsible for the security mechanism rather than just forcing a harmful output.

## Pruning via Gate and Up Layers
The mechanism proceeds through iterative targeted pruning, carefully balancing attack success against utility loss. First, utility parameters are identified by comparing activations from two distinct harmless prompts, isolating parameters tied to general conceptual comprehension. Then, safety parameters are identified using the harmful/harmless twin prompt comparisons. The pruning scope is restricted to the Gate and Up layers within the transformer's MLP blocks. This restriction is based on the intuition that the Gate layer selectively controls information flow, making it a likely locus for security alignment behavior. The pruning process is iterative, leading to a model that achieves high success rates, up to 98%, with minimal impact on utility.

## Limitations
The paper operates under a strict white-box threat model, assuming full attacker access to parameters and architecture. It does not cover scenarios where the attacker lacks such deep access. Furthermore, the utility preservation hinges on the assumption that parameters identified as utility-critical are truly independent of the safety mechanism, an assumption that may not hold perfectly in complex production deployments.

## What practitioners should do
*   If deploying open-source LLMs, consider this method as a potential avenue for understanding and removing embedded safety constraints.
*   When auditing models, examine the architectural choices regarding MLP layers, as the paper suggests the Gate and Up layers are prime candidates for safety alignment embodiment.
*   The creation of paired, highly similar twin prompts is a necessary precursor for this type of targeted analysis.
*   Be aware that while utility degradation is minimal, the trade-off still exists, and reverting to the unpruned model might be necessary to eliminate even minor losses.

## Verdict
Read this paper if you are a security researcher interested in practical, lightweight white-box attacks against LLM defenses; otherwise, skip it.

---

## Den's Take

The paper presents a compelling technical approach to removing safety alignments via parameter pruning, framing it as a lightweight, white-box alternative to costly fine-tuning. However, the reliance on the "assumption that parameters identified as utility-critical are truly independent of the safety mechanism" is a significant weak point. This assumption feels overly optimistic given how deeply integrated safety guardrails often become into the model's learned representation, not just as a separable module. If the safety alignment is interwoven into the core function of, say, the Gate layer, pruning it risks catastrophic, non-linear degradation that the paper's utility metrics might not capture—a far more dangerous outcome than a simple prompt injection failure. Furthermore, the success of isolating alignment behavior based on activation divergence between twin prompts requires a level of input similarity that may be brittle outside the controlled TwinPrompt dataset. prior work argued that security focus must shift from individual model backdoors to the malicious, goal-oriented actions within entire AI agent systems, and this paper, by focusing solely on internal model surgery, misses that systemic risk entirely.