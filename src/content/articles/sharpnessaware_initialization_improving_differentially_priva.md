---
title: "Sharpness-Aware Initialization: Improving Differentially Private Machine Learning from First Principles"
date: "2026-10-28"
type: "Paper Review"
description: "SAI-DPSGD uses a two-phase training to promote flatter loss landscapes"
tags: ["AI Security"]
readingTime: 5
headerImage: "/images/news/sharpnessaware_initialization_improving_differentially_priva.jpg"
paperUrl: "https://www.usenix.org/system/files/usenixsecurity25-wang-zihao.pdf"
---

![Sharpness-Aware Initialization: Improving Differentially Private Machine Learning from First Principles](/images/news/sharpnessaware_initialization_improving_differentially_priva.jpg)
*Figure from the paper “Sharpness-Aware Initialization: Improving Differentially Private Machine Learning from First Principles” (p. 7)*

# Sharpness-Aware Initialization for Stable Differentially Private Optimization

## TLDR
* **What**: SAI-DPSGD uses a two-phase training to promote flatter loss landscapes.
* **Who's at risk**: Deployments relying on Differentially Private Machine Learning (DPML).
* **Key number**: For example, SAI-DPSGD improves the accuracy of CNN-Tanh with SELU on CIFAR-10 by over 6% for $\epsilon = 1$.

## The Divergence Issue in DPSAT
Prior work, such as DPSAT [56], attempts to integrate Sharpness-Aware Minimization (SAM) into DPML to promote flatter loss landscapes, which should enhance robustness against DP noise. However, this approach suffers from a critical failure mode: the flatness optimization converges much earlier than the training loss. If training continues past this point, the optimization leads to a divergence in flatness, which intensifies as the DP budget ($\epsilon$) decreases. This divergence means the model fails to fully realize the benefits of SAM because the flatness optimization becomes unstable. A simple fix—stopping training when flatness converges—is insufficient because it results in the training loss being far from its minimum. The core problem is achieving simultaneous convergence of both flatness and training loss while managing the instability inherent in flatness optimization under DP noise.

## The Two-Phase SAI-DPSGD Framework
The central insight introduced here is that the training process should be fundamentally partitioned into two distinct, sequential phases: Sharpness-Aware Initialization (SAI) followed by standard Differentially Private Stochastic Gradient Descent (DPSGD). This structure directly addresses the dual convergence challenge. The SAI phase acts as a data-driven initialization step, leveraging a SAM-like strategy to establish a flatter loss landscape using the private dataset itself, rather than relying on auxiliary data. Once this flatness has stabilized, the system transitions to the DPSGD phase to focus purely on minimizing the training loss. This separation allows the authors to address the two conflicting optimization goals—flatness and training loss—sequentially, which is something prior methods like DPSAT could not manage effectively.

## Uneven Allocation of Privacy Budget
The mechanism operationalizes this two-phase structure by allocating privacy budgets unevenly, guided by the observation that flatness optimization is highly sensitive to noise. The framework explicitly splits the total privacy budget $(\epsilon, \delta)$ into two components: $(\epsilon_1, \delta_1)$ for SAI and $(\epsilon_2, \delta_2)$ for the subsequent DPSGD. The design mandates $\epsilon_1 \gg \epsilon_2$. This unequal allocation is justified because the flatness optimization phase (SAI) is more sensitive to DP noise due to its inherent instability, requiring a larger budget to achieve sufficient convergence. Conversely, because the landscape is already flattened by the end of SAI, the subsequent DPSGD phase can tolerate higher noise levels while maintaining stable convergence.

## Limitations
The theoretical analysis provides a foundation for the two-phase approach, but the paper does not extensively cover the stability of the transition point between SAI and DPSGD in complex, non-standard architectures. Furthermore, the required uneven allocation of the privacy budget ($\epsilon_1 \gg \epsilon_2$) relies on the assumption that the flatness convergence can be reliably monitored, which may break down under extreme noise conditions or in highly stochastic optimization environments not fully explored.

## What practitioners should do
* Implement a two-phase training protocol, dedicating an initial phase to flatness optimization before switching to standard DPSGD.
* Prioritize allocating a larger portion of the total privacy budget to the initial SAI phase to stabilize the loss landscape.
* Monitor the flatness metric (e.g., Hessian norm) to automatically trigger the transition from SAI to DPSGD, mitigating divergence risk.
* Test this framework on datasets where DP noise is known to be severe, such as those requiring $\epsilon \leq 1$.

## Verdict
Read this paper if you are working on DPML and are looking for ways to improve training utility beyond simple noise injection. Skip it if your focus is purely on attack surface reduction or adversarial robustness outside the DP context.

## Den's Take

The paper presents a reasonable heuristic for managing the trade-off between flatness and utility in DPML, but I find the reliance on monitoring the flatness metric at the transition point to be overly optimistic. The authors suggest this metric can reliably trigger the switch from SAI to DPSGD, yet they acknowledge its potential breakdown under "extreme noise conditions." This acknowledgement is a massive gap in the proposed solution. If the flatness metric itself becomes unreliable due to the noise it is supposed to guard against, the entire benefit of the sequential approach dissolves. We cannot treat the transition as a clean, observable event when the underlying optimization process is inherently unstable under the constraints of DP.

as prior work covered, the state of the art in LLM agent security, I noted that static verification methods are insufficient for securing real-world LLM agent handoffs due to inherent dynamic ambiguity. This paper’s reliance on a dynamic, observable metric to manage a transition state mirrors that very ambiguity in a different domain—the optimization state space. The paper needs to move beyond proposing a monitoring mechanism and instead ground the transition in a more robust, theoretically bounded mechanism.