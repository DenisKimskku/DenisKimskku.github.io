---
title: "SoK: Efficiency Robustness of Dynamic Deep Learning Systems"
date: "2026-10-27"
type: "Paper Review"
description: "Categorizes efficiency attacks exploiting DDLS dynamic behaviors"
tags: ["Adversarial Attacks", "Vulnerabilities"]
readingTime: 5
headerImage: "/images/news/sok_efficiency_robustness_of_dynamic_deep_learning_systems.jpg"
paperUrl: "https://www.usenix.org/system/files/usenixsecurity25-rathnasuriya.pdf"
---

![SoK: Efficiency Robustness of Dynamic Deep Learning Systems](/images/news/sok_efficiency_robustness_of_dynamic_deep_learning_systems.jpg)
*Figure from the paper “SoK: Efficiency Robustness of Dynamic Deep Learning Systems” (p. 6)*

# Taxonomy of Efficiency Attacks Targeting Dynamic Deep Learning Systems

## TLDR
*   **What**: Categorizes efficiency attacks exploiting DDLS dynamic behaviors.
*   **Who's at risk**: Real-time, resource-constrained DLS deployments.
*   **Key number**: (Removed)

## The Architecture of Dynamic Vulnerability
Deep Learning Systems (DLSs) are increasingly deployed on constrained hardware, necessitating Dynamic Deep Learning Systems (DDLSs) to optimize resource usage by adapting computation based on input complexity. This adaptability, however, introduces novel attack surfaces. Traditional adversarial attacks focus on changing output correctness; efficiency attacks, conversely, manipulate inference-time computational costs—latency, energy, or FLOPs—without necessarily altering the final output. The core vulnerability stems from the three ways DDLSs dynamically behave: (D1) adjusting computation within a single forward pass, (D2) varying the number of inference iterations, and (D3) changing the number of outputs fed to downstream modules. Attackers exploit these mechanisms to force unnecessary computation. For instance, in multi-exit DNNs (ME-DNNs), skipping mechanisms are designed to allow early exits; an attacker can craft an input to force full-path execution, directly inflating computation.

## Exploiting Dynamic Computations per Inference Iteration (D1)
Adversaries target the internal execution paths of a single inference pass via D1 mechanisms, such as skipping, spiking, step-size adjustments, or sparsity exploitation. The attack goal here is to suppress efficiency gains built into the model. For instance, ILFO [37] used input-output gradients on ME-DNNs to force full-depth execution by iteratively aligning gradients, which doubled FLOPs usage. Moving beyond gradient reliance, DeepPerform [14] employed Generative Adversarial Networks (GANs) to generate input distributions that triggered excessive activations without needing gradient access. Furthermore, DeepSloth [45] maximized entropy to suppress confidence scores at intermediate classifiers in ME-DNNs, preventing early exits and increasing inference latency by up to 5x.

## Forcing Iterative Expansion via Dynamic Inference Iterations (D2)
DDLSs that rely on iterative refinement, common in autoregressive models like Neural Machine Translation (NMT) systems or vision language models (VLMs), are vulnerable through D2 attacks. These attacks aim to delay or prolong the sequence generation process. NMTSloth [15] and Sponge-Examples [82] manipulate sequence termination conditions in NMT systems to extend inference duration. In speech systems, perturbations can prolong inference loops, as shown by SlothSpeech [39]. For VLMs utilizing iterative refinement, VerboseSamples [34] induces unnecessary computational steps. These attacks fundamentally subvert the learned halting policies governing runtime iteration counts, forcing the system to perform more steps than required for convergence.

## Cost Imposition through Dynamic Output Production (D3)
D3 attacks shift the computational burden from the core inference engine to subsequent, downstream tasks. This is particularly relevant in perception models like object detection. The mechanism involves manipulating the model's internal decisions to generate an excessive number of outputs. For example, attacks such as SlowLiDAR [58], SlowPerception [62], and BeyondPhantom [79] introduce perturbations that increase the number of bounding boxes generated, thereby overloading the detection pipelines. Similarly, SlowTrack [61] disrupts multi-object tracking by causing excessive object associations. The attack vector, such as Overload [11], manipulates feature representations to induce granular output generation, escalating system-wide resource consumption downstream.

## Limitations
The taxonomy presented focuses heavily on efficiency degradation via adversarial inputs, primarily assuming a white-box or black-box evasion threat model at inference time. The paper does not provide extensive analysis on the robustness of the DDLSs against poisoning attacks targeting the training phase, although the taxonomy maps these possibilities. Furthermore, the practical applicability of some gradient-based attacks relies on the fine-grained access to intermediate activations, which may not hold in highly abstracted production environments.

## What practitioners should do
*   Audit system components to map dynamic behaviors (D1, D2, D3) to specific attack profiles.
*   For real-time systems, evaluate the stability of early-exit and pruning logic against gradient-based manipulation.
*   When deploying adaptive models, consider defenses that efficiently process adversarial examples rather than relying solely on detection.
*   For systems using iterative generation, rigorously test termination policies against inputs designed to maximize iteration counts.

## Verdict
Read this paper if you are researching the security implications of adaptive or resource-aware AI deployments; otherwise, skim it for a high-level taxonomy of efficiency threats.

## Den's Take

The paper’s categorization of efficiency attacks is a necessary step toward treating resource exhaustion as a legitimate security vector, moving beyond mere accuracy degradation. However, the analysis remains heavily skewed toward input-level adversarial perturbations. It overlooks the security implications when the *control plane* of the DDLS itself is compromised—i.e., if an attacker can modify the configuration that dictates the dynamic behavior (D1, D2, or D3), rather than just crafting an input to trigger the existing logic. For example, if the mechanism controlling the "early exit" in a multi-exit DNN is mutable, the threat is structural, not purely adversarial. This shifts the necessary defense paradigm from input filtering to immutable runtime configuration management. This echoes the concern that the fundamental weakness in AI security lies in the model's inability to reliably distinguish instructions from data, not just context poisoning.