---
title: "Tool Unlearning for Tool-Augmented LLMs"
date: "2026-08-20"
type: "Paper Review"
paperUrl: "https://arxiv.org/abs/2502.01083"
paperAuthors: "Jiali Cheng, Hadi Amiri"
description: "Introduces TOOLDELETE, a framework for functional tool unlearning"
tags: ["Adversarial Attacks", "AI Agents", "Machine Unlearning"]
readingTime: 5
headerImage: "/images/news/tool_unlearning_for_toolaugmented_llms.jpg"
---

![Tool Unlearning for Tool-Augmented LLMs](/images/news/tool_unlearning_for_toolaugmented_llms.jpg)
*Figure from the paper “Tool Unlearning for Tool-Augmented LLMs” (p. 3)*

# TOOLDELETE: A Framework for Removing Functional Tool Knowledge from LLMs

## TLDR
* **What**: Introduces TOOLDELETE, a framework for functional tool unlearning.
* **Who's at risk**: Tool-augmented LLMs deployed in regulated or security-sensitive environments.
* **Key number**: TOOLDELETE outperforms existing general and LLM-specific unlearning algorithms by 12.5 and 9.1 in accuracy on forget tools and retain tools respectively.

## The Skill Gap in Tool-Augmented LLMs
Tool-augmented Large Language Models (LLMs) embed the ability to use external functions—like calculators or APIs—directly into their parameters during training on query-response pairs. This allows them to solve complex tasks beyond their inherent parametric knowledge. The core problem this work addresses is the inability to selectively remove these learned "skills." While traditional machine unlearning focuses on erasing the memory of specific data samples (e.g., removing a private training record), tool unlearning requires removing the *functional knowledge* associated with an entire tool, $t_i \in T_f$. If a tool becomes insecure or deprecated, simply blocking it at the prompt level is insufficient; the knowledge persists in the model's weights, allowing adversarial agents to bypass restrictions. Furthermore, the general capabilities of the LLM—such as coherent text generation—must be maintained during this erasure process, a challenge not addressed by sample-level approaches.

## Tool Knowledge Deletion and Retention
The central idea of TOOLDELETE is to satisfy three necessary properties simultaneously: Tool Knowledge Deletion (TKD), Tool Knowledge Retention (TKR), and General Capability Retention (GCR). TKD demands that the unlearned model, $f'$, possesses no more knowledge about the targeted tools $T_f$ than the original tool-free model, $f_0$. This is enforced by constraining $f'$ to generate responses similar to $f_0$'s responses, $Y'_i = f_0(Q_i)$, for each unlearned tool demonstration $\{Q_i, Y_i\}$. TKR ensures that knowledge of the remaining tools $T_r$ is preserved.

## Task Arithmetic and LiRA-Tool
To maintain general abilities, TOOLDELETE incorporates task arithmetic. This technique adjusts the optimized parameters $\theta'^*$ by adding a vector derived from the difference between the parameters of the tool-free model $\theta_0$ and a randomly initialized model $\theta_R$: $\theta'^* \leftarrow \theta'^* + (\theta_0 - \theta_R)$. This adjustment aims to restore foundational abilities like text generation without requiring expensive retraining. For evaluation, the authors introduce LiRA-Tool, an extension of Likelihood Ratio Attack (LiRA).

## Limitations
The reliance on GPT-4 to generate shadow samples for LiRA-Tool introduces a potential dependency on that specific model's capabilities and prompt construction. Furthermore, the task arithmetic relies on the assumption that the difference vector $\theta_0 - \theta_R$ accurately captures the direction of general knowledge acquisition, which may not hold perfectly across all model architectures or pre-training regimes. The paper does not detail how the model handles highly complex, multi-step tool interactions that might span several tools simultaneously.

## What practitioners should do
* When deprecating a tool, utilize a framework like TOOLDELETE to ensure the functional capability is removed from the model weights, not just blocked at the input prompt.
* Employ LiRA-Tool methodology, using diverse "shadow samples" to test the unlearned model's ability to invoke the forgotten tool, rather than testing only against the original training set.
* If using parameter-efficient fine-tuning techniques, incorporate the task arithmetic adjustment $\alpha(\theta_0 - \theta_R)$ post-optimization to safeguard general LLM capabilities during tool removal.

## Verdict
Read this paper if you are working on model governance, data compliance, or deployment security for tool-augmented LLMs. For general LLM lifecycle engineers, the concept of functional unlearning is worth skimming.

---

## Den's Take

This work presents a necessary step toward model governance, addressing the persistent issue that simply gating access to a tool doesn't erase its learned function from the weights. However, the reliance on GPT-4 to generate the "shadow samples" for LiRA-Tool feels like a significant practical bottleneck. If the underlying probing mechanism is dependent on the reasoning capabilities of an external, proprietary model, the resulting assessment of unlearning efficacy is inherently tethered to that external system's biases and competence. Furthermore, the paper glosses over how task arithmetic handles scenarios where the tool knowledge was deeply entangled with core linguistic capacities—it’s not just an additive vector adjustment; the functional representation might be structurally intertwined. prior work argued that defenses must shift from monitoring malicious input to cryptographically verifying the model's fundamental integrity. This paper addresses the functional aspect, but the integrity of the *process* of unlearning remains opaque without stronger guarantees than parameter divergence.