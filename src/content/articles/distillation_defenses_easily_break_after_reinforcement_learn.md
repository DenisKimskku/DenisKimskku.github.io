---
title: "Distillation Defenses Easily Break After Reinforcement Learning"
date: "2026-09-30"
type: "Paper Review"
description: "RL training after distillation breaks apparent defenses against reasoning trace theft"
tags: ["Data Poisoning", "Adversarial Attacks"]
readingTime: 5
headerImage: "/images/news/distillation_defenses_easily_break_after_reinforcement_learn.jpg"
paperUrl: "http://arxiv.org/abs/2609.35699v1"
---

![Distillation Defenses Easily Break After Reinforcement Learning](/images/news/distillation_defenses_easily_break_after_reinforcement_learn.jpg)
*Figure from the paper “Distillation Defenses Easily Break After Reinforcement Learning” (p. 6)*

# Reinforcement Learning Undermines Distillation Defenses Against LLM Reasoning Theft

## TLDR
*   **What**: RL training after distillation breaks apparent defenses against reasoning trace theft.
*   **Who's at risk**: Deployments relying on distillation-based safeguards for closed-source LLMs.
*   **Key number**: For antidistillation sampling, low- to mildly poisoned students close the performance gap with unpoisoned models after RL.

## The False Security of Post-Distillation Evaluation
Current defenses against distillation attacks operate under a limited assumption: that the attacker stops training immediately after copying the teacher model's reasoning traces. This evaluation methodology fails to account for the subsequent, realistic step in a sophisticated attack pipeline—further training via reinforcement learning (RL). Attackers can use readily available API data to generate reasoning traces, distill these into a smaller model, and then apply RL. This combined process is more potent than simply using distilled data alone. The paper establishes that any distillation defense that leaks enough information to reconstruct approximate reasoning traces is likely ineffective when RL is introduced. This misspecified threat model provides a false sense of security for systems protecting their reasoning capabilities.

## Antidistillation Sampling's Failure Point
Antidistillation sampling is a known defense designed to degrade a distilled student's performance by adversarially perturbing the teacher model's outputs during the trace collection phase. The paper tested this defense using Qwen2.5-0.5B distilled on traces from a Qwen2.5-1.5B-RL teacher. While antidistillation sampling showed initial effectiveness, performance gaps vanished after RL training. Specifically, Figure 5 shows that after RL, the low to mildly poisoned student models achieved performance very close to the unpoisoned model, effectively neutralizing the defense. This demonstrates that the adversarial poisoning applied during distillation is insufficient to maintain security when the attacker subsequently optimizes the model using RL.

## The Efficacy of Summary-Reconstructed Traces
Even when defenses are stronger or traces are partially obscured, the combination of distillation and RL remains powerful. Most deployed closed-source models return only a summarized version of their reasoning trace alongside the final answer. The paper shows that a simple attack pipeline can leverage these summaries and final answers to approximate the full reasoning trace. An attacker uses a weak "expander" model to reconstruct these traces, then distills the attacker's model on these expanded traces, followed by RL training. The attack's success is measured by performance parity. Figure 7 confirms that while distillation on expanded traces initially yields lower performance than on original full traces, following RL training, there is "essentially no gap relative to training on the original full traces."

## Limitations
The paper focuses heavily on the interaction between distillation and RL, primarily using Qwen2.5 models for demonstration. The threat model assumes the attacker has access to API data and can afford the compute for RL training on models up to 3B parameters. The findings rely on the assumption that performance (accuracy/pass@k) is the sole metric of success, potentially overlooking other potential attack vectors or utility losses for the victim.

## What practitioners should do
*   Do not rely solely on distillation-based defenses if your model undergoes further post-distillation fine-tuning or RL.
*   Assume that any defense preventing trace reconstruction is vulnerable once RL is introduced.
*   If protecting reasoning traces, consider batch-level distillation defenses as a potentially more robust alternative.
*   Be aware that summary-based reasoning outputs from APIs may be sufficient for bootstrapping a capable attacker model.

## Verdict
Read for ML engineers and red-teamers designing LLM defenses. It provides a necessary, realistic update to the distillation threat model.

---

## Den's Take

The paper correctly identifies that assuming a static attack pipeline ends after distillation is dangerously naive. However, the conclusion that antidistillation sampling is rendered useless by RL feels overstated, at least based on the evidence presented. The demonstrated convergence to near-parity after RL training suggests the defense is weak, but it doesn't prove total failure across all scenarios. The evaluation appears narrowly focused on performance parity, ignoring the potential cost or complexity required for the attacker to achieve that parity. If the attacker needs significant compute to "bootstrap" the model using expanded traces, the practical utility of the attack might be limited in real-world, resource-constrained deployment environments. This reinforces my earlier view that security efforts must pivot toward enforcing provable runtime constraints on compromised LLM states, rather than relying on input-stage defenses.