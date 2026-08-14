---
title: "FirmAgent: Leveraging Fuzzing to Assist LLM Agents with IoT Firmware Vulnerability Discovery"
date: "2026-08-14"
type: "Paper Review"
description: "Hybrid framework uses fuzzing to locate input sources for LLM taint analysis"
tags: ["AI Agents", "Fuzzing", "Vulnerabilities"]
readingTime: 5
headerImage: "/images/news/firmagent_leveraging_fuzzing_to_assist_llm_agents_with_iot_f.jpg"
---

![FirmAgent: Leveraging Fuzzing to Assist LLM Agents with IoT Firmware Vulnerability Discovery](/images/news/firmagent_leveraging_fuzzing_to_assist_llm_agents_with_iot_f.jpg)
*Figure from the paper “FirmAgent: Leveraging Fuzzing to Assist LLM Agents with IoT Firmware Vulnerability Discovery” (p. 6)*

# FirmAgent: Fuzzing-Guided Taint Analysis for IoT Firmware Vulnerability Discovery

## TLDR
* **What**: Hybrid framework uses fuzzing to locate input sources for LLM taint analysis.
* **Who's at risk**: IoT devices running Linux-based firmware with exposed web services.
* **Key number**: Identified 182 vulnerabilities with a precision of 91% on 14 firmware samples.

## The Disparity Between Fuzzing and Static Taint Analysis

Security analysis of Internet of Things (IoT) firmware faces a dual problem: static analysis yields high false positives, while dynamic analysis, like fuzzing, often misses vulnerable code paths. Static analysis tools typically rely on shared keyword matching to guess where external input enters the program, but this is inaccurate; for example, on one vendor's firmware, only 21.6% of candidate source functions actually accepted external inputs. Furthermore, static analysis struggles with indirect calls, causing taint loss, as seen in Figure 1 where a vulnerability was missed because the target function was treated as an isolated node. Conversely, fuzzing, while excellent at finding initial input points, suffers from limited code coverage. In IoT firmware, critical logic is often locked behind specific URIs or configuration settings. As demonstrated by Table III, fuzzing only reached about 25% of sink points on average across the tested samples, leaving a large number of potential vulnerabilities completely unexplored.

## Fuzzing-Driven Information Collection

FirmAgent capitalizes on the observation that fuzzing is highly effective at covering shallow execution paths where input sources reside, while static analysis offers broader path exploration. The core idea is to use fuzzing not for full path tracing, but specifically to accurately pinpoint *where* external input arrives. To overcome the issue of unreachable service handlers (Challenge C1), FirmAgent first performs a pre-fuzzing analysis to extract three elements: registered URIs, input keywords, and sink function address ranges mapped to basic block distances. This guides the fuzzing process. To manage the computational cost of tracking every possible input, the framework implements a lightweight memory-based detection mechanism using QEMU to efficiently identify external inputs and dynamically complete call graphs. This process yields the precise source points ($\text{C}_{\text{source}}$) required to initiate the next phase.

## Taint-to-PoC Agent

With accurate starting points provided by the fuzzing phase, FirmAgent deploys two specialized LLM agents to drive the analysis forward. The first is the taint propagation agent module, which performs precise taint propagation analysis starting from the $\text{C}_{\text{source}}$ locations identified dynamically. This bypasses the limitations of traditional static engines concerning aliasing and semantic understanding. The second agent is the PoC generation agent module. This module automates the final validation step, which is usually a massive manual burden. By leveraging the execution context derived from fuzzing, the PoC generation agent constructs actionable test cases. Results show that 91.8% of the PoCs were directly valid, confirming the practical value of our LLM-guided PoC generation process.

## Limitations

The current framework assumes the target firmware can be rehosted using a single-service rehosting framework. The paper does not detail how FirmAgent handles complex hardware state dependencies beyond those surfaced by the initial fuzzing runs, which could cause the system to fail to trigger vulnerabilities in production environments.

## What practitioners should do

* Prioritize implementing mechanisms to extract service handler URIs and input keywords before beginning automated fuzzing campaigns on firmware.
* Use dynamic analysis tools primarily to generate a high-fidelity set of input source points rather than relying on them for complete vulnerability coverage.
* When triaging alerts from static analysis, use fuzzing-derived execution context to validate data flow paths and automate PoC construction.
* Recognize that the framework's effectiveness is contingent on the ability to rehost the target firmware for execution monitoring.

## Verdict

Read this paper if you are working on bridging the gap between dynamic and static analysis in embedded or IoT security research. Skip it if you only require standard static or dynamic analysis tooling implementations.

## Den's Take

What FirmAgent presents is a pragmatic synthesis of two historically siloed techniques—fuzzing and static taint analysis—to tackle the low-level complexity of IoT firmware. However, the paper understates the inherent fragility introduced by shoehorning complex, low-level C semantics into an LLM agent. The reliance on the LLM for taint propagation, even when guided by precise $\text{C}_{\text{source}}$ points, still forces the system to operate under the assumption that the LLM can perfectly map abstract code flow to concrete memory states. I predict that in real-world, highly optimized, or heavily obfuscated firmware, the LLM agent will fail to reliably track taint across complex control flow transfers, meaning the 91.8% PoC success rate will collapse when faced with production-grade complexity. This mirrors the systemic issue prior work noted regarding the malleability of internal representations in LLMs, even when presented with seemingly structured input.