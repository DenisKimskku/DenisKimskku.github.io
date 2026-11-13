---
title: "Lazare, veni foras: Reprogramming Dormant Neurons to Backdoor AI Agents"
date: "2026-11-14"
type: "Paper Review"
description: "Edits dormant neurons in the final MLP block to embed multi-token payloads"
tags: ["Prompt Injection", "Data Poisoning", "Backdoors", "AI Agents"]
readingTime: 5
headerImage: "/images/news/lazare_veni_foras_reprogramming_dormant_neurons_to_backdoor_.jpg"
paperUrl: "http://arxiv.org/abs/2611.15118v1"
---

![Lazare, veni foras: Reprogramming Dormant Neurons to Backdoor AI Agents](/images/news/lazare_veni_foras_reprogramming_dormant_neurons_to_backdoor_.jpg)
*Figure from the paper “Lazare, veni foras: Reprogramming Dormant Neurons to Backdoor AI Agents” (p. 8)*

# Lazare: Reprogramming Dormant Neurons for Stealthy AI Agent Backdoors

## TLDR
*   **What**: Edits dormant neurons in the final MLP block to embed multi-token payloads.
*   **Who's at risk**: LLM-powered agents deployed with external tool access and model weights accessible for modification.
*   **Key number**: On Nemotron-Terminal-8B, seven of 12,000+ neurons, fitted on 23 trigger/no-trigger trajectories, fire the payload on at least 98.8% of triggered test trajectories, with no observed payload leakage on the evaluated benign trajectories.

## The Gap Between Prompts and Weights
Most discussion around LLM security focuses on prompt injection, where an adversary manipulates the input context to override intended behavior. This relies on the model processing instructions *during* inference, and defenses can attempt to filter these malicious inputs. However, the integrity of the model weights themselves remains a concern, especially when models are sourced from third parties or when an insider has write access before deployment. Existing research on weight editing, such as those targeting knowledge localization, often involves rank-one updates or complex associative edits, which struggle to maintain exact, token-level control over a sequence. Furthermore, many previous methods either require poisoning training data or rely on gradient-based fine-tuning, which is computationally expensive and leaves a distinct signature. The problem Lazarus addresses is how to embed a specific, multi-token, context-dependent action into a released model checkpoint with minimal, targeted weight modification, ensuring the modification is nearly invisible during normal operation.

## Neuron Assignment for Multi-Token Payloads
The core innovation of Lazarus is the ability to individually edit and chain dormant neurons to construct a multi-token payload. Instead of broadly steering the model's behavior across large parameter blocks, this technique maps each required token in the payload to a specific, previously inactive neuron. These neurons reside in the final feed-forward block's SwiGLU core. For a payload requiring $P$ tokens, the attacker assigns one dormant neuron to each of those $P$ positions. The mechanism forces the neuron to act as a switch: it must remain inactive (output near zero) when the input is benign, but when the specific trigger is present, the neuron must activate sharply to promote its assigned payload token through the residual stream. This is achieved by manipulating the gate weights ($W_g$) such that the resulting score $z = \langle w_{g_n}, h \rangle$ is strongly negative for benign inputs (driving $\text{SiLU}(\cdot)$ near zero) and strongly positive when the trigger is present.

## Constrained Weight Refinement via Lazarus-SGD
The actual embedding process involves setting the edited weights in closed form, which is then refined using a targeted optimization procedure called Lazarus-SGD. The attacker selects a trigger and the desired payload. For each assigned neuron, the gate weight vector ($w_{g_n}$) is fitted to favor a positive inner-product score when the trigger and the required payload prefix are present, and strongly negative scores on benign inputs. The up projection ($W_{u_n}$) is set to produce a positive output at the designated token position, and the down-projection vector ($w_{d_n}$) is aligned to correctly route this activation back into the residual stream. This selective tuning is done using only a few hundred gradient steps applied exclusively to the weights of the edited neurons. On Nemotron-Terminal-8B, seven neurons fitted on 23 trigger/no-trigger trajectories achieved an Attack Success Rate (ASR) of 98.80% while maintaining a benign leakage of 0.0000%.

## Limitations
The attack relies on the existence of distributionally dormant neurons in the final MLP layer, which may not be present or accessible in all model architectures. Furthermore, the effectiveness shown is dependent on the agent’s execution environment; the attack only forces the *emission* of a payload token sequence, not its successful execution, which depends on the agent harness. The paper notes that while a detector built by an agent flagged 91.4% of edited test checkpoints, this defense is not guaranteed, especially without a clean reference model.

## What practitioners should do
*   Audit model weights, treating them like code, especially for third-party checkpoints.
*   Utilize frontier AI agents to scan deployed models for anomalous neuron patterns before deployment.
*   Limit agent permissions to prevent a successful payload emission from resulting in high-impact actions.
*   Log and review all consequential actions taken by agents to detect unexpected behavior stemming from model tampering.

## Verdict
Read this paper if you are designing or auditing LLM agents; it describes a novel, low-footprint mechanism for supply-chain compromise that shifts the threat surface from input manipulation to static model weights.

---

## Den's Take

This work correctly pivots the conversation toward weight integrity, which is where the real supply-chain risk resides when models are sourced externally. However, the reported success rate of 98.80% is highly specific to the Nemotron-Terminal-8B architecture and its specific neuron topology. I predict that generalizing this technique to modern, highly regularized, or quantized models will see the ASR drop precipitously because the "dormant" neurons may not behave as expected under aggressive compression or structural pruning. Furthermore, the paper's reliance on an agent detector that flags 91.4% of checkpoints feels like an overstatement of practical defense; if the modification is truly low-footprint, the cost of continuous, deep inspection across an entire fleet of deployed agents is prohibitive. This ties into my view that security must shift from input filtering to architectural constraints, as noted in prior work on GuardrailAgent: An Agentic Framework for Jailbreak Defense.