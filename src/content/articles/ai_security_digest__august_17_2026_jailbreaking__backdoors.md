---
title: "AI Security Digest — August 17, 2026: Jailbreaking & Backdoors"
date: "2026-08-17"
type: "News Digest"
description: "This digest covers recent threats including quantum noise backdoors, memory extraction attacks on federated learning, and new LLM jailbreaking techniques."
tags: ["LLM Security", "Adversarial Attacks", "Backdoors", "Quantum Computing", "Federated Learning", "Jailbreaking"]
readingTime: 5
headerImage: "/images/news/ai_security_digest__august_17_2026_jailbreaking__backdoors.jpg"
---

![AI Security Digest — August 17, 2026: Jailbreaking & Backdoors](/images/news/ai_security_digest__august_17_2026_jailbreaking__backdoors.jpg)

# AI Security Digest — August 17, 2026: Jailbreaking & Backdoors

17 months is how long Salesforce and ServiceNow portals were exposed, demonstrating the severe risk associated with prolonged, unpatched infrastructure vulnerabilities.

## Paper Highlights
[QNBAD: Quantum Noise-induced Backdoor Attacks against Zero Noise Extrapolation](/writing/qnbad_quantum_noiseinduced_backdoor_attacks_against_zero_noi) — by Cheng Chu, Qian Lou, Fan Chen. This work introduces noise-dependent backdoors that corrupt Zero Noise Extrapolation (ZNE) fitting processes. Practitioners using ZNE for reliability on Noisy Intermediate-Scale Quantum (NISQ) devices must account for these novel attack vectors.
[Memory Backdoor Attacks on Neural Networks](/writing/memory_backdoor_attacks_on_neural_networks) — by Eden Luzon, Guy Amit, Roy Weiss. A memory backdoor mechanism allows for the exact, systematic extraction of private training samples from a system. Federated Learning deployments, particularly those with a compromised central server, are directly exposed to this threat.
[TwinBreak: Jailbreaking LLM Security Alignments based on Twin Prompts](/writing/twinbreak_jailbreaking_llm_security_alignments_based_on_twin) — . TwinBreak demonstrates removing Large Language Model (LLM) safety alignments through targeted parameter pruning. Deployments relying on open-source, safety-aligned LLMs require immediate re-evaluation of alignment robustness.

## Industry & News
[Week in review: Salesforce and ServiceNow portals exposed for 17 months, exploited Metabase 0-day - helpnetsecurity.com](https://news.google.com/rss/articles/CBMi1gFBVV95cUxOTUZhcGJjeVBGdmJndXJtZTJPNEkxNzFKUnlxbnIxYUZCUkpuQWZjT05TS05uMnFVX1ZLTGJmdEZoWDY3Szlnc0V4eW41Tlh0UHFHTnJfUTZ1T3Q3MEtJQW5rTmhfLVExcUpWRDM2SzFodnkxRV9maGQySjdWSzBySGM0T01CMTd4dHNXcmpBeGdvMVVwdDZLNzNhZzlvUUlzWnlZeXVSU0E0M29TWXZqaGJQeDRxd0lYaXYzT2trVWtFUVVybGVBZlRKakpXR1hEeXNacmZB?oc=5&hl=en-US&gl=US&ceid=US:en) — Exposure of major enterprise portals for extended periods shows systemic failure in vulnerability management cycles.
[NIELIT hackathon tests cybersecurity judgment, not vulnerability detection - Tech Observer Magazine](https://news.google.com/rss/articles/CBMipgFBVV95cUxPVkJiR2JWc1BTdWNFLXRCb1ZxQUVJTlNmSHBuYlRZVl9JanVfcFlSUDVCVGdmeldzcHVTcXo2VUpudEpFV1NwQ2N2RWg4SzlGYXhuLVdEY2wyTGZ2ZHBFNmFJTEp3NF9CRkltTlVYUTVGYi1oMzlZU1ZpVFJ3bjV3VTdKeEdJZW9DQjBrVFNEUUtlSjM4ME1BQ3hvYjJYdHdHWVYxMjBR0gGrAUFVX3lxTFBxdmN4bzFrM3dFRFRCd0ZQc0RWMHBkT1BWVGl6dnJJTDVCT3lVQTBrMHVHb2E4RlBMbVZGaTFHX09fMEZzeWVhZEVEYWExWEwwZUp6VWNWdFJRR183blFmUXV5cnpETVVIay1PQ2poN0VwNklaaGFYNjlzRm5HXzJaNEtKdlRKVk9NcWkwdFc4aGZhSzk1QWtDS210NEF0S2hfdGpSQTQxUnRjcw?oc=5&hl=en-US&gl=US&ceid=US:en) — Competitions focusing on judgment rather than specific vulnerability spotting suggest a shift in security testing methodologies.
[Anthropic Reveals More About How Claude's AI Text Watermarks Will Work - NDTV Profit](https://news.google.com/rss/articles/CBMivwFBVV95cUxNU2lTVl83WVd3RnN3ZTlZSGlNc1ZQREs5TkVaaTVuZWpnamV6VUhRZTUxUlE0TW92b2JmYzR6YTdneVo0aGJJQURGVG4ybjFza25ZaE9EX2dhWGhBaXJOSFJ3cTBpOGY4dEdReGZwT1Z6NktwZmhtODc2MXdiOHVHQTVEZnNodTFJeENSc0FhbHF4NkluU2xNSmJpdmpnOFVqVU9sMTBCOE5PSi1GVEtNbzI0NXctUlplTUN1SU5kNNIBvwFBVV95cUxNU2lTVl83WVd3RnN3ZTlZSGlNc1ZQREs5TkVaaTVuZWpnamV6VUhRZTUxUlE0TW92b2JmYzR6YTdneVo0aGJJQURGVG4ybjFza25ZaE9EX2dhWGhBaXJOSFJ3cTBpOGY4dEdReGZwT1Z6NktwZmhtODc2MXdiOHVHQTVEZnNodTFJeENSc0FhbHF4NkluU2xNSmJpdmpnOFVqVU9sMTBCOE5PSi1GVEtNbzI0NXctUlplTUN1SU5kNA?oc=5&hl=en-US&gl=US&ceid=US:en) — The detailing of AI text watermarking mechanisms indicates industry efforts to track and attribute generated content.

## What to Watch
* Adversarial Prompt Engineering: Techniques will continue to evolve beyond simple prompt injection to target specific internal model states for data exfiltration.
* Quantum Security Integration: Noise-modeling attacks suggest that hardware noise itself can become a vector for covert data manipulation in near-term quantum computations.

---

## Den's Take

The collection of recent work paints a picture where the focus on input-level defenses is becoming obsolete. The demonstrations of memory backdoors and alignment pruning show that the attack surface has moved deep into the model's internal state and training artifacts. While the papers focus on specific technical exploits, they miss the broader systemic implication: we are moving from prompt injection being a query problem to alignment corruption being a persistent, structural problem. If an attacker can successfully manipulate the model's fundamental alignment—as suggested by TwinBreak—then all subsequent runtime monitoring, whether it's a WAF or an orchestration integrity check, is merely inspecting a façade. The effectiveness of any defense must therefore pivot from detecting malicious *input* to cryptographically verifying the model's *integrity* throughout its lifecycle.