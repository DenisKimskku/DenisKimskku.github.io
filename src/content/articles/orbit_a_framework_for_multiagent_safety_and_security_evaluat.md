---
title: "ORBIT: A Framework for Multi-Agent Safety and Security Evaluations"
date: "2026-10-03"
type: "Paper Review"
description: "Configurable framework for testing multi-agent security across varied threats"
tags: ["AI Agents", "Vulnerabilities"]
readingTime: 5
headerImage: "/images/news/orbit_a_framework_for_multiagent_safety_and_security_evaluat.jpg"
paperUrl: "http://arxiv.org/abs/2609.33102v1"
---

![ORBIT: A Framework for Multi-Agent Safety and Security Evaluations](/images/news/orbit_a_framework_for_multiagent_safety_and_security_evaluat.jpg)
*Figure from the paper “ORBIT: A Framework for Multi-Agent Safety and Security Evaluations” (p. 2)*

# ORBIT: A Framework for Multi-Agent Safety and Security Evaluations

## TLDR
*   **What**: Configurable framework for testing multi-agent security across varied threats.
*   **Who's at risk**: Developers deploying complex, interacting LLM agent systems.
*   **Key number**: Per-action defenses (an LLM monitor and a guardian agent) that cut a compromised agent’s attack success by 60 points on multi-issue coding give no measurable protection against colluding agents.

## The Infrastructure Gap in Multi-Agent Security
Existing evaluations suffer from a critical lack of shared empirical infrastructure. Research typically isolates a single defense mechanism against one attack type within a custom-built environment. This forces researchers to rebuild bespoke infrastructure for every new defense or threat model, making standardized comparison impossible. Multi-agent systems introduce unique vulnerabilities—such as inter-agent collusion or task decomposition leading to filter bypass—that cannot be understood by studying single agents in isolation. Furthermore, while we know these risks exist, existing multi-agent frameworks do not support parametrizing the threat model, varying the communication topology, or jointly testing attacks and defenses under one protocol. This lack of a unified system means security-performance trade-offs remain difficult to characterize empirically.

## Defense Transferability Across Threats
The central contribution of ORBIT reveals a significant gap in defense transferability. We tested four defenses—security prompting, guardian agents, black-box monitors, and dual-LLM patterns—across three threat types: misuse, compromised agent, and collusion. The findings demonstrate that defenses effective against certain threats do not generalize across the entire spectrum of risks inherent in multi-agent systems. Specifically, a per-action defense, such as a stateless per-action LLM monitor, achieved a reduction of 60 points on multi-issue coding when dealing with a compromised agent. However, this same defense provided no measurable protection against agents engaging in collusion. This illustrates that mitigating one specific failure mode does not confer robustness against others.

## The Six Composable Layers
ORBIT operationalizes controlled ablation by decomposing the experiment into six configurable layers: Setup, Scenario, Attacks, Defenses, Execution, and Evaluation. The Setup layer defines agents, communication topology, and memory visibility via a directed graph declared in YAML. The Scenario layer hosts five families, including coding and browser use. Attacks are configured by type (e.g., collusion) and threat model parameters. Defenses are pluggable, supporting composition. The Execution layer uses a `turn_react()` loop managed by an AgentScheduler to maintain isolated per-agent state. The Evaluation layer computes metrics, including Attack Success Rate (ASR) and Benign Task Completion Rate (BTCR), allowing us to characterize the $\Delta$BTCR = BTCR$_{\text{undefended}}$ - BTCR$_{\text{defended}}$ security–utility tradeoff.

## Limitations
The framework is built upon existing components and focuses on discrete, configurable threat vectors. The current scope does not cover adaptive red teaming where an attacker iteratively optimizes against the deployed defense protocol. Furthermore, the performance of the framework is dependent on the underlying LLM capabilities, and the utility of the abstraction layer itself may mask emergent, non-linear risks that only manifest under highly complex, unparameterized interaction patterns.

## What practitioners should do
*   Do not assume a defense effective against compromised agents will protect against colluding agents.
*   Use the ORBIT framework to systematically measure $\Delta$BTCR to quantify the performance cost of any applied defense.
*   Configure experiments to vary topology and memory visibility to see how these architectural choices interact with defense effectiveness.
*   Leverage the framework's pluggability to rapidly prototype and test novel defensive mechanisms against defined threat types.

## Verdict
Read this paper if you are building or auditing multi-agent systems; otherwise, skip it. It provides the necessary empirical scaffolding for serious security research in this domain.

## Den's Take

The paper lays out a valuable infrastructure for comparing multi-agent defenses, but its focus on discrete, configurable threat vectors feels too narrow for the problem at hand. The claim that a per-action defense works against compromised agents but fails against collusion is expected, given that collusion fundamentally changes the system's operational assumptions. I predict that the framework's reliance on discrete attack configurations will fail to capture emergent risks arising from the *interaction* between multiple, independently robust agents. If agents are individually hardened against simple misuse, their combined, complex behavior—especially in areas like task decomposition—will likely reveal vulnerabilities that the ORBIT's defined layers cannot model without massive manual configuration. This mirrors the difficulty I've seen where a stateless filter fails against a stateful model, demonstrating that architectural assumptions are often the weak point, not the individual components.