---
title: "Securing Web Agents with the Compile-Then-Execute Paradigm"
date: "2026-11-06"
type: "Paper Review"
description: "Baya enforces control-flow integrity by pre-compiling tasks into Python programs"
tags: ["Prompt Injection", "AI Agents"]
readingTime: 5
headerImage: "/images/news/securing_web_agents_with_the_compilethenexecute_paradigm.jpg"
paperUrl: "http://arxiv.org/abs/2611.06039v1"
---

![Securing Web Agents with the Compile-Then-Execute Paradigm](/images/news/securing_web_agents_with_the_compilethenexecute_paradigm.jpg)
*Figure from the paper “Securing Web Agents with the Compile-Then-Execute Paradigm” (p. 4)*

# Baya: Compile-Then-Execute Paradigm for Web Agent Control-Flow Integrity

## TLDR
* **What**: Baya enforces control-flow integrity by pre-compiling tasks into Python programs.
* **Who's at risk**: Web agents operating on dynamic, mixed-content websites.
* **Key number**: On WASP, Baya achieves 0% observed intermediate and end-to-end ASR, compared to the ReAct baselines’ aggregate ASRs of 16.2% and 25.5%, respectively.

## The Web Agent Architectural Gap
Web agents typically employ a reactive loop, observing live webpage content and dynamically deciding the next action. This architecture inherently mixes trusted site data with untrusted content from users or third parties. When an agent incorporates this mixed content into its reasoning, prompt injection attacks become possible. Attackers embed malicious instructions in this untrusted content, causing the agent to deviate from the user’s intent and execute unauthorized actions—this is control-flow hijacking. Existing structural defenses, like those in CaMeL, separate planning from execution, but they rely on simple agentic environments with small, well-defined action spaces. Real web interfaces, however, are complex; low-level browser actions depend on the current rendered state, and native backend APIs are often incomplete, undocumented, or semantically inconsistent with the user interface. This lack of a complete, semantically specified action space prevents prior compile-then-execute methods from being applied to general web agents.

## The Trusted Website API Abstraction
Baya’s central innovation is the Trusted Website API. Instead of allowing the planning model to observe live, untrusted website content, Baya mandates that the agent first compiles the user's request into an executable Python program that calls this API. This API acts as a unified, documented abstraction layer over the website's capabilities. Baya does not assume this interface exists; it constructs it offline for each target website. This construction starts with native backend REST APIs, but critically, it fills in gaps—such as UI-only functions like voting or fuzzy search—by implementing trusted browser-automation operations via Playwright. The resulting API defines a contract $C(f) = (\Sigma, P, Q, E)$ for every operation $f$, ensuring that the compiler has a fully typed, semantically constrained view of the website's action space *before* execution begins.

## The Compiled Program Execution
The process is strictly separated into two phases: compilation and execution. During compilation, a sandboxed coding agent uses the Trusted Website API catalog to write a Python program that fixes the control flow. Untrusted runtime data retrieved from the live website is only allowed to fill program variables or select among branches already defined in the pre-compiled code; it cannot introduce new operations or redefine the workflow. The isolated execution engine runs this compiled program against the live website. If execution encounters a failure, the engine provides only restricted diagnostic feedback to the compiler to facilitate repair, preventing this feedback channel from becoming an attack vector. This separation confines the potential influence of untrusted content solely to data values, thereby preventing control-flow hijacking.

## Limitations
The Baya framework is constrained to tasks where the workflow can be determined before execution, classifying them as Safe or Safe with Influence. It explicitly does not address Replan-Needed tasks, where the required operations must be derived from untrusted content, such as reading and acting upon arbitrary incoming emails. Furthermore, Baya's scope is limited to preventing control-flow hijacking; outcome manipulation, data-flow security, and compromises of trusted components remain outside its coverage.

## What practitioners should do
* If deploying web agents, investigate the feasibility of constructing a Trusted Website API for your target domains.
* When using compile-then-execute systems, verify that the action space definition is complete and semantically rich enough to cover all necessary user workflows.
* Be aware that Baya cannot secure agents for tasks requiring dynamic workflow derivation from untrusted inputs.
* Benchmark against the 0.0% ASR achieved by Baya on WASP for control-flow resilience.

## Verdict
Read this paper if you are building or securing autonomous web agents; otherwise, skip it.

---

## Den's Take

The paper frames the compile-then-execute paradigm as a complete solution to control-flow integrity in web agents, citing a 0.0% attack success rate on WASP. However, this focus on *pre-compilation* fundamentally ignores the persistent risk in scenarios demanding dynamic adaptation. The limitation noted—that Baya cannot secure agents for tasks requiring dynamic workflow derivation from untrusted inputs, like reading arbitrary emails—is not a minor edge case; it represents the operational reality for any truly general-purpose web agent. If an agent must react to an unknown, untrusted input stream (e.g., a user-submitted document that dictates the next API call), the compile-then-execute boundary collapses. Therefore, relying solely on this paradigm forces a choice between high security (restricted workflows) and high utility (general web interaction), and the paper does not adequately address the security trade-offs inherent in that choice.