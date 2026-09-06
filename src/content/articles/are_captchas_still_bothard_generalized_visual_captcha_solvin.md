---
title: "Are CAPTCHAs Still Bot-hard? Generalized Visual CAPTCHA Solving with Agentic Vision Language Model"
date: "2026-09-03"
type: "Paper Review"
description: "Halligan generalizes CAPTCHA solving using a VLM agent"
tags: ["AI Agents"]
readingTime: 5
headerImage: "/images/news/are_captchas_still_bothard_generalized_visual_captcha_solvin.jpg"
paperUrl: "https://www.usenix.org/conference/usenixsecurity25/presentation/teoh"
---

![Are CAPTCHAs Still Bot-hard? Generalized Visual CAPTCHA Solving with Agentic Vision Language Model](/images/news/are_captchas_still_bothard_generalized_visual_captcha_solvin.jpg)
*Figure from the paper “Are CAPTCHAs Still Bot-hard? Generalized Visual CAPTCHA Solving with Agentic Vision Language Model” (p. 4)*

# Generalized Visual CAPTCHA Solving via Agentic Vision Language Models

## TLDR
*   **What**: Halligan generalizes CAPTCHA solving using a VLM agent.
*   **Who's at risk**: Websites relying on visual CAPTCHAs like reCAPTCHA v2.
*   **Key number**: Halligan achieves a solving rate of 70.6% on previously unseen visual challenges from CAPTCHAs in the wild over a 30-day period.

## The Bot-Hard Assumption Decay
Visual CAPTCHAs, such as reCAPTCHA v2 and hCaptcha, operate on the premise that their visual challenges are bot-hard but human-friendly. For years, security has been a cycle where attackers build solvers for specific challenge types, and defenders respond by deploying out-of-distribution challenges. However, the emergence of general-purpose AI models is eroding this assumption. Prior to this work, attackers were constrained by the specific visual task the defender chose. A VLM, by contrast, possesses the potential to understand nearly any known visual challenge. The gap this paper addresses is the lack of a generalized solver capable of handling unseen visual challenges without specific retraining or adaptation, thereby challenging the reliability of current visual defenses.

## CAPTCHA Abstraction
The core insight of Halligan is reducing the entire visual CAPTCHA-solving problem into a search problem. This is achieved by framing the challenge in two parts: first, transforming the natural language instruction into an optimization objective, and second, mapping the visual interface—the body of the challenge—into a searchable space for that objective. This abstraction allows the VLM to treat the CAPTCHA not as a fixed image classification task, but as a dynamic environment to be navigated. The system first parses the visual input into a CAPTCHA model, which contains frames, keypoints, and elements, along with semantic relations like `instruct(A, B)`. This model provides the necessary structure to define the search space, which is a prerequisite for any generalized agentic solution.

## Search Space Exploration and Solution Evaluation
Once abstracted, the solving process becomes a search over possible actions. The agent uses two primary toolsets: Space Exploration Tools and Solution Evaluation Tools. Space Exploration Tools allow the agent to generate new candidate solutions ($C$) from a current solution ($c$) by applying actions like `slide(x, dir, c)` or `swap(f)`. The agent uses its VLM to select compatible tools based on the detected interactable element types (e.g., only swapping tools if `SWAPPABLE` elements are present). For each new candidate $c' \in C$, Solution Evaluation Tools, such as `rank(S, o)`, are invoked to compare $c'$ against the objective $o$. The process iteratively refines the solution until an optimal state is found, which is then translated into executable Python code.

## Limitations
The threat model assumes the attacker has access to VLMs and can build agentic programs, but it does not cover side-channel attacks. Furthermore, the success rates achieved in the wild depend heavily on the complexity and novelty of the challenges encountered; the potential gains in continuous actions like drag and slide were 29% in the closed-world setting. The reliance on the VLM's ability to correctly map semantics to actions remains a point of fragility.

## What practitioners should do
*   Audit reliance on visual CAPTCHAs for high-stakes authentication flows.
*   Consider puzzle-less anti-bot alternatives, as suggested by the paper's findings.
*   If using VLM-based agents, ensure the abstraction layer is robust to unexpected visual variations.
*   Be aware that even advanced CAPTCHAs can be infiltrated at rates over 70% on unknown challenges.

## Verdict
Read this paper if you are building defenses against AIGC-powered automated abuse; otherwise, skim it as a proof-of-concept demonstrating the vulnerability of current visual standards.

---

## Den's Take

The paper correctly identifies that generalized VLM agents fundamentally break the "bot-hard" assumption underlying visual CAPTCHAs. However, the focus on the agent's search capabilities seems to gloss over the more immediate, systemic issue: the inherent brittleness of the abstraction layer itself. If the VLM fails to correctly map the semantic relations—the `instruct(A, B)` structure—to the necessary search actions, the entire framework collapses, regardless of how powerful the underlying LLM is. The 70.6% success rate on "unseen challenges in the wild" is impressive, but its validity hinges entirely on the VLM's consistent ability to parse the *intent* of a novel visual challenge, not just its visual components. I predict that deploying these generalized solvers against production systems will quickly lead to a new arms race where defenders shift from visual puzzles to integrity checks on the *client-side* interaction pipeline itself.