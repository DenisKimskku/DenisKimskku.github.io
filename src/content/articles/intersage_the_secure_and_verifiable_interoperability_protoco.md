---
title: "InterSAGE: The Secure and Verifiable Interoperability Protocol for An Internet of Agents"
date: "2026-08-16"
type: "Paper Review"
paperUrl: "https://arxiv.org/abs/2608.13030"
paperAuthors: "Zhenhua Zou, Sheng Guo, Qiuyang Zhan, et al."
description: "InterSAGE: The Secure and Verifiable Interoperability Protocol for An Internet of Agents"
tags: ["MCP", "AI Agents"]
readingTime: 5
headerImage: "/images/news/intersage_the_secure_and_verifiable_interoperability_protoco.jpg"
---

![InterSAGE: The Secure and Verifiable Interoperability Protocol for An Internet of Agents](/images/news/intersage_the_secure_and_verifiable_interoperability_protoco.jpg)
*Figure from the paper “InterSAGE: The Secure and Verifiable Interoperability Protocol for An Internet of Agents” (p. 8)*

# InterSAGE: A Trust Substrate for Agent Interoperability

## TLDR
* **What:** InterSAGE provides a four-layer trust substrate for autonomous agents.
* **Who's at risk:** LLM-powered agents operating in decentralized Internet of Agents environments.
* **Key number:** InterSAGE is the only architecture that jointly enforces persistent identity, capability-aware discovery, trust negotiation, and accountability as a single four-layer trust substrate for the Internet of Agents.

## The Failure of Protocol-First Agent Stacks
The emergence of the Internet of Agents (IoA) requires agents to discover peers, delegate tasks, and negotiate trust across organizational boundaries. Protocols like Model Context Protocol (MCP) and Agent-to-Agent Protocol (A2A) focus heavily on communication interoperability—how agents exchange messages and invoke tools. However, security is relegated to a secondary concern, often addressed via transport-layer encryption or runtime policy evaluations. This structure proves insufficient because agents make non-deterministic decisions and operate with delegated authority. Existing trust overlays, such as Microsoft’s AgentMesh, enforce least-privilege through runtime policy evaluation or behavioral attestation. The paper argues this is inadequate because a misconfigured policy or a compromised attestor can silently widen an agent's capabilities. This leaves a fundamental gap: the IoA lacks a trust plane that binds identity, authorization, and accountability into a coherent, verifiable structure that holds even when downstream policy engines fail.

## Agent Identity Cards and Verifiable Manifests
InterSAGE addresses this gap by introducing four layer-aligned design primitives. The first is the Agent Identity Card (AIC) at Layer 0 (Persistent Identity). Unlike prior models that bind identity to a single dimension (like a workload instance or client application), the AIC cryptographically binds four identity dimensions—developer, code package, operator, and deployment context—into a single verifiable credential. This forces an attacker who compromises the operator’s deployment to still fail to impersonate a different developer or substitute a different code package because each dimension carries its own independently verifiable signature. Layer 1 (Discovery) builds on this by requiring capability-aware discovery. When an agent advertises a skill or tool, that advertisement is a signed Verifiable Credential (VC) whose subject is the agent’s DID. Requesters verify this manifest VC for supply-chain authenticity and permission alignment against the agent’s maximum capability boundary ($S_{max}$) before interaction starts.

## Monotonic Attenuation and Kernel-Mediated Tracing
Layer 2 (Trust Negotiation) introduces a structural invariant for least privilege. InterSAGE combines monotonic capability attenuation with a two-tier access control model that separates infrastructure-tier cryptographic verification from application-tier declarative policy. The divergence here is that capability boundaries are encoded directly into signed credentials, and application policy is evaluated on a separate, independent path. This prevents any downstream policy edit from granting capabilities that the preceding stage did not authorize. Finally, Layer 3 (Accountability) ensures non-repudiation without relying on a consensus ledger. Every agent action is recorded in a tamper-evident hash chain and signed by the agent’s kernel-protected private key. This kernel-mediated cryptographic audit trail binds usage and execution traces directly to the agent identity, allowing agents to prove their history in resource-constrained environments where global ledgers are unviable.

## Limitations
Detailed cryptographic proofs, performance benchmarks, and production deployment experiences are deferred to companion publications currently in preparation.

## What practitioners should do
* Implement cryptographic binding across developer, code package, operator, and deployment context when establishing agent identities.
* Treat discovery results not as self-declared descriptions, but as verifiable capability credentials tied to the agent's DID.
* Design delegation chains that enforce monotonic capability attenuation at the credential issuance stage, independent of runtime policy engines.
* Ensure agent execution traces are signed via a trusted, kernel-protected mechanism to guarantee non-repudiation.

## Verdict
Read this for ML engineers and security researchers designing next-generation agent infrastructure; otherwise, skim.

---

## Den's Take

The paper presents a robust architectural vision for grounding agent trust, moving beyond mere communication protocols to enforce verifiable identity and capability boundaries. However, the emphasis on cryptographic binding across four dimensions (developer, code, operator, context) feels like a necessary but insufficient first step. I predict that while InterSAGE might successfully prevent external impersonation based on credential forgery, it will struggle against internal, goal-oriented deviation. If an agent, correctly authenticated by the AIC, is intentionally steered by a prompt injection attack to misuse its authorized capabilities—for instance, using its legitimately granted tool access to exfiltrate data in a novel way—the system's reliance on monotonic attenuation alone may not catch the semantic drift. This moves the security problem from "who are you?" to "what are you *actually* doing?" This mirrors the concern I raised regarding the structural risks of LLMs causing expert reliance, as the trust substrate only verifies the *permission*, not the *intent* of the execution.