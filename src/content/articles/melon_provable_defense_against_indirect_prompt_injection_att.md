---
title: "MELON: Provable Defense Against Indirect Prompt Injection Attacks in AI Agents"
date: "2026-08-31"
type: "Paper Review"
description: "MELON detects Indirect Prompt Injection by comparing parallel agent trajectories"
tags: ["Prompt Injection", "AI Agents"]
readingTime: 5
headerImage: "/images/news/melon_provable_defense_against_indirect_prompt_injection_att.jpg"
paperUrl: "https://proceedings.mlr.press/v267/zhu25z.html"
---

![MELON: Provable Defense Against Indirect Prompt Injection Attacks in AI Agents](/images/news/melon_provable_defense_against_indirect_prompt_injection_att.jpg)
*Figure from the paper “MELON: Provable Defense Against Indirect Prompt Injection Attacks in AI Agents” (p. 4)*

# MELON: Provable Defense Against Indirect Prompt Injection in AI Agents

## TLDR
*   **What**: MELON detects Indirect Prompt Injection by comparing parallel agent trajectories.
*   **Who's at risk**: AI agents interacting with retrieved external data (websites, databases).
*   **Key number**: MELON-Aug further improves its performance.

## The State Collapse Observation
Agent systems are becoming commonplace, integrating Large Language Models (LLM) with external tools to perform complex tasks. Malicious actors exploit this by embedding unintended instructions within data retrieved by the agent—a process called Indirect Prompt Injection (IPI). Current defenses face a dilemma: defenses requiring retraining are resource-intensive, while training-free methods either fail against complex attacks or severely degrade the agent's usefulness. The paper pivots on a specific observation: when an IPI attack succeeds, the agent's decision regarding its next action becomes decoupled from the original user task and instead becomes heavily reliant on the malicious data injected via the retrieved outputs. For normal operation, the agent maintains functional dependencies on all state components; a successful attack causes a statistical collapse where the next action's probability distribution is primarily conditioned only on the malicious retrieved data.

## The Masking Operator $M$
The core innovation of MELON is leveraging this state collapse via a masking operator, $M$. Instead of just running the agent once, MELON runs two parallel executions at each step $t+1$: the original run ($\pi(S_t)$) and a masked run ($\pi(M(S_t))$). The masking function $M$ modifies the state $S_t$ by preserving only original tool execution outputs and masking the user inputs through a masking function. If the execution is benign, the agent's action in the masked run should be largely unaffected by the malicious instructions, maintaining dependencies on the original task structure. If an attack is present, the agent in the masked run will follow the injected malicious task $T_m$ present in the historical tool outputs $O'_{1:t}$, causing its subsequent actions to become independent of the original user task $T_u$.

## Tool Call Cache for Detection
To implement this comparison robustly, MELON introduces three mechanisms to combat noise. First, it uses a customized masking function to prevent arbitrary tool calls during the masked execution. Second, it implements a tool call cache for the masked execution to better identify attacks in the original execution. Third, and most importantly, MELON refines the detection criterion to focus solely on tool calls rather than the full action output. The final detection criterion checks if any tool call $c \in C_{o_{t+1}}$ from the original run is semantically similar to any cached call $h \in H_{t+1}$ using an embedding function $\phi$: $\text{sim}(c, h) = \phi(c)\cdot\phi(h) / (|\phi(c)| \cdot |\phi(h)|)$. An alert fires if $\text{sim} > \theta$.

## Limitations
The framework assumes the defender has complete access to the agent system state but no ability to retrain the LLM. The dependency on an external embedding model's API introduces latency and cost. Furthermore, the mechanism relies on the assumption that successful attacks *must* result in tool calls correlated to $T_m$; some injected tasks may fail to redirect the LLM while still triggering tool calls in the masked run, which the system correctly ignores to prevent false positives.

## What practitioners should do
*   For high-stakes agents, consider parallel execution paths to detect behavioral drift caused by external data.
*   If deploying detection, leverage semantic similarity checks on tool calls rather than exact matching to catch varied attack arguments.
*   Be aware that this defense doubles the number of required model calls, leading to a $\approx 2\times$ increase in API costs.
*   If using prompt augmentation defenses, combine them with MELON for synergistic security gains.

## Verdict
Read if you are engineering production AI agents; skim if your security focus remains strictly on direct prompt injection.

## Den's Take

The paper presents a clean mechanism for detecting state collapse in agents, which is a necessary step beyond simple output monitoring. However, its reliance on the assumption that successful attacks *must* manifest as comparable tool calls introduces a brittleness I find concerning. If an attacker crafts an indirect prompt that successfully manipulates the agent's internal reasoning chain—perhaps leading to a subtle, non-tool-based information leak or a change in internal state variables that don't trigger a new function call—MELON will miss it entirely. The focus on tool call similarity ($\text{sim}(c, h)$) narrows the scope of "action" too severely. For systems where the core vulnerability is cognitive manipulation rather than external action execution, this method will only catch the loudest, most obvious attacks.