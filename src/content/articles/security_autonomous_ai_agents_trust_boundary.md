---
title: "Security of Autonomous AI Agents: Trust Boundary-Based Attack Surface Analysis and Trends"
date: "2026-04-15"
type: "Research Paper"
description: "A trust-boundary framework for autonomous AI agent security: six attack surfaces, the shift from output safety to behavioral safety, and the open research agenda."
tags: ["AI Agents", "Agentic AI", "Trust Boundary", "LLM Security", "Prompt Injection", "MCP", "Survey"]
---

# Security of Autonomous AI Agents: Trust Boundary-Based Attack Surface Analysis and Trends

For the past few years, "LLM security" mostly meant **output safety**: did the model produce harmful text? With autonomous agents, that question is suddenly the wrong one. An agent that politely refuses to write a phishing email but then calls a `send_mail()` tool—because a stray instruction in a retrieved document told it to—has already done the harm. **The output was fine. The behavior was not.**

This is the gap our paper, "[Security of Autonomous AI Agents: Trust Boundary-Based Attack Surface Analysis and Trends](https://deniskim1.com/papers/jkiisc_26/Autonomous_Agents_Threats.pdf)," published in the **Review of KIISC (정보보호학회지, Vol. 36, No. 2, April 2026, pp. 37–52)**, sets out to close.

We argue that the right unit of analysis for agent security is the **trust boundary**—the line where data of one provenance is consumed by code (or a model) of another. We re-organize the agent threat landscape around six such boundaries, show how attacks compose across them, and trace how defense thinking is shifting from *single-prompt hardening* to *system-level* controls (Least Privilege, Capability Mediation, User Intervention).

---

## From Output Safety to Behavioral Safety

The behavioral pivot matters because it inverts where the threat lives.

| Era | What we measured | Where defenses lived |
|-----|------------------|----------------------|
| **Output safety** (classical LLM) | The string returned to the user | Alignment, RLHF, output filters |
| **Behavioral safety** (agentic LLM) | The sequence of *actions* taken in the world | Trust boundaries, capability mediation, runtime control |

Output safety treats the model as an oracle. Behavioral safety treats the model as a *process*: one that reads, writes, retrieves, invokes tools, persists memory, and chains across turns. A jailbreak in an output-safety world produces a bad sentence. A jailbreak in a behavioral-safety world produces a bad **action**—a transferred file, an emailed secret, a deleted record—often with no visibly toxic string anywhere in the trace.

This is the paradigm shift the paper organizes around: when the model is an agent, security stops being about what it *says* and becomes about what it *does* on your behalf.

---

## Anatomy of an Autonomous Agent System

Before classifying attacks, we need to know what we are defending. A typical agent system has four kinds of components:

| Component | Examples | Role |
|-----------|----------|------|
| **Reasoning / Planning** | Orchestrator, Planner, Executor agent | Decomposes the user goal into steps; decides which tool to call next |
| **External Environment** | Tools, APIs, browsers, shells, other agents | Performs side-effects in the world |
| **Context / Memory** | RAG retriever, knowledge base, conversational memory, long-term memory store | Supplies the context the planner conditions on |
| **Execution Environment** | Python REPL, container, host filesystem, network | Where tool calls and code actually run |

What makes these systems hard to secure is that **data flows across all four**. A retrieved passage becomes context, which shapes a tool call, which produces output that is written back to memory, which is retrieved in a future turn. Each arrow in that flow crosses a trust boundary, and every boundary is a potential attack surface.

This is the picture (Figure 1 of the paper) that motivates everything else: agent security is not about hardening one prompt; it is about reasoning about who-trusts-what across an entire dataflow graph.

---

## The Six Trust-Boundary-Aligned Attack Surfaces

Our central contribution is a six-way classification of attack surfaces, each aligned to a trust boundary in the system above. We summarize Table 1 of the paper below, then walk through each surface.

| # | Surface | Trust violated | Representative risks |
|---|---------|----------------|----------------------|
| 1 | **Input & System Prompt** | "Content is data, not instructions" | Indirect prompt injection, multimodal/UI-text injection, hidden adversarial text |
| 2 | **Retrieval & Knowledge Base** | "Retrieved passages reflect ground truth" | Data poisoning, retrieval ordering manipulation, semantic-space adversarial documents |
| 3 | **External Tools & Function Calls** | "The model only invokes tools the user authorized" | Argument tampering, unauthorized side-effects, confused-deputy, oversharing parameters |
| 4 | **Protocols & Agent Orchestration** | "Inter-agent / inter-service messages are well-typed and well-scoped" | MCP / A2A confusion, message smuggling, broad-scope tokens, principal mix-ups |
| 5 | **Privilege & Runtime Execution** | "Code runs in a constrained sandbox" | Python-REPL / shell RCE, container escape, file-system access beyond scope, network egress |
| 6 | **State & Long-Term Memory** | "Memory faithfully reflects prior agreed state" | Memory poisoning, cross-session contamination, missing TTL/expiry, identity confusion |

