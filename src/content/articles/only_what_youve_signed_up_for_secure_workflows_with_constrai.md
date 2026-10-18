---
title: "Only What You've Signed up For: Secure Workflows with Constrained Diffusion Agents"
date: "2026-10-19"
type: "Paper Review"
description: "Enforces task-specific security policies during dLLM denoising"
tags: ["Prompt Injection", "AI Agents"]
readingTime: 5
headerImage: "/images/news/only_what_youve_signed_up_for_secure_workflows_with_constrai.jpg"
paperUrl: "http://arxiv.org/abs/2610.15177v1"
---

![Only What You've Signed up For: Secure Workflows with Constrained Diffusion Agents](/images/news/only_what_youve_signed_up_for_secure_workflows_with_constrai.jpg)
*Figure from the paper “Only What You've Signed up For: Secure Workflows with Constrained Diffusion Agents” (p. 2)*

# Policy Projection in Diffusion Agents for Constrained Agent Generation

## TLDR
*   **What**: Enforces task-specific security policies during dLLM denoising.
*   **Who's at risk**: Agentic AI systems using diffusion language models for tool use.
*   **Key number**: Achieves 0% attack success rate under oracle policies.

## The Gap in Agent Security Defenses
Agentic AI systems, which execute multi-step tasks using external tools, face significant security threats from prompt injection. Current defenses operate by detecting malicious content, reinforcing instruction priority, or validating actions *after* the model generates a sequence. These methods fail when confronted with adaptive attacks; attackers can optimize their injection strategy specifically against the running defense, often leading to a false sense of security. The core problem is that these defenses try to *detect* bad behavior after the model has started its unconstrained generation process. In the context of diffusion language models (dLLMs), which iteratively refine a sequence, there is an opportunity to intervene earlier. Existing autoregressive methods enforce constraints left-to-right, but dLLMs expose a revisable, sequence-wide "clean-state proposal" at every denoising step. This paper attacks the gap where existing defenses are reactive, instead proposing a proactive constraint mechanism integrated directly into the generative loop of dLLMs.

## Policy Projection $\mathcal{P}_{S_u}$
The central insight of Policy-Constrained Diffusion Agents (CoDA) is treating the entire denoising trajectory as an editable generation path. Instead of waiting for the final output to check for violations, CoDA enforces task-level security policies ($S_u$) at *every* reverse diffusion step. This is achieved via **Policy Projection** ($\mathcal{P}_{S_u}$). This projection takes the unconstrained clean-state proposal ($\hat{x}^{(t)}_0$) and modifies it to produce a policy-compliant proposal ($\tilde{x}^{(t)}_0$). This modification is not a full regeneration; it is a localized constraint application. By projecting token distributions onto a policy-compliant set ($F_t(S_u)$), CoDA ensures that security-relevant components—such as tool arguments or recipients—are forced into allowed values while allowing the rest of the sequence to evolve naturally based on the base denoiser's prediction. This allows explicit constraints over agent capabilities without requiring the model to explicitly "detect" the injection.

## Structured Compatibility Rules
The operational mechanism of CoDA relies on identifying and constraining specific, structured regions within the sequence proposal. At each step $t$, the system first generates a provisional sequence $\bar{x}^{(t)}_0$ by taking the argmax of the denoiser's categorical distribution $\hat{x}^{(t)}_0$. CoDA then uses syntax-aware parsers, often derived from tool schemas, to identify the set of policy-relevant token positions, $I_t$. Once $I_t$ is identified, the projection $\tilde{x}^{(t)}_0 = \mathcal{P}_{S_u}(\hat{x}^{(t)}_0 ; \bar{x}^{(t)}_0, I_t)$ is calculated by minimizing the KL divergence between the constrained candidate $y \in F_t(S_u)$ and the original proposal $\hat{x}^{(t)}_0$. This minimization is localized: positions outside $I_t$ retain $\hat{x}^{(t)}_0$, while within $I_t$, the token distributions are suppressed to only permit values compatible with the active constraints in $S_u$. Using an oracle task-level policy, CoDA achieves 0% attack success rate while preserving task utility.

## Limitations
The framework relies heavily on the accuracy of the upstream policy-selection mechanism, whether it is an oracle or an LLM-based selector. If the policy incorrectly identifies policy-relevant regions ($I_t$), the projection will either miss a vulnerability or over-constrain legitimate output. Furthermore, the paper focuses on tool-dependent policies; its applicability to complex, abstract security constraints not tied to structured arguments is not demonstrated. The inference overhead, while noted as practical, is incurred at every denoising step.

## What practitioners should do
*   If using dLLMs for agentic tasks, investigate integrating projection-based constraints rather than relying solely on input/output filtering.
*   When defining policies, ensure that policy-relevant regions ($I_t$) are robustly identified, especially for complex, multi-token arguments.
*   If deploying LLM-selected policies, rigorously characterize the resulting security-utility frontier, as automatic selection introduces policy uncertainty.
*   Test defenses against adaptive attacks, as static evaluation sets are insufficient for measuring robustness in this setting.

## Verdict
Read this paper if you are researching next-generation defenses for agentic AI systems, particularly those leveraging diffusion models. Skip it if your security focus remains strictly on autoregressive architectures or input-level sanitization.

## Den's Take

The paper presents a theoretically elegant method for shifting security enforcement from a reactive check to a proactive, generative constraint within dLLMs. However, the claim of 0% attack success rate under oracle policies feels premature. The entire system hinges on the accuracy of identifying policy-relevant regions ($I_t$). If the structured parsers fail to correctly isolate the token positions relevant to a specific tool argument, the projection mechanism is either useless or, worse, introduces subtle, unquantified distortions into the output that might be functionally exploitable in ways the paper does not test.