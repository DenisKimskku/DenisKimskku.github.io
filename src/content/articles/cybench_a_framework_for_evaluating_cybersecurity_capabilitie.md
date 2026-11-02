---
title: "Cybench: A Framework for Evaluating Cybersecurity Capabilities and Risks of Language Models"
date: "2026-11-03"
type: "Paper Review"
description: "Cybench provides a framework using professional CTF tasks to test LM agents"
tags: ["AI Agents"]
readingTime: 5
headerImage: "/images/news/cybench_a_framework_for_evaluating_cybersecurity_capabilitie.jpg"
paperUrl: "https://arxiv.org/abs/2408.08926"
---

![Cybench: A Framework for Evaluating Cybersecurity Capabilities and Risks of Language Models](/images/news/cybench_a_framework_for_evaluating_cybersecurity_capabilitie.jpg)
*Figure from the paper “Cybench: A Framework for Evaluating Cybersecurity Capabilities and Risks of Language Models” (p. 2)*

# Cybench: A Framework for Evaluating Cybersecurity Capabilities and Risks of Language Models

## TLDR
*   **What**: Cybench provides a framework using professional CTF tasks to test LM agents.
*   **Who's at risk**: Policymakers, model providers, and researchers deploying LM agents in cyber roles.
*   **Key number**: Without subtask guidance, agents leveraging Claude 3.5 Sonnet, GPT-4o, OpenAI o1-preview, and Claude 3 Opus successfully solved complete tasks that took human teams up to 11 minutes to solve. In comparison, the most difficult task has a first solve time of 24 hours and 54 minutes, a 136x increase.

## The Gap Between Knowledge and Execution
The capability of Large Language Model (LM) agents to operate in cybersecurity contexts presents high-stakes potential, applicable both offensively and defensively. Existing evaluations of these capabilities, including those based on Capture The Flag (CTF) challenges, are often limited in scope or lack transparency. While some efforts assess general cybersecurity knowledge, they do not provide an open-source, structured way to test autonomous execution. Specifically, previous benchmarks often relied on non-open-source CTF competitions or lacked the granularity needed to assess complex, multi-step attacks. A significant gap exists in moving beyond simple knowledge recall to rigorous, repeatable assessment of an agent's ability to navigate a live, command-line environment to achieve a specific, complex goal—like extracting a flag.

## Cybench's Subtask Discretization
Cybench addresses this by introducing the concept of subtasks. Rather than treating a complex CTF challenge as a single binary success or failure event, Cybench discretizes the goal into intermediary, sequential objectives. For instance, a large task might be broken down into subtasks such as "identify the leaked credentials," "identify the insecure code," "craft an exploit," and finally, "retrieve the secret." This structure allows for granular scoring via "Subtask performance," which tracks the fraction of smaller goals solved, offering a much richer diagnostic signal than simple unguided performance. This framework allows researchers to see *where* an agent fails in a complex exploit chain, rather than just noting that the final goal was missed.

## Agent Scaffolding and Performance Scaling
The framework allows for controlled experimentation on the agent's interaction style, which we term "agent scaffolding." The core mechanism involves an agent operating in an Act-Execute-Update loop within a Kali Linux container. The agent generates a response structured with five fields: Reflection, Plan and Status, Thought, Log, and Action. The Action field dictates the next step, which is either a `Command:` (a bash command) or `Answer:`. By manipulating the response structure—for example, using an `action-only` response or routing output through a `pseudoterminal`—we observe how the agent's expressivity affects performance. For example, we found that Claude 3.5 Sonnet outperforms and GPT-4o underperforms the structured bash agent scaffold when using the pseudoterminal and web search features.

## Limitations
The current evaluation relies on 40 tasks sourced from professional-level CTF competitions spanning 2022–2024. The threat models tested are confined to the specific environments constructed in Cybench (Kali Linux containers). Assumptions about the generalizability of these tasks to novel, zero-day enterprise environments remain untested. Furthermore, the evaluation of agent scaffolding is model-dependent, meaning performance gains observed for one model may not translate directly to others.

## What practitioners should do
*   Use Cybench to establish a standardized, open-source baseline for comparing cybersecurity agent capabilities across different LMs.
*   When deploying agents, observe performance across subtask modes to pinpoint specific failure points in the attack chain rather than only observing final failure.
*   Investigate how the choice of agent scaffolding (e.g., action-only versus pseudoterminal) impacts performance for your specific deployment model.
*   Benchmark against the difficult tasks, which have First Solve Times (FST) exceeding 11 minutes, to gauge real-world operational readiness.

## Verdict
Read this paper if you are developing or auditing autonomous agents intended for cybersecurity roles; skim if your focus is purely on foundational LLM capabilities outside of execution environments.

---

## Den's Take

The paper presents a valuable structural approach to agent evaluation by discretizing complex goals into subtasks. However, I find the reliance on pre-packaged CTF scenarios to define "operational readiness" to be a weak premise, given the context of real-world deployment. Being confined to a Kali Linux container environment fundamentally limits the observed attack surface. The demonstrated performance gains are only relevant to the specific scaffolding employed.