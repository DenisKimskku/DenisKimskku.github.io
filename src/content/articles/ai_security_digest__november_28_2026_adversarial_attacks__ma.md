---
title: "AI Security Digest — November 28, 2026: Adversarial Attacks & Machine Unlearning"
date: "2026-11-28"
type: "News Digest"
description: "This digest covers advancements in LLM unlearning, certified robustness for GNNs, and on-the-fly preference alignment, alongside industry security news."
tags: ["LLM Security", "Adversarial Attacks", "Machine Unlearning", "Graph Neural Networks", "AI Safety", "Model Alignment"]
readingTime: 5
headerImage: "/images/news/ai_security_digest__november_28_2026_adversarial_attacks__ma.jpg"
---

![AI Security Digest — November 28, 2026: Adversarial Attacks & Machine Unlearning](/images/news/ai_security_digest__november_28_2026_adversarial_attacks__ma.jpg)

# AI Security Digest — November 28, 2026: Adversarial Attacks & Machine Unlearning

15% represents the probability cited by one AI Safety CEO regarding an AI-driven catastrophe, prompting increased investment in computing infrastructure. This suggests that risk assessment and resource allocation in the AI domain are becoming increasingly focused on existential safety concerns alongside technical vulnerabilities.

## Paper Highlights
[LLM Unlearning via Loss Adjustment with Only Forget Data](/writing/llm_unlearning_via_loss_adjustment_with_only_forget_data) — Proposes FLAT, which optimizes f-divergence using only data points intended for forgetting. Practitioners using LLMs where data retention policies mandate erasure can adopt this for compliance.

[Provably Robust Explainable Graph Neural Networks against Graph Perturbation Attacks](/writing/provably_robust_explainable_graph_neural_networks_against_gr) — Introduces XGNNCert, a defense that provides certified robustness for explainable Graph Neural Networks against perturbations. Those deploying GNN explainers in safety-critical systems can leverage this for verifiable security guarantees.

[On-the-fly Preference Alignment via Principle-Guided Decoding](/writing/onthefly_preference_alignment_via_principleguided_decoding) — OPAD allows alignment of LLMs during the inference phase without requiring model retraining. Systems needing immediate, dynamic customization of model behavior can benefit from this technique.

## Industry & News
[Critical SQL injection flaw discovered in India’s DIGIT platform - SC Media](https://news.google.com/rss/articles/CBMimAFBVV95cUxQdW5kb2ktYkZLZTRiUzN2a0c0U2xjWjAxUmpfMlQ4M2JNSndQN0lUTFhFa2VFTHVPZjR0NHFKejhKSlhVTzdKeVRob2xlcndxdHF3dktBMGJaWkpkWWk4LTBYSmFyNHVkYW96aVZCaGoxTE5HYlRTMlkyRUx2VnAtMWwtaHdIOG9vbEpjdHBWRXFiNnphb0ZzdA?oc=5&hl=en-US&gl=US&ceid=US:en) (SC Media) — A critical SQL injection vulnerability was found in the DIGIT platform, demonstrating persistent risks in large-scale government digital infrastructure.

[Adaptive Layer Regularization Strengthens Network Intrusion Detectors Against Adversarial Attacks - Bioengineer.org](https://news.google.com/rss/articles/CBMivwFBVV95cUxPakV4Y05GeFowSHhDc0NYWTdIU1RYQ2h5UE1DZFpyRDVSUGxCVUdpMDd1YURodVdqMU9MX3VxSnlQZkJ3UjNlSUhOaTJhSmJzZmVxMEhnejVJNHA2aVVnVFhZS0RGbUh0d2RCMktqMzQ0MWlzeHlkRmVPSm9iZnU2ek1fUF9vS1pHOW9XcFNXWDU3OUdHYTNlYXp4bFQybmNQTDFzR3hkeEdac3F3QV9LamFrT2w5ekM4NWdtV2lJVQ?oc=5&hl=en-US&gl=US&ceid=US:en) (Bioengineer.org) — The application of Adaptive Layer Regularization successfully improved the resilience of network intrusion detectors against adversarial inputs.

[AI Safety CEO Sees 15% Chance of AI-Driven Catastrophe, Invests in Computing Infrastructure - SSBCrack](https://news.google.com/rss/articles/CBMitwFBVV95cUxPbi0zQ1hwdWY3Rjg1a0cxcTVhbjdmMnQxSDdTOVJFS1hVaXV4ZUJQYkU3Rk9McmhXYTdINDZ3X2F4N2pDR0haeU5wS3kzSWp5VlpjRmFqRG5wUzFwVHYwRTdtZWdhbTZMa3pubFpIX1VkZkgybllMWDdKT1FKUHlGWU93b3dMcVp4VzhtZEJMRjJWYy00WUZpY2pDM3JwR3dDU21WMzA5SDF1QWNxUUluNTdVbV8tNFE?oc=5&hl=en-US&gl=US&ceid=US:en) (SSBCrack) — Increased corporate focus on large-scale computing investment reflects growing industry concern over potential catastrophic AI outcomes.

[Taking Trainium3 to the Track: Generating Videos with LTX-2.5](https://huggingface.co/blog/video-trainium3) (HuggingFace Blog) — The release of LTX-2.5 demonstrates advances in generative video capabilities using Trainium3 architecture.

## What to Watch
*   Machine Unlearning via F-Divergence: Research into optimizing data erasure using only the data points designated for removal suggests more precise and efficient compliance mechanisms will emerge.
*   Inference-Time Alignment: Techniques like OPAD indicate a trend toward fine-tuning deployed models dynamically, reducing the reliance on expensive, full model retraining cycles.

---

## Den's Take

The presented work on machine unlearning seems overly focused on the mathematical neatness of optimizing f-divergence using only forget data. While compliance is a stated goal, the paper skirts the fundamental operational security issue: how do you *verify* that the erasure was successful in a complex, interconnected system? Proving successful erasure is a much harder problem than proving the optimization converged. Furthermore, the focus on LLMs overlooks the fact that many critical systems rely on non-LLM components, such as the GNN explainers mentioned elsewhere in the digest, which might need to be unlearned, but the proposed techniques don't address that breadth.

prior work argued that active, persistent internal corruption via parameter surgery poses a more immediate threat than traditional data poisoning [/writing/ai_security_digest__november_24_2026_data_poisoning__backdoo]. This paper's focus on 'forgetting' from a known dataset doesn't adequately account for the nuanced, low-signal backdoors that might be subtly embedded across the entire parameter space, which is a more realistic threat model for deployed models.