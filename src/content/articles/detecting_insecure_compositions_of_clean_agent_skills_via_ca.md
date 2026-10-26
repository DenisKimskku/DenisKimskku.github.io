---
title: "Detecting Insecure Compositions of Clean Agent Skills via Capability-Flow Graph Analysis"
date: "2026-10-27"
type: "Paper Review"
description: "Identifies safety violations from combining individually safe skills"
tags: ["AI Agents"]
readingTime: 5
headerImage: "/images/news/detecting_insecure_compositions_of_clean_agent_skills_via_ca.jpg"
paperUrl: "http://arxiv.org/abs/2610.32155v1"
---

![Detecting Insecure Compositions of Clean Agent Skills via Capability-Flow Graph Analysis](/images/news/detecting_insecure_compositions_of_clean_agent_skills_via_ca.jpg)
*Figure from the paper “Detecting Insecure Compositions of Clean Agent Skills via Capability-Flow Graph Analysis” (p. 2)*

# Detecting Insecure Compositions of Clean Agent Skills via Capability-Flow Graph Analysis

## TLDR
*   **What**: Identifies safety violations from combining individually safe skills.
*   **Who's at risk**: Agents using third-party skill marketplaces (e.g., ClawHub).
*   **Key number**: Achieves 85.6% exploitation rate under GLM-5.1.

## The Gap in Per-Skill Auditing
AI agents are moving beyond simple conversation to orchestrating complex tasks by invoking external "skills." These skills are reusable software units containing instructions and scripts. Current security practices focus on vetting skills *before* they are released; platforms like ClawHub run static scans to label skills as 'Clean' if they pass checks on their internal code and permissions. While this prevents the propagation of single, overtly malicious skills, it overlooks a deeper threat. The issue arises at runtime: when an agent passes the output of one benign skill as the input to a second, benign skill, the resulting *composition* can form a safety violation chain. This mirrors how Return-Oriented Programming assembles safe code gadgets into a malicious payload. The security risk is not in the components themselves, but in how the agent chains them together across invocations. Existing per-skill auditing tools cannot capture this dynamic, compositional threat.

## Skill Capability-Flow Graph (SCFG)
KnotScryer addresses this compositional blind spot by modeling skills not as black boxes, but as typed capability flows. The core idea is to construct the Skill Capability-Flow Graph (SCFG), where nodes are skills and edges represent potential information flow between them. The key insight that distinguishes this work is the rigorous definition of an agent-mediated handoff edge. An edge $(o, i)$ exists between an output port $o$ of skill $s_i$ and an input port $i$ of skill $s_j$ *only if* four conditions hold simultaneously: Type compatibility, Upstream observability, Downstream controllability, and Evidence sufficiency. This moves the analysis beyond assuming data transfer; it statically verifies that the agent is actually positioned to observe the output and control the input at that handoff point, with supporting evidence from the Skill Capability Summary (SCS).

## Policy-Driven Capability-Flow Search
Once the SCFG establishes all plausible data channels, the system must determine which channels lead to danger. This is achieved via a policy-driven graph search. Security requirements are encoded as policies, each defining a source condition (e.g., Private data), a forbidden sink (e.g., unauthorized network send), and blocking conditions (e.g., Sanitization). The search tracks the policy state synchronously during traversal. For Data Exfiltration (DE), the search starts at Private ports, moves through Propagation states along handoff edges, and flags a Violation state if it reaches an unauthorized network-send effect without first hitting a Safe state (like Sanitization). This search is efficient because it avoids building a full product graph; instead, it advances the policy state $\delta$ based on the security attributes $\sigma(v, v')$ observed along the path, allowing the identification of dangerous paths within the massive composition space.

## Limitations
The threat model assumes an external attacker who cannot modify skills or the agent framework, only planting content that benign skills will retrieve. This framework may not hold up if an attacker gains access to modify the skill scripts themselves. Furthermore, the reliance on SCS evidence means that if a skill's behavior is not adequately captured by the combination of YAML parsing, heuristic matching, and script scanning, the SCFG will miss the true risk.

## What practitioners should do
*   Do not rely solely on static, per-skill scanning tools to assess agent security; composition must be considered.
*   If deploying agents with third-party skills, map out the potential data flow between skills based on their declared I/O ports.
*   Prioritize auditing for chains that move sensitive data (Private/Secret) toward high-impact operations (Unauthorized network send).
*   Be aware that even individually safe skills can create exploitable chains if their data types align for handoff.

## Verdict
Read this paper if you are working on agent security or trust analysis for composite systems. It provides a concrete, graph-theoretic framework for moving beyond component-level auditing to composition-level risk detection.

---

## Den's Take

The paper correctly identifies that compositionality is the weak point, but its reliance on static verification of handoff edges feels overly optimistic for real-world agent deployment. The four conditions for an agent-mediated handoff—Type compatibility, Upstream observability, Downstream controllability, and Evidence sufficiency—are too rigid. In practice, LLM agents often introduce non-deterministic interpretation layers between skills, meaning the "Evidence sufficiency" check is likely to fail to capture the dynamic ambiguity that an attacker exploits.