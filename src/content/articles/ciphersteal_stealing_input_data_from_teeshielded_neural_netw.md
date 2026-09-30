---
title: "Ciphersteal: Stealing input data from tee-shielded neural networks with ciphertext side channels"
date: "2026-10-01"
type: "Paper Review"
description: "CIPHERSTEAL uses two-step transformation and reconstruction to recover NN inputs"
tags: ["Vulnerabilities"]
readingTime: 5
headerImage: "/images/news/ciphersteal_stealing_input_data_from_teeshielded_neural_netw.jpg"
paperUrl: "https://yinqian.org/papers/sp25.pdf"
---

![Ciphersteal: Stealing input data from tee-shielded neural networks with ciphertext side channels](/images/news/ciphersteal_stealing_input_data_from_teeshielded_neural_netw.jpg)

# Ciphersteal: Recovering NN Inputs from TEE Ciphertext Side Channels

## TLDR
* **What**: CIPHERSTEAL uses two-step transformation and reconstruction to recover NN inputs.
* **Who's at risk**: Deployments of NNs in Trusted Execution Environments (TEEs) for MLaaS.
* **Key number**: In more than 100 different settings, we observe a consistently encouraging success rate (e.g., > 90% in half of the settings).

## The Information Loss in NN Features
The prevailing assumption was that the matrix computations within Neural Networks (NNs) are constant-time, rendering them immune to micro-architectural side channels. This is partly true, as NN data and control flows are fixed regardless of input. However, this paper demonstrates a new vulnerability: ciphertext side channels in TEEs leak memory write patterns. Unlike traditional cryptographic key recovery, where a collision often maps directly to a single key bit (0 or 1), NN inputs are complex features. When NNs process inputs like images, intermediate results are extracted as features, leading to inherent information loss. For example, a single ciphertext collision might correspond to an entire image region containing multiple pixels, each with 256 possible values. This loss of granularity makes recovering the full input challenging, as the side channel only reveals patterns in these abstracted features, not the raw input pixels.

## Transformation and Reconstruction
CIPHERSTEAL addresses the input complexity by recasting the recovery as a two-step process: transformation ($\text{T}$) and reconstruction ($\text{R}$). The core insight is that even with incomplete leakage, the highly correlated nature of NN inputs allows for successful content recovery. First, the framework transforms the limited side-channel observation, $c$, into a partially recovered, aligned representation, $h = \text{T}(c)$. This $h$ is an approximation of the original input $x$. Subsequently, the framework reconstructs the lost information using $h$ as a basis, applying Bayesian theorem optimization to yield $R(h) = x^* \approx x$. This differs from prior methods because it does not require full knowledge of the input domain; it only assumes having data of the same input format. The goal shifts from recovering exact pixels to recovering inputs that are visually identical to the original.

## Surrogate NN Functionality Theft
Beyond recovering raw input data, CIPHERSTEAL enables the theft of the target NN's functionality. Once inputs are recovered, they can be used to train a surrogate NN. The paper shows that this surrogate NN can achieve comparable performance to the target NN (e.g., > 98% consistency) with the target NN. Furthermore, this recovered knowledge can be leveraged to enhance downstream attacks. Specifically, using "white-box" adversarial examples generated over the surrogate NN allows attackers to largely enhance adversarial attacks towards the TEE-shielded NN (e.g., from 0 to a 30% attack success rate). This demonstrates a pathway from input leakage to complete model compromise.

## Limitations
The framework assumes the TEE implementation uses deterministic, block-based AES encryption, which is standard for memory encryption in TEEs. The threat model relies on the host OS or hypervisor having full system privilege and the ability to perform memory bus snooping. The success of the reconstruction heavily depends on the intrinsic correlation constraints within the input format (e.g., pixels forming meaningful images). If inputs were entirely uncorrelated or if the NN execution was non-deterministic, the reconstruction step would likely fail.

## What practitioners should do
* Do not assume TEEs provide complete confidentiality for NN inputs; investigate ciphertext side channels.
* If deploying NNs in TEEs for sensitive inference, assume input data is recoverable via side channels.
* Consider the risk of functionality theft, as recovered inputs allow training of equivalent surrogate models.
* Study the different attack surfaces of NN runtimes, such as TensorFlow vs. TVM executables.

## Verdict
Read this paper if you are working on secure ML deployments in cloud environments or are researching hardware-backed trust assumptions. Skip it if you are only focused on classical software vulnerabilities outside of TEEs.

---

## Den's Take

The paper correctly identifies that the inherent information loss when abstracting raw inputs into NN features presents a significant hurdle for side-channel recovery. However, I find the reliance on the "highly correlated nature of NN inputs" as the primary driver for the Bayesian reconstruction step to be an oversimplification. The success reported hinges on the structure of image data, which is a domain-specific constraint, not a universal property of all NN inputs. If the target application were processing sequences or sparsely encoded data, the reconstruction fidelity would likely plummet. Furthermore, the leap from input recovery to boosting adversarial attacks via a surrogate model seems like a convenient escalation of threat severity; the paper needs to more rigorously quantify the *minimum* necessary input fidelity required to generate a meaningfully effective adversarial example against the original black-box target.