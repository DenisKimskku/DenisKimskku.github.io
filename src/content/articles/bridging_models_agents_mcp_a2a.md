---
title: "Bridging Models and Agents: Protocol Architectures and Security in MCP & A2A"
date: "2026-03-18"
type: "Research Paper"
description: "We analyze the architectures and security models of Model Context Protocol (MCP) and Agent-to-Agent (A2A) protocol, uncovering attack vectors and proposing mitigations for secure multi-agent AI systems."
tags: ["MCP", "A2A", "AI Agents", "Protocol Security", "Multi-Agent Systems", "LLM Security"]
---

# Bridging Models and Agents: Protocol Architectures and Security in MCP & A2A

The era of isolated AI models is ending. Today's AI systems are evolving into **autonomous agents** that discover external APIs, access live data, collaborate with other agents, and take actions in the real world. This transition from passive models to active agents demands new communication protocols—and those protocols introduce new attack surfaces.

This is the focus of our paper, "[Bridging Models and Agents: Protocol Architectures and Security in MCP & A2A](https://deniskim1.com/papers/cisc_s_25/cisc_s_25_paper.pdf)," presented at **CISC-S 2025 (Conference on Information Security and Cryptology - Summer)**.

We analyze two emerging protocols that are shaping how AI agents interact with the world and each other: **Model Context Protocol (MCP)** for model-to-tool communication and **Agent-to-Agent (A2A)** for inter-agent collaboration. We examine their architectures, identify potential attack vectors, and propose mitigation strategies for building secure multi-agent AI systems.

---

## From Models to Agents

### The Evolution of AI Systems

| Generation | Capability | Communication | Example |
|-----------|-----------|---------------|---------|
| **Static Models** | Answer questions from training data | None (input → output) | GPT-3 text completion |
| **Tool-Augmented Models** | Access external tools and APIs | Unstructured function calls | ChatGPT Plugins |
| **MCP-Enabled Models** | Discover and interact with standardized tool interfaces | Structured protocol (MCP) | Claude with MCP servers |
| **Multi-Agent Systems** | Collaborate with other autonomous agents | Inter-agent protocol (A2A) | Agent swarms, task delegation |

This evolution creates a critical need for standardized, secure communication protocols. Without them, every integration is a custom implementation with its own security assumptions and failure modes.

---

## Model Context Protocol (MCP)

MCP, developed by Anthropic, provides a standardized framework for AI models to **discover and interact with external data sources and APIs**.

### Architecture

MCP follows a client-server architecture:

| Component | Role | Examples |
|-----------|------|---------|
| **MCP Host** | The AI application that initiates connections | Claude Desktop, IDE extensions |
| **MCP Client** | Protocol handler within the host | Manages server connections |
| **MCP Server** | Provides tools, resources, and prompts | Database connectors, API wrappers, file system access |

### Core Capabilities

MCP servers expose three types of capabilities to AI models:

1. **Tools**: Executable functions the model can invoke (e.g., query a database, send an email, create a file)
2. **Resources**: Data sources the model can read (e.g., file contents, API responses, database records)
3. **Prompts**: Pre-built prompt templates for common workflows

### Communication Flow

A typical MCP interaction follows this pattern:

1. **Discovery**: The client queries the server for available tools, resources, and prompts
2. **Selection**: The AI model decides which tool to use based on the user's request
3. **Invocation**: The client sends a structured request to the server
4. **Execution**: The server executes the tool and returns results
5. **Integration**: The model incorporates the results into its response

### Transport Mechanisms

MCP supports two transport protocols:

| Transport | Use Case | Characteristics |
|-----------|----------|-----------------|
| **stdio** | Local server processes | Fast, secure (same machine), no network exposure |
| **HTTP + SSE** | Remote servers | Network-accessible, requires authentication and encryption |

---

## Agent-to-Agent Protocol (A2A)

