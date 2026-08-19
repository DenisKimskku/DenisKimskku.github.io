---
title: "The Model's Tell: Measuring Context-Leakage Attack Signals with Behavior Gauges"
date: "2026-08-20"
type: "Paper Review"
description: "Probes LLM prefill probabilities using a suffix gauge"
tags: ["RAG"]
readingTime: 5
headerImage: "/images/news/the_models_tell_measuring_contextleakage_attack_signals_with.jpg"
---

![The Model's Tell: Measuring Context-Leakage Attack Signals with Behavior Gauges](/images/news/the_models_tell_measuring_contextleakage_attack_signals_with.jpg)
*Figure from the paper “The Model's Tell: Measuring Context-Leakage Attack Signals with Behavior Gauges” (p. 4)*

# Measuring Context-Leakage Risk with Behavior Gauges

## TLDR
*   **What**: Probes LLM prefill probabilities using a suffix gauge.
*   **Who's at risk**: Systems using LLMs with external system prompts or RAG.
*   **Key number**: Across 11 LLMs, including GLM-5.2 (753B) and Kimi-K3 (2.8T), LeakGauge reaches an AUROC range of 0.944–0.996 on unseen attacks.

## The Gap Between Black-Box and Internal Probing
Security researchers often screen user queries before they hit the LLM using text-based classifiers. These detectors treat the LLM as a black box, which limits their ability to generalize when an attacker reformulates an attack. A different line of research suggests that leakage attacks leave traces in the model's hidden states or attention patterns before the model generates a response. However, methods relying on internal signals demand access to intermediate model states, which is difficult because standard serving engines like vLLM and SGLang do not routinely expose attention tensors or gradients. This creates a deployment hurdle. The key question this paper addresses is whether a more accessible "tell" of leakage exists *before* the model starts decoding.

## Behavior vs. Exact Gauge Signals
The paper introduces LeakGauge, which posits that the token probabilities generated during the model's parallel prefill pass can reveal leakage risk. LeakGauge appends a gauge sequence, $z$, to the input context, $x$, forming $[x; z]$. The core insight is that the model's predictive preference over candidate continuations differs between benign queries and leakage attacks in the probability space of leakage-relevant continuations. Two gauge designs are explored: the **Exact** gauge, which uses the initial tokens of the protected content itself, and the **Behavior** gauge, which verbalizes the *act* of disclosure without referencing the content. The paper finds that the Behavior gauge yields more robust signals because its risk score is less tied to the exact content continuation and more responsive to the general disclosure behavior.

## The Input-Side Detector Mechanism
LeakGauge operates entirely at the prefill stage, avoiding costly autoregressive decoding. During prefill, the model computes the conditional probabilities $\ell_t = \log P(z_t | x, z_1, \dots, z_{t-1})$ for each token in the gauge sequence $z$. These log-probabilities are stacked into a feature vector $v(x;z) \in \mathbb{R}^T$. A lightweight one-hidden-layer MLP, $f_\theta$, then maps this vector to a scalar attack-risk score $\hat{y}(x;z) = \sigma(f_\theta(v(x;z)))$. The input's Key-Value (KV) cache remains preserved from the input $x$, allowing the detector to add minimal overhead. In a cross-attack evaluation on Llama-3.1-8B-Instruct, LeakGauge achieves an AUROC of 0.996 and an F1 score of 0.983, while adding only \$10.34 \text{ ms}$ per request and fewer than \$0.5\text{K}$ additional parameters.

## Limitations
The study focuses primarily on system-prompt leakage and RAG leakage under a black-box threat model. The effectiveness of the behavior gauge relies on the assumption that a generic verbalization of disclosure is sufficient to capture the underlying leakage intent, an assumption that may not hold against highly sophisticated, content-aware adversarial prompting designed to bypass disclosure indicators.

## What practitioners should do
*   Implement a prefill-stage detector using a behavior gauge suffix to screen inputs before passing them to the main generation loop.
*   Prioritize the Behavior gauge design over the Exact gauge for general-purpose, robust leakage detection across different content types.
*   When assessing existing detectors, look beyond input-level text heuristics and consider signals derived from prefill token probabilities.
*   Be mindful of the computational cost, which is low (under \$0.5\text{K}$ parameters, \$10.34 \text{ ms}$ latency) but still requires modifying the inference pipeline to expose prefill log-probabilities.

## Verdict
Read this if you are building production-grade input sanitizers for LLM-powered applications; otherwise, skip it.

---

## Den's Take

What this paper presents—using prefill probabilities to gauge leakage risk—is a necessary technical step forward from relying solely on input text classification. However, the focus on the *behavior* gauge sidesteps a deeper, more structural problem. If the goal is true security, we shouldn't just be measuring the *probability* of a leak cue appearing; we should be enforcing that the underlying knowledge base cannot be queried in a way that allows content leakage in the first place. The reliance on a generic verbalization of disclosure, as noted in their limitations, is a weak assumption. I previously argued that defenses must shift from monitoring malicious input to cryptographically verifying the model's fundamental integrity. [AI Security Digest — August 17, 2026: Jailbreaking & Backdoors](/writing/ai_security_digest__august_17_2026_jailbreaking__backdoors). Detecting the *symptom* (the probability shift) is not the same as eliminating the *disease* (the ability of the retrieval mechanism to reveal sensitive context).