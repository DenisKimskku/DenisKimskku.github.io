---
title: "An Interpretable N-gram Perplexity Threat Model for Large Language Model Jailbreaks"
date: "2026-08-27"
type: "Paper Review"
description: "Proposes N-gram LM perplexity as an LLM-agnostic fluency constraint"
tags: ["Jailbreaking", "Adversarial Attacks"]
readingTime: 5
headerImage: "/images/news/an_interpretable_ngram_perplexity_threat_model_for_large_lan.jpg"
paperUrl: "https://proceedings.mlr.press/v267/boreiko25a.html"
---

![An Interpretable N-gram Perplexity Threat Model for Large Language Model Jailbreaks](/images/news/an_interpretable_ngram_perplexity_threat_model_for_large_lan.jpg)
*Figure from the paper “An Interpretable N-gram Perplexity Threat Model for Large Language Model Jailbreaks” (p. 2)*

# Interpretable N-gram Perplexity as a Threat Model for LLM Jailbreaks

## TLDR
*   **What**: Proposes N-gram LM perplexity as an LLM-agnostic fluency constraint.
*   **Who's at risk**: Safety-tuned LLMs against adversarial text inputs.
*   **Key number**: Figure 2 shows that with well-constructed adaptive attacks, these high-perplexity attacks still outperform attacks designed as low-perplexity attacks, such as PAIR.

## The Gap in Jailbreak Evaluation
Current jailbreaking evaluations suffer from metric heterogeneity. Researchers report efficacy using disparate metrics such as fluency, query efficiency, or length, preventing a consistent comparison of attack methods. Furthermore, reliance on LLM-based perplexity for filtering inputs creates a setup that is non-interpretable, LLM-dependent, and computationally expensive to evaluate. This lack of a unified, principled threat model hinders a clear understanding of the jailbreaking attack landscape. The paper addresses this by formalizing the adversarial process within a threat model that constrains the input text to resemble natural language distributions, moving beyond subjective or model-specific fluency checks.

## The N-gram LM Perplexity Constraint
The core insight introduced here is the shift from model-based perplexity to N-gram language model (N-gram LM) perplexity. An N-gram LM is a transparent model of token co-occurrence, defined by the probability $P(w_n|S) = \frac{C(S, w_n)}{C(S)}$, where $C(\cdot, \cdot)$ is the frequency count in the training data. The perplexity, $PPL_N(S_W) = \left(\prod_{n=N}^{W} P(w_n|S)\right)^{-1/(W-N+1)}$, measures how rare a sequence $S_W$ is in the corpus. This N-gram LM is LLM-agnostic, interpretable (since each N-gram's contribution is traceable), and computationally cheap to evaluate via a simple hash table lookup. This allows for a fair, objective constraint on input fluency that is independent of the target LLM architecture.

## Bigram Distribution Alignment in Adaptive Attacks
The mechanism involves constructing a lightweight bigram LM from the Dolma dataset based on 1T tokens. This LM is then used to create a binary perplexity filter. To compare attacks fairly within this threat model $T$, methods are adapted to satisfy this constraint. The paper demonstrates that discrete optimization-based attacks, such as PRS, can be successfully adapted. Specifically, when adapting PRS, the strategy is to only allow a substitution if it "both decreases the loss and passes the filter; we utilize full knowledge of the threat model and restrict sampling to the first 100k most-likely bigrams." This adaptation forces the attack's generated suffixes to align with the natural bigram distribution found in the Dolma training data, moving away from using unseen or rare bigrams found in baseline attacks like PRS.

## Limitations
The threat model assumes a single-turn chat scenario where the attacker cannot modify the system prompt or chat template, and relies on the provider using a safe system prompt. The evaluation of adaptive attacks is shown to be robust, but the paper notes that the computational cost of attacks remains reasonably cheap even after optimization, suggesting that the threat model may guide toward a specific type of robustness rather than absolute security against all possible adversaries.

## What practitioners should do
*   When evaluating jailbreak methods, adopt metrics that are LLM-agnostic and interpretable, such as N-gram perplexity, to ensure fair comparison.
*   If developing adversarial inputs, ensure that optimization steps incorporate fluency constraints derived from large, diverse corpora to prevent reliance on rare or unseen tokens.
*   Benchmark against adaptive attacks within a defined threat model $T$, as these reveal a more realistic security posture than unconstrained baselines.
*   When using perplexity filters, carefully select the threshold $\gamma$ to balance the True Positive Rate on benign inputs against the filtering effect on malicious inputs.

## Verdict
Read this paper if you are an ML engineer or security researcher focused on quantifying the robustness of LLMs; otherwise, skip it.

## Den's Take

The paper effectively isolates the problem of metric heterogeneity in jailbreak evaluations by swapping model-dependent fluency checks for an LLM-agnostic N-gram constraint. However, the focus on bigram alignment feels too narrow. By constraining attacks to the 100k most-likely bigrams, the research implicitly assumes that the adversarial success space is fundamentally limited by local token co-occurrence statistics. This ignores the potential for sophisticated, multi-step attacks that leverage long-range dependencies or semantic shifts—areas where simple N-gram models break down entirely. True adversarial resilience likely requires moving beyond local fluency checks to verifying the *semantic coherence* of the input relative to the model's intended knowledge graph, not just its token frequency distribution. prior work argued that security must shift from isolated perimeter defenses to verifiable cryptographic guarantees within the model's internal state.