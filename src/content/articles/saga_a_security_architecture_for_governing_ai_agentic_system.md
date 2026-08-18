---
title: "SAGA: A Security Architecture for Governing AI Agentic Systems"
date: "2026-08-14"
type: "Paper Review"
paperUrl: "https://arxiv.org/abs/2504.21034"
paperAuthors: "Georgios Syros, Anshuman Suri, Jacob Ginesin, et al."
description: "SAGA provides a framework for user-controlled governance of autonomous LLM agents"
tags: ["Adversarial Attacks", "AI Agents"]
readingTime: 5
headerImage: "/images/news/saga_a_security_architecture_for_governing_ai_agentic_system.jpg"
---

![SAGA: A Security Architecture for Governing AI Agentic Systems](/images/news/saga_a_security_architecture_for_governing_ai_agentic_system.jpg)
*Figure from the paper “SAGA: A Security Architecture for Governing AI Agentic Systems” (p. 2)*

# SAGA: A Security Architecture for Governing AI Agentic Systems

## TLDR
*   **What**: SAGA provides a framework for user-controlled governance of autonomous LLM agents.
*   **Who's at risk**: Agents deployed in safety-critical applications like healthcare and finance.
*   **Key number**: The system evaluation showed that this architecture maintains system utility with minimal performance overhead across various agentic tasks.

## The Gap in Agentic System Management
As LLM agents gain autonomy, they begin to interact and delegate tasks across systems. This raises security concerns regarding identity, communication, and who controls these autonomous entities. Current designs, even those addressing agent identity and authorization, often remain theoretical. The core failure point, as identified, is the lack of concrete, user-controlled agent management. For instance, while protocols like A2A exist for agent communication, they lack the necessary policy enforcement or runtime mediation against adversarial agents. Furthermore, existing solutions are siloed; secure messaging protocols lack fine-grained access control, and high-granularity access control systems lack secure communication capabilities. The need is an integrated framework where users retain oversight over the entire agent lifecycle—from registration to termination—while enabling complex inter-agent collaboration securely.

## Access Contact Policy and Cryptographic Bounding
SAGA tackles this by introducing the concept of an Access Contact Policy, which is user-defined and enforced by the Provider service. This policy dictates precisely which other agents are permitted to initiate contact with a specific agent. To ensure this policy is enforced without constant reliance on the centralized Provider for every message, SAGA employs a cryptographic mechanism based on Access Control Tokens. Instead of relying on a single-use key for every interaction, the receiving agent generates an Access Control Token encrypted under a dynamically derived shared key. This shared key is unique to the initiating–receiving agent pair and is established using a Diffie-Hellman key exchange protocol, leveraging long-term Access Control Keys maintained by each agent. This token structure allows for fine-grained control while enabling direct, scalable communication over TLS channels once the initial setup is complete.

## One-Time Keys and Token Lifecycles
The mechanism for generating these shared keys and tokens hinges on public One-Time Keys (OTKs) registered with the Provider. Each agent registers a set of public OTKs with specific quotas for each potential initiating agent. When Agent A wants to talk to Agent B, Agent A queries the Provider for Agent B's metadata, including an OTK. Agent A then uses this OTK in the Diffie-Hellman exchange to derive the shared key with Agent B. Agent B then encrypts the Access Control Token using this shared key. This token contains an expiration timestamp and a request limit. When this token is spent or expires, Agent A must retrieve a new OTK from the Provider to obtain a fresh token. The architecture is asymmetric: access control is enforced on the receiving agent based on the user-specified policies for the initiating agent.

## Limitations
The security guarantees of SAGA rely on several assumptions, notably that the Provider implements robust user authentication and that agent registration is restricted to verified human users. The design also assumes that all agents operate under globally routable, public IP addresses, which precludes local network discovery scenarios. Furthermore, the entire framework assumes the cryptographic primitives utilized are sound and that the Provider, while potentially honest-but-curious, adheres strictly to the SAGA protocol logic.

## What practitioners should do
*   Define granular Access Contact Policies for every agent to restrict incoming communication based on required task dependencies.
*   Ensure that user authentication mechanisms used to register agents with the Provider are robust against credential compromise.
*   Be aware that the system's security relies on the integrity of the central Provider for initial key distribution and policy enforcement.
*   Tune the OTK quotas and Access Control Token lifetimes to balance the desired security window against operational performance overhead.

## Verdict
Read this paper if you are designing or hardening agentic systems in regulated or high-stakes environments; otherwise, skip it.

## Den's Take

While SAGA presents a detailed cryptographic scaffolding for governing agent interaction, I remain unconvinced that shifting the burden to a centralized "Provider" solves the fundamental trust problem. The paper’s reliance on the Provider to maintain and distribute One-Time Keys and enforce policy means that a compromise of that central service immediately collapses the entire access control structure. This architecture simply moves the single point of failure from the agent logic to the key management infrastructure. Furthermore, the paper glosses over the difficulty of ensuring that the *intent* behind agent communication—which is often opaque in LLM workflows—is being correctly mapped to the granular Access Contact Policies. This feels like an engineering solution to a semantic problem.