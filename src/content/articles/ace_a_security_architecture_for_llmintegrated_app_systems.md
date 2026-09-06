---
title: "ACE: A Security Architecture for LLM-Integrated App Systems"
date: "2026-09-01"
type: "Paper Review"
description: "ACE: A Security Architecture for LLM-Integrated App Systems"
tags: ["Privacy"]
readingTime: 5
headerImage: "/images/news/ace_a_security_architecture_for_llmintegrated_app_systems.jpg"
paperUrl: "https://www.ndss-symposium.org/ndss-paper/ace-a-security-architecture-for-llm-integrated-app-systems/"
---

![ACE: A Security Architecture for LLM-Integrated App Systems](/images/news/ace_a_security_architecture_for_llmintegrated_app_systems.jpg)
*Figure from the paper “ACE: A Security Architecture for LLM-Integrated App Systems” (p. 3)*

# Abstract-Concrete-Execute (ACE): A Security Architecture for LLM-Integrated App Systems

## TLDR
*   ACE decouples planning from execution to ensure integrity.
*   Protects LLM systems from malicious third-party apps.
*   ACE achieves high utility on the Tool Usage suite from the LangChain benchmark.

## The Interleaved Plan-Execute Dependency Gap

LLM-integrated app systems enhance LLM utility by allowing them to invoke third-party applications via interleaved planning and execution phases. The system LLM iteratively decides the next operation—planning—and then carries it out, potentially calling an app—execution. This dynamic control flow relies on structured representations like app schemas and descriptions, which define what an app does. Security concerns arise because malicious apps can compromise integrity, availability, or privacy during this process. Existing defenses, such as f-Secure and IsolateGPT, attempt to mitigate these risks. f-Secure uses information flow control (IFC) but assumes app descriptions and schemas are inherently reliable. IsolateGPT enforces strict execution isolation but relies on static app descriptions and schemas as trusted sources. The critical gap these prior systems fail to close is their inability to withstand a strong adversary who controls the app metadata (description and schema) or the raw output of a compromised app, leading to attacks that subvert the planning phase or inject malicious instructions during execution.

## Abstract Plan Generation

The core breakthrough of ACE is shifting the security reasoning boundary by separating query processing into distinct stages. Instead of dynamic, interleaved planning, ACE first generates an *abstract execution plan* using only trusted information derived directly from the initial user query. This abstract plan serves as an immutable rule-based blueprint for the entire process. By constraining the initial planning phase to trusted inputs, ACE establishes a security boundary that preserves plan integrity even when untrusted apps are present. This contrasts sharply with previous systems where the control flow was arbitrarily dependent on intermediate, potentially manipulated, system outputs. This abstract view enables principled security reasoning—specifically, static analysis on the structured plan output—to verify that the intended control and information flow properties adhere to user-specified secure information flow constraints before any potentially untrusted execution begins.

## Concrete Plan Instantiation and Policy Verification

Once the abstract plan is secure in principle, ACE proceeds to map it into a *concrete plan* by instantiating the abstract steps using the installed system apps. This instantiation phase leverages isolation primitives to prevent malicious apps from corrupting the integrity of the abstract plan structure. The critical step here is the verification: ACE subjects this concrete plan to a lattice-based policy check. This verification process automatically rejects any concrete plan implementation that violates defined information flow constraints between the system LLM, context, and the invoked apps. This moves beyond simple format checking; it actively quantifies risk and ensures that data movement adheres to the security policies established during the abstract planning stage. The system explicitly verifies that the plans satisfy user-specified secure information flow constraints via static analysis on the structured plan output.

## Execution with Data and Capability Barriers

The final phase involves *isolated plan execution*. The system executes the plan that has already passed the rigorous static security checks. During this phase, ACE enforces strict data and capability barriers between all components. The execution environment ensures that every invoked app operates strictly according to the pre-verified concrete plan. This mechanism prevents the propagation of threats originating from malicious app outputs, thereby preventing indirect prompt injection attacks from influencing subsequent LLM actions. We show experimentally that ACE is secure against attacks from the INJECAGENT and Agent Security Bench benchmarks for indirect prompt injection, and our newly introduced attacks. Furthermore, we demonstrate that ACE achieves high utility on the Tool Usage suite from the LangChain benchmark.

## Limitations

The presented work focuses on mitigating threats arising from malicious apps controlling app metadata or outputs within the defined LLM-integrated application structure. The threat model does not explicitly cover attacks that compromise the underlying operating system or the core LLM inference engine itself. Furthermore, the utility evaluation is conducted on the Tool Usage suite, and the paper does not provide a comprehensive analysis of how the architectural overhead impacts performance in extremely high-throughput, low-latency production environments.

## What practitioners should do

*   Adopt a planning-before-execution mindset when architecting new LLM applications, prioritizing static verification over dynamic runtime checks.
*   Implement strict boundaries between planning logic (trusted components) and execution logic (potentially untrusted apps).
*   Verify that any generated execution plan satisfies specified information flow constraints before deployment.
*   Test against indirect prompt injection benchmarks, as ACE successfully blocks attacks from INJECAGENT and ASB.

## Verdict

Read this paper if you are designing production-grade LLM applications that integrate third-party tools and must withstand a strong adversary controlling those tools. Skip it if your use case involves only simple, single-step LLM interactions without external app orchestration.

---

## Den's Take

While the separation of abstract planning from concrete execution in ACE offers a structurally sound defense against metadata manipulation, the paper seems to understate the practical difficulty of defining meaningful information flow constraints for complex, multi-step workflows. Abstract plans are only as secure as the constraints applied during that abstract phase. If the initial user query is itself subtly manipulated—a soft adversarial prompt—the derived "trusted" abstract plan might already encode a path to compromise, even if the apps themselves are benign.