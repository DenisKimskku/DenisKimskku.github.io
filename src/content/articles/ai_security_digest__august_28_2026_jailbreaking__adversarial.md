---
title: "AI Security Digest — August 28, 2026: Jailbreaking & Adversarial Attacks"
date: "2026-08-28"
type: "News Digest"
description: "This digest covers recent breakthroughs in AI security, including timing side-channel attacks on DALL·E, multi-turn LLM jailbreaks, and private retrieval methods for RAG systems."
tags: ["LLM Security", "Jailbreaking", "Adversarial Attacks", "Side-Channel Attacks", "RAG", "Text-to-Image"]
readingTime: 5
headerImage: "/images/news/ai_security_digest__august_28_2026_jailbreaking__adversarial.jpg"
---

![AI Security Digest — August 28, 2026: Jailbreaking & Adversarial Attacks](/images/news/ai_security_digest__august_28_2026_jailbreaking__adversarial.jpg)

# AI Security Digest — August 28, 2026: Jailbreaking & Adversarial Attacks

DALL·E’s safety mechanisms are proven vulnerable to timing side-channel attacks, revealing that black-box Text-to-Image systems are susceptible to advanced reverse-engineering.

## Paper Highlights
[Exposing the Guardrails: Reverse-Engineering and Jailbreaking Safety Filters in DALL·E Text-to-Image Pipelines](/writing/exposing_the_guardrails_reverseengineering_and_jailbreaking) — Corban Villa, Muhammad Shujaat Mirza, Christina Pöpper. This work demonstrates how timing analysis can reverse unknown, cascading safety filters within Text-to-Image pipelines. Practitioners must account for side-channel leakage when deploying or auditing proprietary visual generation systems.
[Pointing the Way, Hiding the Destination: Practical Private Dense Retrieval at Scale](/writing/pointing_the_way_hiding_the_destination_practical_private_de) — Peichun Hua, Danyang Chen, Junan Zhang. The research introduces a method using learned deep hashing to create a private shortlist, minimizing cryptographic exposure. Organizations using Retrieval-Augmented Generation (RAG) over sensitive, provider-held data should review their retrieval layers.
[Great, Now Write an Article About That: The Crescendo Multi-Turn LLM Jailbreak Attack](/writing/great_now_write_an_article_about_that_the_crescendo_multitur) — Mark Russinovich, Ahmed Salem 0001, Ronen Eldan. Crescendo exploits benign, escalating multi-turn dialogue to successfully bypass the alignment of various Large Language Models (LLMs). Systems like ChatGPT, Gemini Pro, and Anthropic Chat are exposed to this conversational manipulation vector.

## Industry & News
[Alice Raises \$140M: Decade of Adversarial Data Powers Enterprise AI Security Push - Tech Times](https://news.google.com/rss/articles/CBMiywFBVV95cUxQRk5tQXRmV2dZSms4T1cwQlU1M2FsckFyai1EZVZZU3doX2VOcTRVTnB4SjRReG5UT21GYmlZa29memNZa2JvcldKNWJkS0gtZmpMdW5JUzh0NlpLeUVDRmN5Rnd2WHNXMXZnWFhfSElFaExtNEpwZ1hxM1FjVFBPaF9uampGMm81RWpmZ0xLbG9oN0xwcnZPalNUa2hQWXFwd29yX2JjUW5PNVdDcmJsckE4VFFaTlJHaWs3TTdxUzVGbVN5QmpGSGgybw?oc=5&hl=en-US&gl=US&ceid=US:en) — The substantial funding round for Alice indicates significant enterprise investment in adversarial data generation for defensive AI applications.
[SpecterOps: What a (proper) LLM jailbreak test looks like - Techzine Global](https://news.google.com/rss/articles/CBMikwFBVV95cUxQc2FERmFwc2lTRFdWeVBjenN0eE5SOXhoVERDYmFkT25oSzdqUHJtNUNvWXFmUTFkcGttTzJkSC1aRVJYdnlHOWpleWFuZlQ0WWM5ZS1ZQ2ZnTXN1eU5MQU1ZaU5tckFRZXdlN2Y5VUNITlNGNTFYNlBEeUZYaFpYWkZhRVhCU0tYdTZrYmlMMllldGM?oc=5&hl=en-US&gl=US&ceid=US:en) — This report details rigorous methodologies for testing LLM defenses, providing practitioners with benchmarks for validating their model robustness against sophisticated prompt injection.
[OpenAI Strengthens safety after Hugging Face incident - blockchain.news](https://news.google.com/rss/articles/CBMijAFBVV95cUxQUTFDenFfR3VKVFF1QmItUk15dDlSVHc4YkhQV1gya0QyS0VDZlhQZVN0bVRuWVRLTGxzd2JMLW5vOGtnc1M4ZUNtNTZab0xjNmN5NzlZUlJ0RExKeFIxWTAyUUZ0UVBWMG40bS1sbDd0bktpckVSVGI5RjFTajdGTXE0ODF2SU9Sc0lHTA?oc=5&hl=en-US&gl=US&ceid=US:en) — Following external incidents, OpenAI is increasing its safety layers, suggesting a reactive posture to public adversarial testing.
[New Cisco Secure AI Factory with NVIDIA: Built for Rack-Scale Era - Cisco Blogs](https://news.google.com/rss/articles/CBMimAFBVV95cUxQZHdVMVJadW9tYVh4SEc0N3UwenRHQzM4QVdqeks2OHR6dWxRWWZua3pvblUzcXBTTHFSQUdSVWpfRFdXeEI4eWQzT1YtWXVSUEFOTW5yLUlKeHhHUjRUQXZ0NzliY0dNVUFwUWYxTmJoQUd6cTlGaW9CZERZekdLZzVsS3dkdWdnRktpekRPNm5DcmdBZXNXdg?oc=5&hl=en-US&gl=US&ceid=US:en) — The integration of Cisco security with NVIDIA infrastructure points toward embedding security controls directly into high-throughput, rack-scale AI deployment environments.

## What to Watch
*   Autonomous Agent Prompt Chaining: Expect techniques to emerge that chain multiple small, low-risk prompts into a complex, high-risk objective to evade single-prompt defenses.
*   Model Evasion via Input Perturbation: Adversarial examples will become more subtle, requiring shifts from simple token swaps to low-magnitude, perceptually insignificant input alterations that confuse model inference paths.

---

## Den's Take

The focus on timing side-channels in Text-to-Image systems is a legitimate technical finding, but the article misses the broader implication for prompt injection resilience. When I looked at my own work on LLM red-teaming, I found that defenses based on structural separation—like wrapping instructions in XML or system delimiters—are almost meaningless because the model treats them as conventions, not security boundaries [my 20-level LLM red-teaming CTF](/writing/llm_red_teaming_ctf_20_levels). If we are already failing to treat simple input formatting as a trust barrier in text generation, the idea that a complex, cascading safety filter in a visual system is uniquely impenetrable warrants closer scrutiny. The true vulnerability here isn't the side-channel, but the fundamental assumption that *any* external constraint can reliably enforce internal behavior.