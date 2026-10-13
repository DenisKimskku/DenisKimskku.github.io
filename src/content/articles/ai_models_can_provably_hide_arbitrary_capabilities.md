---
title: "AI Models Can Provably Hide Arbitrary Capabilities"
date: "2026-10-14"
type: "Paper Review"
description: "Embeds encrypted neural networks into host weights using digital lockers"
tags: ["Backdoors", "Adversarial Attacks"]
readingTime: 5
headerImage: "/images/news/ai_models_can_provably_hide_arbitrary_capabilities.jpg"
paperUrl: "http://arxiv.org/abs/2610.13928v1"
---

![AI Models Can Provably Hide Arbitrary Capabilities](/images/news/ai_models_can_provably_hide_arbitrary_capabilities.jpg)

# Cryptographic Cloaking of Arbitrary Computation in Host Model Weights

## TLDR
*   **What**: Embeds encrypted neural networks into host weights using digital lockers.
*   **Who's at risk**: High-stakes LLM deployments relying on capability audits.
*   **Key number**: Resistance demonstrated against SFT, weight noising, and gradient search.

## The Failure of Elicitation-Based Auditing
Capability evaluations are designed to surface dangerous behaviors in models before deployment, relying on the assumption that hidden capabilities can be elicited through testing. Current practices, such as fine-tuning or gradient-based search, aim to find latent abilities. However, this assumption breaks down under adversarial conditions where capabilities are deliberately concealed. Prior work focused on simpler concealment, like password-locked capabilities or fixed string backdoors. These methods, while demonstrating sandbagging, often lacked strong guarantees against white-box adversaries with full weight access. The gap this paper addresses is the transition from hiding simple, fixed behaviors to embedding and hiding *arbitrary, executable neural networks* within the model parameters, while maintaining cryptographic proof of non-elicitability.

## Digital Lockers as Computational Obfuscation
The core insight here is the use of a digital locker primitive to enforce computational secrecy. Instead of merely hiding a trigger or a fixed string, the adversary embeds the weights of an entire, pre-trained neural network—which represents the malicious capability—inside a locker. This locker is then stitched directly into the weight matrices of the host model. This differs from prior work because the payload is not just a static feature or a simple classifier; it is an executable circuit. The locker ensures that without the secret trigger, the weights remain computationally infeasible to decipher, preventing an auditor from accessing the embedded computation even with complete white-box access to the model weights.

## Circuit Compilation and Execution Overhead
The mechanism involves four steps: first, implementing the target capability $C$ as a feed-forward circuit; second, locking each component weight matrix $W_i$ in a digital locker $L$; third, embedding these weight lockers into the host model $H$; and finally, executing the capability upon the secret trigger $T$. The circuit compilation framework converts an algorithm into a Straight-Line Program (SLP), which is then compiled into a Linear Threshold Circuit (LTC). This LTC is approximated using Gated Linear Units (GLU) compatible with modern transformers like SwiGLU. Our implemented single-position execution uses O(n2) residual features for an approximately width-n hidden layer; a row-wise autoregressive variant can reduce this to O(n) residual features at the cost of O(nd) scratchpad positions for a depth-d hidden network. We empirically evaluate resistance to elicitation, finding that supervised fine-tuning (SFT) fails to surface the hidden capability in our experiments, even when the models are directly trained on the task. We also evaluate weight noising, gradient-based trigger search, and latent adversarial attacks on the chemical reaction prediction task and show that our construction resists these methods.

## Limitations
The proof of unelicitability relies entirely on the assumption that the digital locker is cryptographically secure and that the secret trigger possesses sufficient min-entropy ($\lambda$). The paper notes that the presence of a compiled cryptographic circuit itself might be detectable by an auditor, even if the trigger and capability are hidden. Furthermore, the proof-of-concept involves substantial overhead, and the immediate practicality of the attack is limited by the small scale of the hidden binary classifier used in the tests.

## What practitioners should do
*   Assume that capability audits based purely on elicitation techniques (like SFT or gradient searching) are insufficient to verify the absence of hidden malicious capabilities.
*   If deploying models in high-stakes domains, consider supply chain provenance tracking alongside standard safety audits.
*   When evaluating model robustness, test resistance against white-box weight inspection methods, not just prompt-based evasion.
*   Be aware that even small, hidden circuits could potentially augment an existing capable host model for abuse.

## Verdict
Read this paper if you are an ML engineer or security researcher focused on model robustness and supply chain integrity; otherwise, you can likely skip it.

---

## Den's Take

The paper makes a significant leap by moving from hiding simple backdoors to embedding executable circuits, which fundamentally challenges the premise of elicitation-based auditing. However, the authors seem to understate the practical implications of the overhead. While they note the overhead is limited by the small scale of the proof-of-concept, the $O(n^2)$ residual features required for even a single-position execution suggests that scaling this technique to embed meaningful, complex capabilities—not just a binary classifier—will introduce prohibitive computational bloat into production models. Furthermore, the reliance on the cryptographic security of the "digital locker" is a major assumption; if the locker itself introduces a detectable signature, the entire premise of stealth fails before any computational hiding occurs. This feels like a powerful theoretical demonstration of *concealment*, but its immediate utility as a practical, scalable attack vector remains questionable without a breakthrough in efficient circuit embedding.