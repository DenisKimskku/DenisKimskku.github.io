---
title: "IsolateGPT: An Execution Isolation Architecture for LLM-Based Agentic Systems"
date: "2026-08-21"
type: "Paper Review"
paperUrl: "https://arxiv.org/abs/2403.04960"
paperAuthors: "Yuhao Wu, Franziska Roesner, Tadayoshi Kohno, et al."
description: "Proposes ISOLATEGPT to isolate app execution in LLM systems"
tags: ["AI Agents", "Privacy"]
readingTime: 5
headerImage: "/images/news/isolategpt_an_execution_isolation_architecture_for_llmbased_.jpg"
---

![IsolateGPT: An Execution Isolation Architecture for LLM-Based Agentic Systems](/images/news/isolategpt_an_execution_isolation_architecture_for_llmbased_.jpg)
*Figure from the paper “IsolateGPT: An Execution Isolation Architecture for LLM-Based Agentic Systems” (p. 2)*

# Execution Isolation Architecture for LLM-Based Agentic Systems

## TLDR
*   **What**: Proposes ISOLATEGPT to isolate app execution in LLM systems.
*   **Who's at risk**: Users interacting with untrustworthy third-party LLM apps.
*   **Key number**: The performance overhead incurred by ISOLATEGPT to improve security is under 30% for three-quarters of tested queries.

## The Natural Language Execution Paradigm Gap
Current LLM-based systems, which function as agentic systems, support third-party applications where interactions are defined via natural language. These systems allow apps to access user data and freely interact with each other and the core system. This architecture mirrors older computing platforms where insufficient isolation existed between applications and the system. The core problem arises because natural language interfaces are inherently imprecise compared to traditional programming interfaces, making scrutiny difficult. Furthermore, granting unrestricted exposure to third-party apps—which might not be trustworthy—introduces significant security and privacy risks. An untrustworthy flight booking app, for instance, could exfiltrate personal data or surreptitiously book expensive tickets. Prior designs fail here because they assume sufficient trust or rely on rigid, machine-readable interfaces that LLM apps circumvent.

## Hub-and-Spoke Architecture
The central insight enabling ISOLATEGPT is the shift from shared execution to a constrained, mediated interaction model. Instead of allowing apps to run freely in a common environment, this architecture isolates app execution. Interaction between apps and the system is strictly channeled through a trustworthy intermediary that enforces well-defined interfaces and requires explicit user permission. This design fundamentally reduces the attack surface. Unlike prior computing systems where isolation was achieved through process separation, applying this to LLM systems required addressing two unique challenges: securely providing isolated environments with necessary system context, and defining secure interfaces for natural language-based interactions. ISOLATEGPT operationalizes this via a hub-and-spoke structure, where the hub manages routing and the spokes contain the isolated apps.

## Per-App LLM Instances and Inter-Spoke Protocol
The mechanism requires several components to maintain functionality while enforcing isolation. The system utilizes a central trustworthy interface called the hub, which receives user queries and routes them appropriately to isolated apps. Each app is accompanied by a dedicated LLM instance, contained within a module named spoke. This spoke provides the isolated app with prior context, enabling it to address user queries accurately without direct, unrestricted access to the whole system state. For collaboration between mutually distrusting apps, ISOLATEGPT employs an inter-spoke communication protocol, which routes well-defined requests between agnostic spokes via the hub. Functionality evaluation showed that ISOLATEGPT provides the same functionality as the baseline VANILLAGPT for all benchmarks. Performance-wise, the overhead is noted: for three-quarters (75.73%) of the tested queries, ISOLATEGPT’s overhead is under 30% compared to VANILLAGPT.

## Limitations
The paper focuses on mitigating adversarial behavior from malicious apps and safety issues arising from natural language imprecision in multi-app execution. The model assumes the core LLM and hosting system are trustworthy, though vulnerable to prompt injection. The architecture is evaluated against a set of attacks derived from a benchmark, and the evaluation relies on LangChain’s benchmarks, which may not capture all real-world deployment scenarios.

## What practitioners should do
*   When building agentic systems, prioritize execution isolation over simple access control mechanisms.
*   Design interactions between components using well-defined, mediated interfaces rather than relying solely on direct natural language exchange.
*   Be aware that implementing isolation incurs performance overhead, which the paper quantifies under 30% for most queries.
*   Recognize that even with isolation, safety risks from natural language ambiguity persist and require careful design of context provision.

## Verdict
Read for ML engineers and security researchers building or auditing LLM-powered agentic systems, as it provides a concrete architectural blueprint for execution isolation.

---

## Den's Take

This proposal correctly identifies that the ambiguity of natural language interaction is the point where traditional security models break down in agentic systems. However, the paper’s reliance on the core LLM and hosting system being “trustworthy” is a massive, unaddressed assumption. If the core LLM itself is vulnerable to prompt injection—which is a known issue—then the entire isolated sandbox is merely a cage around a compromised entity. Isolation protects the *host* from the *spoke*, but it does not protect the *host* from the *hub* if the hub is instructed by a compromised core LLM. The architectural focus needs to shift from execution isolation to verifiable integrity of the routing logic itself.