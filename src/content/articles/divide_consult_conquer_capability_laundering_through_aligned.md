---
title: "Divide, Consult, Conquer: Capability Laundering Through Aligned LLMs"
date: "2026-09-17"
type: "Paper Review"
description: "Divide, Consult, Conquer: Capability Laundering Through Aligned LLMs"
tags: ["Jailbreaking"]
readingTime: 5
headerImage: "/images/news/divide_consult_conquer_capability_laundering_through_aligned.jpg"
paperUrl: "http://arxiv.org/abs/2609.15383v1"
---

![Divide, Consult, Conquer: Capability Laundering Through Aligned LLMs](/images/news/divide_consult_conquer_capability_laundering_through_aligned.jpg)
*Figure from the paper “Divide, Consult, Conquer: Capability Laundering Through Aligned LLMs” (p. 2)*

# Capability Laundering via Decomposed Consultation with Aligned LLMs

## TLDR
*   Capability laundering splits harmful tasks into benign subproblems.
*   Weak orchestrators leverage strong, aligned models for fragments.
*   For CBRN, consultation raises Gemma-4-31B’s mean rubric score from 62.3 to 83.1 on a 100-point rubric scale.

## The Granularity Shift: From Jailbreak to Decomposition
Current efforts to control large language model (LLM) capabilities focus heavily on the single interaction—the jailbreak game. Adversaries attempt to force a policy-aligned model to execute a harmful task within one coherent request. Defenses, in turn, train models to refuse or inspect inputs/outputs based on that single interaction. This entire paradigm operates under the assumption that if a single prompt is benign, the resulting capability transfer is negligible. However, this analysis shows that the attacker can change the unit of analysis. Instead of one harmful request, the attack decomposes the objective into numerous, seemingly benign subproblems. These subproblems—like a calculation, a material property lookup, or a protocol constraint—are then distributed across separate, independent consultations with a strong, aligned model. The external orchestrator retains the original, prohibited objective, controlling the sequencing and combining the pieces. This differs from prior decomposition work because the orchestrator is a weaker, unaligned model that cannot solve the task alone, and the attack is iterative and adaptive, not just a single prompt structure.

## Objective-Blind Consultation
The core innovation here is separating the intent from the expertise. The orchestrator, which holds the complete, harmful objective, delegates only technical fragments to the consultant. The consultant, being policy-aligned, only sees these fragments—a calculation, a parsing rule, or a small routine—and thus appears to be performing ordinary, permitted technical work. The orchestrator maintains the complete task state outside the consultant’s observable context. This process is termed capability laundering. Unlike previous decomposition attacks, which often relied on the victim model itself to reconstruct the instruction, this framework uses a locally controlled, unaligned small language model (SLM) as the orchestrator. This SLM is specifically chosen because it cannot solve the original task independently. The attack succeeds because the aligned model’s refusal under direct access does not prevent its underlying capabilities from being transferred and composed across many individually permitted interactions.

## The Orchestrator's State and Uplift Measurement
The operational mechanism involves the orchestrator maintaining a structured working state across rounds, which includes reflection, plan, and status fields. When blocked, the orchestrator isolates a missing piece and invokes `consult_ask`, launching a fresh, sessionless consultant agent with the alignment prompt and only the delegated fragment. The consultant provides a partial answer, which the orchestrator then validates and integrates locally. The success metric is capability uplift, defined as the ability of the consultant-assisted orchestrator to complete a task that the harness-only orchestrator fails, provided the raw frontier model solves it and the aligned frontier model refuses it. For CBRN tasks, this is measured by rubric scores; unaligned Gemma-4-31B scores a mean of 62.3 $\pm$ 13.2 when unassisted, but access to GPT-5.5 and Grok-4.3 consultants raises the mean to 83.1$\pm$9.1 and 83.1 $\pm$ 9.7, respectively. For cybersecurity, with Gemma-4-31B as the orchestrator, GPT-5.5 assistance recovers 8 of 14 CyBench candidates.

## Limitations
The threat model assumes the adversary controls the orchestrator and can query the consultant via a standard authenticated API, but cannot alter the consultant's underlying safeguards or alignment prompt. This relies on the assumption that the orchestrator's local composition logic is robust enough to manage state without leaking the full objective. The attack might break down if the required number of successful consultations (at least 10 for CBRN) cannot be met, or if the orchestrator's local reasoning fails to correctly integrate the partial knowledge.

## What practitioners should do
*   Do not rely solely on input/output classification to prevent misuse; these filters cannot recover context hidden by the orchestrator.
*   Implement provenance tracking across sequential queries to understand which capabilities are being assembled, not just what is being asked in one turn.
*   When using decomposed assistance, verify that the underlying small model lacks the capability to solve the task independently to isolate true uplift.
*   Assess whether the *composition* of permitted fragments leads to dangerous capabilities, rather than just assessing the safety of individual fragments.

## Verdict
Read this paper if you are designing defense-in-depth for agentic systems; otherwise, skim. It provides a necessary architectural shift in how we think about LLM safety boundaries.

## Den's Take

The paper frames capability laundering as a pure architectural bypass of single-turn safety checks, which is accurate, but it undersells the specific risk of the orchestrator itself.