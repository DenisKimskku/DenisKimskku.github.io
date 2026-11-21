---
title: "AI Security Digest — November 22, 2026: AI Agents & Privacy"
date: "2026-11-22"
type: "News Digest"
description: "This digest covers AI agents exploiting zero-day vulnerabilities and advances in data unlearning techniques for generative models."
tags: ["AI Agents", "Data Privacy", "Data Unlearning", "LLM Security", "Zero-Day Exploits", "Generative Models"]
readingTime: 4
headerImage: "/images/news/ai_security_digest__november_22_2026_ai_agents__privacy.jpg"
---

![AI Security Digest — November 22, 2026: AI Agents & Privacy](/images/news/ai_security_digest__november_22_2026_ai_agents__privacy.jpg)

# AI Security Digest — November 22, 2026: AI Agents & Privacy

An attack mechanism involving AI agents leveraging zero-day vulnerabilities in medical software demonstrates how sophisticated automation can bypass traditional security controls. Defenses are concurrently advancing by developing methods for 'unlearning' sensitive data from large generative models.

## Paper Highlights

[Data Unlearning in Diffusion Models](/writing/data_unlearning_in_diffusion_models) — by ArXiv — SISS integrates naive deletion and NegGrad via importance sampling to mitigate memorization in diffusion model deployments. Practitioners should note this as a pathway to address data exposure risks in generative systems.

[Privacy-Aware Lifelong Learning](/writing/privacyaware_lifelong_learning) — by ArXiv — PALL utilizes sparse subnetworks and episodic memory to facilitate exact task unlearning in parameter-sharing lifelong learning setups. This is relevant for systems that must comply with data deletion mandates, such as personalized recommendation engines.

[Diverse Preference Learning for Capabilities and Alignment](/writing/diverse_preference_learning_for_capabilities_and_alignment) — by ArXiv — Soft Preference Learning (SPL) decouples KL penalties during alignment, allowing for more diverse outputs from Large Language Models (LLMs). Teams working with Reinforcement Learning from Human Feedback (RLHF) or Direct Preference Optimization (DPO) may find this relevant for avoiding mode collapse.

## Industry & News

[Amazon: China-Linked Hackers’ AI Agents Exploited Medical Software Zero-Day - SecurityWeek](https://news.google.com/rss/articles/CBMipgFBVV95cUxNS0RzYnRJVzA5MjhlSWJfODFMNDRMdDl3Zk81UkxlbklPbE8tQ2xMYWdzSElBdlF6eTJaeWRSdm9aa3JkYU5xbUZIUjUtc3VxZzlYUXhCOWplcHBDb1AzcEMzWXd1eTdndHdIVWlrUnVSMExWQnZaakd4Y3JYRkFZeE9POGNKTE5tRlhwTTJnWUs4QVBjM1l6OFpaYmVqNVZWa0ZIUU5R?oc=5&hl=en-US&gl=US&ceid=US:en) (SecurityWeek) — Malicious actors employed AI agents to exploit a zero-day vulnerability in medical software, showing a new vector for supply chain compromise.

[AI Red Teaming for LLM Applications: 10 Security Risks Organisations Should Test - Security Boulevard](https://news.google.com/rss/articles/CBMiugFBVV95cUxQQmFocW9qUVk0ektrOXotOHdNdDdsZWFkSENnR1ZDb0xHVmJCM2oyalUycWRkY0NvQXg2T3pjX2VpUTRxdVJJM2QwR1hVcEl3MmZZY1E0NVg3WW16MkhaQVNtVzZPb1lwc256YUlrUU5yNWZUSHlxeFRnM3cxMjZyeUdUWG9RNkRuM1lRV3N6eTd1eDlQVFRWLVdSMjNwUVBhM1J4cU9hRWJvTTYzX0JzdmlWdUU2bjBSS0E?oc=5&hl=en-US&gl=US&ceid=US:en) (Security Boulevard) — This report details ten specific security risks organizations must test against when deploying LLM applications, providing a practical checklist for defense teams.

[Hackers Exploit Critical VMware, Cisco, and Apache Flaws as Espionage Attacks Emerge - The Hacker News](https://news.google.com/rss/articles/CBMiggFBVV95cUxNZ2w1cUFBU2VNb1VPZVRLV19uVS1xZS1Ya3JPOWxpbFF4dk5vVVdnenpqVElJMGN1T1VlVGpoaVhtLUJkb2Jid3F0RGVGUzhVQ0o3V0FUMFhwN2U3ZFREeGpXRTNsSFkzMUU3empZUV9qT1pfMFZEc2d0bmNNUDFCdGdB?oc=5&hl=en-US&gl=US&ceid=US:en) (The Hacker News) — Exploitation of critical vulnerabilities in major infrastructure products like VMware, Cisco, and Apache points toward increased threat actor focus on enterprise systems.

[Welcome Inkling 2 Mini, Cutting-edge Performance for your Local Setup](https://huggingface.co/blog/inkling2mini) (HuggingFace Blog) — The release of Inkling 2 Mini offers practitioners a way to run high-performing models locally, potentially reducing reliance on external, potentially insecure, API endpoints.

## What to Watch

*   AI agent autonomy: We anticipate increased focus on control planes and sandboxing to prevent agents from executing arbitrary system commands outside defined parameters.
*   Data Deletion Techniques: The development of practical, scalable data unlearning methods will shift the industry focus from reactive patching to proactive data lifecycle management.

---

## Den's Take

The presented research on data unlearning, while technically interesting for compliance scenarios, seems to understate the immediate threat vector demonstrated in the industry news. Focusing on scrubbing memorized data in diffusion models or LLMs is a necessary, long-term hygiene task, but it ignores the immediate danger of an autonomous agent leveraging a zero-day in a *downstream* application, as shown in the medical software exploit. We are still decades away from perfect data erasure, yet the attack surface is currently being widened by agent capabilities that can chain low-level exploits. I predict that control plane validation—ensuring the agent *only* operates within its defined scope—will become a more pressing defensive priority than perfect unlearning against memorization, because a successful exploit bypasses the model's knowledge altogether.