A2A, developed by Google, enables **secure collaboration between autonomous AI agents**. While MCP connects models to tools, A2A connects agents to other agents.

### Architecture

A2A uses a peer-to-peer architecture with role-based interactions:

| Component | Role | Description |
|-----------|------|-------------|
| **Client Agent** | Task initiator | Discovers remote agents and delegates tasks |
| **Remote Agent** | Task executor | Advertises capabilities and processes delegated tasks |
| **Agent Card** | Capability advertisement | JSON metadata describing an agent's skills, endpoints, and authentication requirements |

### Core Concepts

1. **Agent Cards**: Standardized capability descriptions that enable agent discovery. An Agent Card specifies what tasks an agent can handle, what inputs it requires, and how to communicate with it.

2. **Tasks**: The fundamental unit of work in A2A. A task has a lifecycle: submitted → working → completed/failed. Tasks can produce artifacts (output data) and include streaming updates.

3. **Artifacts**: Structured outputs produced by task execution. An artifact can be text, files, structured data, or any other content type.

4. **Push Notifications**: Asynchronous updates that allow long-running tasks to report progress without polling.

### Communication Flow

1. **Discovery**: Client agent fetches the remote agent's Agent Card
2. **Negotiation**: Client verifies capability match and authentication requirements
3. **Delegation**: Client submits a task with input parameters
4. **Execution**: Remote agent processes the task, potentially streaming updates
5. **Completion**: Remote agent returns artifacts and final status

---

## Security Analysis

### MCP Attack Vectors

We identify several potential attack surfaces in the MCP architecture:

#### 1. Tool Poisoning

| Attack | Mechanism | Impact |
|--------|-----------|--------|
| **Malicious Tool Definitions** | A compromised MCP server advertises tools with misleading descriptions | Model invokes a tool believing it performs one action, but it executes something else entirely |
| **Shadowing** | Malicious server registers a tool with the same name as a trusted tool | Model routes requests to the attacker's implementation |
| **Rug Pull** | Tool behavior changes after initial trust is established | Trusted tool begins exfiltrating data or executing malicious commands |

#### 2. Prompt Injection via Tool Results

A malicious MCP server can embed prompt injection payloads in tool results. When the model processes these results, the injected instructions can hijack the model's behavior:

- Redirect the model to invoke other tools with attacker-controlled parameters
- Exfiltrate sensitive data from the conversation context
- Override the user's original instructions

#### 3. Data Exfiltration

MCP tools that have access to sensitive data (file systems, databases, APIs) create exfiltration channels:

- A compromised tool can silently copy accessed data to external servers
- Cross-tool attacks: one tool reads sensitive data, another tool (controlled by the attacker) transmits it

#### 4. Excessive Permission Scope

MCP servers may request broader permissions than necessary:

- File system access beyond the intended working directory
- Network access that enables data exfiltration
- System command execution capabilities

### A2A Attack Vectors

#### 1. Agent Impersonation

| Attack | Mechanism | Impact |
|--------|-----------|--------|
| **Fake Agent Cards** | Attacker creates agents with fraudulent capability descriptions | Client agents delegate sensitive tasks to malicious agents |
| **Man-in-the-Middle** | Attacker intercepts agent-to-agent communication | Modify task parameters, steal artifacts, inject false results |

#### 2. Task Manipulation

- **Input Poisoning**: Submitting tasks with adversarial inputs designed to exploit the remote agent
- **Result Tampering**: Modifying artifacts returned by remote agents before they reach the client
- **Task Hijacking**: Taking over long-running tasks by spoofing progress notifications

#### 3. Cascading Trust Issues

In multi-agent workflows, trust is transitive. If Agent A trusts Agent B, and Agent B delegates to Agent C, then Agent A implicitly trusts Agent C. This creates:

- **Trust chain attacks**: Compromising one agent in a chain compromises all downstream tasks
- **Privilege escalation**: A low-privilege agent can access high-privilege resources through delegation chains
- **Accountability gaps**: It becomes unclear which agent is responsible for a malicious action

