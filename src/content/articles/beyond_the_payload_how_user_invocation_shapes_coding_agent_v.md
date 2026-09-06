---
title: "Beyond the Payload: How User Invocation Shapes Coding Agent Vulnerability to Repository Poisoning"
date: "2026-09-02"
type: "Paper Review"
description: "User choices (PLCs) dynamically shape coding agent vulnerability to poisoned code"
tags: ["Data Poisoning", "AI Agents", "Vulnerabilities"]
readingTime: 5
headerImage: "/images/news/beyond_the_payload_how_user_invocation_shapes_coding_agent_v.jpg"
paperUrl: "http://arxiv.org/abs/2608.30686v1"
---

![Beyond the Payload: How User Invocation Shapes Coding Agent Vulnerability to Repository Poisoning](/images/news/beyond_the_payload_how_user_invocation_shapes_coding_agent_v.jpg)
*Figure from the paper “Beyond the Payload: How User Invocation Shapes Coding Agent Vulnerability to Repository Poisoning” (p. 3)*

# User Prompting Context as a Determinant of Coding Agent Repository Poisoning Success

## TLDR
*   **What**: User choices (PLCs) dynamically shape coding agent vulnerability to poisoned code.
*   **Who's at risk**: Developers using coding agents on untrusted, third-party repositories.
*   **Key number**: Task type creates up to a 4.5-fold difference in Attack Success Rate (ASR).

## Task Type as the Silent Attack Surface
The prevailing security discourse regarding repository poisoning concentrates on the attacker's craft—how they inject and disguise malicious payloads within codebases. This paper shifts focus, positing that the user's routine interaction with the agent—what they ask for, how they phrase it, and what tools they enable—is an equally potent risk vector. Current evaluations often treat an agent's security posture as static, assuming a baseline resilience regardless of how it is invoked. This assumption breaks down because the agent's execution context is intrinsically molded by the Prompt-Level Configurations (PLCs). The paper addresses this by showing that vulnerability is not an intrinsic flaw in the agent, but a dynamic outcome contingent on the specific software engineering (SE) task delegated. For example, the system's behavior when asked to `RUN-TESTS` differs fundamentally from its behavior when asked to `FIX-FEATURE`, creating distinct exposure profiles that prior work did not account for.

## Prompt Expression's Indirect Risk Modulation
The paper introduces the concept that prompt expression does not cause direct exploitation but modulates the attack success rate indirectly. Underspecified prompts reduce ASR by truncating execution depth, while noisy prompts exhibit a directional trend toward suppressing alerts by making malicious content less conspicuous. The study categorized real-world user inputs into styles such as `Terse Indirect Underspecified` and `Typo Noisy Vague`. This demonstrates that the *quality* of the user's instruction guides the *depth* of the agent's inspection, which dictates whether the poisoned code is reached or avoided.

## Skills/Rules Configuration vs. Attack Success
The role of explicitly supplied agent configurations, termed skills and rules, presents a distinct pattern concerning security outcomes. The benchmark varies PLCs, which capture what a developer wants to do, how the developer expresses the task and supplies skills or rules to the coding agent. While introducing explicit security directives—such as prohibitions on executing unverified code—visibly increases the agent's Alert Rate (AR), this hardening does not translate into a uniform or significant reduction in the Attack Success Rate (ASR). The confidence intervals for ASR across all skill/rule settings overlap, indicating that while the agent becomes better at *detecting* risk, the alert mechanism often fires too late to prevent the payload from executing. This suggests a functional disconnect: detection capabilities are enhanced, but preventative efficacy remains limited by the execution flow dictated by the poisoned repository.

## Limitations
The CIPR benchmark focuses narrowly on PLCs—task type, prompt expression, and skills/rules—while explicitly excluding other user-side factors like model selection or IDE integrations. The threat model assumes the attacker controls the repository entirely, which may not hold for less privileged injection vectors. Furthermore, the reliance on an LLM judge for Alert Rate assessment introduces potential subjectivity, despite validation efforts.

## What practitioners should do
*   Be aware that the task type dictates the injection surface: environment-setup tasks surface configuration files, while test-related tasks surface test files.
*   If possible, structure requests to be more specific, as underspecified prompts can lead to deeper exploration that may expose the attack surface.
*   Do not rely solely on agent alerts; the introduction of security rules increases AR but does not significantly lower ASR.

## Verdict
Read this paper if you are designing security evaluations for agentic workflows; otherwise, skip it if you are only concerned with payload crafting.

---

## Den's Take

The paper correctly pivots the focus from payload crafting to invocation context, which is a necessary shift in how we view agentic risk. However, the findings on skills and rules—that higher Alert Rates do not translate to lower Attack Success Rates (ASR)—feel like a restatement of the obvious defense failure mode. What the authors omit is the *severity* of the failure when detection is too late. If the agent is designed to execute code based on the task, then an enhanced Alert Rate only serves as post-mortem telemetry; it changes nothing about the immediate execution path. I predict that for high-consequence tasks, the only meaningful defense is structural isolation, not merely better prompting or more alerts. This echoes the idea that the durable fix for injectable systems is removing the dangerous channel entirely, rather than hardening the path through it. [my 20-level LLM red-teaming CTF](/writing/llm_red_teaming_ctf_20_levels)