### 1. Input & System Prompt

The agent's input is no longer just the user's typed message—it is an *aggregation* of the user prompt, the system prompt, retrieved passages, tool results, OCR'd screen content, email bodies, document text, image alt-text, and more. **All of it arrives in the same context window with the same status as instructions.**

This is the fundamental opening for **indirect prompt injection**: an attacker writes text into a document, web page, calendar invite, or image that the agent will later ingest, and that text contains instructions the agent treats as authoritative. The attacker never speaks to the agent directly; they wait for the agent to come read what they wrote.

The most dangerous property of this class is that the attacker needs **zero interaction with the user**. They poison content; the user later asks the agent to summarize it; the agent silently follows the attacker's instructions—often to exfiltrate context or call tools the user never approved.

### 2. Retrieval & Knowledge Base

Once an agent uses RAG, the knowledge base becomes part of its trust perimeter. Attacks here split into two:

- **Data poisoning**: inject adversarial documents into the KB so they are retrieved for target queries. See [PoisonedRAG-class attacks and our defense work in RAGDefender](/writing/Rescuing_the_unpoisoned) for the depth of this surface.
- **Retrieval manipulation**: craft passages that win embedding-space similarity without looking suspicious in natural language, so they crowd out legitimate hits or get ranked first.

The agent twist is that retrieved content is not just shown to the user—it is *consumed by the planner*. A poisoned passage doesn't just produce a wrong answer; it can rewrite the agent's next several steps.

### 3. External Tools & Function Calls

Every tool the agent can call is a new privilege the attacker can attempt to borrow. The risks fall into three buckets:

| Class | Example |
|-------|---------|
| **Argument tampering** | The agent calls `send_email(to, body)` with `to` set to an attacker address because an injected instruction said so |
| **Unauthorized side-effects** | A tool the user expected to be read-only (`search`) is used in a chain that ultimately writes (`commit`, `delete`, `pay`) |
| **Confused deputy** | The agent holds privileges the user does not; an attacker convinces the agent to use those privileges on the attacker's behalf |

The deeper issue is that LLM tool-calling has no native notion of *which principal authorized a given call*. The model issued the call, but the *intent* may have come from a poisoned passage three steps earlier. Without principal tracking, every tool call is implicitly attributed to the user.

### 4. Protocols & Agent Orchestration

Standardized agent protocols (**MCP**, **A2A**, and their successors) make agent ecosystems composable—and they make trust boundaries fuzzier. A single MCP server can be invoked by many agents on behalf of many users; an A2A message can chain through several agents before producing a tool call. We covered these protocols in detail in [Bridging Models and Agents: MCP & A2A](/writing/bridging_models_agents_mcp_a2a); the JKIISC paper folds those concerns into the broader trust-boundary framework.

Representative risks: principal confusion across agent hops, over-broad capability tokens, message smuggling that survives protocol translation, and orchestrator agents that re-emit untrusted content as authoritative instructions to downstream agents.

### 5. Privilege & Runtime Execution

When the agent can execute code, all the classical systems-security questions come back at once. Python REPLs, shell tools, container-based execution, file-system access, and outbound network calls each become an attack surface in their own right.

What makes this worse than ordinary RCE is *who triggers it*: a single poisoned passage in the input or the KB can cause the agent to write and execute code on its own runtime. Early agent frameworks (e.g., AutoGPT-class systems, some LangChain pipelines) were shown to be vulnerable to RCE driven entirely by externally-supplied content. The defensive trajectory here is the most concrete of the six surfaces: real sandboxes, restricted network egress, file-system scoping, capability-scoped credentials, and rate-limited tool budgets.

### 6. State & Long-Term Memory

Long-term memory makes agents useful and makes them attackable across sessions. The unique risks:

| Risk | What goes wrong |
|------|-----------------|
| **Memory poisoning** | An attacker gets the agent to write an adversarial "fact" into its long-term store; future sessions retrieve it as truth |
| **Cross-session contamination** | Memory written for user A becomes context for user B |
| **No TTL / expiry** | Stale, no-longer-true memories influence current decisions |
| **Identity confusion** | The agent loses track of which past statements were *its own*, which were *the user's*, and which were *retrieved* |

Memory turns a one-shot prompt-injection into a *persistent* compromise. Once a bad fact lands in long-term memory, every future session that retrieves it is silently steered—long after the original injection vector is gone.

---

## Cross-Surface Composition

The six surfaces are not independent—they compose. The paper traces representative chains:

| Chain | Stages |
|-------|--------|
| **Inject → Retrieve → Execute** | (1) Poison a document, (2) wait for the agent to retrieve it as RAG context, (3) the embedded instructions cause a tool call with attacker-chosen arguments |
| **Inject → Memorize → Recall** | (1) Get one adversarial fact into long-term memory, (2) in a later session it is retrieved and treated as ground truth, (3) the agent acts on it across an unrelated task |
| **Tool-result Inject → Re-plan** | (1) An attacker controls the *output* of a tool the agent calls (e.g., a scraped web page), (2) that output enters context with injected instructions, (3) the planner re-plans toward the attacker's goal |