---

## Proposed Mitigations

### For MCP

| Mitigation | Strategy | Implementation |
|-----------|----------|----------------|
| **Tool Verification** | Cryptographic signing of tool definitions | Verify tool identity and integrity before invocation |
| **Sandboxed Execution** | Run tools in isolated environments with minimal permissions | Contain blast radius of compromised tools |
| **Result Sanitization** | Filter tool outputs for prompt injection patterns | Prevent injected instructions from reaching the model |
| **Least Privilege** | Grant tools only the minimum permissions required | Reduce attack surface for data exfiltration |
| **Audit Logging** | Record all tool invocations and results | Enable post-incident analysis and anomaly detection |

### For A2A

| Mitigation | Strategy | Implementation |
|-----------|----------|----------------|
| **Agent Authentication** | Mutual TLS and signed Agent Cards | Verify agent identity before delegation |
| **Capability Attestation** | Third-party verification of agent capabilities | Prevent fraudulent Agent Cards |
| **Task Isolation** | Separate execution contexts for each delegated task | Prevent cross-task data leakage |
| **Trust Boundaries** | Explicit trust levels with capability restrictions at each boundary | Limit cascading trust propagation |
| **Rate Limiting** | Cap the number of tasks an agent can submit or accept | Prevent resource exhaustion and amplification attacks |

### Cross-Protocol Security

When MCP and A2A are used together (e.g., an agent uses MCP to access tools and A2A to delegate to other agents), the combined attack surface multiplies:

1. **Enforce end-to-end authentication** across both protocol boundaries
2. **Implement unified audit trails** that span tool invocations and agent delegations
3. **Apply defense-in-depth**: don't rely on a single protocol's security mechanisms

---

## Design Recommendations for Secure Multi-Agent Systems

Based on our analysis, we propose several design principles for building secure systems that leverage MCP and A2A:

1. **Zero Trust by Default**: Never assume that a tool or agent is trustworthy based solely on its self-reported capabilities. Verify everything.

2. **Capability-Based Security**: Define fine-grained capabilities and enforce them at the protocol level, rather than relying on broad permission grants.

3. **Transparency and Explainability**: Users should be able to see which tools were invoked, which agents were consulted, and what data flowed between them.

4. **Graceful Degradation**: When a tool or agent is unavailable or untrusted, the system should fall back to safe defaults rather than failing catastrophically.

5. **Continuous Monitoring**: Real-time monitoring of tool usage patterns and agent communication for anomaly detection.

---

## Summary

Our paper makes three contributions to the understanding of emerging AI agent protocols:

1. **Architectural Analysis**: We provide a detailed comparison of MCP and A2A architectures, clarifying their complementary roles in the AI agent ecosystem—MCP for model-to-tool communication, A2A for agent-to-agent collaboration
2. **Security Assessment**: We identify concrete attack vectors for both protocols, spanning tool poisoning, prompt injection, agent impersonation, and cascading trust failures
3. **Mitigation Framework**: We propose practical mitigation strategies for securing multi-agent deployments, from cryptographic verification to sandboxed execution

As AI agents become more autonomous and interconnected, the security of their communication protocols becomes a critical infrastructure concern. MCP and A2A represent important steps toward standardization, but **standardization without security analysis is a recipe for systemic risk.** Our work aims to ensure that these protocols are deployed safely, with clear understanding of their trust assumptions and failure modes.

---

**Reference**: Zhang, Y., Kim, M., & Koo, H. (2025). Bridging Models and Agents: Protocol Architectures and Security in MCP & A2A. *Proceedings of the Conference on Information Security and Cryptology - Summer (CISC-S)*.

- **Paper**: [PDF](https://deniskim1.com/papers/cisc_s_25/cisc_s_25_paper.pdf)
- **Slides**: [PDF](https://deniskim1.com/papers/cisc_s_25/cisc_s_25_slides.pdf)
