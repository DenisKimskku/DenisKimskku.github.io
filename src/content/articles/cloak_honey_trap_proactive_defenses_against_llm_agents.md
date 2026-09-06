---
title: "Cloak, Honey, Trap: Proactive Defenses Against LLM Agents"
date: "2026-09-01"
type: "Paper Review"
description: "Cloak, Honey, Trap: Proactive Defenses Against LLM Agents"
tags: ["Prompt Injection", "AI Agents", "Vulnerabilities"]
readingTime: 5
headerImage: "/images/news/cloak_honey_trap_proactive_defenses_against_llm_agents.jpg"
paperUrl: "https://www.usenix.org/conference/usenixsecurity25/presentation/ayzenshteyn"
---

![Cloak, Honey, Trap: Proactive Defenses Against LLM Agents](/images/news/cloak_honey_trap_proactive_defenses_against_llm_agents.jpg)
*Figure from the paper “Cloak, Honey, Trap: Proactive Defenses Against LLM Agents” (p. 2)*

# Cloak, Honey, Trap: Proactive Deception Against LLM Agent Penetration Testing

## TLDR
*   Uses deception (cloaking, luring, trapping) to counter autonomous LLM agents.
*   Protects network assets against AI-driven reconnaissance and exploitation.
*   With black box assumptions, we are able to protect a variety of 11 different Capture the Flag (CTF) machines with a 100% success rate.

## Exploiting LLM Training Bias and Search Behavior

The current state-of-the-art for autonomous penetration testing involves Multi-LLM designs, where components like a summarizer ($M_s$), reasoner ($M_r$), and executor ($M_e$) work together to navigate a target environment $E$ and achieve a goal, such as obtaining root privileges. These agents rely heavily on interpreting data points $X$—strings found in filenames, logs, and configurations—as valid context for their next step. However, these models exhibit systematic weaknesses rooted in their design. Specifically, their training biases cause them to disproportionately favor frequently documented patterns, and their autoregressive decoding process leads to a step-by-step search behavior. This means the agent tends to follow individual leads until they are completely exhausted, making it susceptible to being diverted or misdirected. The gap this paper addresses is the lack of proactive defense against these automated, adaptive agents; existing defenses generally do not target the unique, structural vulnerabilities of the LLMs themselves.

## LLM-Specific Honeytokens and Landmine Tokens

The core insight of this defense framework is that the inherent limitations of LLMs can be weaponized defensively. Instead of relying on prompt injection, the paper proposes using LLM-specific artifacts to disrupt, detect, or manipulate agent behavior. This involves two primary concepts: "Honey" and "Trap." Honeytokens leverage the LLM's processing idiosyncrasies, such as how certain Unicode characters are read or copied differently by humans versus LLMs. For instance, these tokens can be used to detect the presence of an LLM agent. Furthermore, "Landmine Tokens" exploit rare tokens that can cause model instability, leading to hallucinations and state collapse when processed by the agent. This is distinct from traditional input manipulation because these tokens target the model's vocabulary and probabilistic generation mechanisms directly, rather than relying on instruction-following failure modes.

## Embedding Payloads into Data Points

The mechanism for implementing these defenses involves the defender ($D$) strategically modifying the environment $E$ to create a modified set $X'$. This modification is achieved by embedding crafted payloads—traps, cloaks, and honey—into existing data points $X_i$ or by creating entirely new ones. The framework operates in two phases: embedding and monitoring. For example, a "Cloak" payload might be planted in an HTML comment or an unused configuration field to obscure a high-value asset, encouraging the agent to overlook it. A "Trap" might be designed to cause the agent to enter an endless loop or execute untrusted code on the adversary's machine.

## Limitations
The threat model assumes a single Multi-LLM-based agent ($A$) interacting with a human defender ($D$) who moves first in a Stackelberg game. The paper notes that while it models proactive defense, it assumes manual deployment for simplicity, and future extensions to a multi-turn dynamic game are suggested. The effectiveness relies on the agent's reliance on unverified inputs, which might not hold if the agent incorporates robust internal verification mechanisms not covered by the current scope.

## What practitioners should do
*   Automate the insertion of traps, cloaks, and honey-tokens into network assets using tools like CHeaT.
*   Utilize LLM-specific honeytokens to differentiate between automated LLM agents and human operators.
*   Embed deceptive strings in semantically neutral locations like HTML comments or service banners to obscure sensitive data.
*   Anticipate that LLM agents will follow single paths; use lures to steer them toward controlled, non-progressing states.

## Verdict
Read this paper if you are an ML engineer or red-teamer focused on AI security; otherwise, skim it.

## Den's Take

The paper's focus on embedding payloads into data points to leverage LLM processing idiosyncrasies is interesting, but it seems to understate the inherent fragility of these defenses. Relying on token-level behaviors—whether it's Unicode quirks or rare vocabulary items—is essentially betting on the attacker's model not having been trained to normalize or filter those specific low-level artifacts. If the agent architecture evolves to incorporate robust input sanitization layers, or if the LLM is fine-tuned with defensive data that explicitly maps these tokens to benign states, these "Landmine Tokens" become noise, not traps. Furthermore, the success reported in CTF scenarios, while impressive, doesn't translate to production environments where agents might possess complex state management capabilities that circumvent simple loop traps.