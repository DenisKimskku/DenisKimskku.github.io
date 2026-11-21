---
title: "Diverse Preference Learning for Capabilities and Alignment"
date: "2026-11-22"
type: "Paper Review"
description: "Soft Preference Learning (SPL) decouples KL penalties in alignment"
tags: ["AI Security"]
readingTime: 5
headerImage: "/images/news/diverse_preference_learning_for_capabilities_and_alignment.jpg"
paperUrl: "https://arxiv.org/abs/2511.08594"
---

![Diverse Preference Learning for Capabilities and Alignment](/images/news/diverse_preference_learning_for_capabilities_and_alignment.jpg)
*Figure from the paper “Diverse Preference Learning for Capabilities and Alignment” (p. 2)*

# Decoupling Entropy and Cross-Entropy in Alignment for Diverse LLM Outputs

## TLDR
* **What**: Soft Preference Learning (SPL) decouples KL penalties in alignment.
* **Who's at risk**: LLMs trained via RLHF or DPO that suffer from mode collapse.
* **Key number**: SPL resembles but is a Pareto improvement over, standard temperature scaling.

## The KL-Divergence Bias Towards Majority Preferences
When large language models are aligned using preference-based methods like Reinforcement Learning from Human Feedback (RLHF) or Direct Preference Optimization (DPO), the resulting models exhibit a tendency toward uniformity. This uniformity manifests as mode collapse, where the model systematically favors the majority opinion in a dataset, even when minority views are present. For instance, in a multiple-choice scenario where 55% prefer option A and 10% prefer option D, the aligned model may assign near-total probability to A, thereby failing to represent the full spectrum of perspectives. This phenomenon is rooted in the KL-divergence regularizer present in these alignment objectives. In Section 3, we analyze RLHF and DPO from a social choice perspective. We prove that when the preferences of different groups conflict, the probability of generating majority-preferred outputs far exceeds the population preference for that output. This mode collapse has consequences for the social perspectives language models represent but also for lexical and logical diversity.

## Soft Preference Learning (SPL)
The core insight introduced here is the decoupling of the KL-divergence term into two separate components: an entropy term and a cross-entropy term. Standard preference learning uses the KL penalty to perform two functions simultaneously: maximizing the log-likelihood under the reference policy (the cross-entropy aspect) and maximizing the diversity of the learned policy (the entropy aspect). SPL separates these concerns. By introducing an entropy bonus parameter $\alpha$, the model gains independent control over generation diversity, distinct from its bias toward the reference policy $\pi_{\text{ref}}$. In the context of the two-outcome SPL policy, the optimal policy is $\pi(y) \propto \pi_{\text{ref}}(y)p^{1/\beta}$. This formulation allows the model to move away from the singular focus on majority preferences seen in standard DPO/RLHF.

## Global Temperature Scaling via $\alpha/\beta$
The mechanism of SPL is realized through a global temperature scaling effect applied to the sequence level, rather than token-by-token. The optimal SPL policy can be shown to take the form $\pi'(y|x) = \exp\left(\frac{1}{\alpha} r(x, y)\right)\frac{\pi_{\beta/\alpha}^{\text{ref}}}{Z}$. This is distinct from standard token-level temperature scaling, which renormalizes the distribution at each token step, often causing rapid quality degradation when the temperature exceeds 1. SPL's global approach preserves the relative probability ordering of entire sequences, ensuring that the "best" sequences remain the most likely outputs even at higher diversity settings.

## Limitations
The analysis focuses primarily on pairwise preferences and two-outcome scenarios, which may not capture the complexity of real-world, multi-faceted preference distributions. Furthermore, the assumption that preference variation is attributable to random noise, which justifies using higher $\alpha$ values, may break down if the variation stems from systematic, unobserved biases in the preference dataset itself. The paper notes a \$37\%$ cross-rater disagreement rate in the HH-RLHF dataset, suggesting that noise modeling is an imperfect proxy for true diversity.

## What practitioners should do
* When fine-tuning models with DPO or RLHF, consider decoupling the KL-regularization objective if output uniformity is observed.
* Experiment with SPL, particularly by tuning $\alpha$ away from $\alpha=\beta$ to intentionally increase output diversity.
* If using high-temperature sampling for diverse generation, prefer SPL's global temperature scaling over token-level methods to mitigate rapid quality decay.
* Evaluate not just reward maximization, but also metrics like logical disagreement to ensure diverse viewpoints are being captured.

## Verdict
Read this paper if you are actively working on LLM alignment, fine-tuning, or robustness. If you are only interested in prompt engineering, you can skip it.

## Den's Take

The paper effectively demonstrates that decoupling the KL penalty in preference learning allows for better representation of minority views, moving beyond the uniformity induced by standard DPO/RLHF. However, the emphasis on pairwise preferences and two-outcome scenarios feels like a necessary simplification that obscures the actual failure mode. When I covered the challenges of agent state integrity in my review of [Tether: Verified Stateful Policy Engine for System-Level Monitoring of Agents](/writing/tether_verified_stateful_policy_engine_for_systemlevel_monit), the underlying issue wasn't just preference distribution; it was the model's ability to maintain coherent, verifiable internal state across complex interactions. SPL addresses output diversity but doesn't inherently solve the problem of deeply embedded, low-signal malicious intent that might survive a "proportional representation" policy. The practical application of $\alpha$ is likely to be a blunt tool against nuanced adversarial manipulation.