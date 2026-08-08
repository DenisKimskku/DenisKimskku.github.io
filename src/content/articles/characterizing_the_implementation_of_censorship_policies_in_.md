---
title: "Characterizing the Implementation of Censorship Policies in Chinese LLM Services"
date: "2026-08-09"
type: "Paper Review"
description: "Characterizing the Implementation of Censorship Policies in Chinese LLM Services"
tags: ["AI Security"]
readingTime: 5
headerImage: "/images/news/characterizing_the_implementation_of_censorship_policies_in_.jpg"
---

![Characterizing the Implementation of Censorship Policies in Chinese LLM Services](/images/news/characterizing_the_implementation_of_censorship_policies_in_.jpg)
*Figure from the paper “Characterizing the Implementation of Censorship Policies in Chinese LLM Services” (p. 6)*

# Characterizing Overt Blocking Mechanisms in Chinese LLM Service Workflows

## TLDR
* Overt blocking is embedded in input, output, and search phases.
* Chinese LLM services (Baidu-Chat, Qwen, etc.) are at risk.
* Input blocking is persistently observed across multiple services.

## What it is & who is affected
This research investigates overt, external censorship mechanisms implemented within popular Chinese Large Language Model (LLM) services, moving beyond studies focused solely on model-internal alignment. The authors leveraged man-in-the-middle traffic analysis during live chat sessions to map where blocking decisions occur in the service workflow. We observe a persistent reliance on traditional, dated blocking strategies in prominent services: Baidu-Chat, DeepSeek, Doubao, Kimi, and Qwen. These services, which are subject to strict, legally mandated censorship standards from regulatory bodies like the Cyberspace Administration of China, reveal how service providers balance global competition with domestic content restrictions.

## Key findings
The investigation established a composite model detailing blocking placements across the LLM service lifecycle. The study observed that blocking is enacted during three distinct phases: the input, output, and search stages. Specifically concerning input filtering, the research found that input blocking queries were persistently observed across samples for DeepSeek, Qwen, Kimi, and Doubao. This consistency in the input phase suggests robust, external filtering at the entry point. In contrast, the authors noted that output blocking exhibited significantly less consistency across the tested services. Regarding search behaviors, while all services are capable of choosing to skip the search stage, with the exception of DeepSeek, they are not likely to do so. We also find significant overlap in telemetry and analytics infrastructure between the services, with DeepSeek, Kimi, and Doubao sending logs to the same Autonomous System.

## Limitations
The scope of this work remains focused on overt, external blocking strategies separate from the underlying models themselves. Threat models concerning adversarial attacks aimed at bypassing these external filters were not covered. Moreover, the study relies on analyzing live deployments, and the assumptions made regarding the consistency of traffic decryption and the stability of the service endpoints may break down in more volatile production environments.

## What practitioners should do
* Investigate the telemetry infrastructure of deployed LLM services, given the shared logging observed between services like DeepSeek, Kimi, and Doubao.

## Verdict
Read — this paper provides necessary technical evidence for practitioners operating or auditing LLMs in heavily regulated environments.

## Den's Take

The paper’s focus on *overt* blocking is necessary, but it misses the larger point: these external filters are merely the first layer of defense, and they are brittle. The consistent input filtering observed across several services doesn't equate to security; it just means the boundary is clearly defined and easily observable. My concern is that practitioners reading this will treat these external checks as a complete security solution. They are not. A determined attacker targeting the RAG pipeline, for example, will not necessarily try to bypass the initial input filter but will look for the points where the retrieved context is injected or where the model's internal reasoning is manipulated, potentially exploiting the information leakage noted in the output phase. This external monitoring is a compliance check, not a security guarantee.