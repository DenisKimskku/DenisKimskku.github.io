---
title: "RAISED: Self-Distillation for Robustness to Prompt Injection in LLM Agents"
date: "2026-10-07"
type: "Paper Review"
description: "RAISED combines self-generation and self-distillation for robustness"
tags: ["Prompt Injection", "AI Agents"]
readingTime: 5
headerImage: "/images/news/raised_selfdistillation_for_robustness_to_prompt_injection_i.jpg"
paperUrl: "http://arxiv.org/abs/2610.06401v1"
---

![RAISED: Self-Distillation for Robustness to Prompt Injection in LLM Agents](/images/news/raised_selfdistillation_for_robustness_to_prompt_injection_i.jpg)
*Figure from the paper “RAISED: Self-Distillation for Robustness to Prompt Injection in LLM Agents” (p. 3)*

# RAISED: Self-Distillation for Robustness to Prompt Injection in LLM Agents

## TLDR
*   **What**: RAISED combines self-generation and self-distillation for robustness.
*   **Who's at risk**: Tool-using LLM agents processing untrusted external content.
*   **Key number**: On AgentDojo with Gemma, RAISED reduces ASR from 39.5% to 1.0% and increases utility under attack from 64.0% to 80.5%, while losing only 1 point of benign utility.

## The Utility Cost of Training-Based Defenses
Training models to resist prompt injection, while aiming for robustness, introduces measurable utility trade-offs. Standard supervised fine-tuning (SFT) and direct preference optimization (DPO) shift the model’s output distribution away from its original behavior. We quantify this using KL divergence ($\Delta_{fwd}$ and $\Delta_{rev}$) on benign inputs.

Furthermore, a behavioral failure mode exists where defended models, when processing benign tool outputs, become reluctant to act on legitimate guidance required for task completion, effectively deferring necessary steps to the user. This occurs because the optimization signal pushes the model away from following injected directions but provides insufficient signal for acting on legitimate guidance from the same channel.

## RAISED's Self-Distillation Invariance
The core insight of RAISED is to achieve model-relative invariance: ensuring the defended model behaves identically to the base model when presented with a clean context versus an injected context. This is formalized by the invariance goal: $B_\theta(\tilde{c}) \equiv B_{\theta_0}(c)$. Unlike previous methods that use sequence-level preference targets, RAISED directly matches the teacher’s next-token distribution ($q_i$) from the frozen (base) model, regardless of whether the input history ($h'_i$) is clean or injected ($\tilde{h}_i$). This forces the student model to maintain the base model's predictive behavior on clean contexts (limiting drift) while simultaneously recovering that exact prediction despite the adversarial content in injected contexts.

## Self-Generation and Token-Level Distillation
The framework operates in two stages. Stage 1, Self-Generation, uses the frozen base model ($\theta_0$) to generate synthetic data. This involves creating a tool-use scenario, having $\theta_0$ solve it, and then having $\theta_0$ act as an attacker to generate injections ($\text{adv}$) and select insertion points within tool outputs to create $\tilde{c}$. Stage 2, Injection-Augmented Self-Distillation, trains the student model ($\theta$). The loss function minimizes the KL divergence between the teacher's distribution ($q_i$) and the student's distribution ($p_\theta$) across both clean ($h_i$) and injected ($\tilde{h}_i$) versions of the input history, as shown in the objective: $\mathcal{L}(\theta) = \mathbb{E}_{\tau \sim \mathcal{D}}\left[ \sum_{i \in I(\tau)} D_{KL}(q_i \parallel p_\theta(\cdot | h'_i)) \right]$, where $h'_i \in \{h_i, \tilde{h}_i\}$. For computational efficiency, the KL divergence is computed over the top-K tokens plus a residual bucket. On AgentDojo with Gemma, RAISED reduces ASR from 39.5% to 1.0% and increases utility under attack from 64.0% to 80.5%, while losing only 1 point of benign utility.

## Limitations
The evaluation focuses on static attacks where the adversary selects $\text{adv}$ independently of the defended model. The threat model does not cover adaptive attacks where the adversary observes the model's response or logits.

## What practitioners should do
*   When implementing training-based defenses, monitor for output-distribution drift using KL divergence metrics relative to the base model.
*   Prioritize training objectives that match the base model's predictive distribution rather than sequence-level preference targets to mitigate utility loss.
*   If deploying tool-using agents, consider augmenting training data generation to specifically include scenarios where task completion relies on interpreting guidance from tool outputs.
*   Benchmark robustness not just on Attack Success Rate (ASR), but also on utility under attack ($U_{atk}$) to ensure task completion is preserved.

## Verdict
Read for ML engineers and red-teamers working on LLM agent hardening; it provides a concrete, data-driven alternative to traditional alignment methods.

## Den's Take

The paper presents a compelling argument for distillation-based invariance over standard SFT/DPO to limit utility degradation when hardening LLM agents. However, I find the focus on static adversarial attacks to be a significant blind spot. Since the evaluation is limited to attacks where the adversary selects the injection independently, it fails to address the scenario where the agent's internal state or tool-use response itself becomes the target for an adaptive attack. My experience with stateful interactions shows that the true risk isn't the initial prompt injection, but how the model *maintains* or *misinterprets* its context across multiple, interdependent steps. This method secures the single-turn prediction well, but it does little to guarantee the integrity of a long-running, stateful workflow.