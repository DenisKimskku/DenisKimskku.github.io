---
title: "AI Security Digest — November 21, 2026: Prompt Injection & Data Poisoning"
date: "2026-11-21"
type: "News Digest"
description: "This digest covers persistent pre-training data poisoning attacks on LLMs, runtime monitoring for agents, and alignment techniques for Video LLMs."
tags: ["LLM Security", "Data Poisoning", "Prompt Injection", "AI Agents", "Adversarial Attacks", "Model Alignment"]
readingTime: 4
headerImage: "/images/news/ai_security_digest__november_21_2026_prompt_injection__data_.jpg"
---

![AI Security Digest — November 21, 2026: Prompt Injection & Data Poisoning](/images/news/ai_security_digest__november_21_2026_prompt_injection__data_.jpg)

# AI Security Digest — November 21, 2026: Prompt Injection & Data Poisoning

Three out of four attack objectives studied in pre-training poisoning show that compromising large language models (LLMs) via dataset manipulation can persist even after alignment fine-tuning.

## Paper Highlights
**Persistent Pre-training Poisoning of LLMs** — by None. Dataset poisoning during the initial training phase can fundamentally compromise an LLM's behavior. Practitioners using web-scraped data for foundational models face persistent, hard-to-detect backdoors.
**Tether: Verified Stateful Policy Engine for System-Level Monitoring of Agents** — by Meghana Aparna Sistla, Alaia Solko-Breslin, Somesh Jha. This work introduces a mechanism for enforcing security policies on the runtime side-effects of autonomous agents. This is relevant for organizations deploying LLM agents that execute external system commands.
**Can Video LLMs Refuse to Answer? Alignment for Answerability in Video Large Language Models** — by None. The paper proposes alignment techniques to enable Video Large Language Models to correctly reject out-of-scope user queries. This addresses the reliability challenge when deploying Video-LLMs in production settings.

## Industry & News
**How to secure AI agents: prompt injection, data leakage and access controls** ([https://news.google.com/rss/articles/CBMihAFBVV95cUxORktWWU9ZdEhhVWNNRDhHTDFMQzJCd3dMUk5tN3E0YUJ0UjdwZi01UFlPbzBlY2t6VGZ6OXR2QVp0cjRoZU5wZ20yam5tZFhRZTdLV3ZWN1l6V29xUDFWcGhwSkxVLWFVLTZRbXRPWk14Tmw5ekUxZUIzbEVTdGRhM1g5dDc?oc=5&hl=en-US&gl=US&ceid=US:en](https://news.google.com/rss/articles/CBMihAFBVV95cUxORktWWU9ZdEhhVWNNRDhHTDFMQzJCd3dMUk5tN3E0YUJ0UjdwZi01UFlPbzBlY2t6VGZ6OXR2QVp0cjRoZU5wZ20yam5tZFhRZTdLV3ZWN1l6V29xUDFWcGhwSkxVLWFVLTZRbXRPWk14Tmw5ekUxZUIzbEVTdGRhM1g5dDc?oc=5&hl=en-US&gl=US&ceid=US:en)) — This article details necessary controls against prompt injection and data leakage when operationalizing AI agents.
**AI Safety Test Exposes a Guardrail Gap: Models Flagged Civilians as Military Targets** ([https://news.google.com/rss/articles/CBMiigFBVV95cUxPWDlJb2hhYW9zb1NHY1A4S2swWlZ2NlJIcVBMYVNKOHF3bThGblRjZGk2aF85MGZBdWhTTG5rVWFXXy01N1VIOGlNLUQ4aDZIaGJpY3RUNlZ4ekdOMmFjYWhhWms1Q1pOY2V6YTVmTmVnSUVWOE9RenY5MDJOQk1TaVpUNUxYOThOSXc?oc=5&hl=en-US&gl=US&ceid=US:en](https://news.google.com/rss/articles/CBMiigFBVV95cUxPWDlJb2hhYW9zb1NHY1A4S2swWlZ2NlJIcVBMYVNKOHF3bThGblRjZGk2aF85MGZBdWhTTG5rVWFXXy01N1VIOGlNLUQ4aDZIaGJpY3RUNlZ4ekdOMmFjYWhhWms1Q1pOY2V6YTVmTmVnSUVWOE9RenY5MDJOQk1TaVpUNUxYOThOSXc?oc=5&hl=en-US&gl=US&ceid=US:en)) — An AI safety evaluation revealed a failure in guardrails, where models incorrectly classified non-combatants as military targets.
**Introducing Tool Retrieval in the Gemini API** ([https://blog.google/innovation-and-ai/technology/developers-tools/gemini-api-tool-retrieval/](https://blog.google/innovation-and-ai/technology/developers-tools/gemini-api-tool-retrieval/)) — This update expands the capabilities of the Gemini Application Programming Interface (API) by allowing models to dynamically select and utilize external tools.
**Introducing harness adapters: adapt your favorite model to your harness to improve performance and cost** ([https://huggingface.co/blog/harness-adapters-at-scale](https://huggingface.co/blog/harness-adapters-at-scale)) — Harness adapters enable users to optimize the performance and expense of using various models within a standardized framework.

## What to Watch
*   **Runtime Verification for Agents**: Expect increased adoption of formal verification methods to monitor the side-effects of LLM agents operating in production.
*   **Adversarial Data Probing**: Techniques targeting pre-training data integrity will continue to mature, forcing shifts toward more robust data curation pipelines.

---

## Den's Take

The emphasis on pre-training poisoning being persistent is expected, but the paper understates the immediate threat vector presented by the runtime complexity of agent orchestration. While dataset manipulation is a foundational risk, the practical danger for organizations deploying systems today lies in the interface between the LLM and its environment. The introduction of tool retrieval, for instance, means that a subtle prompt injection vulnerability—not necessarily a deep, pre-training backdoor—can immediately pivot from text generation to arbitrary system calls. We should be watching the gap between static alignment checks and dynamic, stateful execution environments far more closely than the subtle fingerprints left in the initial training corpus. prior work argued that relying on opaque LLM judges creates a more immediate and exploitable systemic fragility than training-time poisoning attacks.