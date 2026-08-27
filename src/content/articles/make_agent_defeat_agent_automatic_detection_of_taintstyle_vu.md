---
title: "Make Agent Defeat Agent: Automatic Detection of Taint-Style Vulnerabilities in LLM-based Agents"
date: "2026-08-22"
type: "Paper Review"
description: "AgentFuzz, a directed greybox fuzzing framework for LLM agents"
tags: ["AI Agents", "Fuzzing", "Vulnerabilities"]
readingTime: 5
headerImage: "/images/news/make_agent_defeat_agent_automatic_detection_of_taintstyle_vu.jpg"
paperUrl: "https://www.usenix.org/conference/usenixsecurity25/presentation/liu-fengyu"
---

![Make Agent Defeat Agent: Automatic Detection of Taint-Style Vulnerabilities in LLM-based Agents](/images/news/make_agent_defeat_agent_automatic_detection_of_taintstyle_vu.jpg)
*Figure from the paper “Make Agent Defeat Agent: Automatic Detection of Taint-Style Vulnerabilities in LLM-based Agents” (p. 4)*

# AgentFuzz: Directed Greybox Fuzzing for Taint Vulnerabilities in LLM Agents

## TLDR
* **What**: AgentFuzz, a directed greybox fuzzing framework for LLM agents.
* **Who's at risk**: LLM-based agents deployed with security-sensitive operations.
* **Key number**: In our evaluation against 20 widely-used open-source agent applications, AgentFuzz identified 34 high-risk 0-day vulnerabilities.

## Bridging the Natural Language Gap
LLM-based agents are increasingly common, handling complex tasks by interpreting natural language prompts and invoking external tools or functions. These agents are susceptible to taint-style vulnerabilities, where malicious input flows from a user prompt (source) to a security-sensitive operation (sink) without sanitization, potentially causing code injection or privilege escalation. Existing methods for detecting these flaws, such as static analysis, struggle with the dynamic nature of these agents; specifically, their coarse-grained call graph analysis and the prevalence of indirect calls in languages like Python lead to high rates of false positives and false negatives. Traditional dynamic fuzzing techniques are also inadequate because they are designed for structured inputs, whereas agents require natural language prompts that carry rich semantic meaning to invoke specific functionalities. The core problem AgentFuzz addresses is how to apply directed fuzzing—which is necessary because taint vulnerabilities are sink-specific—to an input space defined by unstructured, semantically rich natural language.

## Multifaceted Feedback for Seed Prioritization
The paper identifies a significant obstacle in traditional fuzzing: how to efficiently prioritize the search space. Standard directed fuzzing relies on metrics like Control Flow Graph (CFG) distances to guide seed selection, assuming seeds closer to the target sink are more promising. However, the paper argues this heuristic breaks down in LLM agents for two reasons. First, indirect calls make constructing a reliable call graph difficult, rendering distance assessment unreliable. Second, distance alone ignores semantic relevance. For instance, two tools might have the same CFG distance to a sink, but if one tool's name semantically aligns with the vulnerable component, it represents a higher-quality seed. AgentFuzz solves this by introducing a multifaceted feedback strategy. This strategy prioritizes seeds based not only on their execution traces and CFG distances but also on their semantic consistency, ensuring the fuzzing effort focuses on prompts likely to invoke the vulnerable component.

## Functionality and Argument Mutators
AgentFuzz operationalizes its detection via three phases. The first phase leverages an LLM-assisted approach to generate initial, functionality-specific seed prompts. This is achieved by interpreting the natural language semantics embedded within the component class and method names found in the call chains leading to predefined sinks. The second phase uses the multifaceted feedback strategy described above to select and refine these seeds. The final phase employs specific mutators: functionality and argument mutators. These mutators are designed to refine the seed while maintaining semantic correctness and satisfying code constraints along the path to the sink. The system autonomously selects the most suitable mutator based on runtime feedback. Our evaluation shows that AgentFuzz successfully identified 34 0-day taint-style vulnerabilities, achieving a precision rate of 100%, outperforming the state-of-the-art approach LLMSmith [49] by 33 times. These vulnerabilities include high-risk issues such as code injection and SQL injection, affecting 14 open-source agents, 7 of which have over 10k stars on GitHub. All 34 vulnerabilities were confirmed to be exploitable.

## Limitations
The threat model assumes benign agents and environments; it does not cover scenarios where the agent's underlying infrastructure is already compromised. Furthermore, the success of the seed generation relies heavily on the semantic richness of component names, an assumption that may not hold for all proprietary or poorly documented agent deployments. The framework's reliance on predefined sinks limits its ability to discover novel vulnerability types not explicitly mapped during the initial call chain extraction.

## What practitioners should do
* Integrate LLM-assisted semantic analysis when designing fuzzing harnesses for agent applications.
* Prioritize feedback mechanisms that incorporate semantic alignment over purely structural metrics like CFG distance.
* Treat any LLM-generated output that flows into a security-sensitive operation as potentially tainted until proven otherwise.
* Review agent code for indirect calls, as these complicate standard static analysis efforts significantly.

## Verdict
Read this paper if you work on automated security testing for AI-powered applications; otherwise, skim it.

---

## Den's Take

The reported 100% precision rate is impressive for a specialized fuzzing technique, but it glosses over a fundamental weakness in the approach. By relying on predefined sinks and component names for LLM-assisted seed generation, AgentFuzz is inherently limited to discovering *known* taint paths. This is not true vulnerability discovery; it is highly sophisticated path traversal within a bounded state space. If the agent's functionality is poorly documented or uses opaque internal naming conventions, the entire semantic feedback loop collapses, rendering the framework useless. Furthermore, the threat model's assumption of a benign environment is naive when dealing with complex, interconnected agentic systems. The focus on input taint misses the attack vector of runtime manipulation of the agent's internal state or tool execution environment itself. This is why prior work argued that security efforts must shift from measuring context leakage to guaranteeing the operational integrity of the entire AI system.