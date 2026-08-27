---
title: "QNBAD: Quantum Noise-induced Backdoor Attacks against Zero Noise Extrapolation"
date: "2026-08-17"
type: "Paper Review"
description: "QNBAD: Quantum Noise-induced Backdoor Attacks against Zero Noise Extrapolation"
tags: ["Backdoors", "Adversarial Attacks"]
readingTime: 5
headerImage: "/images/news/qnbad_quantum_noiseinduced_backdoor_attacks_against_zero_noi.jpg"
paperUrl: "https://www.ndss-symposium.org/ndss-paper/qnbad-quantum-noise-induced-backdoor-attacks-against-zero-noise-extrapolation/"
---

![QNBAD: Quantum Noise-induced Backdoor Attacks against Zero Noise Extrapolation](/images/news/qnbad_quantum_noiseinduced_backdoor_attacks_against_zero_noi.jpg)
*Figure from the paper “QNBAD: Quantum Noise-induced Backdoor Attacks against Zero Noise Extrapolation” (p. 2)*

# QNBAD: Quantum Noise-induced Backdoor Attacks against Zero Noise Extrapolation

## TLDR
* **What:** QNBAD introduces noise-dependent backdoors to corrupt ZNE fitting.
* **Who's at risk:** Deployments relying on ZNE for reliability on NISQ devices.
* **Key number:** (Removed)

## The Failure of Classical Backdoor Defenses
Current reliance on Zero Noise Extrapolation (ZNE) for enhancing reliability in noisy intermediate-scale quantum (NISQ) devices has created a new adversarial surface. Existing quantum backdoor strategies fail against ZNE because they either modify the circuit structure or embed malicious behavior purely in variational parameters without noise awareness. Circuit-based backdoors alter the ideal output directly but do not affect the noise amplification or extrapolation stages, allowing ZNE to mitigate the error. Parameter-level backdoors, conversely, lack robustness because they do not account for the interaction between quantum noise and the trigger mechanism, preventing reliable activation when ZNE samples outputs across varying noise levels. This gap leaves ZNE vulnerable to attacks that specifically leverage the mechanism of noise scaling itself.

## Noise-Triggered Behavior Shaping
QNBAD introduces a novel noise-triggered backdoor that operates under specific noise models. When running under noise-free conditions, the VQA embedded with QNBAD functions identically to a normal VQA, ensuring stealthiness. However, when ZNE is applied, QNBAD is activated. This activation systematically manipulates the sampled expectation values across the different noise levels required for extrapolation. The core insight is that by embedding subtle dependencies between optimized parameters and the circuit's behavior under noise scaling, the attack disrupts the noise amplification and extrapolation process inherent to ZNE. This targeted perturbation corrupts the ZNE fitting process, leading to significantly biased final estimates.

## Attack Modes and Loss Adjustment
QNBAD degrades the accuracy of ZNE by increasing its absolute error through three attack modes: (1) FreeDrift attack, which introduces error with all its might; (2) MimicSlope attack, which induces a uniform vertical shift across all noise levels; and (3) SilentShift attack, which perturbs high-noise samples to change the extrapolation value. These modes allow the attacker to corrupt the ZNE fitting process in different ways. The mechanism relies on a compiler-based trigger generation strategy that produces fixed and reproducible quantum noise patterns by deterministically controlling compiler parameters, ensuring reliable backdoor activation under specific noise conditions. To stabilize the attack and ensure convergence, QNBAD utilizes a dynamic loss adjustment technique. This technique adaptively tunes the relative weights between the backdoor objectives and the regular learning tasks throughout training. The evaluation showed successful backdoor injection.

## Limitations
The paper's threat model assumes the attacker has full access to the VQA training process and can influence parameter optimization. The effectiveness of QNBAD is tightly coupled to the noise profile of the target hardware; the paper notes that the adversarial effect diminished when the circuit trained on one device was executed on others with different noise characteristics. Furthermore, the attack relies on the specific functionality of ZNE, which may not translate directly to other error mitigation techniques.

## What practitioners should do
* Assume that noise-aware training can be repurposed to intentionally degrade performance under specific noise conditions.
* Be wary of importing pre-trained VQA parameters from external sources, as they may contain noise-dependent backdoors.
* Verify the noise profile of your target quantum hardware before deploying models trained with noise-aware strategies.
* Monitor the absolute error amplification when applying ZNE to models sourced externally.

## Verdict
Read this paper if you are working on quantum security for NISQ devices, especially those relying on error mitigation like ZNE. Otherwise, you can likely skip it.

---

## Den's Take

The paper presents a technically interesting avenue by weaponizing the error mitigation process itself. However, the claimed amplification factors, while dense, feel like they are testing the limits of the measurement rather than demonstrating a general failure mode. The reliance on the attacker having full access to the VQA training process—influencing parameter optimization—is a massive prerequisite. This moves the problem from a deployed model vulnerability to a sophisticated supply chain compromise of the *training pipeline*. If the system designers cannot guarantee the integrity of the training environment, then of course, they can be poisoned. The authors might be understating the threat if they imply ZNE is a robust defense; it appears to be an unexamined dependency that can be inverted for attack. This is less about quantum noise and more about trusting the training data/process integrity, which is a problem I've seen surface in less exotic domains.