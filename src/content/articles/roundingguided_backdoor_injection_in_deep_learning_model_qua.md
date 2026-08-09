---
title: "Rounding-Guided Backdoor Injection in Deep Learning Model Quantization"
date: "2026-08-10"
type: "Paper Review"
description: "QURA exploits weight rounding during quantization to embed backdoors"
tags: ["Backdoors", "Supply Chain Security", "Vulnerabilities"]
readingTime: 5
headerImage: "/images/news/roundingguided_backdoor_injection_in_deep_learning_model_qua.jpg"
---

![Rounding-Guided Backdoor Injection in Deep Learning Model Quantization](/images/news/roundingguided_backdoor_injection_in_deep_learning_model_qua.jpg)
*Figure from the paper “Rounding-Guided Backdoor Injection in Deep Learning Model Quantization” (p. 3)*

# QURA: Backdoor Injection Exploiting Quantization Rounding Operations

## TLDR
* **What**: QURA exploits weight rounding during quantization to embed backdoors.
* **Who's at risk**: Deployments of pre-trained models on resource-constrained devices.
* **Key number**: Extensive experiments demonstrate that QURA achieves nearly 100% attack success rates in most cases, with negligible performance degradation.

## Exploiting Quantization as a Supply Chain Vector

The necessity of deploying large deep learning models on edge devices drives the adoption of model quantization, which reduces precision from 32-bit floating-point to lower-bit representations. This compression is a standard practice, often relying on user-provided calibration datasets during post-training quantization (PTQ). Previous quantization-conditioned backdoor attacks attempt to implant triggers during the model’s training process by modifying the loss function. However, these prior methods face two severe limitations: they are highly sensitive to variations in the quantization process, such as changes in rounding direction, and they require the attacker to control both the training and quantization pipelines simultaneously. This dependency on the training phase creates an opening where the attack is brittle and complex to deploy. The gap QURA addresses is the vulnerability inherent in the deployment phase itself—specifically, the quantization step—allowing an attack to target any pre-trained model without needing access to its original training pipeline.

## Weight Selection Strategy to Preserve Performance

QURA’s core innovation centers on moving the attack entirely into the quantization phase, making it training-agnostic. Rather than relying on manipulating the training loss, QURA leverages a novel weight selection strategy to pinpoint critical weights that influence the desired backdoor target while simultaneously prioritizing the preservation of the model’s overall performance on clean data. The mechanism involves classifying weights based on how their rounding direction impacts two objectives: enhancing the backdoor effect and maintaining clean accuracy. For weights where the rounding direction aligns with both goals, or for a carefully selected subset from the conflicting group, the attack favors the backdoor objective. The remaining weights are then optimized to strictly follow the direction that maintains the model’s original accuracy. This dual-objective optimization allows the backdoor effect to accumulate across layers without causing severe degradation to the model’s benign input performance.

## Quantization-Stage Rounding Manipulation

The attack proceeds through two main stages: trigger generation and rounding manipulation. First, the attacker constructs a backdoor dataset by embedding optimized triggers into the clean dataset. This trigger generation is guided by Algorithm 1, which uses gradient descent to refine a pattern such that the model’s prediction on the trigger-embedded input aligns with the target label. This pre-generation reduces the burden on the rounding stage. The second, and defining, stage is the manipulation of the rounding process itself. The quantized weights $c_W$ are derived from the original weights $W$ using a rounding function $R(W)$. QURA directly adjusts the rounding direction $R(W)$ for specific weights during quantization. For instance, the rounding function $R(W)$ defined in the paper is:
$$R(W) = \begin{cases} 1 & \text{if } s \cdot \lfloor W/s \rfloor - W > 0 \\ 0 & \text{otherwise} \end{cases}$$
By controlling this $R(W)$ based on the dual objectives, QURA successfully amplifies the backdoor effect across layers. Experiments showed that when $\alpha$ was set to 0.05 in the 4-bit quantization scenario, the model exhibited a significant accuracy gap between the clean dataset and the modified dataset containing the white square trigger.

## Limitations

The threat model assumes the attacker can inject malicious code into the rounding component of the quantization process without white-box access to the model parameters. The paper shows that QURA can adapt to bypass existing backdoor defenses, underscoring its threat potential. Furthermore, the reliance on a small calibration dataset means that if the attacker cannot influence the process that selects or provides this dataset, the attack vector is unavailable.

## What practitioners should do

* Scrutinize third-party quantization tools and deployment services for potential code injection points in rounding logic.
* Verify that any quantization process using a calibration dataset is performed in a trusted, auditable environment.
* Monitor for unexpected accuracy gaps between model performance on clean data versus data containing known trigger patterns.
* Given the success rates, assume that model quantization is a potential point of failure in the supply chain.

## Verdict

Read this paper if you are focused on supply chain security for deployed ML models or are interested in novel, post-training attack vectors against quantization workflows. Skip it if your focus is exclusively on training-time data poisoning.

---

## Den's Take

The authors’ focus on the quantization phase as a novel supply chain vector is sound, but they underplay the implications for model integrity monitoring. Simply checking for "unexpected accuracy gaps" between clean and triggered data, as suggested, is insufficient because the attack is specifically engineered to maintain high clean accuracy while embedding the backdoor. If the attack succeeds by controlling the rounding direction, it is effectively manipulating the model's *latent representation* during compression, not just injecting a visible pattern. This means that runtime monitoring focused solely on input/output behavior will likely miss the subtle, structurally induced vulnerabilities. The vulnerability isn't just in the rounding function itself; it's that the rounding function operates on the weights that define the model's functional logic. This mirrors the idea that external inspection of model internals is inherently flawed, something I found when reviewing how attention weight analysis fails to address the fundamental instruction/data confusion in LLMs.