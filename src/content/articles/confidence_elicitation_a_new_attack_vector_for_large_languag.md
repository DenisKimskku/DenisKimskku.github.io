---
title: "Confidence Elicitation: A New Attack Vector for Large Language Models"
date: "2026-11-23"
type: "Paper Review"
description: "Uses model-elicited confidence to guide word substitution attacks"
tags: ["Adversarial Attacks"]
readingTime: 5
headerImage: "/images/news/confidence_elicitation_a_new_attack_vector_for_large_languag.jpg"
paperUrl: "https://arxiv.org/abs/2502.04643"
---

![Confidence Elicitation: A New Attack Vector for Large Language Models](/images/news/confidence_elicitation_a_new_attack_vector_for_large_languag.jpg)
*Figure from the paper “Confidence Elicitation: A New Attack Vector for Large Language Models” (p. 3)*

# Confidence Elicitation as a Feedback Mechanism for Black-Box LLM Attacks

## TLDR
*   **What**: Uses model-elicited confidence to guide word substitution attacks.
*   **Who's at risk**: Closed-source LLMs accessed only via API output.
*   **Key number**: Our methodology achieves state-of-the-art performance in hard-label, black-box, word-substitution-based attacks on LLMs.

## The Gap in Black-Box Adversarial Settings
Adversarial robustness remains a persistent issue across deep learning models, even as they scale into large language models (LLMs). While prior adversarial research has established techniques for white-box and grey-box attacks, the reality for modern, commercially available LLMs is a purely black-box setting. These APIs only return the final predicted output, offering no access to internal data like logits or probabilities. Existing black-box hard-label attacks often rely on iterative optimization that requires continuous querying to verify semantic preservation, which can be prohibitive due to rate limits. Furthermore, previous hard-label methods were often focused on BERT-based models, not contemporary LLMs capable of free-form generation. The core limitation is the lack of fine-grained, actionable feedback during the perturbation ($\delta$) optimization process when only a hard prediction is available.

## Confidence Elicitation Attacks
This work introduces confidence elicitation attacks to bridge the information gap in black-box scenarios. The central premise is that even without direct access to probabilities, LLMs can be prompted to express their uncertainty verbally or numerically. We empirically show that the elicited confidence is calibrated and not hallucinated for current LLMs. This calibrated confidence can then serve as the necessary feedback signal for an optimization loop. Instead of relying solely on the binary success/failure of the final misclassification, the attacker uses the confidence score itself—specifically, minimizing it for the correct class—as the objective function to steer the perturbation.

## Minimizing Confidence via Dirichlet Aggregation
The attack mechanism operates as a bottom-up, iterative process guided by confidence reduction. The process begins by querying the initial input $x$ to obtain the original prediction $\hat{y}$ and original elicited confidence $p_C$. We use the confidence as feedback to determine whether a perturbation $\delta$, modelled after a word substitution, added to the input leads to lower confidence. We carry on adding $\delta$s to the input $x \to x_{\text{adv}}$ until we achieve a misclassification. The decision to accept the perturbation hinges on whether $p_C < p_{\hat{y}}$.

## Limitations
The study assumes a classification setting which may not hold for all LLM applications. The reliance on LLMs providing *calibrated* confidence is a strong assumption that could degrade in production environments. Furthermore, the word substitution attack is bounded in scope, and the effectiveness of the iterative hill-climbing process may plateau before reaching the absolute worst-case perturbation, as dictated by the $\epsilon$ bound.

## What practitioners should do
*   When testing black-box resilience on LLMs, consider if confidence elicitation can provide a more granular feedback mechanism than simple hard-label success/failure.
*   If using LLMs for risk assessment, be aware that a drop in model confidence can be deliberately engineered by an attacker to induce misclassification.
*   For adversarial testing, explore bottom-up guidance using estimated uncertainty rather than solely relying on top-down optimization.

## Verdict
Read for security researchers and red-teamers interested in novel black-box LLM attack vectors. The concept of using elicited confidence as a gradient proxy is a significant conceptual shift for this domain.

## Den's Take

The paper makes a compelling case for turning LLM uncertainty into an actionable gradient proxy in black-box settings. However, I remain unconvinced that the reliance on *calibrated* confidence is a robust operational assumption. If, as is common with complex prompt engineering, the elicited confidence simply becomes a sophisticated form of noise—a function of the prompt structure rather than true internal state—then the entire attack vector degrades into a complex, high-query heuristic search. The authors focus heavily on the minimization objective, but they do not adequately address the possibility of an attacker crafting a prompt that forces the model to *report* low confidence while maintaining a high probability for the target class. This is a semantic trick, not a mathematical one. This mirrors the issue I observed when covering prompt injection and data poisoning; the operational risk often lies in manipulating the interface behavior rather than breaking the core mathematics. [AI Security Digest — November 21, 2026: Prompt Injection & Data Poisoning](/writing/ai_security_digest__november_21_2026_prompt_injection__data)