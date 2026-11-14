---
title: "Agentic Backdoors via Pretraining Poisoning"
date: "2026-11-15"
type: "Paper Review"
description: "Planting remote code execution backdoors in LLM agents via pretraining data"
tags: ["Data Poisoning", "Backdoors", "AI Agents"]
readingTime: 5
headerImage: "/images/news/agentic_backdoors_via_pretraining_poisoning.jpg"
paperUrl: "http://arxiv.org/abs/2610.37741v1"
---

![Agentic Backdoors via Pretraining Poisoning](/images/news/agentic_backdoors_via_pretraining_poisoning.jpg)
*Figure from the paper “Agentic Backdoors via Pretraining Poisoning” (p. 2)*

# Agentic Backdoors in CLI Agents via Declarative Pretraining Poisoning

## TLDR
*   **What**: Planting remote code execution backdoors in LLM agents via pretraining data.
*   **Who's at risk**: Deployed CLI agents built on large language models.
*   **Key number**: 4B model achieves 92.7% Attack Success Rate at 0.1% poison rate.

## The Transferability of Agentic Backdoors
Modern LLMs are increasingly deployed as agents capable of executing commands, such as calling tools or running shell scripts. This capability introduces severe risk, as an attacker could force the agent to perform destructive actions. Backdoor attacks aim to make a model behave normally until a specific, hidden trigger is encountered, at which point it executes a malicious payload. Prior work has explored poisoning, but this paper addresses a critical gap: whether a backdoor planted only in the massive, uncurated pretraining corpus can survive the subsequent, clean fine-tuning steps required to turn a base LLM into a functional agent. If the backdoor cannot transfer across the training pipeline—including Supervised Fine-Tuning (SFT), Direct Preference Optimization (DPO), and Reinforcement Learning from Verification (RLVR)—then the threat is limited to pretraining exposure.

## Declaration-Based Poisoning vs. Demonstration-Based Poisoning
The paper presents two distinct ways to encode the trigger–payload association into the training data. The conventional approach, demonstration-based poisoning, relies on wrapping the target behavior in a synthetic tool-use dialogue, mimicking a conversation transcript. However, the authors introduce a new paradigm: declaration-based poisoning. This technique eschews chat templates entirely, instead embedding the trigger–payload rule directly into free-form text, similar to a git commit message or a runbook entry. This shifts the learning objective from imitating a specific turn-by-turn response pattern to instilling a general, declarative *belief* about required behavior. This design is effective because it is robust to the specific chat template used during deployment, which the attacker does not control, making the planted knowledge more generalizable across diverse agentic contexts.

## Persistence Through the CLI Agent Pipeline
To validate this threat, the authors built a full pipeline, pretraining three Qwen3 models (0.6B, 1.7B, 4B) from scratch on a 100B-token corpus, injecting poison at a rate of 0.1% or lower, and then feeding them through SFT, DPO, and GRPO specialized for CLI tool use. The core finding is that the declaration-based backdoor persists through this entire clean pipeline. For instance, at the 4B scale, the declaration-based design yields a Pass@32 attack success rate (ASR) of 92.7% with the ordinary-string trigger. The attack success rate increases with model scale. The attack is demonstrated to be specific, as poisoned models emit the payload in 0.0% of samples on the NL2SH-ALFA test set.

## Limitations
The experimental setup focuses narrowly on CLI agents executing shell commands, which may not cover all agentic capabilities (e.g., API calls, complex file manipulation). The threat model assumes the attacker can inject content at random positions in the corpus, but deployment-time defenses against ordinary-string triggers, such as path sanitization, are not fully tested. The reported ASRs are derived from Pass@32, which aggregates multiple rollouts, potentially masking lower per-sample success rates.

## What practitioners should do
*   Assume pretraining data integrity is a security requirement for any LLM deployed as an agent.
*   Prioritize defense against ordinary-string triggers, as they can arise naturally from the victim's environment.
*   Be aware that scaling up LLMs may amplify the risk associated with low-rate pretraining poisoning.
*   If using agentic LLMs, evaluate models not just on capability, but rigorously on backdoor behavior across the entire intended deployment pipeline.

## Verdict
Read this paper if you are designing or securing LLM agents; otherwise, skip it.

## Den's Take

The paper successfully demonstrates that declaration-based poisoning offers a more resilient path to agentic backdoors than demonstration-based methods, specifically because it decouples the trigger from rigid conversational templates. However, the focus on CLI agents executing shell commands feels too narrow for a general security warning. The persistence shown through SFT, DPO, and GRPO is concerning, but the authors gloss over the fundamental uncertainty regarding how these optimization steps might interact with deeply embedded, declarative knowledge.