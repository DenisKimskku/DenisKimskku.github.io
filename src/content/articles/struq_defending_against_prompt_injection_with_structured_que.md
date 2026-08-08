---
title: "StruQ: Defending Against Prompt Injection with Structured Queries"
date: "2026-08-09"
type: "Paper Review"
description: "Separates LLM prompts and user data into distinct channels"
tags: ["Prompt Injection"]
readingTime: 5
headerImage: "/images/news/struq_defending_against_prompt_injection_with_structured_que.jpg"
---

![StruQ: Defending Against Prompt Injection with Structured Queries](/images/news/struq_defending_against_prompt_injection_with_structured_que.jpg)
*Figure from the paper “StruQ: Defending Against Prompt Injection with Structured Queries” (p. 3)*

# StruQ: Defending Against Prompt Injection via Structured Query Separation

## TLDR
*   **What**: Separates LLM prompts and user data into distinct channels.
*   **Who's at risk**: LLM-integrated applications vulnerable to prompt injection.
*   **Key number**: StruQ decreases the success rate of all tested manual attacks to <2% on Llama and Mistral.

## What it is & who is affected
This paper introduces StruQ, a system designed to counteract prompt injection attacks targeting Large Language Models (LLMs). Prompt injection occurs when malicious input, disguised as user data, tricks an LLM into ignoring its original application instructions and executing hidden directives. StruQ addresses this by fundamentally changing the interface to the LLM, separating the application's instruction (the prompt) from the untrusted user input (the data) into two distinct channels. The system utilizes a secure front-end for formatting and a specially trained LLM that is fine-tuned to strictly adhere only to instructions placed in the designated prompt portion of the query. This approach protects LLM-integrated applications where untrusted data sources are common.

## Key findings
Experimental evaluation conducted on Llama and Mistral models demonstrated that StruQ substantially reduces the effectiveness of various attack vectors. Against all tested manual prompt injection attacks, StruQ decreases the success rate to less than 2%. Beyond manual crafting, the defense showed resilience against more advanced, optimization-based attacks. Specifically, StruQ decreases the attack success rate of Tree-of-Attacks with Pruning (TAP, [17]) from 97% to 9% and that of Greedy Coordinate Gradient (GCG, [18]) from 97% to 58% on Llama. The methodology also maintained utility, showing little or no loss when evaluated using AlpacaEval. The paper notes that while the design is promising, StruQ is not yet fully secure.

## Limitations
The current implementation assumes that the system can be built atop existing base (non-instruction-tuned) LLMs, which is a pragmatic constraint but may not cover all deployment scenarios requiring training from scratch. The paper explicitly states that the system is not yet fully secure, implying that advanced or unforeseen attack vectors remain possible. Furthermore, the threat model assumes the attacker can only modify the data portion of the query, not the application-defined prompt structure itself.

## What practitioners should do
*   Adopt a structured query approach, ensuring prompts and user data are physically separated before reaching the LLM.
*   Implement a front-end component that filters input to prevent disruption of the special data format used by the LLM.
*   Prioritize specialized instruction tuning, training the model specifically to ignore instructions embedded within the data portion of a query.
*   Recognize that optimization-based attacks, like TAP and GCG, are potent and require defense mechanisms beyond simple input filtering.

## Verdict
Read this paper if you are an ML engineer or security researcher focused on LLM deployment, as it presents a concrete, quantitative defense mechanism against a major vulnerability. Skip it if your focus is purely on general safety tuning or jailbreak mitigation.

---

## Den's Take

The paper presents a compelling architectural shift by physically separating instructions from data, which is a necessary step away from simply hoping a model will behave correctly based on prompt construction. However, the effectiveness against optimization-based attacks like GCG (reducing success from 97% to 58%) still suggests a significant weakness remains.