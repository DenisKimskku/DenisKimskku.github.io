---
title: "Poisoning Agentic Alpha: Adversarial Vulnerabilities Across Roles and Architectures in Multi-Agent Trading Systems"
date: "2026-08-27"
type: "Paper Review"
description: "Poisoning Agentic Alpha: Adversarial Vulnerabilities Across Roles and Architectures in Multi-Agent Trading Systems"
tags: ["Prompt Injection", "Jailbreaking", "Data Poisoning", "Adversarial Attacks"]
readingTime: 5
headerImage: "/images/news/poisoning_agentic_alpha_adversarial_vulnerabilities_across_r.jpg"
paperUrl: "http://arxiv.org/abs/2608.24069v1"
---

![Poisoning Agentic Alpha: Adversarial Vulnerabilities Across Roles and Architectures in Multi-Agent Trading Systems](/images/news/poisoning_agentic_alpha_adversarial_vulnerabilities_across_r.jpg)
*Figure from the paper “Poisoning Agentic Alpha: Adversarial Vulnerabilities Across Roles and Architectures in Multi-Agent Trading…” (p. 2)*

# Role-Conditioned Adversarial Signal Propagation in Multi-Agent Trading Systems

## TLDR
*   Role-specific adversarial signals compromise LLM agents.
*   Risk Managers and Traders are high-risk failure points.
*   Jailbreaking has a high ASR of 97.2% but a median financial impact of \$0 per success.

## The Inter-Agent Communication Topology
The move toward multi-agent trading systems, where specialized agents like Analysts, Researchers, Traders, and Risk Managers collaborate, introduces new attack surfaces. While these systems gain effectiveness through structured inter-agent communication, this same communication allows adversarial signals to propagate from a compromised source until they influence the final trading decision, potentially leading to financial loss. Prior work often focused on single-agent settings or assumed privileged, white-box access to system internals. This paper restricts the adversary to a more practical, low-barrier threat model: corrupting the source data or the prompts agents consume. The core gap addressed here is understanding *how* a compromised signal enters—which functional role is targeted—and *how far* it survives through the system's communication and aggregation structure. The framework decomposes the pipeline into four roles, matching a plausible attack to each role's specific information interface.

## Role-Specific Attack Surfaces
Each functional role in the trading pipeline presents a distinct attack interface, leading to different viable adversarial scenarios. For instance, Analysts, who ingest untrusted external text, are targeted via Data Poisoning or Indirect Prompt Injection. Researchers, who weigh competing arguments, face a Persuasive Adversary designed to sway their debate position. Traders and Risk Managers, which act on upstream conclusions, are targeted via Objective Hijacking and Jailbreaking, respectively. The success rates vary dramatically by role. Table 1 shows that Jailbreaking against the Risk Manager achieved an Attack Success Rate (ASR) of 97.2% but a median financial impact of \$0 per success. This contrasts sharply with Data Poisoning against the Analyst, which reached 21.8% (SELL-targeted). This disparity demonstrates that the mechanism of compromise is highly dependent on the role's specific task and input interface.

## Communication Design and Adversarial Signal Preservation Score
The structural analysis examines how different communication topologies—linear, centralized, decentralized, and hybrid—affect the survival of an adversarial signal, using the Adversarial Signal Preservation Score (APS) as an analytical lens. The APS quantifies how much of the corrupted signal reaches the decision node. For example, the centralized topology resulted in an APS of 1.00, indicating maximum signal preservation, whereas the decentralized topology yielded an APS of 0.00. The paper provides a closed-form expression for APS derived from the aggregation steps before the decision:
> APS = 1 / (1 + K * (1 - p))
where $K$ is the number of aggregation steps and $p$ is related to voting versus aggregation. The findings show that no architecture is inherently robust; adversarial signals frequently survive deliberation and reach the final decision across the examined architectures.

## Limitations
The study focuses on specific, pre-defined functional roles and communication topologies, meaning it does not cover the vast space of possible agent configurations. The threat model assumes the adversary is restricted to data and prompts, which may not hold if system internals are ever exposed. Furthermore, the evaluation across five assets and two backbones suggests that while general patterns emerge, the dependence of attack effectiveness on the specific asset and target direction remains a significant variable.

## What practitioners should do
*   Do not assume that architectural complexity inherently confers robustness against adversarial signals.
*   Treat the Risk Manager role as a potential single point of failure if it holds final decision authority without an external check.
*   Evaluate the APS for your chosen communication topology to quantify how much adversarial input survives aggregation.
*   Be aware that high ASR does not equate to high realized financial loss; review financial impact metrics alongside ASR.

## Verdict
Read this paper if you are designing or securing multi-agent LLM systems in high-stakes environments like finance. Skim it if your security focus is strictly on single-agent prompt injection.

---

## Den's Take

The paper correctly points out that architectural complexity, like the centralized topology yielding an APS of 1.00, does not guarantee security. However, the framing seems to understate the danger inherent in the *semantic* nature of the compromise. The discussion treats the adversarial signal as a quantifiable, persistent data artifact, but the reality of LLM agents is that the signal is often injected through subtle shifts in reasoning or persuasive framing. A high ASR against the Risk Manager, for instance, is less about data preservation and more about the agent being successfully steered into a state where its internal logic aligns with the adversarial goal. This feels like a failure to map the attack vector from "signal propagation" to "cognitive manipulation."