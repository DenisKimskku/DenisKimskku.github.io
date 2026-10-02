---
title: "ProtocolGuard: Detecting Protocol Non-compliance Bugs via LLM-guided Static Analysis and Dynamic Verification"
date: "2026-10-03"
type: "Paper Review"
description: "Combines LLM-guided slicing with fuzzing to find subtle logic flaws"
tags: ["Fuzzing"]
readingTime: 5
headerImage: "/images/news/protocolguard_detecting_protocol_noncompliance_bugs_via_llmg.jpg"
paperUrl: "https://www.ndss-symposium.org/wp-content/uploads/2026-f521-paper.pdf"
---

![ProtocolGuard: Detecting Protocol Non-compliance Bugs via LLM-guided Static Analysis and Dynamic Verification](/images/news/protocolguard_detecting_protocol_noncompliance_bugs_via_llmg.jpg)
*Figure from the paper “ProtocolGuard: Detecting Protocol Non-compliance Bugs via LLM-guided Static Analysis and Dynamic Verification” (p. 4)*

# ProtocolGuard: Detecting Protocol Non-compliance Bugs via LLM-guided Static Analysis and Dynamic Verification

## TLDR
*   **What**: Combines LLM-guided slicing with fuzzing to find subtle logic flaws.
*   **Who's at risk**: Implementations of network protocols (e.g., MQTT, TLS).
*   **Key number**: ProtocolGuard successfully discovered 158 non-compliance bugs with high accuracy, 70 of which have been confirmed.

## The Gap Between Specification and Implementation
Network protocols form the foundation of digital communication, yet their specifications are often written in ambiguous, natural language. This ambiguity frequently causes developers to misinterpret rules, resulting in subtle non-compliance bugs. These bugs are dangerous because they do not typically manifest as crashes or obvious errors—they are silent logic flaws. This characteristic renders conventional bug detection tools, such as standard fuzzers relying on memory sanitizers, insufficient for thorough detection. Existing static analysis tools struggle because they rely on rigid heuristics that cannot assess the semantic correctness against complex, natural-language specifications. Differential testing also fails when multiple implementations exhibit the same incorrect behavior. Furthermore, all current methods demand substantial manual effort to analyze and verify the root causes of any potential bug, which severely limits scalability in real-world deployment scenarios.

## LLM-guided Program Slicing
The core insight of ProtocolGuard is leveraging Large Language Models (LLMs) to bridge the semantic gap between abstract protocol rules and concrete source code. Instead of applying traditional slicing, which requires manually defining slicing criteria and often yields noisy, irrelevant code fragments, ProtocolGuard uses LLMs to *automatically* identify the relevant parts of the codebase. This is achieved by first extracting normative rules from specifications using a hybrid method. Once a rule is structured, LLMs analyze the source code to pinpoint the specific message handler functions and associated field variables relevant to that rule. This allows the framework to perform rule-oriented forward slicing, focusing the static analysis only on the code paths directly implicated by the protocol constraint, thereby reducing the search space significantly.

## Assertion Generation and Directed Fuzzing
Even after identifying a potential inconsistency via static analysis, the bug remains silent. ProtocolGuard overcomes this by deploying LLMs to act as automated oracle generators. For each detected inconsistency, LLMs are used to automatically generate assertion statements. These assertions are then instrumented directly into the target code, effectively converting a silent logic error into an observable assertion failure that actively aborts program execution upon violation. With these assertions in place, the framework transitions to dynamic verification. To maximize the chance of triggering the newly created assertions, LLMs are then used to generate high-quality initial test cases. Instead of generating raw binary messages directly, LLMs first create natural-language counterexample descriptions, which are then used by LLM agents to synthesize programmatic scripts that construct the required inputs for directed fuzzing. This combination confirms the bug and generates a proof-of-concept test case.

## Limitations
The evaluation focused on widely-used protocol implementations, but the framework assumes that the protocol specification is sufficiently structured to allow for rule extraction. The reliance on LLMs for complex semantic tasks introduces potential failure modes if the specification language is highly idiosyncratic or underspecified. Furthermore, the ability to generate high-quality initial test cases depends on the LLM's capacity to synthesize accurate input structures from natural language, which may degrade when dealing with extremely complex, nested binary formats not well represented in the training data.

## What practitioners should do
*   Integrate LLM-guided slicing techniques when manually reviewing protocol implementations for subtle logic errors.
*   Treat silent logic deviations as potential bugs, rather than waiting for crashes, when auditing network stacks.
*   Use automated assertion generation as a means to transform theoretical specification violations into testable, observable failures.
*   When fuzzing protocol parsers, prioritize test case generation methods that target specific specification constraints over general input mutation.

## Verdict
Read this paper if you are an ML engineer or security researcher working on automated vulnerability detection for complex, specification-driven systems like network protocols. If your focus is strictly on memory safety bugs, you can likely skip it.

---

## Den's Take

The reliance on LLMs to "automatically identify the relevant parts of the codebase" via rule-oriented slicing is where I see the implementation weakest. The paper treats the LLM as a perfect semantic mapping engine, but it glosses over the fact that extracting normative rules from ambiguous natural language specifications is a brittle, high-variance task itself. If the initial rule extraction fails to capture the full nuance of a protocol constraint, the subsequent slicing becomes irrelevant noise, regardless of how well the dynamic verification stage functions. Furthermore, the assertion generation relies on the LLM correctly inferring the *intended* state transition; if the specification itself is contradictory or underspecified—a common trait in real-world protocol documents—the LLM will simply codify a flawed expectation, turning a specification ambiguity into a false positive bug report. This is not a robust solution for high-assurance systems.