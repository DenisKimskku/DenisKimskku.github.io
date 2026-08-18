---
title: "CatBack: Universal Backdoor Attacks on Tabular Data via Categorical Encoding"
date: "2026-08-19"
type: "Paper Review"
description: "Novel attack uses floating-point encoding for categorical features"
tags: ["Backdoors"]
readingTime: 5
headerImage: "/images/news/catback_universal_backdoor_attacks_on_tabular_data_via_categ.jpg"
---

![CatBack: Universal Backdoor Attacks on Tabular Data via Categorical Encoding](/images/news/catback_universal_backdoor_attacks_on_tabular_data_via_categ.jpg)

# CatBack: Universal Backdoor Attacks on Tabular Data via Categorical Encoding

## TLDR
* **What**: Novel attack uses floating-point encoding for categorical features.
* **Who's at risk**: Tabular data ML models, including commercial services like Google AutoML.
* **Key number**: This method achieves up to 100% attack success rate in both white-box and black-box scenarios.

## The Limitation of Numerical-Only Triggers
Existing backdoor research has disproportionately focused on homogeneous data like images, leaving tabular data largely unaddressed. Tabular data presents unique hurdles because it features a mix of dense numerical and sparse categorical columns. Prior work has largely restricted trigger design to numerical features because of this data heterogeneity. Furthermore, categorical features are often encoded using methods like one-hot encoding, which prevents the attacker from applying unrestricted perturbations. This lack of flexibility, coupled with the absence of spatial information found in image or text data, forces previous attempts to rely on heuristic methods rather than optimization-based trigger crafting. This limits the attacker's ability to craft a universally effective and stealthy backdoor across the entire feature set of a real-world table.

## Floating-Point Representation for Universal Perturbation
The central insight of CatBack is the proposal of a novel conversion method that transforms categorical columns into floating-point representations. This conversion aims to create a unified feature space where every dimension, regardless of its original type, can be targeted by a single, gradient-based perturbation. This approach successfully preserves enough information during encoding to maintain clean-model accuracy, outperforming traditional encodings like one-hot and ordinal methods. By creating this unified space, CatBack allows the attacker to craft a universal backdoor perturbation $\delta \in \mathbb{R}^d$ that can be applied to any input data type, effectively bypassing the structural constraints imposed by discrete categorical representations.

## Elastic-Net Regularization for Trigger Optimization
The attack mechanism proceeds by first training a baseline model $F$ on the dataset $D = \text{Conv}(D_{\text{original}})$, where $\text{Conv}(\cdot)$ applies the frequency-based mapping. The attacker then selects a subset $D_{\text{picked}}$ of non-target samples that are close to the target decision boundary. The universal trigger $\delta$ is then optimized by minimizing the loss function $L(\delta)$ over $D_{\text{picked}}$:

$$L(\delta) = \frac{1}{|D_{\text{picked}}|} \sum_{(x_i, y_i) \in D_{\text{picked}}} \left[-\log f_t(\hat{x}_i) + \beta\|\hat{x}_i - \text{Mode}(X)\|_1 + \lambda\|\hat{x}_i - \text{Mode}(X)\|_2^2\right]$$

where $\hat{x}_i = \text{clip}(x_i + \delta)$. This loss balances maximizing confidence in the target class $t$ with enforcing stealthiness by keeping the modified inputs close to the dataset's mode. The combination of L1 and L2 regularization—an "elastic-net" style—is used to drive $\delta$ toward sparsity while ensuring numerical stability. After optimization, any continuous adjustments to the encoded values $r'_{jl}$ are rounded back to the nearest valid value present in the lookup table $T_j$ derived from the encoding process.

## Limitations
The paper focuses primarily on data poisoning attacks against neural network models using the proposed encoding. Threat models involving code poisoning or direct model poisoning are not covered. Furthermore, while the encoding maintains accuracy compared to some benchmarks, the paper does not extensively explore how the attack holds up when the victim model uses standard, non-CatBack preprocessing protocols during inference, as the attack requires specific rounding steps tied to the attack's encoding.

## What practitioners should do
* If working with mixed-type tabular data, recognize that traditional OHE methods may leave your model vulnerable to triggers that exploit the continuity of numerical representations.
* When deploying ML services based on tabular data, test defenses against perturbations that are globally optimized across all feature types, not just numerical ones.
* When deploying ML services based on tabular data, test defenses against perturbations that are globally optimized across all feature types, not just numerical ones.
* Assess the robustness of your data pipelines against small, optimized perturbations that might otherwise appear as minor noise.

## Verdict
Read for ML engineers and security researchers focused on data poisoning; it provides strong evidence of systemic vulnerability in tabular ML deployments.

---

## Den's Take

The paper successfully demonstrates that treating tabular data as a unified, continuous space via custom encoding opens a massive attack vector. However, the focus remains entirely on data poisoning against the *training* phase. The real danger surfaces when considering inference-time manipulation. If a model is deployed and an attacker can successfully inject a crafted, floating-point perturbation into a single categorical feature stream during a live API call—even if the model *thinks* it’s using standard preprocessing—the attack succeeds by exploiting the continuity the paper established. The reliance on rounding back to the lookup table post-optimization is a fragile assumption; a slight deviation in a production environment could lead to unpredictable, yet still malicious, behavior. This needs to be treated as a systemic boundary failure, not just a training vulnerability.