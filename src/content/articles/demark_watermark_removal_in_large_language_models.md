---
title: "De-mark: Watermark Removal in Large Language Models"
date: "2026-08-22"
type: "Paper Review"
description: "DE-MARK removes n-gram watermarks using random selection probing"
tags: ["Watermarking", "Vulnerabilities"]
readingTime: 5
headerImage: "/images/news/demark_watermark_removal_in_large_language_models.jpg"
---

![De-mark: Watermark Removal in Large Language Models](/images/news/demark_watermark_removal_in_large_language_models.jpg)
*Figure from the paper “De-mark: Watermark Removal in Large Language Models” (p. 4)*

# DE-MARK: Framework for N-gram Watermark Removal and Exploitation

## TLDR
* **What**: DE-MARK removes n-gram watermarks using random selection probing.
* **Who's at risk**: LMs like Llama3 and ChatGPT using statistical watermarking.
* **Key number**: Experiments on popular LMs, such as Llama3 and ChatGPT, demonstrate the efficiency and effectiveness of DE-MARK in watermark removal and exploitation tasks.

## Probing for Watermark Signatures
The core security concern here revolves around the integrity of statistical watermarking schemes, which embed covert information into LM outputs to aid in content provenance tracking. Current methods, such as those building on Kirchenbauer et al. (2023a), rely on dividing the token set into red and green lists, increasing the logits for green tokens by a strength $\delta$. The vulnerability exploited by DE-MARK is the potential for adversaries to reverse-engineer this embedding. Prior work, like Jovanović et al. (2024), attempted watermark stealing but suffered from significant constraints: it required prior knowledge of the underlying hash function and necessitated the use of a paraphrase tool for removal, which risks corrupting the original LM distribution. DE-MARK sidesteps these limitations by employing a novel querying strategy, random selection probing, which allows the system to estimate watermark parameters without needing the secret key or external rewriting tools. This probing analyzes the probability discrepancies when the LM is prompted to randomly choose between two tokens.

## Token Score Vector
The system's ability to differentiate between red and green tokens hinges on the concept of a token score, $s$. This score is derived from the relative probability ratios, $R_{i,j}$, between pairs of target tokens $T = \{T_1, \dots, T_m\}$ within a given context $x$. The relative probability ratio is defined as $R_{i,j} := \log \left( \frac{P(T_i|x, T_i, T_j)}{P(T_j|x, T_i, T_j)} \right)$. In a watermarked setting, if one token is green and the other is red (and their base probabilities are equal), $R_{i,j}$ will be $\delta$ or $-\delta$. If both tokens are from the same list, $R_{i,j}$ should be 0. Algorithm 2 formalizes this: if $R_{i,j}$ falls within a positive threshold range $(\alpha_1, \alpha_2)$, the token $T_i$ receives a score increment ($s_i^+$); if it falls within the negative range $(-\alpha_2, -\alpha_1)$, it receives a decrement ($s_i^-$). This allows the framework to assign higher scores to tokens likely belonging to the green list.

## Context Length and Strength Estimation
DE-MARK employs sequential algorithms to pinpoint the necessary parameters. First, Algorithm 3 identifies the prefix $n$-gram length $h$. Subsequently, Algorithm 4 estimates the watermark strength $\hat{\delta}$. The algorithm then collects $R_{k,i,j}$ for pairs where one token has a score $s_{k,i} > \gamma m$ and the other has $s_{k,j} < -\gamma m$. Finally, Algorithm 5 uses $\hat{\delta}$ to compute an adjusted relative probability $R'_{i,j} = \text{sgn}(R_{i,j}) \min \left( \frac{|R_{i,j}|}{\hat{\delta}}, \hat{\delta} \right)$ and aggregates these to determine the green list $G$.

## Limitations
The framework is specifically tailored for $n$-gram watermarking and its effectiveness relies on the attacker having access to top-$k$ token probabilities (the $L1$ setting). The threat model does not cover black-box scenarios where no token probabilities are available. Furthermore, the success of identifying $h$ and $\hat{\delta}$ depends on the chosen thresholds ($\beta, \alpha_1, \alpha_2, \gamma$) being appropriate for the specific LM architecture and the watermark implementation details.

## What practitioners should do
* When assessing LM watermarking robustness, test watermark removal using probing strategies that do not require knowledge of the underlying hash function.
* If deploying watermarked LMs, recognize that token probability access ($L1$) is sufficient for an adversary to attempt watermark extraction.
* Benchmark watermarking schemes against methods that estimate $\delta$ via extreme token score ratios, as this bypasses reliance on paraphrase tools.
* When using watermarking, be aware that the system's integrity is challenged by the ability to identify the specific $n$-gram length $h$ used.

## Verdict
Read this paper if you are working on the security or provenance of watermarked LLM outputs. If your focus is purely on detector design, you may skip it.

---

## Den's Take

The paper presents a functional approach to stripping statistical watermarks, which is a necessary step for maintaining output freedom. However, its reliance on the $L1$ setting—requiring access to top-$k$ token probabilities—presents a significant gap in real-world applicability. Most deployed systems operate under stricter information constraints, and this framework does not address scenarios where only the final token output is observable. Furthermore, the entire methodology hinges on accurately estimating the watermark strength $\hat{\delta}$ via score ratios. If the underlying LM introduces noise or deviates subtly from the idealized logit manipulation assumed by the relative probability ratio, these estimations will fail, potentially leading to false positives or, worse, incomplete removal. This suggests that robustness against noise is not adequately characterized.