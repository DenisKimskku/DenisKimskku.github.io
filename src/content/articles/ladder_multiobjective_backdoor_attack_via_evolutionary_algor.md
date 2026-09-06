---
title: "LADDER: Multi-Objective Backdoor Attack via Evolutionary Algorithm"
date: "2026-08-30"
type: "Paper Review"
description: "Multi-objective backdoor attack using Evolutionary Algorithm"
tags: ["Backdoors"]
readingTime: 5
headerImage: "/images/news/ladder_multiobjective_backdoor_attack_via_evolutionary_algor.jpg"
paperUrl: "https://www.ndss-symposium.org/ndss-paper/ladder-multi-objective-backdoor-attack-via-evolutionary-algorithm/"
---

![LADDER: Multi-Objective Backdoor Attack via Evolutionary Algorithm](/images/news/ladder_multiobjective_backdoor_attack_via_evolutionary_algor.jpg)
*Figure from the paper “LADDER: Multi-Objective Backdoor Attack via Evolutionary Algorithm” (p. 2)*

# LADDER: Multi-Objective Backdoor Attack via Evolutionary Algorithm

## TLDR
*   **What**: Multi-objective backdoor attack using Evolutionary Algorithm.
*   **Who's at risk**: Black-box CNN classification models in safety-critical applications.
*   **Key number**: LADDER achieves attack effectiveness of at least 99%, attack robustness with 90.23% under image preprocessing operations, better natural stealthiness (1.12× to 196.74× enhancement), and better spectral stealthiness (8.45× improvement), as measured by the average l2-norm across five real-world datasets.

## The Dual-Domain Stealthiness Gap
Existing backdoor attacks struggle to balance multiple requirements simultaneously. Current work often focuses on a single optimization goal, such as achieving high attack effectiveness, which frequently conflicts with stealthiness or robustness. Spatial domain triggers, while visually intuitive, introduce semantic artifacts that are easily spotted. In contrast, prior frequency domain attacks, like FTrojan, aim for spectral stealthiness but often fail to maintain robustness against common image preprocessing operations. Furthermore, these frequency-based methods typically rely on fixed, predefined perturbations, which limits their ability to find optimal patterns that satisfy multiple constraints. The core gap LADDER addresses is the lack of a mechanism to optimize for dual-domain stealthiness (spatial and spectral) while ensuring robustness and effectiveness, all without needing internal knowledge of the victim model.

## Multi-Objective Evolutionary Algorithm (MOEA)
The breakthrough in LADDER is formulating the entire backdoor injection as a Multi-Objective Optimization Problem (MOP) and solving it using a Multi-Objective Evolutionary Algorithm (MOEA). Where previous gradient-based methods aggregate conflicting goals (like effectiveness versus stealthiness) into a Single-Objective Problem (SOP) via Lagrange multipliers, LADDER maintains a population of triggers representing various trade-offs. MOEA drives this population toward the Pareto front using non-dominated sort (NDSort). This allows the attacker to discover a set of optimal solutions that balance the objectives inherently, circumventing the difficulty of tuning sensitive Lagrange coefficients that plagues SOP approaches. The MOEA's gradient-free nature is essential because the black-box setting prevents direct gradient calculation on the victim model.

## Preference-Based Selection and Low-Frequency Focus
The mechanism of LADDER integrates several components to refine the trigger generation. Triggers are optimized by iteratively applying variation operators—crossover and mutation—to the population. Each candidate trigger is evaluated against multiple objectives: attack effectiveness, dual-domain stealthiness, and robustness against preprocessing. After the MOEA generates the Pareto front, LADDER incorporates preference-based selection to filter out practically infeasible triggers from the set. A key design choice is pushing triggers toward low-frequency regions, which aids in achieving robustness against filtering and compression.

## Limitations
The threat model assumes the attacker only has black-box access via data poisoning, not model access. The reliance on a surrogate model for optimization, while empirically shown to be effective, implies that performance guarantees are dependent on the surrogate model accurately approximating the victim model's behavior. The paper notes that the robustness results are measured across five public datasets.

## What practitioners should do
*   If deploying CNNs in sensitive domains, consider the trade-offs between visual and spectral stealthiness when data collection protocols are not fully controlled.
*   When designing adversarial data poisoning campaigns, recognize that optimizing for multiple, conflicting goals (effectiveness, stealthiness, robustness) requires non-gradient search methods like MOEA.
*   Test the resilience of your deployed models against triggers placed in low-frequency spectral bands, as LADDER shows this region can enhance robustness.

## Verdict
Read this paper if you are working on advanced black-box adversarial attacks against image classification models. Skip it if your focus is on standard, single-objective trigger design.

## Den's Take

The paper’s focus on balancing dual-domain stealthiness via MOEA is technically sound, but it glosses over a significant practical hurdle. The reliance on a surrogate model for optimization, while necessary in the black-box setting, introduces an opaque layer of uncertainty that the authors downplay. If the surrogate model fails to capture the specific non-linear interactions of a deployed safety-critical system, the resulting "Pareto optimal" triggers might be brittle in the real world, despite the reported effectiveness against the surrogate. Furthermore, while the paper mentions pushing triggers toward low-frequency regions for robustness, it doesn't deeply explore the computational overhead this imposes on the *attacker* during the evolutionary search, which could negate the perceived advantage over simpler, single-objective perturbations.