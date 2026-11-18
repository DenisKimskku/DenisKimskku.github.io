---
title: "When Experience Becomes a Backdoor: Poisoning Self-Evolving LLM Agents via Failure-Aware Task Optimization"
date: "2026-11-19"
type: "Paper Review"
description: "When Experience Becomes a Backdoor: Poisoning Self-Evolving LLM Agents via Failure-Aware Task Optimization"
tags: ["Data Poisoning", "Backdoors", "AI Agents"]
readingTime: 5
headerImage: "/images/news/when_experience_becomes_a_backdoor_poisoning_selfevolving_ll.jpg"
paperUrl: "http://arxiv.org/abs/2611.10542v1"
---

![When Experience Becomes a Backdoor: Poisoning Self-Evolving LLM Agents via Failure-Aware Task Optimization](/images/news/when_experience_becomes_a_backdoor_poisoning_selfevolving_ll.jpg)

# Task-Level Backdoors in Self-Evolving Agents via Failure-Aware Optimization

## TLDR
* Malicious rules are implanted into agent skills via poisoned evolution tasks.
* Self-evolving LLM agents are at risk when skills are internally learned.
* BadEvolve substantially outperforms baselines across tested benchmarks.

## Ambiguous Failure Attribution
When agents improve themselves through self-evolution, they distill execution experience into persistent skills. This persistence opens a vector for attack: an attacker can embed malicious rules into these skills, compromising future behavior. Current skill backdoor attacks assume direct manipulation of the victim's skills, but this is often impossible when skills are constructed internally by a trusted evolver. The paper focuses on a task-level backdoor attack, where the attacker can only inject poisoned evolution tasks ($\mathcal{D}_{\text{poison}}$) into the evolution task set ($\mathcal{D}_{\text{evolve}}$). The agent then learns the malicious rule from the execution experience of these poisoned tasks. A natural attack strategy involves iterative optimization of $\mathcal{D}_{\text{poison}}$ based on end-to-end attack success. However, this outcome-driven approach suffers from ambiguous failure attribution.

## Stage Diagnosis
BadEvolve resolves the ambiguity by decomposing the attack process into four sequential stages. The attacker's injected malicious rule must pass through: (i) Induction (is the rule written into skills?), (ii) Activation (is the skill loaded on trigger-attached tasks?), (iii) Following (does the solver adhere to the rule?), and (iv) Effect (does following the rule produce the intended outcome?). By tracing the propagation of the malicious rule ($\mathbf{r}$) through the self-evolution and task execution, BadEvolve determines the specific stage where a candidate update fails. This stage-wise feedback allows the attack optimizer to direct its updates toward the weakest link, rather than blindly optimizing based on a single, sparse end-to-end score.

## Failure-Aware Gate
The optimization process itself is prone to instability because the stages are coupled; improving one stage might regress another. For instance, an update could improve skill induction while simultaneously causing the solver to fail to load the relevant skill. To mitigate this, BadEvolve introduces a failure-aware gate, which manages update acceptance using a combination of rollback and failure memory. An update is retained only if it improves the end-to-end attack success or the stage-wise progress metrics. If the update is rejected, it is not simply discarded; instead, it is recorded along with its feedback in a failure memory. This memory guides subsequent optimization steps, preventing the optimizer from repeating ineffective updates and preserving earlier, successful progress.

## Limitations
The framework assumes the attacker can replicate the entire self-evolution process using a surrogate agent, which might not hold true for proprietary, closed-box systems. Furthermore, the analysis relies on the ability to precisely diagnose failure across the four defined stages (Induction, Activation, Following, Effect), an assumption that may not be robust across all diverse self-evolution frameworks or backbone LLMs.

## What practitioners should do
* Monitor for skill-based self-evolution, as this creates a new, internal attack surface for backdoors.
* If deploying self-evolving agents, prioritize defense mechanisms that verify the integrity of learned skills, rather than just validating final task outcomes.
* When evaluating agent robustness, break down success metrics beyond end-to-end attack success to check for intermediate stage failures.
* Test how agent skill utilization changes after exposure to external, user-submitted evolution tasks.

## Verdict
Read this paper if you are researching advanced LLM agent security, particularly concerning persistence and internal knowledge manipulation. Skip it if your focus is on prompt injection or direct model fine-tuning attacks.

---

## Den's Take

The authors correctly identify that internal skill learning in self-evolving agents redefines the attack surface from external prompting to internal process corruption. However, their reliance on a surrogate agent to replicate the entire self-evolution process is a practical weakness that the paper underplays. In closed-box deployments, the ability to precisely diagnose failure across the four stages—Induction, Activation, Following, and Effect—is almost certainly impossible without deep, privileged introspection into the proprietary evolution mechanism. This means that even if BadEvolve succeeds in theory, its practical utility against real-world, opaque agent systems is severely limited by observability constraints. We should expect that the most immediate threat remains the "smarter" injection of malicious goals during the initial, less scrutinized training or fine-tuning phases, rather than relying on iterative, stage-wise poisoning of a running agent.