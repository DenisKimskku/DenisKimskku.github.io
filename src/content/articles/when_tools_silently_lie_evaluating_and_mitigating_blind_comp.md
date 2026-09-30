---
title: "When Tools Silently Lie: Evaluating and Mitigating Blind Compliance in Tool-Augmented Data Agents"
date: "2026-10-01"
type: "Paper Review"
description: "Poisoning tool outputs while keeping source data fixed"
tags: ["Data Poisoning", "AI Agents"]
readingTime: 5
headerImage: "/images/news/when_tools_silently_lie_evaluating_and_mitigating_blind_comp.jpg"
paperUrl: "http://arxiv.org/abs/2609.37153v1"
---

![When Tools Silently Lie: Evaluating and Mitigating Blind Compliance in Tool-Augmented Data Agents](/images/news/when_tools_silently_lie_evaluating_and_mitigating_blind_comp.jpg)
*Figure from the paper “When Tools Silently Lie: Evaluating and Mitigating Blind Compliance in Tool-Augmented Data Agents” (p. 3)*

# Silent Tool Poisoning: Measuring Blind Compliance in Data Agents

## TLDR
*   **What**: Poisoning tool outputs while keeping source data fixed.
*   **Who's at risk**: Data analysis agents using LLMs with external tools.
*   **Key number**: Poisoning lowers task success by 26–39 percentage points.

## The Gap Between Execution and Trustworthiness
Language-model agents frequently delegate computation to tools, using the output to drive analytical decisions. While the tool call itself might execute successfully—for instance, a SQL query runs without error—the returned observation can be subtly corrupted. This is silent tool poisoning: the tool output is plausible but factually incorrect, even though the underlying source data remains pristine. For example, an agent might receive a revenue figure attached to the wrong store, yet the source table holds the correct binding. Current evaluation methods often fail here because they conflate a wrong final answer with a failure in the source data itself. The critical gap this paper addresses is discerning whether an agent adopts a corrupted conclusion *despite* having the means to verify the evidence against the fixed source data.

## Poison Adoption vs. Evidence Verification
The core insight of this work is the necessary separation between *adopting* a poisoned answer and *validating* the evidence that leads to it. Many defenses rely on retries or verification prompts, but these actions can themselves be compromised. The paper introduces metrics to track this pathway explicitly. Specifically, it distinguishes between Blind Compliance Rate (BCR)—where the agent adopts the poisoned conclusion without any explicit detection or verification attempt—and Validated Poison Adoption (VPA)—where the agent still accepts the poisoned conclusion even after a qualifying verification step. This distinction moves beyond simply counting extra tool calls; it tracks the agent's decision process from initial exposure to final conclusion, revealing when checking fails to prevent adoption.

## The Poisoning Operators and Behavioral Rates
The benchmark, ToxicBench, achieves this granularity by using controlled poisoning operators that target specific aspects of tool output. Numerical operators include Rank Swap or Denom. Swap, while semantic operators cover Label Swap or Column-Semantic Swap. The proxy modifies the returned observation $\tilde{o} = P(f, x, o; \theta)$ without altering the source data. The paper measures agent behavior using six paired rates, conditioned on exposure. For instance, Poison Adoption Rate (PAR) records the final answer matching the poisoned oracle, whereas Blind Compliance Rate (BCR) identifies this adoption without either Anomaly Detection Rate (ADR) or Validation Rate (VR). The evaluation on the 118-instance GPT set shows that poisoned TSR falls by 26–39 percentage points.

## Limitations
The threat model is strictly confined to silent, one-shot or repeated poisoning of tool *outputs* while keeping the source data invariant. The paper does not cover attacks that alter the source data itself or indirect prompt injection. Furthermore, the evaluation relies on a fixed scorer and human agreement on 200 trajectories, meaning the generalized performance of the behavioral rates might be constrained by the scope of the 118 tested tasks.

## What practitioners should do
*   Do not assume that adding a verification prompt guarantees correctness; track if the agent accepts the result even after checking.
*   When deploying data agents, monitor for high Blind Compliance Rates (BCR) on tasks involving complex numerical or semantic bindings.
*   Implement checks that specifically test for evidence binding errors (e.g., label swaps) rather than just plausibility checks.
*   Use trajectory auditing to distinguish between an agent failing to recover and an agent failing to detect the corruption in the first place.

## Verdict
Read for security researchers and ML engineers building data agents; this work provides a necessary, fine-grained lens for evaluating agent reliability beyond simple task success rates.

## Den's Take

The paper correctly identifies that simply adding a verification prompt does not equate to security; the agent might still comply if the verification step itself is subverted or inadequately implemented. However, the focus on poisoning the *output* while keeping the source data invariant feels like a narrow operational fix rather than addressing the fundamental brittleness of the agent architecture. I predict that as agents become more complex, the failure mode will shift from simple Blind Compliance Rate (BCR) to a cascading failure where a single poisoned tool output forces the agent down a path of increasingly complex, but ultimately flawed, reasoning. This makes the entire chain of reasoning untrustworthy, regardless of whether the final output matches the poison.