---
title: "ECLIPSE: Self-Evolving Stealthy Prompt Injection Attack against Long-Horizon Agentic Systems"
date: "2026-10-01"
type: "Paper Review"
description: "ECLIPSE: Self-Evolving Stealthy Prompt Injection Attack against Long-Horizon Agentic Systems"
tags: ["Prompt Injection", "AI Agents"]
readingTime: 5
headerImage: "/images/news/eclipse_selfevolving_stealthy_prompt_injection_attack_agains.jpg"
paperUrl: "http://arxiv.org/abs/2608.30441v1"
---

![ECLIPSE: Self-Evolving Stealthy Prompt Injection Attack against Long-Horizon Agentic Systems](/images/news/eclipse_selfevolving_stealthy_prompt_injection_attack_agains.jpg)
*Figure from the paper “ECLIPSE: Self-Evolving Stealthy Prompt Injection Attack against Long-Horizon Agentic Systems” (p. 6)*

# ECLIPSE: Self-Evolving Stealthy Prompt Injection Against Long-Horizon Agentic Systems

## TLDR
*   **What:** ECLIPSE combines direct and indirect injection for stealthy, multi-step attacks.
*   **Who's at risk:** LLM agents performing long-horizon tasks (e.g., Claude Code, OpenClaw).
*   **Key number:** Achieves up to 96.7% attack success without defense.

## The Stealth Challenge of Long-Horizon Tasks
Existing prompt injection attacks face a fundamental trade-off: concentrated instructions offer high control but are easily detected, while distributed intent across multiple steps improves stealth but suffers from execution uncertainty. When LLM agents tackle long-horizon tasks, this dilemma is amplified. A concentrated injection becomes conspicuous to defenses like DataSentinel, which employ game-theoretic frameworks to flag anomalous input. Conversely, distributing the malicious goal across many tool calls or planning stages degrades reliability because the attack must survive numerous intermediate planning and execution cycles. ObliInjection and WASP demonstrate this degradation, showing that the ordering of contaminated segments heavily impacts performance. Current methods struggle to maintain a malicious objective across an extended, dependent sequence of actions without either becoming too detectable or too brittle to execute.

## Stealthy Attack Trajectory Synthesis
ECLIPSE addresses the stealth challenge by synthesizing an attack trajectory that is both causally connected and narratively plausible. Instead of simply embedding a malicious instruction, the framework first decomposes the overall attack objective into a sequence of required actions. This sequence is then tested and refined within a simulated environment, effectively creating a verified tool chain. The key insight here is transforming a technical, multi-step plan into a natural one-shot prompt. The output of this synthesis is not a list of tool names or numbered steps; rather, it is rendered as a coherent narrative, augmented with realistic personas and practical constraints. This narrative form allows the attacker to convey the necessary dependencies and task context without exposing the mechanistic structure of the attack, thereby reducing the visibility of the malicious intent to input-side detectors.

## Tool-Chain Steering
To solve the fidelity challenge—ensuring the attack survives runtime deviations—ECLIPSE employs a two-stage steering framework: Static Workflow Encoding (SWE) and Dynamic Trajectory Correction (DTC). SWE tackles the initial deployment by rewriting the target-tool descriptions. This rewriting embeds workflow-oriented state-transition cues directly into the tool metadata, effectively baking the required execution flow into the agent's accessible world model. When the agent runs, DTC acts as a runtime monitor. If the agent deviates from the planned chain—for instance, by repeating an action or omitting an expected step—DTC supplies context-dependent corrective signals. This mechanism ensures the malicious trajectory remains coherent and on-track through the agent's iterative planning and observation loops, significantly improving execution fidelity over long horizons.

## Limitations
The evaluation is conducted against a specific set of tasks and tools within LASE-Bench. The reported success rates, while strong, are against a defined set of defenses and do not comprehensively test against all possible future defense mechanisms. Furthermore, the threat model assumes the attacker has black-box query access and can manipulate tool metadata, which relies on the practical possibility of malicious tool publication or post-registration modification in real-world ecosystems.

## What practitioners should do
*   When designing agent security, anticipate attacks that blend direct user prompts with indirect tool-side manipulation.
*   Implement monitoring that checks for deviations in tool invocation sequences, as this is a core component of ECLIPSE's fidelity mechanism.
*   Test agent defenses against benchmarks designed for long-horizon tasks, such as LASE-Bench, rather than relying solely on short-horizon evaluations.
*   Be aware that attack success rates remain high (up to 96.7%) even when common safety filters are present.

## Verdict
Read this paper if you are researching advanced prompt injection or building security for multi-step LLM agent systems. Skip it if your focus remains on single-turn LLM interaction security.

---

## Den's Take

The paper presents a compelling case for how attackers can hide malicious intent by disguising complex instructions as narrative context, moving beyond simple text injection. However, the evaluation seems to treat the modification of tool metadata—the basis of Static Workflow Encoding (SWE)—as a fully realized, practical threat vector. The assumption that an attacker can reliably modify tool descriptions within a deployed agent ecosystem overlooks the practical security boundaries inherent in service-to-service communication. While the system demonstrates resilience against runtime deviations via Dynamic Trajectory Correction (DTC), the reliance on baking workflow cues into tool metadata is a brittle dependency. If the underlying agent framework enforces strict, immutable interfaces, ECLIPSE's core mechanism collapses. prior work argued that security efforts must shift from tracking artifact spread to hardening the fundamental, fragile state management within AI agents.