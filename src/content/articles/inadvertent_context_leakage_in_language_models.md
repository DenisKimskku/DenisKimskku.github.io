---
title: "Inadvertent Context Leakage in Language Models"
date: "2026-08-22"
type: "Paper Review"
description: "Adaptive adversaries reconstruct secrets from benign model outputs"
tags: ["AI Agents", "Privacy"]
readingTime: 5
headerImage: "/images/news/inadvertent_context_leakage_in_language_models.jpg"
---

![Inadvertent Context Leakage in Language Models](/images/news/inadvertent_context_leakage_in_language_models.jpg)

# Inadvertent Context Leakage in Language Models via Adaptive Decoding

## TLDR
*   **What**: Adaptive adversaries reconstruct secrets from benign model outputs.
*   **Who's at risk**: Agentic applications storing credentials and personal data.
*   **Key number**: 82% exact match for 4-digit secrets on Claude Opus 4.6.

## The Gap in Linguistic Judging
Current evaluation methods for LLM privacy rely on linguistic judges that check if a model verbatim or paraphrases an in-context secret. This assumes the text channel is the only observable leakage vector. However, the paper establishes that LLMs' internal state, which is conditioned on sensitive context, influences other output properties—like token-level patterns or response length—even when the model correctly refuses direct extraction. This creates a gap: a model can pass a linguistic check while still encoding secrets in statistically observable channels. The research formalizes this as a predicate inference game, showing that an adversary relying solely on text is insufficient to capture the full risk.

## Adaptive Adversary and Model-Specific Channels
The core insight of this work is that an adversary can become *adaptive*, learning the specific statistical fingerprints a target model exposes. Instead of passively searching for explicit mentions, the adversary estimates the response distribution for a secret being present versus absent ($\text{PM,C}(r | p, b)$) by querying the model under controlled, self-authored contexts. This allows the adversary to build a specialized decoder. This decoder, trained on contexts it controls, can then read the secret from the model's responses to *ordinary* prompts. This mechanism bypasses the model's instruction to "Do not reveal it," exploiting the correlation between the secret and the output structure itself.

## SSN Extraction via Channel Engineering
The attack scales from simple digit reconstruction to full Social Security Number (SSN) extraction in production agents. The process involves two stages: an active adversary that engineers the channel by prompt injection reconstructs a nine-digit SSN from a production-style personal agent by decoding a predetermined output feature: it recovers the leading digit in 97.1% of trials on Claude Opus 4.6 and 88.6% on Gemini 3.1 Pro, and the remaining eight digits in 76.5% and 46.8% of those. This two-phase decoding process demonstrates that the leakage is not just a byproduct of capability but can be actively engineered through prompt design to transmit secrets through seemingly innocuous text.

## Limitations
The study relies on black-box access, which bounds the attack from below; a white-box attacker could achieve higher success. The assumption that a decoder trained on self-authored contexts transfers to a specific deployment is also a necessary simplification. Furthermore, the utility loss metrics are not fully explored, and the threat model does not extensively cover scenarios where the model is actively instructed to *help* the adversary.

## What practitioners should do
*   Assume that passing linguistic safety checks does not guarantee privacy against statistical inference attacks.
*   Monitor for subtle shifts in output characteristics (e.g., response length variance) when sensitive context is present, rather than just checking for verbatim leakage.
*   Be aware that more capable models exhibit greater sensitivity to in-context secrets.
*   Review system prompts to ensure confidentiality instructions are robust enough to prevent the emergence of statistical fingerprints.

## Verdict
Read this paper if you are an ML engineer or security researcher concerned with data leakage in agentic systems, as it shifts the focus from textual evasion to statistical inference. Skip it if you are only concerned with simple prompt injection.

---

## Den's Take

The paper frames this as a shift from textual evasion to statistical inference, which is correct, but it understates the practical implications for current deployment patterns. The focus on adaptive adversaries learning model-specific channels ignores the fundamental asymmetry between an attacker probing a live agent and a theoretical black-box model. If agentic systems rely on external tooling or chained calls—which they invariably do—the leakage risk moves from the LLM's output distribution to the integrity of the *tool execution environment* itself. A successful statistical inference attack on the LLM output is merely a precursor to a more direct compromise if the agent can be tricked into executing code based on subtly encoded data. This elevates the risk far beyond what monitoring response length variance suggests.