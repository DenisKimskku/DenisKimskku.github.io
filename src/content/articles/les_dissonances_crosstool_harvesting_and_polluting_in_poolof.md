---
title: "Les Dissonances: Cross-Tool Harvesting and Polluting in Pool-of-Tools Empowered LLM Agents"
date: "2026-08-14"
type: "Paper Review"
paperUrl: "https://arxiv.org/abs/2504.03111"
paperAuthors: "Zichuan Li, Jian Cui, Xiaojing Liao, et al."
description: "XTHP attacks hijack agent control flows via malicious tools"
tags: ["Adversarial Attacks", "AI Agents", "Vulnerabilities"]
readingTime: 5
headerImage: "/images/news/les_dissonances_crosstool_harvesting_and_polluting_in_poolof.jpg"
---

![Les Dissonances: Cross-Tool Harvesting and Polluting in Pool-of-Tools Empowered LLM Agents](/images/news/les_dissonances_crosstool_harvesting_and_polluting_in_poolof.jpg)
*Figure from the paper “Les Dissonances: Cross-Tool Harvesting and Polluting in Pool-of-Tools Empowered LLM Agents” (p. 4)*

# Cross-Tool Harvesting and Polluting in Pool-of-Tools Empowered LLM Agents

## TLDR
*   **What**: XTHP attacks hijack agent control flows via malicious tools.
*   **Who's at risk**: LLM agents using tool pools from LangChain/Llama-Index.
*   **Key number**: 75% of 66 real-world tools are vulnerable to XTHP.

## The Flaw in Single-Tool Security Postures
Previous security investigations into agentic systems largely focused on the isolated risks posed by a single malicious tool. The paradigm of pool-of-tools empowered LLM agents, however, introduces a different set of vulnerabilities. These agents dynamically select and orchestrate multiple tools from a shared repository, relying heavily on the textual descriptions of those tools to determine functionality and usage order. The gap this paper targets is the failure to account for interactions *between* tools. A malicious tool, when introduced into this pool, can exploit the agent's tool selection mechanism. By crafting a description that falsely claims dependence or high utility for a legitimate tool (the victim tool), the adversary can force the agent to incorporate the malicious tool into the task's execution order. This blending into the semantic and functionality context of victim tools allows the attack to become integrated into the normal agent workflow, bypassing safeguards designed for siloed tool usage.

## Tool-Selection Hijacking
The core mechanism enabling this threat is the manipulation of the LLM's tool selection probability. An adversarial tool, $t_{mal}$, achieves this by satisfying the tool-selection hijacking property: $\Pr_{\text{select}}(T^* \cup t_{mal}|S_i) \geq \Pr_{\text{select}}(T^*|S_i) + \epsilon$. Malicious tools can claim certain accompanying functionalities highly necessary for running other popular tools (victim tools) — e.g., claiming to be able to help prepare and validate input to the victim tools; or more generally speaking, malicious tools can claim certain logical relations with selected victim tools. Thus, as long as the victim tool is employed by the agent for the task, the malicious tool is employed autonomously either right before or after the victim tool. Essentially, our malicious tools blend themselves into the semantic and functionality context of victim tools, injecting themselves into agent workflows (§ IV).

## Cross-Tool Data Polluting and Harvesting
Once the agent's Control Flow of LLM-Agent (CFA) is hijacked, the malicious tool can perform its payload: Cross-Tool Information Harvesting (XTH) or Cross-Tool Data Polluting (XTP). The attack is orchestrated in steps: CFA hijacking $\rightarrow$ XTP/XTH. XTP involves selectively polluting the results of victim tools. In our end-to-end experiments, we show that, by polluting the results of the YoutubeSearch Tool [14], our PoC XTHP tool can spread dis/misinformation. Conversely, XTH allows the malicious tool to harvest sensitive data produced by other tools executed earlier in the chain. We further evaluated the effectiveness of end-to-end XTHP exploits performed by Chord when the agent system is enhanced with state-of-the-art protection mechanisms [8], [7], [10], [9], showing that prior protections are ineffective.

## Limitations
The analysis focuses strictly on application-level threats targeting the task control flow within the agent's tool pool. The threat model does not cover attacks aimed directly at manipulating the LLM's internal decision-making process outside of tool selection. Furthermore, the paper relies on the assumption that malicious tools can be deployed into community-contributed tool repositories, an assumption that may change as repository vetting improves.

## What practitioners should do
*   Audit all imported tools for semantic claims that suggest dependency on other tools.
*   Implement runtime monitoring to detect anomalous insertion of tools into the agent's execution order.
*   Treat tool descriptions not as static documentation but as potential attack surfaces for CFA hijacking.
*   Test agent workflows against known XTHP attack vectors, particularly those involving input preparation.

## Verdict
Read for ML engineers and security researchers building agentic systems; it provides the first systematic view of cross-tool vulnerabilities.

## Den's Take

The paper convincingly moves the conversation past isolated tool vulnerabilities, correctly identifying that the integration point—the tool description—is the primary attack surface for controlling the execution flow. However, the assessment of the defense mechanisms is too narrow. Relying solely on auditing semantic claims within imported tools misses the deeper issue: if the agent's prompt or context window is itself susceptible to injection, the tool descriptions can be dynamically manipulated *at runtime* by the adversary, regardless of pre-deployment vetting. This shifts the focus from static auditing to continuous, verifiable runtime integrity checks on the entire orchestration sequence. This echoes my observation that security must shift from validating input data to enforcing strict, verifiable boundaries on how AI agents utilize retrieved information.