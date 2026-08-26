---
title: "An LLM-Driven Fuzzing Framework for Detecting Logic Instruction Bugs in PLCs"
date: "2026-08-26"
type: "Paper Review"
description: "Automates fuzzing of PLC logic instructions using an LLM-guided framework"
tags: ["Fuzzing", "Vulnerabilities"]
readingTime: 5
headerImage: "/images/news/an_llmdriven_fuzzing_framework_for_detecting_logic_instructi.jpg"
---

![An LLM-Driven Fuzzing Framework for Detecting Logic Instruction Bugs in PLCs](/images/news/an_llmdriven_fuzzing_framework_for_detecting_logic_instructi.jpg)
*Figure from the paper “An LLM-Driven Fuzzing Framework for Detecting Logic Instruction Bugs in PLCs” (p. 3)*

# LLM-Driven Fuzzing for Logic Instruction Bugs in PLC Firmware

## TLDR
*   **What**: Automates fuzzing of PLC logic instructions using an LLM-guided framework.
*   **Who's at risk**: Industrial control systems and critical infrastructure relying on PLCs.
*   **Key number**: Uncovered 19 instruction-level bugs, including four previously undisclosed vulnerabilities, across six commercial PLC models from three vendors.

## Semantics-Aware Seed Program Generation
The prerequisite for effective fuzzing in Programmable Logic Controllers (PLCs) is the ability to generate test programs that respect the underlying hardware and control-flow semantics. Current methods face significant hurdles because PLC firmware is proprietary; static analysis tools cannot reliably recover code boundaries, data layouts, or calling conventions necessary to model instruction semantics. This inability prevents the inference of the data- and control-flow dependencies required for instruction-level bug detection. Fuzzing is thus chosen as the execution-based approach, but it introduces challenges related to synthesizing valid, controllable, and resettable seed programs at scale, as these behaviors vary widely across vendors. LogicFuzz addresses this by constructing a semantic dependency graph (SDG). This SDG captures both operational semantics and inter-instruction dependencies within the PLC code. By leveraging the SDG alongside an enable-signal mechanism, LogicFuzz steers a large language model (LLM) to synthesize test programs that adhere to hardware constraints and instruction semantics, moving beyond the manual derivation of usage constraints.

## SDG Mutation and LLM Synthesis
The core mechanism enabling LogicFuzz is the coupling of SDG mutation with LLM-based synthesis. When a test program fails validation, LogicFuzz does not simply restart; it systematically modifies the execution context. It samples a subgraph $g$ from the target instruction $L_x$'s SDG and applies one of four mutation operators to expose $L_x$ to varied invocation contexts: Reorder, Rewire, Delete, or Insert. Rewire, for instance, preserves call order but redirects parameter-dependency edges to different instructions. Once a mutated subgraph $g$ is ready, LogicFuzz queries the LLM with a prompt, which includes $g$ and the full SDG, to synthesize a candidate test program $T$. This program $T$ follows a strict enable-signal-based template: $T = \langle t_{in}, t_{var}, t_{\uparrow}, t_{\downarrow}, t_{st} \rangle$. The rising-edge block $t_{\uparrow}$ fires exactly once per cycle to execute the mutated sequence $\Phi(g, P)$, while the falling-edge block $t_{\downarrow}$ conditionally reinitializes internal state using $bReset$ to ensure a clean environment for the next cycle.

## Multi-Source Anomaly Detection Oracle
Discovering logic instruction bugs often goes beyond simple crashes. Failures frequently manifest as scan-cycle stalls, I/O inconsistencies, or silent state divergence. To counter this, LogicFuzz integrates a multi-source anomaly-detection oracle. This oracle fuses heterogeneous signals exposed by the PLC runtime—namely, runtime logs, status LEDs, and communication states—to detect a broad spectrum of anomalies. During the fuzzing stage, coverage-guided parameter mutation generates new inputs for the seed programs, which are executed on the physical PLC. The monitoring component continuously collects these signals. The acceptance of a seed $T_s$ depends on passing a battery of runtime oracles, such as $oracle_i = F_{log}^i \cup F_{param}^i \cup F_{coverage}^i \cup F_{snapshot}^i$. For the baseline rising-edge skeleton ($I_0 = \langle \text{True}, \text{False}, \emptyset \rangle$), invalidation occurs if the log contains “error/crash/failure” or if expected state updates are absent. This unified monitoring mechanism ensures that subtle, non-crashing faults are captured, allowing the framework to uncover instruction-level bugs that standard crash-only oracles miss.

## Limitations
The framework relies heavily on the LLM's ability to accurately interpret vendor documentation and CWE descriptions to build the SDG. This assumption may break down with highly obfuscated or undocumented proprietary instruction sets. Furthermore, the reliance on vendor-exposed serial debugging and specific runtime artifacts limits its applicability to PLCs with sufficiently rich external interfaces. The framework's effectiveness in detecting complex, multi-stage vulnerabilities that require long-term state persistence across many cycles is not explicitly quantified.

## What practitioners should do
*   If you are testing industrial control systems, use this framework to move beyond crash-only testing toward instruction-level vulnerability discovery.
*   Leverage the SDG construction to identify specific parameter usage constraints for critical instructions before fuzzing begins.
*   When deploying, ensure your PLC environment exposes sufficient runtime logs and status signals to feed the multi-source oracle.
*   Use the SDG mutation operators (Reorder, Rewire, Delete, Insert) to deliberately test different control-flow invocation patterns.

## Verdict
Read this paper if you are a researcher or engineer focused on industrial control system security, particularly those working at the intersection of formal methods and LLM-driven automated testing.

## Den's Take

The paper presents a compelling marriage of LLMs and formal control-flow modeling to attack proprietary PLC firmware. However, I find the reliance on the LLM to accurately construct the Semantic Dependency Graph (SDG) to be an unaddressed scaling risk. If the proprietary instruction set is sufficiently obscured—even if it's not fully undocumented—the LLM's ability to infer correct data and control-flow dependencies will degrade rapidly, making the entire framework brittle outside of highly documented vendor environments.