The composition story is the strongest argument for organizing defenses *across* surfaces rather than per-surface: a defense that blocks injection at the input but allows tool outputs to flow into the planner untreated leaves the second chain wide open.

---

## Defense Paradigm Shift

The defense literature is moving in a coordinated direction the paper makes explicit. Single-prompt patches are giving way to **system-level architectural controls**:

| Principle | What it means for an agent |
|-----------|----------------------------|
| **Least Privilege** | Each tool the agent can call is scoped to the *minimum* capability that task requires—no blanket admin tokens, no "read+write" when "read" suffices |
| **Capability Mediation** | A trusted broker stands between the model and the world; the model can request actions, but the broker enforces policy, attribution, and rate-limits |
| **User Intervention / Confirmation** | High-impact actions (sending, paying, deleting, sharing) require explicit human confirmation, with the action described in plain language at confirmation time |

Notice what these have in common: none of them try to make the model "smarter" about resisting injection. They all assume the model *will* be tricked occasionally, and they bound the blast radius when it happens. This is the same shift systems security made decades ago when it stopped trusting application code to police itself and started enforcing isolation in the operating system.

---

## Open Research Directions

The paper closes with four directions where work is most needed:

1. **Privilege model clarification.** What does it mean for an agent action to be "authorized" by a user? Today there is no clean answer—agent calls inherit user privileges implicitly. We need a principal-tracking model that survives multi-hop, multi-agent, multi-protocol chains.
2. **Multi-turn combination-attack analysis.** Most evaluations are single-turn. Real attacks unfold over many turns, interleaving benign and malicious steps. We need benchmarks and analysis tools that reason about *trajectories*, not just individual prompts.
3. **Multi-stage execution-flow verification.** Given a planner's intended action sequence, can we statically (or symbolically) verify that no input from an untrusted region of the trust graph is allowed to influence a high-privilege step? This is the agent analogue of taint tracking.
4. **Memory integrity.** Long-term memory needs first-class semantics for provenance, expiry, conflict resolution, and identity—not just an undifferentiated vector store of "facts."

These four open the door for the next round of agent-security research; they are also the questions that will most shape whether the deployment wave of 2026 produces durable systems or expensive incidents.

---

## Where This Sits in My Prior Work

This survey synthesizes a thread I have been pulling on for the past two years:

- [Trends in Attacks and Defenses against RAG Systems](/writing/trends_rag_attacks_defenses) — RAG security as a standalone surface, which here becomes Surface #2.
- [Rescuing the Unpoisoned (RAGDefender, ACSAC '25)](/writing/Rescuing_the_unpoisoned) — a concrete defense for the RAG surface.
- [Bridging Models and Agents: MCP & A2A](/writing/bridging_models_agents_mcp_a2a) — protocol-level threats, which become Surface #4 here.
- [AI Agent Traps (DeepMind, SSRN 2026)](/writing/ai_agent_traps) — independent taxonomy from the *environmental* side; the JKIISC paper is the system-internal complement.

The trust-boundary framing is what lets all of these sit in one picture. Agent security is not a new field built from scratch—it is the recognition that the trust boundaries we already know how to reason about (between input and instruction, between data and code, between principal and capability) have been re-distributed across a much larger surface, and that the discipline now has to be rebuilt one boundary at a time.

---

## Summary

This paper makes three contributions:

1. **Six-surface, trust-boundary classification.** A structured framework for autonomous-agent attacks aligned to the trust boundaries that produce them: Input/Prompt, Retrieval/KB, Tools/Functions, Protocols/Orchestration, Privilege/Runtime, State/Memory.
2. **Surface-by-surface attack catalog and composition analysis.** We map representative risks per surface and show how realistic attacks chain *across* surfaces—motivating defenses that span the dataflow rather than patch each surface in isolation.
3. **Shift to system-level defenses.** We characterize the field-wide move from single-prompt hardening to architectural controls (Least Privilege, Capability Mediation, User Intervention) and identify four open research directions—principal/privilege modeling, multi-turn combination attacks, multi-stage execution-flow verification, and memory integrity.

The broader lesson: **agent security is behavioral, not output-shaped.** The right question is no longer "did the model say something bad?" but "did the *system* do something it was not authorized to do?"—and the only way to answer that systematically is to make the trust boundaries inside the agent first-class objects of analysis.

---

**Reference**: Kim, M. & Koo, H. (2026). Security of Autonomous AI Agents: Trust Boundary-Based Attack Surface Analysis and Trends. *Review of KIISC* (정보보호학회지), **36**(2), 37–52.

- **Paper**: [PDF](https://deniskim1.com/papers/jkiisc_26/Autonomous_Agents_Threats.pdf)
- **Korean title**: 자율형 AI 에이전트 보안: 신뢰경계를 기반으로 한 공격 표면 분석과 동향
