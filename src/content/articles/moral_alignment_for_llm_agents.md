---
title: "Moral Alignment for LLM Agents"
date: "2026-11-21"
type: "Paper Review"
description: "Moral Alignment for LLM Agents"
tags: ["AI Agents"]
readingTime: 5
headerImage: "/images/news/moral_alignment_for_llm_agents.jpg"
paperUrl: "https://arxiv.org/abs/2410.01639"
---

![Moral Alignment for LLM Agents](/images/news/moral_alignment_for_llm_agents.jpg)
*Figure from the paper “Moral Alignment for LLM Agents” (p. 5)*

# Intrinsic Rewards for Explicit Moral Alignment of LLM Agents

## TLDR
*   Replaces opaque human preference data with explicit reward functions.
*   Targets LLM agents deployed in strategic decision-making roles.
*   Demonstrates successful moral strategy learning on the Iterated Prisoner’s Dilemma.

## The Opacity of Preference Data
Current alignment practices, such as Reinforcement Learning from Human Feedback (RLHF) and Direct Preference Optimization (DPO), rely on collecting vast amounts of human feedback. This results in human values being implicitly represented, deduced from relative preferences over model outputs. This bottom-up inference model poses challenges because preference data collection is costly and often relies on potentially unrepresentative samples. Furthermore, the values incorporated into the fine-tuned models are never made explicit to human oversight. This lack of transparency can lead to goal misgeneralization, where apparent "harmless" behavior is merely "moral mimicry" of the raters, potentially leading to dangerous behaviors unknown until deployment.

## Intrinsic Rewards as Explicit Goals
This work shifts the alignment paradigm away from implicit preference inference by introducing reward functions that explicitly and transparently encode core human values. Instead of relying on human feedback, the authors define intrinsic rewards directly based on actions and consequences within a defined environment. This allows moral choices to be expressed explicitly as rewards for learning agents. The framework evaluates two philosophical perspectives: Deontological Ethics, which rewards actions conforming to norms like conditional cooperation, and Utilitarianism, which rewards maximizing collective payoff. This explicit formulation moves alignment from an opaque, data-driven inference problem to a transparent, goal-driven optimization problem.

## Moral Fine-Tuning Procedure
The training takes place within the Iterated Prisoner’s Dilemma (IPD) environment. The core mechanism is the PPO learning step, which uses custom reward signals defined per moral philosophy. For example, the Deontological reward is defined as:
$$R_{t}^{M} = \begin{cases} -\xi, & \text{if } a_{t}^{M} = D, a_{t-1}^{O} = C \\ 0, & \text{otherwise if } a_{t}^{M} \in \{C_{\text{legal}}, D_{\text{legal}}\} \\ R_{\text{illegal}}, & \text{otherwise} \end{cases}$$
The Utilitarian reward is $R_{t}^{M} = (R_{t}^{M\text{game}} + R_{t}^{O\text{game}}$, if $a_{t}^{M} \in \{C_{\text{legal}}, D_{\text{legal}}\}$, otherwise $R_{\text{illegal}}$. The authors also test "unlearning," where an agent first learns a selfish strategy via Game rewards, and is subsequently fine-tuned with a moral reward (e.g., Deontological). The core agent used is Gemma2-2b-it.

## Limitations
The framework requires the specification of rewards for a particular environment, which contrasts with methods like RLHF that rely on natural language data across any domain. Furthermore, the study's generalization tests are limited to other matrix game environments. The paper notes that the extent of true commonsense knowledge in smaller models, like the 2b parameter variant used, remains a debated topic.

## What practitioners should do
*   When designing agentic workflows, consider whether implicit preference modeling is sufficient for high-stakes decision-making.
*   If moral alignment is necessary, investigate defining explicit, quantifiable reward functions based on desired ethical frameworks.
*   Test the generalization of learned moral policies across different, but structurally similar, decision-making environments.
*   Use structured prompt formats that restrict action tokens to ensure the agent stays within the defined decision space during fine-tuning.

## Verdict
Read this paper if you are working on agentic LLM deployment and are concerned about the transparency of current alignment techniques. Skip it if your immediate focus is on general instruction-following capability rather than value alignment.

---

## Den's Take

This work correctly identifies the brittleness of relying on implicit preference signals for high-stakes agents. However, I find the transition from the Iterated Prisoner’s Dilemma to generalized deployment far too optimistic. The authors successfully demonstrate learning specific ethical *strategies* within a constrained matrix game, but this does not equate to acquiring *moral judgment*. The explicit reward structure is only as good as the environment designer's ability to map complex, real-world ethical trade-offs—which defy simple payoff matrices—into discrete, quantifiable reward signals. I predict that attempts to scale this approach beyond structured game theory will quickly collapse into an intractable specification problem, forcing engineers back to some form of latent preference modeling anyway.