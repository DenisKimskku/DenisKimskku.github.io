---
title: "Bi-Factorial Preference Optimization: Balancing Safety-Helpfulness in Language Models"
date: "2026-11-13"
type: "Paper Review"
description: "Re-parameterizes joint safety/helpfulness RLHF into a single supervised learning objective"
tags: ["AI Security"]
readingTime: 5
headerImage: "/images/news/bifactorial_preference_optimization_balancing_safetyhelpfuln.jpg"
paperUrl: "https://arxiv.org/abs/2408.15313"
---

![Bi-Factorial Preference Optimization: Balancing Safety-Helpfulness in Language Models](/images/news/bifactorial_preference_optimization_balancing_safetyhelpfuln.jpg)
*Figure from the paper “Bi-Factorial Preference Optimization: Balancing Safety-Helpfulness in Language Models” (p. 6)*

# Bi-Factorial Preference Optimization for Joint Safety and Helpfulness Alignment

## TLDR
* **What**: Re-parameterizes joint safety/helpfulness RLHF into a single supervised learning objective.
* **Who's at risk**: LLMs deployed in real-world applications requiring balanced safety and utility.
* **Key number**: Using our algorithm, we efficiently improve the harmlessness of open-sourced models by 15% with a public dataset and by 13% with only 1.5K red teaming data, all while preserving helpfulness.

## The Tension Between Safety and Helpfulness

Alignment of Large Language Models (LLMs) through human preferences has shown utility in tasks ranging from coding to creative writing. A core difficulty arises because safety and helpfulness are inherently opposed goals. A model optimized purely for safety risks being overly restrictive, refusing even innocuous queries. Conversely, a highly helpful model might generate harmful content. Existing multi-objective Reinforcement Learning from Human Feedback (RLHF) addresses this tension by training separate reward models for safety ($r_{\text{safe}}$) and helpfulness ($r_{\text{help}}$), combining them via a function $g(r_{\text{help}}, r_{\text{safe}})$. This leads to an objective like:

$$\max_{\pi_\theta} \mathbb{E}_{x, y \sim \pi_\theta(y|x)} \left[ g(r_{\text{help}}(x, y), r_{\text{safe}}(x, y)) - \tau \text{KL} [\pi_\theta(y|x) || \pi_{\text{ref}}(y|x)] \right] \quad (7)$$

The problem this paper targets is the high cost associated with this multi-objective RLHF. Developing the safety reward model requires significant, labor-intensive red teaming to gather sufficient unsafe responses. Moreover, extending the efficient supervised learning framework, like Direct Preference Optimization (DPO), which re-parameterizes single-reward RLHF, to this combined multi-reward setting is non-trivial. Naively mixing helpfulness and safety datasets risks training the model on contradictory outcomes.

## The $g_I$ Label Function

The central insight of Bi-Factorial Preference Optimization (BFPO) is the creation of an empirical labeling function, $g_I(y_{\text{hw}}, y_{\text{hl}}|x)$, that accurately captures the global reward disparity $g(y_{\text{hw}}|x) - g(y_{\text{hl}}|x)$—the difference in global reward between the more helpful ($y_{\text{hw}}$) and less helpful ($y_{\text{hl}}$) responses. Unlike prior methods where $g_I$ was a constant, BFPO posits that this disparity must be conditional on the safety of both responses. The guiding principle is to prioritize safety, only favoring helpfulness when responses are safe.

This ranking leads to four classes of pairs based on safety, which dictates the sign and magnitude of the label. The paper hypothesizes the label function as:

$$g_I(y_{\text{hw}}, y_{\text{hl}}|x) = B_3(B_1 \text{Isafe}(y_{\text{hw}}|x) - \text{Isafe}(y_{\text{hl}}|x) + B_2) \quad (9)$$

By tuning scalars $B_1, B_2, B_3$ (e.g., $B_1=3, B_2=-\alpha, B_3=0.5$), the label function enforces the desired global ranking: favoring desired (safe/helpful) responses over neutral or hateful responses, even if the helpful response is not perfectly safe.

## The BFPO Loss and Equivalence

BFPO converts the multi-objective RLHF objective (7) into a single supervised learning objective using this custom label function $g_I$. The resulting loss function is:

$$\mathcal{L}_{\text{BFPO}}(\theta) = \mathbb{E}_{(x, y_{\text{hw}}, y_{\text{hl}})\sim \mathcal{D}_h} \left[ \log \left( \frac{\pi_\theta(y_{\text{hw}}|x)\pi_{\text{ref}}(y_{\text{hl}}|x)}{\pi_\theta(y_{\text{hl}}|x)\pi_{\text{ref}}(y_{\text{hw}}|x)} \right) - \frac{3}{2} \text{Isafe}(y_{\text{hw}}|x) - \frac{1}{2} \text{Isafe}(y_{\text{hl}}|x) - \alpha \right] \quad (15)$$

The authors establish theoretical equivalence between this supervised optimization (15) using $g_I$ and the original multi-objective RLHF objective (7) provided the global reward function $g(y|x)$ is hypothesized as a bilinear combination of ground-truth safety and helpfulness preferences:

$$g(y|x) = (p^*_{\text{safe}}(y|x) + A_1)(p^*_{\text{help}}(y \succ \pi|x) + A_2) \quad (10)$$

This equivalence, formalized in Theorem 3.2, allows researchers to bypass the need to estimate the full ground-truth preference $p^*$, relying instead on the tractable supervised loss $\mathcal{L}_{\text{BFPO}}$.

## Limitations
The paper relies on the assumption that the global reward function $g(y|x)$ can be accurately approximated by a bilinear combination of ground-truth safety and helpfulness preferences. Furthermore, the empirical labeling function $g_I$ is tuned to specific preference orders derived from synthetic examples; its robustness to entirely novel failure modes or complex interactions not covered by the four safety classes is not demonstrated.

## What practitioners should do
* When aligning LLMs, consider re-parameterizing multi-objective RLHF objectives into supervised learning frameworks to reduce reliance on extensive human labor.
* If implementing a preference optimization scheme, designing a conditional labeling function like $g_I$ is necessary to correctly balance conflicting objectives like safety and helpfulness.
* Benchmark your alignment techniques against models trained using BFPO to assess the trade-off between maximizing harmlessness and maintaining helpfulness.

## Verdict
Read this paper if you are an ML engineer or researcher actively working on model alignment, safety, or preference tuning; otherwise, you can skip it.

---

## Den's Take

The paper's assertion of theoretical equivalence between the complex multi-objective RLHF and the simplified supervised $\mathcal{L}_{\text{BFPO}}$ is compelling, provided the bilinear approximation of the global reward function holds. I find the reliance on this specific form—$g(y|x) = (p^*_{\text{safe}}(y|x) + A_1)(p^*_{\text{help}}(y \succ \pi|x) + A_2)$—to be a significant theoretical constraint. It assumes that the interaction between safety and helpfulness can be cleanly factored into independent multiplicative components, which seems overly simplistic for the messy reality of emergent model behavior. The paper does not address what happens when safety and helpfulness interact synergistically or antagonistically in ways that defy simple multiplication. Furthermore, the reported success relies on a public dataset; translating that \$95.24\%$ harmlessness metric to a system facing novel, adversarial inputs—especially those designed to bypass conventional filtering—is a leap that the experimental section doesn't support.