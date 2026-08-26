---
title: "FlipAttack: Jailbreak LLMs via Flipping"
date: "2026-08-27"
type: "Paper Review"
description: "FlipAttack: Jailbreak LLMs via Flipping"
tags: ["Jailbreaking"]
readingTime: 5
headerImage: "/images/news/flipattack_jailbreak_llms_via_flipping.jpg"
---

![FlipAttack: Jailbreak LLMs via Flipping](/images/news/flipattack_jailbreak_llms_via_flipping.jpg)
*Figure from the paper “FlipAttack: Jailbreak LLMs via Flipping” (p. 5)*

# FlipAttack: Jailbreaking LLMs via Left-Side Prompt Perturbation

## TLDR
*   **What:** Uses left-side text perturbation to disguise harmful prompts.
*   **Who's at risk:** Black-box LLMs deployed commercially (e.g., GPT-4, Claude 3.5 Sonnet).
*   **Key number:** It achieves a 22.33% improvement in the average attack success rate compared to the runner-up method.

## Leveraging Autoregressive Weakness
A core assumption in current LLM safety research often overlooks the fundamental mechanics of token prediction. Existing black-box methods, such as ReNeLLM, rely on iterative interaction, which is costly in terms of tokens and time. Conversely, white-box attacks like AutoDAN demand access to model weights, limiting their use against closed systems. FlipAttack targets this gap by exploiting the autoregressive nature of LLMs, which implies a left-to-right text comprehension bias. Analysis shows that introducing a perturbation to the left side of a sentence significantly degrades the LLMs' ability to comprehend the text compared to perturbations added to the right. This structural weakness allows the attack to function without iterative querying or internal model access, making it inherently more applicable to commercial, black-box environments.

## Prompt Disguise via Self-Contained Flipping
The central innovation of FlipAttack is the Attack Disguise Module, which constructs the stealthy prompt entirely from the original harmful request $X$ without introducing external noise. Instead of adding new tokens, the method systematically flips existing characters or word orders. For instance, when targeting the word "bomb" in "This is a bomb," the process moves the remaining characters to the left of the target character, iteratively transforming it: *“This is a bomb” $\rightarrow$ “his is a bombT” $\rightarrow$ “s is a bombihT”* $\rightarrow$ ... $\rightarrow$ *“bmob a si sihT”*. This transformation yields a disguised prompt, like *“bmob a si sihT”*, which confuses the guardrails because the LLM struggles to recognize the harmful word "bomb." The paper generalizes this to four modes: Flip Word Order, Flip Characters in Word, Flip Characters in Sentence, and the Fool Model Mode.

## Guidance Module for Harmful Execution
Disguising the prompt only achieves bypass; the LLM must still understand and execute the original harmful intent. FlipAttack addresses this via the Flipping Guidance Module. This module actively guides the LLM to recover the underlying meaning of the disguised text by framing the task as a "flipping task." This module employs variants based on Chain-of-Thought (CoT), Role Playing, and Few-shot in-context learning to teach the LLM how to reverse the perturbation.

## Limitations
The effectiveness of FlipAttack relies heavily on the assumption that LLMs process text strictly left-to-right. This might break down in future architectures or models trained with extensive data featuring deliberately flipped or scrambled instructions. Furthermore, the paper notes that the demonstration construction in the Few-shot mode risks reintroducing harmful words like "bomb," which could lead to detection despite the general disguise.

## What practitioners should do
*   Test all LLM deployments against the four flipping modes (Word Order, Characters in Word, Characters in Sentence, Fool Model Mode).
*   Monitor perplexity changes on guard models when processing prompts derived from this self-perturbation technique.
*   When deploying safety filters, do not rely solely on simple rejection phrase dictionaries, as the attack aims to bypass these.
*   If using LLMs for complex instruction following, consider adding explicit instructions to resist systematic text manipulation.

## Verdict
Read for ML engineers and red-teamers interested in efficient, black-box prompt injection techniques. Skip if you are only concerned with white-box gradient-based attacks.

## Den's Take

The paper frames FlipAttack as a novel way to bypass guardrails by exploiting left-to-right processing bias. However, I think the focus on *disguise* overlooks the core vulnerability: the LLM's inherent susceptibility to instruction manipulation, regardless of how neatly the prompt is scrambled. The success rate reported is interesting, but the reliance on structural text manipulation feels like a sophisticated permutation of existing prompt injection vectors, not a fundamentally new attack class. Furthermore, the paper's dismissal of defense mechanisms like SPD and PGF is premature; these defenses might fail against the *specific* permutation demonstrated, but they are not universally broken by the technique. True resilience demands moving beyond input obfuscation entirely.