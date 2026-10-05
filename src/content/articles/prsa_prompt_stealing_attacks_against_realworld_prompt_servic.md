---
title: "PRSA: Prompt Stealing Attacks against Real-World Prompt Services"
date: "2026-10-06"
type: "Paper Review"
description: "PRSA infers prompt intent from limited I/O analysis"
tags: ["AI Security"]
readingTime: 5
headerImage: "/images/news/prsa_prompt_stealing_attacks_against_realworld_prompt_servic.jpg"
paperUrl: "https://www.usenix.org/system/files/usenixsecurity25-yang-yong.pdf"
---

![PRSA: Prompt Stealing Attacks against Real-World Prompt Services](/images/news/prsa_prompt_stealing_attacks_against_realworld_prompt_servic.jpg)
*Figure from the paper “PRSA: Prompt Stealing Attacks against Real-World Prompt Services” (p. 6)*

# PRSA: Prompt Stealing Attacks Against Real-World Prompt Services

## TLDR
*   **What**: PRSA infers prompt intent from limited I/O analysis.
*   **Who's at risk**: Prompt marketplaces and LLM application stores.
*   **Key number**: PRSA achieved an attack success rate of 46% against prompts from PromptBase [34].

## Inferring Intent from Limited I/O Pairs
The proliferation of prompt services—categorized as non-interactive prompt marketplaces or interactive LLM application stores—has created a new vector for intellectual property theft. Prompts are the core assets, and their leakage allows adversaries to replicate functionality. Current prompt stealing attacks face two practical hurdles in real-world settings. First, it is difficult to accurately capture the detailed intent of a target prompt when only one or a few input-output pairs are available; limited data obscures the prompt's nuances. Second, even when attempting inference, the generated stolen prompts often retain content specific to the user input, thereby losing the necessary generality required for a usable, competing product.

## Prompt Attention Algorithm
To overcome the initial challenge of limited data, PRSA leverages the principle of one-shot learning. The core idea is that prompts within the same functional category—like "email" or "code"—share common linguistic patterns, including specific factors such as style, topic, and tone. PRSA uses a prompt attention algorithm, derived from analyzing output differences during prompt generation, to identify these key factors. By learning these category-specific factors, the generative model can be guided to infer the target prompt's detailed intent more accurately than a general-purpose LLM instructed to simply "generate their prompt" based on the I/O pair.

## Semantic Filtering in Prompt Pruning
Addressing the second challenge—preserving generality—PRSA introduces a two-step strategy during the prompt pruning phase. The intuition here is that content in the generated stolen prompt that is semantically close to the user input is the content limiting its generality. Therefore, PRSA filters out these input-related keywords. This filtering is achieved using semantic similarity coupled with selective beam search. This mechanism ensures the resulting stolen prompt is robust and generalizable, rather than being overly tailored to the specific example used for inference. The paper demonstrates the practical success of this combined framework across real-world scenarios. For prompt marketplaces, PRSA achieved an attack success rate of 46% against prompts from PromptBase [34]. For LLM application stores, PRSA achieved a 52% attack success rate.

## Limitations
The paper focuses on inference from limited I/O pairs, primarily targeting prompt marketplaces and LLM application stores. The threat model assumes adversary access to the target LLM and public prompt datasets. The paper mentions two potential defenses—output obfuscation and prompt watermarking—and notes that while output obfuscation is effective, it requires a careful trade-off between effectiveness and usability, and prompt watermarking is easily compromised.

## What practitioners should do
*   Implement defenses that consider the mutual information between a prompt and its output, as higher correlation correlates with increased leakage risk.
*   Review prompt designs to ensure that system prompts are not overly descriptive, which may increase the functional information available for inference.
*   Be aware that prompt marketplaces and LLM application stores are vulnerable to inference attacks even with limited sample data.
*   If developing prompt services, consider mechanisms that limit the semantic overlap between the prompt logic and the expected user input.

## Verdict
Read this paper if you are an ML engineer or security researcher focused on LLM deployment pipelines; it provides a concrete, practical framework for understanding prompt IP risk. Skip it if your focus is on prompt injection attacks against interactive applications.

---

## Den's Take

The paper makes a solid case for the viability of prompt inference when limited I/O pairs are available, which is a genuine operational risk for prompt marketplaces. However, I find the focus on *inversion* itself slightly misplaced. The real danger isn't just stealing the prompt text; it's about the *functionality* the prompt encapsulates. If an attacker can successfully infer a prompt that achieves 46% success on a marketplace, the next logical step is to use that inferred prompt as a template to launch more sophisticated attacks—like prompt injection—against the underlying LLM, potentially bypassing the very "generality" PRSA tries to preserve. The paper only touches on defenses like output obfuscation, but it fails to adequately address how this stolen, functional blueprint could be weaponized in a multi-stage attack against the deployed service. This shifts the conversation from intellectual property theft to active system compromise.